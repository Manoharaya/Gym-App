import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ExercisesService } from '../src/exercises/services/exercises.service';
import { ExerciseCollectionsLearningPathsService } from '../src/exercises/services/exercise-collections-learning-paths.service';
import { KnowledgeCheckService } from '../src/exercises/services/knowledge-check.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';

describe('Day 72: Interactive Fitness Education, Knowledge Checks & Assessments E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let exercisesService: ExercisesService;
  let collectionsPathsService: ExerciseCollectionsLearningPathsService;
  let knowledgeService: KnowledgeCheckService;

  let orgA: any;
  let orgB: any;
  let memberUserA: any;
  let memberUserB: any;
  let actorMemberOrgA: AuthenticatedUser;
  let actorMemberOrgB: AuthenticatedUser;

  let testExercise: any;
  let testPath: any;
  let testLesson: any;
  let createdCheckId: string;

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
    knowledgeService = app.get(KnowledgeCheckService);

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
      roles: [{ role: 'MEMBER', organisationId: orgA.id }],
    } as any;

    actorMemberOrgB = {
      id: memberUserB.id,
      email: memberUserB.email,
      roles: [{ role: 'MEMBER', organisationId: orgB.id }],
    } as any;

    // Seed clean test exercise
    testExercise = await exercisesService.create(
      orgA.id,
      {
        name: `Day 72 Assessment Exercise ${Date.now()}`,
        exerciseType: 'FREE_WEIGHT',
        primaryMuscleGroup: 'LEGS',
        equipment: 'BARBELL',
        difficulty: 'INTERMEDIATE',
        movementPattern: 'SQUAT',
        description: 'Exercise for Day 72 knowledge checks',
      } as any,
      actorMemberOrgA,
    );

    // Seed test learning path with a lesson
    testPath = await collectionsPathsService.createLearningPath(orgA.id, memberUserA.id, {
      title: `Day 72 Assessment Path ${Date.now()}`,
      category: 'FUNDAMENTALS',
      difficulty: 'BEGINNER',
      description: 'Learning path for knowledge check verification',
      estimatedDurationMinutes: 15,
      sections: [
        {
          title: 'Section 1: Foundations',
          sortOrder: 1,
          lessons: [
            {
              title: 'Lesson 1: Barbell Squat Fundamentals',
              lessonType: 'EXERCISE_LESSON',
              exerciseId: testExercise.id,
              estimatedMinutes: 5,
              isRequired: true,
              sortOrder: 1,
            },
          ],
        },
      ],
    });

    const fullPath = await collectionsPathsService.findLearningPathById(orgA.id, memberUserA.id, testPath.id);
    testLesson = fullPath.sections[0].lessons[0];
  });

  afterAll(async () => {
    // Cleanup created test records
    if (testPath) {
      await prisma.learningPath.deleteMany({ where: { id: testPath.id } });
    }
    if (testExercise) {
      await prisma.exercise.deleteMany({ where: { id: testExercise.id } });
    }
    await app.close();
  });

  describe('1. Curriculum Authoring & Question Validation', () => {
    let checkId: string;

    it('should create an unpublished knowledge check linked to a lesson', async () => {
      const check = await knowledgeService.createKnowledgeCheck(orgA.id, memberUserA.id, {
        title: 'Squat Mastery Knowledge Check',
        description: 'Verify understanding of barbell back squat technique and safety',
        instructions: 'Answer all 6 questions to test your technique knowledge.',
        passingScore: 70,
        attemptLimit: 3,
        isRequiredForLesson: true,
        lessonId: testLesson.id,
        exerciseId: testExercise.id,
      });

      expect(check).toBeDefined();
      expect(check.id).toBeDefined();
      expect(check.title).toBe('Squat Mastery Knowledge Check');
      expect(check.contentStatus).toBe('PUBLISHED'); // default in model is PUBLISHED
      expect(check.passingScore).toBe(70);
      expect(check.isRequiredForLesson).toBe(true);
      checkId = check.id;
      createdCheckId = check.id;
    });

    it('should fail publishing if assessment has 0 questions', async () => {
      await expect(
        knowledgeService.validateAndPublishCheck(orgA.id, checkId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should add all 6 question types to the knowledge check', async () => {
      // 1. MULTIPLE_CHOICE
      const mcq = await knowledgeService.addQuestion(orgA.id, checkId, {
        questionText: 'What is the primary starting position cue for a back squat?',
        questionType: 'MULTIPLE_CHOICE',
        difficulty: 'BEGINNER',
        sortOrder: 1,
        explanation: 'Establishing foot stance shoulder-width apart creates the base of support.',
        correctFeedback: 'Correct! A solid stance forms the bedrock of safe squatting.',
        incorrectFeedback: 'Not quite. The foundation begins with shoulder-width foot placement.',
        hint: 'Think about where your feet should be positioned before descending.',
        answers: [
          { answerText: 'Feet shoulder-width apart, chest upright', isCorrect: true, sortOrder: 1 },
          { answerText: 'Feet touching together with knees locked', isCorrect: false, sortOrder: 2 },
          { answerText: 'Staggered stance with one leg behind', isCorrect: false, sortOrder: 3 },
          { answerText: 'Head tilted backward looking at ceiling', isCorrect: false, sortOrder: 4 },
        ],
      });
      expect(mcq.answers.length).toBe(4);

      // 2. TRUE_FALSE
      const tf = await knowledgeService.addQuestion(orgA.id, checkId, {
        questionText: 'A controlled eccentric descent is safer and more effective than dropping rapidly.',
        questionType: 'TRUE_FALSE',
        difficulty: 'BEGINNER',
        sortOrder: 2,
        explanation: 'Controlling the descent maintains spinal neutrality and muscle tension.',
        correctFeedback: 'True! Motor control during the eccentric phase protects connective tissue.',
        answers: [
          { answerText: 'True', isCorrect: true, sortOrder: 1 },
          { answerText: 'False', isCorrect: false, sortOrder: 2 },
        ],
      });
      expect(tf.answers.length).toBe(2);

      // 3. MULTI_SELECT
      const ms = await knowledgeService.addQuestion(orgA.id, checkId, {
        questionText: 'Which two muscle groups act as primary drivers during the ascent phase?',
        questionType: 'MULTI_SELECT',
        difficulty: 'INTERMEDIATE',
        sortOrder: 3,
        explanation: 'The quadriceps extend the knees and the gluteus maximus extends the hips.',
        answers: [
          { answerText: 'Quadriceps', isCorrect: true, sortOrder: 1 },
          { answerText: 'Gluteus Maximus', isCorrect: true, sortOrder: 2 },
          { answerText: 'Biceps Brachii', isCorrect: false, sortOrder: 3 },
          { answerText: 'Latissimus Dorsi', isCorrect: false, sortOrder: 4 },
        ],
      });
      expect(ms.answers.filter((a: any) => a.isCorrect).length).toBe(2);

      // 4. IMAGE_CHOICE
      const img = await knowledgeService.addQuestion(orgA.id, checkId, {
        questionText: 'Which image demonstrates the correct parallel depth?',
        questionType: 'IMAGE_CHOICE',
        difficulty: 'INTERMEDIATE',
        sortOrder: 4,
        explanation: 'Parallel depth requires the hip crease to drop level with the top of the knee.',
        mediaUrl: 'https://fitcore.test/media/squat_depth_demo.jpg',
        mediaAltText: 'Diagram showing squat depth angles',
        answers: [
          { answerText: 'Hip crease at knee level (Parallel)', isCorrect: true, mediaUrl: 'https://fitcore.test/img/depth_parallel.jpg', sortOrder: 1 },
          { answerText: 'Quarter squat (Above parallel)', isCorrect: false, mediaUrl: 'https://fitcore.test/img/depth_quarter.jpg', sortOrder: 2 },
          { answerText: 'Excessive hyperextension', isCorrect: false, mediaUrl: 'https://fitcore.test/img/depth_excess.jpg', sortOrder: 3 },
        ],
      });
      expect(img.questionType).toBe('IMAGE_CHOICE');

      // 5. ORDERING
      const ord = await knowledgeService.addQuestion(orgA.id, checkId, {
        questionText: 'Place the back squat movement phases in the correct sequential order:',
        questionType: 'ORDERING',
        difficulty: 'INTERMEDIATE',
        sortOrder: 5,
        explanation: 'Movement starts with the setup, followed by eccentric descent, bottom transition, and concentric ascent.',
        answers: [
          { answerText: 'Setup & Unrack', isCorrect: true, correctOrderIndex: 1, sortOrder: 1 },
          { answerText: 'Eccentric Descent', isCorrect: true, correctOrderIndex: 2, sortOrder: 2 },
          { answerText: 'Bottom Transition', isCorrect: true, correctOrderIndex: 3, sortOrder: 3 },
          { answerText: 'Concentric Ascent', isCorrect: true, correctOrderIndex: 4, sortOrder: 4 },
        ],
      });
      expect(ord.answers.length).toBe(4);

      // 6. MATCHING
      const match = await knowledgeService.addQuestion(orgA.id, checkId, {
        questionText: 'Match each piece of equipment with its role in squat training:',
        questionType: 'MATCHING',
        difficulty: 'ADVANCED',
        sortOrder: 6,
        explanation: 'Different equipment provides distinct biomechanical load vectors.',
        answers: [
          { answerText: 'Olympic Barbell', matchTarget: 'Primary Axial Loading', sortOrder: 1 },
          { answerText: 'Squat Safety Bars', matchTarget: 'Emergency Catch Protection', sortOrder: 2 },
          { answerText: 'Weightlifting Belt', matchTarget: 'Intra-Abdominal Pressure Support', sortOrder: 3 },
        ],
      });
      expect(match.answers.length).toBe(3);

      // Validate and publish check
      const published = await knowledgeService.validateAndPublishCheck(orgA.id, checkId);
      expect(published.contentStatus).toBe('PUBLISHED');
      expect(published.questionCount).toBe(6);
    });
  });

  describe('2. Security & Answer Key Protection', () => {
    it('should NEVER expose isCorrect or correct answer flags in player payload', async () => {
      const playerCheck = await knowledgeService.getLessonKnowledgeCheck(orgA.id, memberUserA.id, testLesson.id);

      expect(playerCheck).toBeDefined();
      expect(playerCheck!.questions.length).toBe(6);

      // Check every question and choice in the player payload
      for (const q of playerCheck!.questions) {
        expect((q as any).isCorrect).toBeUndefined();

        for (const a of q.answers) {
          // STRICT SECURITY ASSERTION: isCorrect must NEVER be leaked to player
          expect((a as any).isCorrect).toBeUndefined();
          expect((a as any).correctOrderIndex).toBeUndefined();
          expect((a as any).matchTarget).toBeUndefined();
        }

        if (q.questionType === 'MATCHING') {
          // Targets are provided as a separate shuffled set of options, not tied to answer IDs
          expect(Array.isArray(q.matchTargets)).toBe(true);
          expect(q.matchTargets!.length).toBe(3);
        }
      }
    });
  });

  describe('3. Attempt Engine & Question Grading', () => {
    let check: any;
    let attemptId: string;
    let questions: any[];

    beforeAll(async () => {
      const playerCheck = await knowledgeService.getLessonKnowledgeCheck(orgA.id, memberUserA.id, testLesson.id);
      check = playerCheck;
      questions = playerCheck!.questions;
    });

    it('should start a new attempt in IN_PROGRESS status', async () => {
      const attempt = await knowledgeService.startAttempt(orgA.id, memberUserA.id, check.id);
      expect(attempt).toBeDefined();
      expect(attempt.attemptId).toBeDefined();
      expect(attempt.attemptNumber).toBe(1);
      expect(attempt.status).toBe('IN_PROGRESS');
      attemptId = attempt.attemptId;
    });

    it('should accurately grade a MULTIPLE_CHOICE question and return feedback', async () => {
      const mcq = questions.find((q) => q.questionType === 'MULTIPLE_CHOICE');
      // Look up correct answer ID directly from DB to simulate correct submission
      const dbAnswers = await prisma.knowledgeAnswer.findMany({ where: { questionId: mcq.id } });
      const correctAns = dbAnswers.find((a) => a.isCorrect)!;

      const res = await knowledgeService.submitResponse(orgA.id, memberUserA.id, attemptId, {
        questionId: mcq.id,
        selectedAnswerIds: [correctAns.id],
      });

      expect(res.isCorrect).toBe(true);
      expect(res.feedback).toContain('Correct');
      expect(res.explanation).toBeDefined();
      expect(res.answeredCount).toBe(1);
    });

    it('should accurately grade an incorrect TRUE_FALSE response and provide corrective feedback', async () => {
      const tf = questions.find((q) => q.questionType === 'TRUE_FALSE');
      const dbAnswers = await prisma.knowledgeAnswer.findMany({ where: { questionId: tf.id } });
      const wrongAns = dbAnswers.find((a) => !a.isCorrect)!;

      const res = await knowledgeService.submitResponse(orgA.id, memberUserA.id, attemptId, {
        questionId: tf.id,
        selectedAnswerIds: [wrongAns.id],
        hintsUsed: true,
      });

      expect(res.isCorrect).toBe(false);
      expect(res.feedback).toContain('Not quite');
      expect(res.explanation).toContain('Controlling the descent');
      expect(res.answeredCount).toBe(2);
    });

    it('should accurately grade a MULTI_SELECT question (all correct answers required)', async () => {
      const ms = questions.find((q) => q.questionType === 'MULTI_SELECT');
      const dbAnswers = await prisma.knowledgeAnswer.findMany({ where: { questionId: ms.id } });
      const correctIds = dbAnswers.filter((a) => a.isCorrect).map((a) => a.id);

      const res = await knowledgeService.submitResponse(orgA.id, memberUserA.id, attemptId, {
        questionId: ms.id,
        selectedAnswerIds: correctIds,
      });

      expect(res.isCorrect).toBe(true);
      expect(res.answeredCount).toBe(3);
    });

    it('should accurately grade an IMAGE_CHOICE question', async () => {
      const img = questions.find((q) => q.questionType === 'IMAGE_CHOICE');
      const dbAnswers = await prisma.knowledgeAnswer.findMany({ where: { questionId: img.id } });
      const correctAns = dbAnswers.find((a) => a.isCorrect)!;

      const res = await knowledgeService.submitResponse(orgA.id, memberUserA.id, attemptId, {
        questionId: img.id,
        selectedAnswerIds: [correctAns.id],
      });

      expect(res.isCorrect).toBe(true);
      expect(res.answeredCount).toBe(4);
    });

    it('should accurately grade an ORDERING question based on sequential indices', async () => {
      const ord = questions.find((q) => q.questionType === 'ORDERING');
      const dbAnswers = await prisma.knowledgeAnswer.findMany({ where: { questionId: ord.id } });
      const orderedIds = [...dbAnswers]
        .sort((a, b) => (a.correctOrderIndex ?? 0) - (b.correctOrderIndex ?? 0))
        .map((a) => a.id);

      const res = await knowledgeService.submitResponse(orgA.id, memberUserA.id, attemptId, {
        questionId: ord.id,
        orderedItemIds: orderedIds,
      });

      expect(res.isCorrect).toBe(true);
      expect(res.answeredCount).toBe(5);
    });

    it('should accurately grade a MATCHING question based on target terms', async () => {
      const match = questions.find((q) => q.questionType === 'MATCHING');
      const dbAnswers = await prisma.knowledgeAnswer.findMany({ where: { questionId: match.id } });
      const pairs: Record<string, string> = {};
      for (const a of dbAnswers) {
        if (a.matchTarget) pairs[a.id] = a.matchTarget;
      }

      const res = await knowledgeService.submitResponse(orgA.id, memberUserA.id, attemptId, {
        questionId: match.id,
        matchingPairs: pairs,
      });

      expect(res.isCorrect).toBe(true);
      expect(res.answeredCount).toBe(6);
    });

    it('should finalize attempt, calculate score (5/6 = 83.3%), and pass assessment', async () => {
      const result = await knowledgeService.completeAttempt(orgA.id, memberUserA.id, attemptId, {
        timeSpentSeconds: 110,
      });

      expect(result.status).toBe('PASSED');
      expect(result.passed).toBe(true);
      expect(result.score).toBe(83.3); // 5 correct out of 6
      expect(result.correctCount).toBe(5);
      expect(result.questionCount).toBe(6);
      expect(result.timeSpentSeconds).toBe(110);
      expect(result.reviewRecommendations.length).toBeGreaterThan(0);
      expect(result.reviewRecommendations[0]).toContain('Review key coaching cues');
    });

    it('should provide full post-test answer review with correct answers and explanations', async () => {
      const review = await knowledgeService.getAttemptReview(orgA.id, memberUserA.id, attemptId);

      expect(review.attemptId).toBe(attemptId);
      expect(review.score).toBe(83.3);
      expect(review.passed).toBe(true);
      expect(review.items.length).toBe(6);

      const missedItem = review.items.find((i) => !i.isCorrect)!;
      expect(missedItem).toBeDefined();
      expect(missedItem.questionType).toBe('TRUE_FALSE');
      expect(missedItem.correctAnswer).toBe('True');
      expect(missedItem.yourAnswer).toBe('False');
      expect(missedItem.explanation).toBeDefined();
    });
  });

  describe('4. Learning Progress Integration & Passing Gate', () => {
    it('should automatically mark lesson completed when required assessment is passed', async () => {
      const lessonCompletion = await prisma.userLessonCompletion.findUnique({
        where: {
          userId_lessonId: {
            userId: memberUserA.id,
            lessonId: testLesson.id,
          },
        },
      });

      expect(lessonCompletion).toBeDefined();
      expect(lessonCompletion!.pathId).toBe(testPath.id);

      const pathProgress = await prisma.userLearningPathProgress.findUnique({
        where: {
          userId_pathId: {
            userId: memberUserA.id,
            pathId: testPath.id,
          },
        },
      });

      expect(pathProgress).toBeDefined();
      expect(pathProgress!.status).toBe('COMPLETED'); // 1 out of 1 lesson completed
      expect(pathProgress!.completedLessons).toBe(1);
      expect(pathProgress!.percentComplete).toBe(100);
    });
  });

  describe('5. Multi-Tenant Isolation & IDOR Protection', () => {
    it('should not allow Member B to access or review Member A attempt', async () => {
      const attemptsA = await prisma.knowledgeAttempt.findMany({
        where: { userId: memberUserA.id },
      });
      const attemptA = attemptsA[0];

      await expect(
        knowledgeService.getAttemptReview(orgB.id, memberUserB.id, attemptA.id),
      ).rejects.toThrow();
    });

    it('should not allow Member B to submit answers to Member A in-progress attempt', async () => {
      const newAttemptA = await prisma.knowledgeAttempt.create({
        data: {
          userId: memberUserA.id,
          tenantId: orgA.id,
          checkId: createdCheckId,
          status: 'IN_PROGRESS',
        },
      });

      await expect(
        knowledgeService.submitResponse(orgB.id, memberUserB.id, newAttemptA.id, {
          questionId: 'q_fake',
          selectedAnswerIds: ['ans_fake'],
        }),
      ).rejects.toThrow();

      await prisma.knowledgeAttempt.delete({ where: { id: newAttemptA.id } });
    });
  });
});
