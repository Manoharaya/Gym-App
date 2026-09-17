import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ExercisesService } from '../src/exercises/services/exercises.service';
import { ExerciseCollectionsLearningPathsService } from '../src/exercises/services/exercise-collections-learning-paths.service';
import { AcademyService } from '../src/exercises/services/academy.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';

describe('Day 73: Fitness Education Curriculum, Exercise Fundamentals & Academy E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let exercisesService: ExercisesService;
  let collectionsPathsService: ExerciseCollectionsLearningPathsService;
  let academyService: AcademyService;

  let orgA: any;
  let orgB: any;
  let memberUserA: any;
  let memberUserB: any;
  let actorMemberOrgA: AuthenticatedUser;

  let testExercise: any;
  let testPath: any;
  let testLesson: any;
  let testCurriculumId: string;
  let testTermId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
    prisma = app.get(PrismaService);
    exercisesService = app.get(ExercisesService);
    collectionsPathsService = app.get(ExerciseCollectionsLearningPathsService);
    academyService = app.get(AcademyService);

    orgA = await prisma.organisation.findFirstOrThrow({ where: { slug: 'second-wind' } });
    orgB = await prisma.organisation.findFirstOrThrow({ where: { slug: 'apex-strength' } });

    memberUserA = (await prisma.user.findFirst({
      where: { email: 'member@secondwind.com.au' },
    })) || (await prisma.user.findFirstOrThrow({
      where: { email: 'owner@secondwind.com.au' },
    }));

    memberUserB = (await prisma.user.findFirst({
      where: { email: 'member@apexstrength.com.au' },
    })) || (await prisma.user.findFirstOrThrow({
      where: { email: 'owner@apexstrength.com.au' },
    }));

    actorMemberOrgA = {
      id: memberUserA.id,
      email: memberUserA.email,
      roles: [{ organisationId: orgA.id, role: { name: 'MEMBER' } } as any],
    } as AuthenticatedUser;

    // Create test exercise
    testExercise = await exercisesService.create(
      orgA.id,
      {
        name: 'Day 73 Academy Squat Test',
        slug: `day-73-squat-${Date.now()}`,
        primaryMuscleGroup: 'LEGS',
        equipment: 'BODYWEIGHT',
        difficulty: 'BEGINNER',
        movementPattern: 'SQUAT',
        exerciseType: 'STRENGTH',
        description: 'Testing educational curriculum and academy integration',
        instructions: ['Stand with feet shoulder-width', 'Descend under control', 'Drive through feet to stand'],
      } as any,
      actorMemberOrgA,
    );

    // Create test learning path
    testPath = await collectionsPathsService.createLearningPath(orgA.id, memberUserA.id, {
      title: 'Academy Intro to Squat Mechanics',
      description: 'Foundational movement mechanics for the squat',
      category: 'MOVEMENT_FUNDAMENTALS',
      difficulty: 'BEGINNER',
      primaryGoal: 'TECHNIQUE',
      sections: [
        {
          title: 'Core Fundamentals',
          lessons: [
            {
              title: 'Squat Stance & Foot Mechanics',
              lessonType: 'MOVEMENT_LESSON',
              exerciseId: testExercise.id,
              learningObjective: 'Master tripod foot contact and pelvic neutral',
              content: 'The squat movement begins at the feet and hips simultaneously.',
              keyTakeaways: ['Maintain tripod foot contact', 'Knees track over toes'],
              estimatedMinutes: 5,
              isRequired: true,
              contentBlocks: [
                {
                  id: 'blk-1',
                  type: 'TEXT',
                  title: 'Introduction to Stance',
                  content: 'A stable base starts with shoulder-width feet and slight toe flare.',
                  sortOrder: 1,
                },
                {
                  id: 'blk-2',
                  type: 'CALLOUT',
                  calloutType: 'KEY_POINT',
                  title: 'Tripod Foot Contact',
                  content: 'Press the big toe, pinky toe, and heel firmly into the floor.',
                  sortOrder: 2,
                },
                {
                  id: 'blk-3',
                  type: 'CALLOUT',
                  calloutType: 'SAFETY',
                  title: 'Avoid Knee Valgus',
                  content: 'Do not allow knees to collapse inward during the ascent phase.',
                  sortOrder: 3,
                },
                {
                  id: 'blk-4',
                  type: 'EXERCISE_REF',
                  exerciseId: testExercise.id,
                  exerciseName: testExercise.name,
                  sortOrder: 4,
                },
              ],
            },
          ],
        },
      ],
    });

    const fullPath = await collectionsPathsService.findLearningPathById(orgA.id, memberUserA.id, testPath.id);
    testLesson = fullPath.sections[0].lessons[0];

    // Seed foundational academy content
    await academyService.seedFoundationalAcademyContent(orgA.id, memberUserA.id);
  });

  afterAll(async () => {
    if (testPath) {
      await prisma.learningPath.deleteMany({ where: { id: testPath.id } });
    }
    if (testExercise) {
      await prisma.exercise.deleteMany({ where: { id: testExercise.id } });
    }
    if (testCurriculumId) {
      await prisma.curriculum.deleteMany({ where: { id: testCurriculumId } });
    }
    if (testTermId) {
      await prisma.glossaryTerm.deleteMany({ where: { id: testTermId } });
    }
    await app.close();
  });

  describe('1. Curriculum Creation & Management', () => {
    it('should create an authorable curriculum in DRAFT status', async () => {
      const curriculum = await academyService.createCurriculum(
        orgA.id,
        memberUserA.id,
        {
          title: 'Day 73 Test Curriculum: Biomechanics Masterclass',
          description: 'A deep exploration into movement mechanics and training execution',
          category: 'MOVEMENT_FUNDAMENTALS',
          difficulty: 'BEGINNER',
          iconName: 'activity',
          learningPathIds: [testPath.id],
        },
        false,
      );

      expect(curriculum).toBeDefined();
      expect(curriculum.id).toBeDefined();
      expect(curriculum.title).toBe('Day 73 Test Curriculum: Biomechanics Masterclass');
      expect(curriculum.contentStatus).toBe('DRAFT');
      expect(curriculum.category).toBe('MOVEMENT_FUNDAMENTALS');
      testCurriculumId = curriculum.id;

      // Verify learning path was linked
      const updatedPath = await prisma.learningPath.findUnique({
        where: { id: testPath.id },
      });
      expect(updatedPath?.curriculumId).toBe(curriculum.id);
    });

    it('should fail publishing a curriculum if it has 0 learning paths', async () => {
      const emptyCurriculum = await academyService.createCurriculum(
        orgA.id,
        memberUserA.id,
        {
          title: 'Empty Curriculum',
          category: 'FITNESS_FUNDAMENTALS',
        },
        false,
      );

      await expect(
        academyService.validateAndPublishCurriculum(orgA.id, emptyCurriculum.id),
      ).rejects.toThrow(BadRequestException);

      await prisma.curriculum.delete({ where: { id: emptyCurriculum.id } });
    });

    it('should publish a valid curriculum with learning paths', async () => {
      const published = await academyService.validateAndPublishCurriculum(
        orgA.id,
        testCurriculumId,
      );
      expect(published.contentStatus).toBe('PUBLISHED');
      expect(published.pathCount).toBe(1);
    });
  });

  describe('2. Fitness Academy Hub & Overview Aggregation', () => {
    it('should return aggregated academy overview with categories, resume position, and curricula', async () => {
      const overview = await academyService.getAcademyOverview(orgA.id, memberUserA.id);

      expect(overview).toBeDefined();
      expect(Array.isArray(overview.categories)).toBe(true);
      expect(overview.categories.length).toBe(12); // All 12 CURRICULUM_CATEGORIES
      expect(Array.isArray(overview.curricula)).toBe(true);
      expect(overview.curricula.length).toBeGreaterThan(0);

      // Verify the curriculum we created & published is present
      const found = overview.curricula.find((c: any) => c.id === testCurriculumId);
      expect(found).toBeDefined();
      expect(found!.title).toBe('Day 73 Test Curriculum: Biomechanics Masterclass');
      expect(found!.percentComplete).toBe(0);
      expect(found!.totalLessons).toBe(1);

      // Verify glossary highlights are included
      expect(Array.isArray(overview.glossaryHighlights)).toBe(true);
      expect(overview.glossaryHighlights.length).toBeGreaterThan(0);
    });

    it('should list published curricula with category filtering and pagination', async () => {
      const result = await academyService.getCurricula(orgA.id, memberUserA.id, {
        category: 'MOVEMENT_FUNDAMENTALS',
        page: 1,
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.some((c: any) => c.id === testCurriculumId)).toBe(true);
      expect(result.pagination.totalCount).toBeGreaterThan(0);
    });

    it('should return full curriculum syllabus and calculate progress', async () => {
      const detail = await academyService.getCurriculumById(
        orgA.id,
        memberUserA.id,
        testCurriculumId,
      );

      expect(detail).toBeDefined();
      expect(detail.id).toBe(testCurriculumId);
      expect(detail.learningPaths.length).toBe(1);
      expect(detail.learningPaths[0].id).toBe(testPath.id);
      expect(detail.learningPaths[0].sections[0].lessons[0].id).toBe(testLesson.id);
      expect(detail.learningPaths[0].sections[0].lessons[0].isCompleted).toBe(false);

      // Complete the lesson and re-fetch to verify progress updates
      await collectionsPathsService.completeLesson(
        orgA.id,
        memberUserA.id,
        testPath.id,
        testLesson.id,
      );

      const detailAfterCompletion = await academyService.getCurriculumById(
        orgA.id,
        memberUserA.id,
        testCurriculumId,
      );
      expect(detailAfterCompletion.completedLessons).toBe(1);
      expect(detailAfterCompletion.percentComplete).toBe(100);
      expect(
        detailAfterCompletion.learningPaths[0].sections[0].lessons[0].isCompleted,
      ).toBe(true);
    });
  });

  describe('3. Structured Content Blocks in Lessons', () => {
    it('should preserve and deliver modular content blocks inside lesson payload', async () => {
      const lessonFromDb = await prisma.learningPathLesson.findUnique({
        where: { id: testLesson.id },
      });

      expect(lessonFromDb).toBeDefined();
      expect(lessonFromDb?.contentBlocks).toBeDefined();

      const blocks = lessonFromDb?.contentBlocks as any[];
      expect(Array.isArray(blocks)).toBe(true);
      expect(blocks.length).toBe(4);

      // Block 1: TEXT
      expect(blocks[0].type).toBe('TEXT');
      expect(blocks[0].title).toBe('Introduction to Stance');

      // Block 2: CALLOUT - KEY_POINT
      expect(blocks[1].type).toBe('CALLOUT');
      expect(blocks[1].calloutType).toBe('KEY_POINT');
      expect(blocks[1].content).toContain('toe');

      // Block 3: CALLOUT - SAFETY
      expect(blocks[2].type).toBe('CALLOUT');
      expect(blocks[2].calloutType).toBe('SAFETY');
      expect(blocks[2].title).toBe('Avoid Knee Valgus');

      // Block 4: EXERCISE_REF
      expect(blocks[3].type).toBe('EXERCISE_REF');
      expect(blocks[3].exerciseId).toBe(testExercise.id);
    });
  });

  describe('4. Fitness Terminology Glossary', () => {
    it('should create an authorable glossary term', async () => {
      const term = await academyService.createGlossaryTerm(
        orgA.id,
        memberUserA.id,
        {
          term: 'Pelvic Tilt',
          definition: 'The orientation of the pelvis relative to the femurs and the rest of the body.',
          shortExplanation: 'Can be anterior (tipped forward) or posterior (tucked backward).',
          category: 'BIOMECHANICS',
          difficulty: 'INTERMEDIATE',
          relatedExerciseIds: [testExercise.id],
          relatedLessonIds: [testLesson.id],
        },
        false,
      );

      expect(term).toBeDefined();
      expect(term.id).toBeDefined();
      expect(term.slug).toBe('pelvic-tilt');
      expect(term.term).toBe('Pelvic Tilt');
      testTermId = term.id;
    });

    it('should list and search glossary terms with category filter', async () => {
      const result = await academyService.getGlossaryTerms(orgA.id, {
        category: 'BIOMECHANICS',
        page: 1,
        limit: 20,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.some((t: any) => t.slug === 'pelvic-tilt')).toBe(true);
      expect(result.items.some((t: any) => t.slug === 'tempo')).toBe(true); // From seed
    });

    it('should filter glossary terms by alphabetical letter', async () => {
      const result = await academyService.getGlossaryTerms(orgA.id, {
        letter: 'P',
        page: 1,
        limit: 20,
      });

      expect(result).toBeDefined();
      expect(result.items.every((t: any) => t.term.toUpperCase().startsWith('P'))).toBe(true);
      expect(result.items.some((t: any) => t.slug === 'pelvic-tilt')).toBe(true);
    });

    it('should retrieve single glossary term with populated related exercises and lessons', async () => {
      const termDetail = await academyService.getGlossaryTermBySlugOrTerm(
        orgA.id,
        'pelvic-tilt',
      );

      expect(termDetail).toBeDefined();
      expect(termDetail.term).toBe('Pelvic Tilt');
      expect(Array.isArray(termDetail.relatedExercises)).toBe(true);
      expect(termDetail.relatedExercises.length).toBe(1);
      expect(termDetail.relatedExercises[0].id).toBe(testExercise.id);
      expect(Array.isArray(termDetail.relatedLessons)).toBe(true);
      expect(termDetail.relatedLessons.length).toBe(1);
      expect(termDetail.relatedLessons[0].id).toBe(testLesson.id);
    });

    it('should update a glossary term', async () => {
      const updated = await academyService.updateGlossaryTerm(orgA.id, testTermId, {
        shortExplanation: 'Updated short explanation for pelvic neutral alignment.',
      });

      expect(updated.shortExplanation).toBe('Updated short explanation for pelvic neutral alignment.');
    });
  });

  describe('5. Multi-Tenant Isolation & Security', () => {
    it('should not allow Member B in Org B to access Org A draft or unpublished curriculum', async () => {
      const draftCurriculum = await academyService.createCurriculum(
        orgA.id,
        memberUserA.id,
        {
          title: 'Org A Secret Curriculum',
          category: 'STRENGTH_TRAINING',
        },
        false,
      );

      await expect(
        academyService.getCurriculumById(orgB.id, memberUserB.id, draftCurriculum.id),
      ).rejects.toThrow(NotFoundException);

      await prisma.curriculum.delete({ where: { id: draftCurriculum.id } });
    });

    it('should prevent non-superadmin from modifying SYSTEM curricula', async () => {
      const systemCurriculum = await prisma.curriculum.findFirst({
        where: { ownershipType: 'SYSTEM' },
      });

      if (systemCurriculum) {
        await expect(
          academyService.updateCurriculum(
            orgA.id,
            systemCurriculum.id,
            { title: 'Attempted Hijack' },
            false, // isPlatformAdmin = false
          ),
        ).rejects.toThrow(ForbiddenException);
      }
    });
  });
});
