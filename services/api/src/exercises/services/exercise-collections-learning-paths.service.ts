import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  QueryExerciseCollectionsDto,
  QueryLearningPathsDto,
  CreateExerciseCollectionDto,
  UpdateExerciseCollectionDto,
  SetCollectionItemsDto,
  CreateLearningPathDto,
  UpdateLearningPathDto,
  CompleteLessonDto,
  AssignLearningPathDto,
} from '../dto/exercise-collections-learning-paths.dto';

@Injectable()
export class ExerciseCollectionsLearningPathsService {
  private readonly logger = new Logger(ExerciseCollectionsLearningPathsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // =========================================================================
  // UTILITY HELPERS
  // =========================================================================

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private buildTenantFilter(organisationId: string, ownershipType?: string) {
    if (ownershipType === 'SYSTEM') {
      return { ownershipType: 'SYSTEM' as const };
    }
    if (ownershipType === 'ORGANISATION') {
      return { ownershipType: 'ORGANISATION' as const, organisationId };
    }
    return {
      OR: [
        { ownershipType: 'SYSTEM' },
        { organisationId },
      ],
    };
  }

  // =========================================================================
  // EXERCISE COLLECTIONS
  // =========================================================================

  async findCollections(
    organisationId: string,
    query: QueryExerciseCollectionsDto,
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const whereClause: any = {
      AND: [
        this.buildTenantFilter(organisationId, query.ownershipType),
        { contentStatus: 'PUBLISHED' },
      ],
    };

    if (query.category) {
      whereClause.AND.push({ category: query.category.toUpperCase() });
    }
    if (query.difficulty) {
      whereClause.AND.push({ difficulty: query.difficulty.toUpperCase() });
    }
    if (query.primaryMuscleGroup) {
      whereClause.AND.push({ primaryMuscleGroup: query.primaryMuscleGroup.toUpperCase() });
    }
    if (query.equipmentType) {
      whereClause.AND.push({ equipmentType: query.equipmentType.toUpperCase() });
    }
    if (query.featured !== undefined) {
      whereClause.AND.push({ featured: query.featured });
    }
    if (query.search) {
      const term = query.search.trim();
      whereClause.AND.push({
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
        ],
      });
    }

    const [total, collections] = await Promise.all([
      this.prisma.exerciseCollection.count({ where: whereClause }),
      this.prisma.exerciseCollection.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: {
          items: {
            take: 4,
            orderBy: { sortOrder: 'asc' },
            include: {
              exercise: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  exerciseType: true,
                  difficulty: true,
                  primaryMuscleGroup: true,
                  equipment: true,
                  media: {
                    take: 1,
                    where: { purpose: { in: ['PRIMARY_DEMONSTRATION', 'THUMBNAIL'] } },
                    select: { id: true, storageKey: true, mimeType: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const formatted = collections.map((col) => ({
      id: col.id,
      slug: col.slug,
      title: col.title,
      description: col.description,
      coverMediaUrl: col.coverMediaUrl,
      category: col.category,
      difficulty: col.difficulty,
      primaryMuscleGroup: col.primaryMuscleGroup,
      equipmentType: col.equipmentType,
      featured: col.featured,
      exerciseCount: col.exerciseCount,
      ownershipType: col.ownershipType,
      previewExercises: col.items.map((it) => ({
        id: it.exercise.id,
        name: it.customTitle || it.exercise.name,
        slug: it.exercise.slug,
        primaryMuscleGroup: it.exercise.primaryMuscleGroup,
        equipment: it.exercise.equipment,
        difficulty: it.exercise.difficulty,
      })),
      createdAt: col.createdAt,
      updatedAt: col.updatedAt,
    }));

    return {
      items: formatted,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findCollectionById(organisationId: string, idOrSlug: string) {
    const collection = await this.prisma.exerciseCollection.findFirst({
      where: {
        AND: [
          { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
          this.buildTenantFilter(organisationId),
        ],
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            exercise: {
              select: {
                id: true,
                name: true,
                slug: true,
                exerciseType: true,
                difficulty: true,
                primaryMuscleGroup: true,
                secondaryMuscleGroups: true,
                movementPattern: true,
                equipment: true,
                media: {
                  take: 2,
                  select: { id: true, storageKey: true, mimeType: true, purpose: true },
                },
              },
            },
          },
        },
      },
    });

    if (!collection) {
      throw new NotFoundException(`Exercise collection not found: ${idOrSlug}`);
    }

    return {
      id: collection.id,
      slug: collection.slug,
      title: collection.title,
      description: collection.description,
      coverMediaUrl: collection.coverMediaUrl,
      category: collection.category,
      difficulty: collection.difficulty,
      primaryMuscleGroup: collection.primaryMuscleGroup,
      equipmentType: collection.equipmentType,
      featured: collection.featured,
      contentStatus: collection.contentStatus,
      exerciseCount: collection.items.length,
      ownershipType: collection.ownershipType,
      items: collection.items.map((it) => ({
        id: it.id,
        exerciseId: it.exerciseId,
        sectionTitle: it.sectionTitle,
        sortOrder: it.sortOrder,
        customTitle: it.customTitle,
        learningObjective: it.learningObjective,
        notes: it.notes,
        exercise: {
          id: it.exercise.id,
          name: it.customTitle || it.exercise.name,
          slug: it.exercise.slug,
          difficulty: it.exercise.difficulty,
          primaryMuscleGroup: it.exercise.primaryMuscleGroup,
          secondaryMuscleGroups: it.exercise.secondaryMuscleGroups,
          movementPattern: it.exercise.movementPattern,
          equipment: it.exercise.equipment,
          mediaPreview: it.exercise.media[0] || null,
        },
      })),
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    };
  }

  async createCollection(
    organisationId: string,
    userId: string,
    dto: CreateExerciseCollectionDto,
    ownershipType: 'ORGANISATION' | 'TRAINER' = 'ORGANISATION',
  ) {
    const slugBase = dto.slug || this.slugify(dto.title);
    const existingSlug = await this.prisma.exerciseCollection.findFirst({
      where: { slug: slugBase },
    });
    const slug = existingSlug ? `${slugBase}-${Date.now().toString(36)}` : slugBase;

    const itemsInput = dto.items || [];

    const collection = await this.prisma.$transaction(async (tx) => {
      const created = await tx.exerciseCollection.create({
        data: {
          organisationId,
          createdById: userId,
          ownershipType,
          title: dto.title.trim(),
          slug,
          description: dto.description?.trim(),
          coverMediaUrl: dto.coverMediaUrl,
          category: dto.category ? dto.category.toUpperCase() : null,
          difficulty: dto.difficulty ? dto.difficulty.toUpperCase() : 'ALL_LEVELS',
          primaryMuscleGroup: dto.primaryMuscleGroup ? dto.primaryMuscleGroup.toUpperCase() : null,
          equipmentType: dto.equipmentType ? dto.equipmentType.toUpperCase() : null,
          contentStatus: 'PUBLISHED',
          featured: dto.featured ?? false,
          sortOrder: dto.sortOrder ?? 0,
          exerciseCount: itemsInput.length,
        },
      });

      if (itemsInput.length > 0) {
        await tx.exerciseCollectionItem.createMany({
          data: itemsInput.map((it, idx) => ({
            collectionId: created.id,
            exerciseId: it.exerciseId,
            sectionTitle: it.sectionTitle || null,
            sortOrder: it.sortOrder !== undefined ? it.sortOrder : idx,
            customTitle: it.customTitle || null,
            learningObjective: it.learningObjective || null,
            notes: it.notes || null,
          })),
        });
      }

      return created;
    });

    await this.auditService.log({
      organisationId,
      userId,
      action: 'COLLECTION_CREATED',
      resource: 'exercise_collections',
      resourceId: collection.id,
      metadata: { title: collection.title, slug: collection.slug, itemCount: itemsInput.length },
    });

    return this.findCollectionById(organisationId, collection.id);
  }

  async updateCollection(
    organisationId: string,
    userId: string,
    collectionId: string,
    dto: UpdateExerciseCollectionDto,
  ) {
    const existing = await this.prisma.exerciseCollection.findUnique({
      where: { id: collectionId },
    });

    if (!existing) {
      throw new NotFoundException(`Exercise collection not found: ${collectionId}`);
    }

    if (existing.ownershipType === 'SYSTEM') {
      throw new ForbiddenException('Cannot modify system exercise collections directly');
    }

    if (existing.organisationId !== organisationId) {
      throw new ForbiddenException('Cross-tenant modification forbidden');
    }

    const updated = await this.prisma.exerciseCollection.update({
      where: { id: collectionId },
      data: {
        title: dto.title ? dto.title.trim() : undefined,
        slug: dto.slug ? this.slugify(dto.slug) : undefined,
        description: dto.description !== undefined ? dto.description?.trim() : undefined,
        coverMediaUrl: dto.coverMediaUrl !== undefined ? dto.coverMediaUrl : undefined,
        category: dto.category ? dto.category.toUpperCase() : undefined,
        difficulty: dto.difficulty ? dto.difficulty.toUpperCase() : undefined,
        primaryMuscleGroup: dto.primaryMuscleGroup ? dto.primaryMuscleGroup.toUpperCase() : undefined,
        equipmentType: dto.equipmentType ? dto.equipmentType.toUpperCase() : undefined,
        featured: dto.featured !== undefined ? dto.featured : undefined,
        sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : undefined,
        contentStatus: dto.contentStatus ? dto.contentStatus.toUpperCase() : undefined,
      },
    });

    await this.auditService.log({
      organisationId,
      userId,
      action: 'COLLECTION_UPDATED',
      resource: 'exercise_collections',
      resourceId: collectionId,
      metadata: { title: updated.title, contentStatus: updated.contentStatus },
    });

    return this.findCollectionById(organisationId, collectionId);
  }

  async setCollectionItems(
    organisationId: string,
    userId: string,
    collectionId: string,
    dto: SetCollectionItemsDto,
  ) {
    const existing = await this.prisma.exerciseCollection.findUnique({
      where: { id: collectionId },
    });

    if (!existing) {
      throw new NotFoundException(`Exercise collection not found: ${collectionId}`);
    }

    if (existing.ownershipType === 'SYSTEM') {
      throw new ForbiddenException('Cannot modify system exercise collections');
    }

    if (existing.organisationId !== organisationId) {
      throw new ForbiddenException('Cross-tenant modification forbidden');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.exerciseCollectionItem.deleteMany({
        where: { collectionId },
      });

      if (dto.items.length > 0) {
        await tx.exerciseCollectionItem.createMany({
          data: dto.items.map((it, idx) => ({
            collectionId,
            exerciseId: it.exerciseId,
            sectionTitle: it.sectionTitle || null,
            sortOrder: it.sortOrder !== undefined ? it.sortOrder : idx,
            customTitle: it.customTitle || null,
            learningObjective: it.learningObjective || null,
            notes: it.notes || null,
          })),
        });
      }

      await tx.exerciseCollection.update({
        where: { id: collectionId },
        data: { exerciseCount: dto.items.length },
      });
    });

    return this.findCollectionById(organisationId, collectionId);
  }

  // =========================================================================
  // GUIDED LEARNING PATHS
  // =========================================================================

  async findLearningPaths(
    organisationId: string,
    userId: string,
    query: QueryLearningPathsDto,
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const whereClause: any = {
      AND: [
        this.buildTenantFilter(organisationId),
        { contentStatus: 'PUBLISHED' },
      ],
    };

    if (query.category) {
      whereClause.AND.push({ category: query.category.toUpperCase() });
    }
    if (query.difficulty) {
      whereClause.AND.push({ difficulty: query.difficulty.toUpperCase() });
    }
    if (query.primaryGoal) {
      whereClause.AND.push({ primaryGoal: query.primaryGoal.toUpperCase() });
    }
    if (query.featured !== undefined) {
      whereClause.AND.push({ featured: query.featured });
    }
    if (query.search) {
      const term = query.search.trim();
      whereClause.AND.push({
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
        ],
      });
    }

    const [total, paths] = await Promise.all([
      this.prisma.learningPath.count({ where: whereClause }),
      this.prisma.learningPath.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: {
          userProgress: {
            where: { userId },
            take: 1,
          },
          lessons: {
            take: 3,
            orderBy: { sortOrder: 'asc' },
            select: { id: true, title: true, lessonType: true, estimatedMinutes: true },
          },
        },
      }),
    ]);

    let formatted = paths.map((p) => {
      const userProg = p.userProgress[0] || null;
      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        description: p.description,
        coverMediaUrl: p.coverMediaUrl,
        category: p.category,
        difficulty: p.difficulty,
        primaryGoal: p.primaryGoal,
        estimatedDurationMinutes: p.estimatedDurationMinutes,
        featured: p.featured,
        lessonCount: p.lessonCount,
        exerciseCount: p.exerciseCount,
        ownershipType: p.ownershipType,
        previewLessons: p.lessons,
        progress: userProg
          ? {
              status: userProg.status,
              completedLessons: userProg.completedLessons,
              totalLessons: userProg.totalLessons,
              percentComplete: userProg.percentComplete,
              currentLessonId: userProg.currentLessonId,
              completedAt: userProg.completedAt,
              lastInteractedAt: userProg.lastInteractedAt,
            }
          : {
              status: 'NOT_STARTED',
              completedLessons: 0,
              totalLessons: p.lessonCount,
              percentComplete: 0,
              currentLessonId: p.lessons[0]?.id || null,
              completedAt: null,
              lastInteractedAt: null,
            },
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    if (query.progressStatus) {
      const filterStatus = query.progressStatus.toUpperCase();
      formatted = formatted.filter((p) => p.progress.status === filterStatus);
    }

    return {
      items: formatted,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findLearningPathById(organisationId: string, userId: string, idOrSlug: string) {
    const path = await this.prisma.learningPath.findFirst({
      where: {
        AND: [
          { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
          this.buildTenantFilter(organisationId),
        ],
      },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: {
              orderBy: { sortOrder: 'asc' },
              include: {
                exercise: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    difficulty: true,
                    primaryMuscleGroup: true,
                    equipment: true,
                  },
                },
              },
            },
          },
        },
        lessons: {
          orderBy: { sortOrder: 'asc' },
          include: {
            exercise: {
              select: {
                id: true,
                name: true,
                slug: true,
                difficulty: true,
                primaryMuscleGroup: true,
                equipment: true,
              },
            },
          },
        },
        userProgress: {
          where: { userId },
          take: 1,
        },
        lessonCompletions: {
          where: { userId },
          select: { lessonId: true, completedAt: true },
        },
      },
    });

    if (!path) {
      throw new NotFoundException(`Learning path not found: ${idOrSlug}`);
    }

    const completedLessonIdMap = new Map<string, Date>();
    path.lessonCompletions.forEach((c) => {
      completedLessonIdMap.set(c.lessonId, c.completedAt);
    });

    // Map all lessons in flat order
    const allLessons = path.lessons.map((l) => ({
      id: l.id,
      sectionId: l.sectionId,
      title: l.title,
      description: l.description,
      sortOrder: l.sortOrder,
      lessonType: l.lessonType,
      exerciseId: l.exerciseId,
      mediaUrl: l.mediaUrl,
      learningObjective: l.learningObjective,
      keyTakeaways: l.keyTakeaways,
      estimatedMinutes: l.estimatedMinutes,
      isRequired: l.isRequired,
      exercise: l.exercise,
      isCompleted: completedLessonIdMap.has(l.id),
      completedAt: completedLessonIdMap.get(l.id) || null,
    }));

    // Find next uncompleted lesson
    const nextUncompletedLesson = allLessons.find((l) => !l.isCompleted && l.isRequired) || allLessons[0];

    // Build structured sections
    const structuredSections = path.sections.map((sec) => ({
      id: sec.id,
      title: sec.title,
      description: sec.description,
      sortOrder: sec.sortOrder,
      lessons: sec.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        sortOrder: l.sortOrder,
        lessonType: l.lessonType,
        exerciseId: l.exerciseId,
        mediaUrl: l.mediaUrl,
        learningObjective: l.learningObjective,
        keyTakeaways: l.keyTakeaways,
        estimatedMinutes: l.estimatedMinutes,
        isRequired: l.isRequired,
        exercise: l.exercise,
        isCompleted: completedLessonIdMap.has(l.id),
        completedAt: completedLessonIdMap.get(l.id) || null,
      })),
    }));

    const userProg = path.userProgress[0] || null;

    return {
      id: path.id,
      slug: path.slug,
      title: path.title,
      description: path.description,
      coverMediaUrl: path.coverMediaUrl,
      category: path.category,
      difficulty: path.difficulty,
      primaryGoal: path.primaryGoal,
      estimatedDurationMinutes: path.estimatedDurationMinutes,
      featured: path.featured,
      contentStatus: path.contentStatus,
      lessonCount: allLessons.length,
      exerciseCount: path.exerciseCount,
      ownershipType: path.ownershipType,
      nextLessonId: nextUncompletedLesson?.id || null,
      progress: userProg
        ? {
            status: userProg.status,
            completedLessons: userProg.completedLessons,
            totalLessons: userProg.totalLessons,
            percentComplete: userProg.percentComplete,
            currentLessonId: userProg.currentLessonId || nextUncompletedLesson?.id || null,
            completedAt: userProg.completedAt,
            lastInteractedAt: userProg.lastInteractedAt,
          }
        : {
            status: 'NOT_STARTED',
            completedLessons: 0,
            totalLessons: allLessons.length,
            percentComplete: 0,
            currentLessonId: nextUncompletedLesson?.id || null,
            completedAt: null,
            lastInteractedAt: null,
          },
      sections: structuredSections,
      lessons: allLessons,
      createdAt: path.createdAt,
      updatedAt: path.updatedAt,
    };
  }

  async createLearningPath(
    organisationId: string,
    userId: string,
    dto: CreateLearningPathDto,
    ownershipType: 'ORGANISATION' | 'TRAINER' = 'ORGANISATION',
  ) {
    const slugBase = dto.slug || this.slugify(dto.title);
    const existingSlug = await this.prisma.learningPath.findFirst({
      where: { slug: slugBase },
    });
    const slug = existingSlug ? `${slugBase}-${Date.now().toString(36)}` : slugBase;

    const sectionsInput = dto.sections || [];
    const directLessonsInput = dto.lessons || [];

    // Calculate total lessons and exercises
    let totalLessons = directLessonsInput.length;
    sectionsInput.forEach((s) => {
      totalLessons += s.lessons ? s.lessons.length : 0;
    });

    const uniqueExerciseIds = new Set<string>();
    directLessonsInput.forEach((l) => {
      if (l.exerciseId) uniqueExerciseIds.add(l.exerciseId);
    });
    sectionsInput.forEach((s) => {
      s.lessons?.forEach((l) => {
        if (l.exerciseId) uniqueExerciseIds.add(l.exerciseId);
      });
    });

    const createdPath = await this.prisma.$transaction(async (tx) => {
      const path = await tx.learningPath.create({
        data: {
          organisationId,
          createdById: userId,
          ownershipType,
          title: dto.title.trim(),
          slug,
          description: dto.description?.trim(),
          coverMediaUrl: dto.coverMediaUrl,
          category: dto.category ? dto.category.toUpperCase() : null,
          difficulty: dto.difficulty ? dto.difficulty.toUpperCase() : 'BEGINNER',
          primaryGoal: dto.primaryGoal ? dto.primaryGoal.toUpperCase() : 'TECHNIQUE',
          estimatedDurationMinutes: dto.estimatedDurationMinutes ?? 30,
          contentStatus: 'PUBLISHED',
          featured: dto.featured ?? false,
          sortOrder: dto.sortOrder ?? 0,
          lessonCount: totalLessons,
          exerciseCount: uniqueExerciseIds.size,
        },
      });

      // Insert sections and their nested lessons
      let globalSortOrder = 0;
      for (let secIdx = 0; secIdx < sectionsInput.length; secIdx++) {
        const sec = sectionsInput[secIdx];
        const createdSection = await tx.learningPathSection.create({
          data: {
            pathId: path.id,
            title: sec.title.trim(),
            description: sec.description?.trim(),
            sortOrder: sec.sortOrder !== undefined ? sec.sortOrder : secIdx,
          },
        });

        if (sec.lessons && sec.lessons.length > 0) {
          for (let lIdx = 0; lIdx < sec.lessons.length; lIdx++) {
            const l = sec.lessons[lIdx];
            await tx.learningPathLesson.create({
              data: {
                pathId: path.id,
                sectionId: createdSection.id,
                title: l.title.trim(),
                description: l.description?.trim(),
                sortOrder: l.sortOrder !== undefined ? l.sortOrder : globalSortOrder++,
                lessonType: l.lessonType ? l.lessonType.toUpperCase() : 'EXERCISE_LESSON',
                exerciseId: l.exerciseId || null,
                mediaUrl: l.mediaUrl || null,
                learningObjective: l.learningObjective || null,
                content: l.content || null,
                contentBlocks: l.contentBlocks ? (l.contentBlocks as any) : undefined,
                keyTakeaways: l.keyTakeaways || [],
                estimatedMinutes: l.estimatedMinutes ?? 5,
                isRequired: l.isRequired ?? true,
              },
            });
          }
        }
      }

      // Insert direct lessons
      for (let lIdx = 0; lIdx < directLessonsInput.length; lIdx++) {
        const l = directLessonsInput[lIdx];
        await tx.learningPathLesson.create({
          data: {
            pathId: path.id,
            sectionId: l.sectionId || null,
            title: l.title.trim(),
            description: l.description?.trim(),
            sortOrder: l.sortOrder !== undefined ? l.sortOrder : globalSortOrder++,
            lessonType: l.lessonType ? l.lessonType.toUpperCase() : 'EXERCISE_LESSON',
            exerciseId: l.exerciseId || null,
            mediaUrl: l.mediaUrl || null,
            learningObjective: l.learningObjective || null,
            content: l.content || null,
            contentBlocks: l.contentBlocks ? (l.contentBlocks as any) : undefined,
            keyTakeaways: l.keyTakeaways || [],
            estimatedMinutes: l.estimatedMinutes ?? 5,
            isRequired: l.isRequired ?? true,
          },
        });
      }

      return path;
    });

    await this.auditService.log({
      organisationId,
      userId,
      action: 'LEARNING_PATH_CREATED',
      resource: 'learning_paths',
      resourceId: createdPath.id,
      metadata: { title: createdPath.title, slug: createdPath.slug, lessonCount: totalLessons },
    });

    return this.findLearningPathById(organisationId, userId, createdPath.id);
  }

  async updateLearningPath(
    organisationId: string,
    userId: string,
    pathId: string,
    dto: UpdateLearningPathDto,
  ) {
    const existing = await this.prisma.learningPath.findUnique({
      where: { id: pathId },
    });

    if (!existing) {
      throw new NotFoundException(`Learning path not found: ${pathId}`);
    }

    if (existing.ownershipType === 'SYSTEM') {
      throw new ForbiddenException('Cannot modify system learning paths directly');
    }

    if (existing.organisationId !== organisationId) {
      throw new ForbiddenException('Cross-tenant modification forbidden');
    }

    const updated = await this.prisma.learningPath.update({
      where: { id: pathId },
      data: {
        title: dto.title ? dto.title.trim() : undefined,
        slug: dto.slug ? this.slugify(dto.slug) : undefined,
        description: dto.description !== undefined ? dto.description?.trim() : undefined,
        coverMediaUrl: dto.coverMediaUrl !== undefined ? dto.coverMediaUrl : undefined,
        category: dto.category ? dto.category.toUpperCase() : undefined,
        difficulty: dto.difficulty ? dto.difficulty.toUpperCase() : undefined,
        primaryGoal: dto.primaryGoal ? dto.primaryGoal.toUpperCase() : undefined,
        estimatedDurationMinutes: dto.estimatedDurationMinutes !== undefined ? dto.estimatedDurationMinutes : undefined,
        featured: dto.featured !== undefined ? dto.featured : undefined,
        sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : undefined,
        contentStatus: dto.contentStatus ? dto.contentStatus.toUpperCase() : undefined,
      },
    });

    await this.auditService.log({
      organisationId,
      userId,
      action: 'LEARNING_PATH_UPDATED',
      resource: 'learning_paths',
      resourceId: pathId,
      metadata: { title: updated.title, contentStatus: updated.contentStatus },
    });

    return this.findLearningPathById(organisationId, userId, pathId);
  }

  async getLesson(
    organisationId: string,
    userId: string,
    pathId: string,
    lessonId: string,
  ) {
    const path = await this.prisma.learningPath.findFirst({
      where: {
        id: pathId,
        ...this.buildTenantFilter(organisationId),
      },
      select: { id: true, title: true, slug: true },
    });

    if (!path) {
      throw new NotFoundException(`Learning path not found: ${pathId}`);
    }

    const allLessons = await this.prisma.learningPathLesson.findMany({
      where: { pathId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, title: true, sortOrder: true },
    });

    const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
    if (currentIndex === -1) {
      throw new NotFoundException(`Lesson not found: ${lessonId} in path: ${pathId}`);
    }

    const lesson = await this.prisma.learningPathLesson.findUnique({
      where: { id: lessonId },
      include: {
        exercise: {
          select: {
            id: true,
            name: true,
            slug: true,
            difficulty: true,
            primaryMuscleGroup: true,
            equipment: true,
            media: {
              take: 3,
              select: { id: true, storageKey: true, mimeType: true, purpose: true },
            },
            instructionSteps: {
              orderBy: { stepNumber: 'asc' },
              select: { stepNumber: true, title: true, description: true },
            },
            movementPhases: {
              orderBy: { orderIndex: 'asc' },
              select: { phaseName: true, description: true, cueText: true },
            },
            commonMistakes: {
              select: { mistake: true, correction: true },
            },
          },
        },
        section: {
          select: { id: true, title: true, description: true },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson not found: ${lessonId} in path: ${pathId}`);
    }

    const completion = await this.prisma.userLessonCompletion.findUnique({
      where: {
        userId_lessonId: { userId, lessonId },
      },
    });

    const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
    const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

    return {
      id: lesson.id,
      pathId: lesson.pathId,
      pathTitle: path.title,
      section: lesson.section,
      title: lesson.title,
      description: lesson.description,
      sortOrder: lesson.sortOrder,
      lessonType: lesson.lessonType,
      mediaUrl: lesson.mediaUrl,
      learningObjective: lesson.learningObjective,
      content: lesson.content,
      keyTakeaways: lesson.keyTakeaways,
      estimatedMinutes: lesson.estimatedMinutes,
      isRequired: lesson.isRequired,
      isCompleted: !!completion,
      completedAt: completion?.completedAt || null,
      previousLessonId: prevLesson?.id || null,
      nextLessonId: nextLesson?.id || null,
      exercise: lesson.exercise,
      position: {
        current: currentIndex + 1,
        total: allLessons.length,
      },
    };
  }

  async completeLesson(
    organisationId: string,
    userId: string,
    pathId: string,
    lessonId: string,
    dto?: CompleteLessonDto,
  ) {
    const lesson = await this.prisma.learningPathLesson.findFirst({
      where: {
        id: lessonId,
        pathId,
        path: this.buildTenantFilter(organisationId),
      },
      include: { path: true },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson not found: ${lessonId} for path: ${pathId}`);
    }

    // 1. Record completion record (idempotent upsert)
    await this.prisma.userLessonCompletion.upsert({
      where: {
        userId_lessonId: { userId, lessonId },
      },
      update: {
        completedAt: new Date(),
      },
      create: {
        userId,
        pathId,
        lessonId,
        completedAt: new Date(),
      },
    });

    // 2. Recalculate progress across the entire path
    const allLessons = await this.prisma.learningPathLesson.findMany({
      where: { pathId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, isRequired: true },
    });

    const userCompletions = await this.prisma.userLessonCompletion.findMany({
      where: { userId, pathId },
      select: { lessonId: true },
    });

    const completedLessonIds = new Set(userCompletions.map((c) => c.lessonId));

    const totalLessons = allLessons.length;
    const completedLessonsCount = allLessons.filter((l) => completedLessonIds.has(l.id)).length;
    const requiredLessons = allLessons.filter((l) => l.isRequired);
    const requiredCompleted = requiredLessons.filter((l) => completedLessonIds.has(l.id)).length;

    const isAllRequiredDone = requiredLessons.length > 0
      ? requiredCompleted >= requiredLessons.length
      : completedLessonsCount >= totalLessons;

    const percentComplete = totalLessons > 0
      ? Math.round((completedLessonsCount / totalLessons) * 100)
      : 100;

    // Find next uncompleted lesson
    const nextUncompleted = allLessons.find((l) => !completedLessonIds.has(l.id));
    const nextLessonId = nextUncompleted ? nextUncompleted.id : null;

    const status = isAllRequiredDone ? 'COMPLETED' : 'IN_PROGRESS';
    const now = new Date();

    const progressRecord = await this.prisma.userLearningPathProgress.upsert({
      where: {
        userId_pathId: { userId, pathId },
      },
      update: {
        status,
        completedLessons: completedLessonsCount,
        totalLessons,
        percentComplete,
        currentLessonId: nextLessonId || lessonId,
        completedAt: status === 'COMPLETED' ? now : undefined,
        lastInteractedAt: now,
      },
      create: {
        userId,
        pathId,
        organisationId,
        status,
        completedLessons: completedLessonsCount,
        totalLessons,
        percentComplete,
        currentLessonId: nextLessonId || lessonId,
        completedAt: status === 'COMPLETED' ? now : null,
        lastInteractedAt: now,
      },
    });

    // NOTE: Keep Learning strictly separate from Workouts.
    // We intentionally DO NOT mark workouts complete or log reps/sets.

    return {
      success: true,
      lessonId,
      pathId,
      pathProgress: {
        status: progressRecord.status,
        completedLessons: progressRecord.completedLessons,
        totalLessons: progressRecord.totalLessons,
        percentComplete: progressRecord.percentComplete,
        currentLessonId: progressRecord.currentLessonId,
        completedAt: progressRecord.completedAt,
      },
      nextLessonId,
    };
  }

  async resetPathProgress(
    organisationId: string,
    userId: string,
    pathId: string,
  ) {
    const path = await this.prisma.learningPath.findFirst({
      where: {
        id: pathId,
        ...this.buildTenantFilter(organisationId),
      },
      include: {
        lessons: {
          take: 1,
          orderBy: { sortOrder: 'asc' },
          select: { id: true },
        },
      },
    });

    if (!path) {
      throw new NotFoundException(`Learning path not found: ${pathId}`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userLessonCompletion.deleteMany({
        where: { userId, pathId },
      });

      await tx.userLearningPathProgress.deleteMany({
        where: { userId, pathId },
      });
    });

    return {
      success: true,
      message: 'Learning path progress reset successfully',
      pathId,
      status: 'NOT_STARTED',
      currentLessonId: path.lessons[0]?.id || null,
    };
  }

  async assignLearningPath(
    organisationId: string,
    trainerUserId: string,
    pathId: string,
    dto: AssignLearningPathDto,
  ) {
    const [path, trainerProfile, memberProfile] = await Promise.all([
      this.prisma.learningPath.findFirst({
        where: {
          id: pathId,
          ...this.buildTenantFilter(organisationId),
        },
      }),
      this.prisma.trainerProfile.findFirst({
        where: {
          organisationId,
          staffProfile: { userId: trainerUserId },
        },
      }),
      this.prisma.memberProfile.findFirst({
        where: { id: dto.memberProfileId, organisationId },
      }),
    ]);

    if (!path) {
      throw new NotFoundException(`Learning path not found: ${pathId}`);
    }
    if (!trainerProfile) {
      throw new ForbiddenException('Authenticated user does not have an active trainer profile');
    }
    if (!memberProfile) {
      throw new NotFoundException(`Member profile not found in organisation: ${dto.memberProfileId}`);
    }

    const assignment = await this.prisma.trainerLearningPathAssignment.create({
      data: {
        organisationId,
        trainerProfileId: trainerProfile.id,
        memberProfileId: memberProfile.id,
        pathId,
        notes: dto.notes?.trim() || null,
        status: 'ASSIGNED',
      },
    });

    await this.auditService.log({
      organisationId,
      userId: trainerUserId,
      action: 'LEARNING_PATH_ASSIGNED',
      resource: 'trainer_learning_path_assignments',
      resourceId: assignment.id,
      metadata: {
        pathId,
        trainerProfileId: trainerProfile.id,
        memberProfileId: memberProfile.id,
      },
    });

    return assignment;
  }

  // =========================================================================
  // CROSS-LINKING: Exercise -> Collections & Learning Paths
  // =========================================================================

  async getRelatedCollectionsAndPathsForExercise(
    organisationId: string,
    exerciseId: string,
    userId?: string,
  ) {
    const exercise = await this.prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        OR: [
          { ownershipType: 'SYSTEM' },
          { organisationId },
        ],
      },
      select: { id: true, name: true, slug: true },
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise not found: ${exerciseId}`);
    }

    const [collections, paths] = await Promise.all([
      this.prisma.exerciseCollection.findMany({
        where: {
          ...this.buildTenantFilter(organisationId),
          contentStatus: 'PUBLISHED',
          items: {
            some: { exerciseId },
          },
        },
        take: 5,
        orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          coverMediaUrl: true,
          category: true,
          difficulty: true,
          exerciseCount: true,
        },
      }),
      this.prisma.learningPath.findMany({
        where: {
          ...this.buildTenantFilter(organisationId),
          contentStatus: 'PUBLISHED',
          lessons: {
            some: { exerciseId },
          },
        },
        take: 5,
        orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          coverMediaUrl: true,
          category: true,
          difficulty: true,
          lessonCount: true,
          estimatedDurationMinutes: true,
          userProgress: userId
            ? {
                where: { userId },
                take: 1,
                select: { status: true, percentComplete: true },
              }
            : false,
        },
      }),
    ]);

    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      exerciseSlug: exercise.slug,
      collections: collections.map((col) => ({
        id: col.id,
        slug: col.slug,
        title: col.title,
        description: col.description,
        coverMediaUrl: col.coverMediaUrl,
        category: col.category,
        difficulty: col.difficulty,
        exerciseCount: col.exerciseCount,
      })),
      learningPaths: paths.map((p) => {
        const userProg = (p as any).userProgress?.[0] || null;
        return {
          id: p.id,
          slug: p.slug,
          title: p.title,
          description: p.description,
          coverMediaUrl: p.coverMediaUrl,
          category: p.category,
          difficulty: p.difficulty,
          lessonCount: p.lessonCount,
          estimatedDurationMinutes: p.estimatedDurationMinutes,
          progress: userProg
            ? {
                status: userProg.status,
                percentComplete: userProg.percentComplete,
              }
            : null,
        };
      }),
    };
  }
}
