import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LearningDashboardService } from './learning-dashboard.service';
import {
  CreateCurriculumDto,
  UpdateCurriculumDto,
  CurriculumQueryDto,
  CreateGlossaryTermDto,
  UpdateGlossaryTermDto,
  GlossaryQueryDto,
  CURRICULUM_CATEGORIES,
  CurriculumCategoryType,
} from '../dto/academy.dto';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class AcademyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly learningDashboardService: LearningDashboardService,
  ) {}

  // ==========================================
  // 1. FITNESS ACADEMY LANDING & OVERVIEW
  // ==========================================

  async getAcademyOverview(organisationId: string, userId: string) {
    // 1. Continue Learning position (if any)
    const resumePosition = await this.learningDashboardService.getResumeLearningPosition(
      organisationId,
      userId,
    );

    // 2. Categories breakdown with counts
    const categoryCounts = await this.getCategoriesWithCounts(organisationId);

    // 3. Featured / Primary Curricula
    const curricula = await this.prisma.curriculum.findMany({
      where: {
        OR: [{ organisationId }, { ownershipType: 'SYSTEM' }],
        contentStatus: 'PUBLISHED',
      },
      include: {
        learningPaths: {
          where: { contentStatus: 'PUBLISHED' },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            coverMediaUrl: true,
            category: true,
            difficulty: true,
            estimatedDurationMinutes: true,
            lessonCount: true,
            exerciseCount: true,
            sortOrder: true,
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    // 4. Fetch member's completed lessons to compute progress
    const userCompletions = await this.prisma.userLessonCompletion.findMany({
      where: { userId },
      select: { lessonId: true, pathId: true },
    });
    const completedLessonIds = new Set(userCompletions.map((c: any) => c.lessonId));

    // Enrich curricula with member progress
    const enrichedCurricula = curricula.map((curriculum: any) => {
      let totalLessonsInCurriculum = 0;
      let completedLessonsInCurriculum = 0;

      const enrichedPaths = curriculum.learningPaths.map((p: any) => {
        const completedInPath = userCompletions.filter((c: any) => c.pathId === p.id).length;
        totalLessonsInCurriculum += p.lessonCount;
        completedLessonsInCurriculum += completedInPath;

        return {
          ...p,
          completedLessons: completedInPath,
          percentComplete:
            p.lessonCount > 0 ? Math.min(100, Math.round((completedInPath / p.lessonCount) * 100)) : 0,
        };
      });

      const percentComplete =
        totalLessonsInCurriculum > 0
          ? Math.min(100, Math.round((completedLessonsInCurriculum / totalLessonsInCurriculum) * 100))
          : 0;

      return {
        id: curriculum.id,
        title: curriculum.title,
        slug: curriculum.slug,
        description: curriculum.description,
        category: curriculum.category,
        difficulty: curriculum.difficulty,
        iconName: curriculum.iconName,
        coverMediaUrl: curriculum.coverMediaUrl,
        pathCount: curriculum.learningPaths.length,
        totalLessons: totalLessonsInCurriculum,
        completedLessons: completedLessonsInCurriculum,
        percentComplete,
        learningPaths: enrichedPaths,
      };
    });

    // 5. Featured Glossary Terms Preview
    const glossaryPreview = await this.prisma.glossaryTerm.findMany({
      where: {
        OR: [{ organisationId }, { isSystem: true }],
      },
      orderBy: { sortOrder: 'asc' },
      take: 6,
      select: {
        id: true,
        term: true,
        slug: true,
        definition: true,
        category: true,
        difficulty: true,
      },
    });

    return {
      resumePosition,
      categories: categoryCounts,
      curricula: enrichedCurricula,
      glossaryHighlights: glossaryPreview,
    };
  }

  // ==========================================
  // 2. CURRICULUM DISCOVERY & DETAILS
  // ==========================================

  async getCurricula(organisationId: string, userId: string, query: CurriculumQueryDto) {
    const { search, category, difficulty, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [{ organisationId }, { ownershipType: 'SYSTEM' }],
      contentStatus: 'PUBLISHED',
    };

    if (category) {
      where.category = category;
    }
    if (difficulty) {
      where.difficulty = difficulty;
    }
    if (search) {
      where.AND = [
        {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.curriculum.count({ where }),
      this.prisma.curriculum.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: {
          learningPaths: {
            where: { contentStatus: 'PUBLISHED' },
            select: {
              id: true,
              title: true,
              lessonCount: true,
              estimatedDurationMinutes: true,
            },
          },
        },
      }),
    ]);

    // Member progress calculation
    const userCompletions = await this.prisma.userLessonCompletion.findMany({
      where: { userId },
      select: { lessonId: true, pathId: true },
    });

    const enrichedItems = items.map((c: any) => {
      const pathIds = c.learningPaths.map((p: any) => p.id);
      const totalLessons = c.learningPaths.reduce((acc: number, p: any) => acc + p.lessonCount, 0);
      const completedLessons = userCompletions.filter((uc: any) => pathIds.includes(uc.pathId)).length;
      const percentComplete =
        totalLessons > 0 ? Math.min(100, Math.round((completedLessons / totalLessons) * 100)) : 0;

      return {
        id: c.id,
        title: c.title,
        slug: c.slug,
        description: c.description,
        category: c.category,
        difficulty: c.difficulty,
        iconName: c.iconName,
        coverMediaUrl: c.coverMediaUrl,
        pathCount: c.learningPaths.length,
        totalLessons,
        completedLessons,
        percentComplete,
        pathsPreview: c.learningPaths.map((p: any) => ({
          id: p.id,
          title: p.title,
          lessonCount: p.lessonCount,
          estimatedDurationMinutes: p.estimatedDurationMinutes,
        })),
      };
    });

    return {
      items: enrichedItems,
      pagination: {
        page,
        limit,
        totalCount: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCurriculumById(organisationId: string, userId: string, idOrSlug: string) {
    const curriculum = await this.prisma.curriculum.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        AND: [
          {
            OR: [{ organisationId }, { ownershipType: 'SYSTEM' }],
          },
        ],
      },
      include: {
        learningPaths: {
          where: { contentStatus: 'PUBLISHED' },
          orderBy: { sortOrder: 'asc' },
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
                        primaryMuscleGroup: true,
                        equipment: true,
                        difficulty: true,
                      },
                    },
                    knowledgeChecks: {
                      where: { contentStatus: 'PUBLISHED' },
                      select: {
                        id: true,
                        title: true,
                        passingScore: true,
                        questionCount: true,
                        isRequiredForLesson: true,
                      },
                    },
                  },
                },
              },
            },
            lessons: {
              where: { sectionId: null },
              orderBy: { sortOrder: 'asc' },
              include: {
                exercise: {
                  select: {
                    id: true,
                    name: true,
                    primaryMuscleGroup: true,
                    equipment: true,
                    difficulty: true,
                  },
                },
                knowledgeChecks: {
                  where: { contentStatus: 'PUBLISHED' },
                  select: {
                    id: true,
                    title: true,
                    passingScore: true,
                    questionCount: true,
                    isRequiredForLesson: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!curriculum) {
      throw new NotFoundException(`Curriculum '${idOrSlug}' not found`);
    }

    // Member progress data
    const userCompletions = await this.prisma.userLessonCompletion.findMany({
      where: { userId },
      select: { lessonId: true, pathId: true, completedAt: true },
    });
    const completedLessonMap = new Map(
      userCompletions.map((c: any) => [c.lessonId, c.completedAt]),
    );

    let totalCurriculumLessons = 0;
    let completedCurriculumLessons = 0;

    const enrichedPaths = curriculum.learningPaths.map((path: any) => {
      // Flatten all lessons in sections + unsectioned
      const allLessons = [
        ...path.sections.flatMap((s: any) => s.lessons),
        ...path.lessons,
      ];

      const completedInPath = allLessons.filter((l: any) => completedLessonMap.has(l.id)).length;
      totalCurriculumLessons += allLessons.length;
      completedCurriculumLessons += completedInPath;

      const enrichLesson = (lesson: any) => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        lessonType: lesson.lessonType,
        estimatedMinutes: lesson.estimatedMinutes,
        sortOrder: lesson.sortOrder,
        isCompleted: completedLessonMap.has(lesson.id),
        completedAt: completedLessonMap.get(lesson.id) || null,
        exercise: lesson.exercise,
        knowledgeCheck: lesson.knowledgeChecks[0] || null,
      });

      return {
        id: path.id,
        title: path.title,
        slug: path.slug,
        description: path.description,
        coverMediaUrl: path.coverMediaUrl,
        category: path.category,
        difficulty: path.difficulty,
        primaryGoal: path.primaryGoal,
        estimatedDurationMinutes: path.estimatedDurationMinutes,
        lessonCount: allLessons.length,
        completedLessons: completedInPath,
        percentComplete:
          allLessons.length > 0
            ? Math.min(100, Math.round((completedInPath / allLessons.length) * 100))
            : 0,
        sections: path.sections.map((sec: any) => ({
          id: sec.id,
          title: sec.title,
          description: sec.description,
          lessons: sec.lessons.map(enrichLesson),
        })),
        unsectionedLessons: path.lessons.map(enrichLesson),
      };
    });

    const percentComplete =
      totalCurriculumLessons > 0
        ? Math.min(100, Math.round((completedCurriculumLessons / totalCurriculumLessons) * 100))
        : 0;

    return {
      id: curriculum.id,
      title: curriculum.title,
      slug: curriculum.slug,
      description: curriculum.description,
      category: curriculum.category,
      difficulty: curriculum.difficulty,
      iconName: curriculum.iconName,
      coverMediaUrl: curriculum.coverMediaUrl,
      pathCount: curriculum.learningPaths.length,
      totalLessons: totalCurriculumLessons,
      completedLessons: completedCurriculumLessons,
      percentComplete,
      learningPaths: enrichedPaths,
    };
  }

  // ==========================================
  // 3. CURRICULUM CATEGORIES TAXONOMY
  // ==========================================

  async getCategoriesWithCounts(organisationId: string) {
    const rawCounts = await this.prisma.curriculum.groupBy({
      by: ['category'],
      where: {
        OR: [{ organisationId }, { ownershipType: 'SYSTEM' }],
        contentStatus: 'PUBLISHED',
      },
      _count: { id: true },
    });

    const countsMap = new Map(rawCounts.map((rc: any) => [rc.category, rc._count.id]));

    return CURRICULUM_CATEGORIES.map((cat) => ({
      category: cat,
      label: formatCategoryLabel(cat),
      count: countsMap.get(cat) || 0,
    }));
  }

  // ==========================================
  // 4. FITNESS TERMINOLOGY GLOSSARY
  // ==========================================

  async getGlossaryTerms(organisationId: string, query: GlossaryQueryDto) {
    const { search, category, letter, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [{ organisationId }, { isSystem: true }],
    };

    if (category) {
      where.category = category;
    }
    if (letter) {
      where.term = {
        startsWith: letter.toUpperCase(),
        mode: 'insensitive',
      };
    }
    if (search) {
      where.AND = [
        {
          OR: [
            { term: { contains: search, mode: 'insensitive' } },
            { definition: { contains: search, mode: 'insensitive' } },
            { shortExplanation: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [total, terms] = await Promise.all([
      this.prisma.glossaryTerm.count({ where }),
      this.prisma.glossaryTerm.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ term: 'asc' }],
      }),
    ]);

    return {
      items: terms,
      pagination: {
        page,
        limit,
        totalCount: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getGlossaryTermBySlugOrTerm(organisationId: string, termOrSlug: string) {
    const term = await this.prisma.glossaryTerm.findFirst({
      where: {
        OR: [
          { slug: slugify(termOrSlug) },
          { term: { equals: termOrSlug, mode: 'insensitive' } },
          { id: termOrSlug },
        ],
        AND: [
          {
            OR: [{ organisationId }, { isSystem: true }],
          },
        ],
      },
    });

    if (!term) {
      throw new NotFoundException(`Glossary term '${termOrSlug}' not found`);
    }

    // Populate related exercises if IDs exist
    let relatedExercises: any[] = [];
    if (term.relatedExerciseIds && term.relatedExerciseIds.length > 0) {
      relatedExercises = await this.prisma.exercise.findMany({
        where: { id: { in: term.relatedExerciseIds } },
        select: {
          id: true,
          name: true,
          primaryMuscleGroup: true,
          equipment: true,
          difficulty: true,
        },
      });
    }

    // Populate related lessons if IDs exist
    let relatedLessons: any[] = [];
    if (term.relatedLessonIds && term.relatedLessonIds.length > 0) {
      relatedLessons = await this.prisma.learningPathLesson.findMany({
        where: { id: { in: term.relatedLessonIds } },
        select: {
          id: true,
          title: true,
          pathId: true,
          estimatedMinutes: true,
          path: { select: { title: true, slug: true } },
        },
      });
    }

    return {
      ...term,
      relatedExercises,
      relatedLessons,
    };
  }

  // ==========================================
  // 5. CURRICULUM AUTHORING (TRAINER / ADMIN)
  // ==========================================

  async createCurriculum(
    organisationId: string,
    userId: string,
    dto: CreateCurriculumDto,
    isPlatformAdmin = false,
  ) {
    const baseSlug = slugify(dto.title);
    let finalSlug = baseSlug;
    let counter = 1;

    while (
      await this.prisma.curriculum.findFirst({
        where: {
          slug: finalSlug,
          OR: [{ organisationId }, { ownershipType: 'SYSTEM' }],
        },
      })
    ) {
      finalSlug = `${baseSlug}-${counter++}`;
    }

    const curriculum = await this.prisma.curriculum.create({
      data: {
        organisationId: isPlatformAdmin ? null : organisationId,
        createdById: userId,
        ownershipType: isPlatformAdmin ? 'SYSTEM' : 'ORGANISATION',
        title: dto.title,
        slug: finalSlug,
        description: dto.description,
        category: dto.category,
        difficulty: dto.difficulty || 'BEGINNER',
        iconName: dto.iconName,
        coverMediaUrl: dto.coverMediaUrl,
        sortOrder: dto.sortOrder || 0,
        contentStatus: 'DRAFT',
      },
    });

    if (dto.learningPathIds && dto.learningPathIds.length > 0) {
      await this.prisma.learningPath.updateMany({
        where: { id: { in: dto.learningPathIds } },
        data: { curriculumId: curriculum.id },
      });
    }

    return curriculum;
  }

  async updateCurriculum(
    organisationId: string,
    id: string,
    dto: UpdateCurriculumDto,
    isPlatformAdmin = false,
  ) {
    const existing = await this.prisma.curriculum.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Curriculum ${id} not found`);
    }

    if (!isPlatformAdmin && existing.ownershipType === 'SYSTEM') {
      throw new ForbiddenException('Cannot modify system curricula');
    }

    if (!isPlatformAdmin && existing.organisationId !== organisationId) {
      throw new ForbiddenException('Cannot modify curricula belonging to another organization');
    }

    const updated = await this.prisma.curriculum.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        difficulty: dto.difficulty,
        iconName: dto.iconName,
        coverMediaUrl: dto.coverMediaUrl,
        contentStatus: dto.contentStatus,
        sortOrder: dto.sortOrder,
      },
    });

    if (dto.learningPathIds) {
      // Unlink existing
      await this.prisma.learningPath.updateMany({
        where: { curriculumId: id },
        data: { curriculumId: null },
      });
      // Link new
      if (dto.learningPathIds.length > 0) {
        await this.prisma.learningPath.updateMany({
          where: { id: { in: dto.learningPathIds } },
          data: { curriculumId: id },
        });
      }
    }

    return updated;
  }

  async validateAndPublishCurriculum(organisationId: string, id: string) {
    const curriculum = await this.prisma.curriculum.findFirst({
      where: {
        id,
        OR: [{ organisationId }, { ownershipType: 'SYSTEM' }],
      },
      include: {
        learningPaths: {
          select: { id: true, title: true, contentStatus: true, lessonCount: true },
        },
      },
    });

    if (!curriculum) {
      throw new NotFoundException(`Curriculum ${id} not found`);
    }

    if (curriculum.learningPaths.length === 0) {
      throw new BadRequestException('Cannot publish a curriculum with zero learning paths');
    }

    return await this.prisma.curriculum.update({
      where: { id },
      data: {
        contentStatus: 'PUBLISHED',
        pathCount: curriculum.learningPaths.length,
      },
    });
  }

  // ==========================================
  // 6. GLOSSARY AUTHORING
  // ==========================================

  async createGlossaryTerm(
    organisationId: string,
    userId: string,
    dto: CreateGlossaryTermDto,
    isPlatformAdmin = false,
  ) {
    const baseSlug = slugify(dto.term);
    let finalSlug = baseSlug;
    let counter = 1;

    while (
      await this.prisma.glossaryTerm.findFirst({
        where: {
          slug: finalSlug,
          OR: [{ organisationId }, { isSystem: true }],
        },
      })
    ) {
      finalSlug = `${baseSlug}-${counter++}`;
    }

    return await this.prisma.glossaryTerm.create({
      data: {
        organisationId: isPlatformAdmin ? null : organisationId,
        createdById: userId,
        term: dto.term,
        slug: finalSlug,
        definition: dto.definition,
        shortExplanation: dto.shortExplanation,
        category: dto.category || 'GENERAL',
        difficulty: dto.difficulty || 'BEGINNER',
        relatedExerciseIds: dto.relatedExerciseIds || [],
        relatedMovementPatterns: dto.relatedMovementPatterns || [],
        relatedLessonIds: dto.relatedLessonIds || [],
        mediaUrl: dto.mediaUrl,
        isSystem: isPlatformAdmin,
        sortOrder: dto.sortOrder || 0,
      },
    });
  }

  async updateGlossaryTerm(organisationId: string, id: string, dto: UpdateGlossaryTermDto) {
    const existing = await this.prisma.glossaryTerm.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Glossary term ${id} not found`);
    }

    return await this.prisma.glossaryTerm.update({
      where: { id },
      data: {
        term: dto.term,
        definition: dto.definition,
        shortExplanation: dto.shortExplanation,
        category: dto.category,
        difficulty: dto.difficulty,
        relatedExerciseIds: dto.relatedExerciseIds,
        relatedMovementPatterns: dto.relatedMovementPatterns,
        relatedLessonIds: dto.relatedLessonIds,
        mediaUrl: dto.mediaUrl,
        sortOrder: dto.sortOrder,
      },
    });
  }

  async deleteGlossaryTerm(organisationId: string, id: string) {
    const existing = await this.prisma.glossaryTerm.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Glossary term ${id} not found`);
    }

    await this.prisma.glossaryTerm.delete({ where: { id } });
    return { success: true, deletedId: id };
  }

  // ==========================================
  // 7. SEED FOUNDATIONAL CURRICULA & GLOSSARY
  // ==========================================

  async seedFoundationalAcademyContent(organisationId?: string, userId?: string) {
    // 1. Seed Core Glossary Terms
    const glossaryTerms = [
      {
        term: 'Repetition',
        slug: 'repetition',
        definition: 'One complete execution of a single exercise movement from start to finish.',
        shortExplanation: 'Often abbreviated as "rep". Completing 10 squats equals 10 repetitions.',
        category: 'PROGRAMMING',
        difficulty: 'BEGINNER',
      },
      {
        term: 'Set',
        slug: 'set',
        definition: 'A group of consecutive repetitions performed without rest.',
        shortExplanation: 'E.g., 3 sets of 10 repetitions with 60 seconds rest between each set.',
        category: 'PROGRAMMING',
        difficulty: 'BEGINNER',
      },
      {
        term: 'Rest Interval',
        slug: 'rest-interval',
        definition: 'The designated recovery duration taken between sets or exercises.',
        shortExplanation: 'Allows muscle energy stores (ATP-CP) and cardiovascular recovery.',
        category: 'PROGRAMMING',
        difficulty: 'BEGINNER',
      },
      {
        term: 'Tempo',
        slug: 'tempo',
        definition: 'The controlled speed or rhythm at which an exercise repetition is executed.',
        shortExplanation: 'Typically expressed in 4 digits representing eccentric, pause, concentric, and top pause.',
        category: 'BIOMECHANICS',
        difficulty: 'INTERMEDIATE',
      },
      {
        term: 'Range of Motion',
        slug: 'range-of-motion',
        definition: 'The full degree of movement possible at a joint during an exercise.',
        shortExplanation: 'Abbreviated as ROM. Controlled full range promotes hypertrophy and joint health.',
        category: 'BIOMECHANICS',
        difficulty: 'BEGINNER',
      },
      {
        term: 'Compound Exercise',
        slug: 'compound-exercise',
        definition: 'A multi-joint exercise that recruits multiple muscle groups simultaneously.',
        shortExplanation: 'Examples include the squat, bench press, deadlift, and pull-up.',
        category: 'BIOMECHANICS',
        difficulty: 'BEGINNER',
      },
      {
        term: 'Isolation Exercise',
        slug: 'isolation-exercise',
        definition: 'A single-joint movement designed to target one specific muscle in isolation.',
        shortExplanation: 'Examples include bicep curls, leg extensions, and lateral raises.',
        category: 'BIOMECHANICS',
        difficulty: 'BEGINNER',
      },
      {
        term: 'Progressive Overload',
        slug: 'progressive-overload',
        definition: 'The gradual increase of stress placed upon the body during exercise training.',
        shortExplanation: 'Achieved by increasing weight, reps, sets, tempo control, or decreasing rest.',
        category: 'PROGRAMMING',
        difficulty: 'INTERMEDIATE',
      },
      {
        term: 'Concentric',
        slug: 'concentric',
        definition: 'The muscle action phase where muscle fibers actively shorten while producing tension.',
        shortExplanation: 'Usually the lifting or exertion phase (e.g., standing up in a squat).',
        category: 'BIOMECHANICS',
        difficulty: 'INTERMEDIATE',
      },
      {
        term: 'Eccentric',
        slug: 'eccentric',
        definition: 'The muscle action phase where muscle fibers actively lengthen under tension.',
        shortExplanation: 'The lowering or resisting phase (e.g., descending into a squat).',
        category: 'BIOMECHANICS',
        difficulty: 'INTERMEDIATE',
      },
      {
        term: 'Warm-Up',
        slug: 'warm-up',
        definition: 'Preparatory physical activity designed to elevate body temperature and prime movement patterns.',
        shortExplanation: 'Reduces injury risk and optimizes neurological readiness for working sets.',
        category: 'GENERAL',
        difficulty: 'BEGINNER',
      },
      {
        term: 'Cool-Down',
        slug: 'cool-down',
        definition: 'Post-training recovery period returning heart rate, respiration, and nervous system toward baseline.',
        shortExplanation: 'Facilitates parasympathetic transition and post-workout mobility.',
        category: 'RECOVERY',
        difficulty: 'BEGINNER',
      },
    ];

    for (const item of glossaryTerms) {
      const existing = await this.prisma.glossaryTerm.findFirst({
        where: { slug: item.slug },
      });
      if (!existing) {
        await this.prisma.glossaryTerm.create({
          data: {
            organisationId: null,
            createdById: userId || null,
            term: item.term,
            slug: item.slug,
            definition: item.definition,
            shortExplanation: item.shortExplanation,
            category: item.category,
            difficulty: item.difficulty,
            isSystem: true,
          },
        });
      }
    }

    // 2. Seed Foundational Curricula
    const foundationalCurricula = [
      {
        title: 'Fitness Fundamentals',
        slug: 'fitness-fundamentals',
        description: 'Master essential fitness terminology, training structures, sets, reps, and baseline exercise habits.',
        category: 'FITNESS_FUNDAMENTALS',
        difficulty: 'BEGINNER',
        iconName: 'bolt',
        sortOrder: 1,
      },
      {
        title: 'Movement Fundamentals',
        slug: 'movement-fundamentals',
        description: 'Understand the 7 core human movement patterns: Squat, Hinge, Push, Pull, Lunge, Rotation, and Carry.',
        category: 'MOVEMENT_FUNDAMENTALS',
        difficulty: 'BEGINNER',
        iconName: 'activity',
        sortOrder: 2,
      },
      {
        title: 'Exercise Fundamentals',
        slug: 'exercise-fundamentals',
        description: 'Distinguish compound vs isolation movements, bodyweight mechanics, free weights, and gym machines.',
        category: 'EXERCISE_FUNDAMENTALS',
        difficulty: 'BEGINNER',
        iconName: 'dumbbell',
        sortOrder: 3,
      },
      {
        title: 'Training Principles',
        slug: 'training-principles',
        description: 'Discover the science of progressive overload, consistency, training specificity, and recovery adaptation.',
        category: 'TRAINING_PRINCIPLES',
        difficulty: 'INTERMEDIATE',
        iconName: 'sparkles',
        sortOrder: 4,
      },
      {
        title: 'Warm-Up & Cool-Down Essentials',
        slug: 'warm-up-cool-down-essentials',
        description: 'Build robust movement preparation, core activation, and parasympathetic post-training recovery routines.',
        category: 'WARMUP_COOLDOWN',
        difficulty: 'BEGINNER',
        iconName: 'flame',
        sortOrder: 5,
      },
      {
        title: 'Understanding Recovery',
        slug: 'understanding-recovery',
        description: 'Optimize sleep hygiene, rest intervals, deload frequency, and holistic athletic restoration.',
        category: 'RECOVERY',
        difficulty: 'BEGINNER',
        iconName: 'heart',
        sortOrder: 6,
      },
    ];

    for (const c of foundationalCurricula) {
      const existing = await this.prisma.curriculum.findFirst({
        where: { slug: c.slug },
      });
      if (!existing) {
        await this.prisma.curriculum.create({
          data: {
            organisationId: null,
            createdById: userId || null,
            ownershipType: 'SYSTEM',
            title: c.title,
            slug: c.slug,
            description: c.description,
            category: c.category,
            difficulty: c.difficulty,
            iconName: c.iconName,
            sortOrder: c.sortOrder,
            contentStatus: 'PUBLISHED',
          },
        });
      }
    }
  }
}

function formatCategoryLabel(category: CurriculumCategoryType): string {
  switch (category) {
    case 'FITNESS_FUNDAMENTALS':
      return 'Fitness Fundamentals';
    case 'MOVEMENT_FUNDAMENTALS':
      return 'Movement Fundamentals';
    case 'EXERCISE_FUNDAMENTALS':
      return 'Exercise Fundamentals';
    case 'GYM_EQUIPMENT':
      return 'Gym Equipment';
    case 'TRAINING_PRINCIPLES':
      return 'Training Principles';
    case 'WARMUP_COOLDOWN':
      return 'Warm-Up & Cool-Down';
    case 'STRENGTH_TRAINING':
      return 'Strength Training';
    case 'CARDIO':
      return 'Cardiovascular Training';
    case 'MOBILITY':
      return 'Mobility';
    case 'FLEXIBILITY':
      return 'Flexibility';
    case 'RECOVERY':
      return 'Recovery';
    case 'WELLNESS':
      return 'Wellness';
    default:
      return category;
  }
}
