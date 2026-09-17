import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ExerciseAnatomyService } from '../src/exercises/services/exercise-anatomy.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';

describe('Day 74: Visual Anatomy, Muscle Education, Movement Mechanics & "Why This Exercise Works" E2E Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let anatomyService: ExerciseAnatomyService;

  let orgA: any;
  let orgB: any;
  let userA: any;
  let userB: any;
  let actorMemberA: AuthenticatedUser;
  let actorTrainerA: AuthenticatedUser;
  let actorMemberB: AuthenticatedUser;

  let testExerciseA: any;
  let testExerciseB: any;

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
    anatomyService = app.get(ExerciseAnatomyService);

    orgA = await prisma.organisation.findFirstOrThrow({ where: { slug: 'second-wind' } });
    orgB = await prisma.organisation.findFirstOrThrow({ where: { slug: 'apex-strength' } });

    userA =
      (await prisma.user.findFirst({ where: { email: 'owner@secondwind.com.au' } })) ||
      (await prisma.user.findFirstOrThrow({ where: { email: 'member@secondwind.com.au' } }));

    userB =
      (await prisma.user.findFirst({ where: { email: 'owner@apexstrength.com.au' } })) ||
      (await prisma.user.findFirstOrThrow({ where: { email: 'member@apexstrength.com.au' } }));

    actorMemberA = {
      id: userA.id,
      email: userA.email,
      roles: [{ role: 'MEMBER', organisationId: orgA.id }],
    } as any;

    actorTrainerA = {
      id: userA.id,
      email: userA.email,
      roles: [{ role: 'TRAINER', organisationId: orgA.id }],
    } as any;

    actorMemberB = {
      id: userB.id,
      email: userB.email,
      roles: [{ role: 'MEMBER', organisationId: orgB.id }],
    } as any;

    // Create a comprehensive test exercise for Tenant A
    testExerciseA = await prisma.exercise.create({
      data: {
        name: 'Day 74 Barbell Back Squat',
        slug: `day-74-barbell-back-squat-${Date.now()}`,
        organisationId: orgA.id,
        ownershipType: 'ORGANISATION',
        exerciseType: 'STRENGTH',
        difficulty: 'INTERMEDIATE',
        movementPattern: 'SQUAT',
        primaryMuscleGroup: 'QUADRICEPS',
        equipment: 'BARBELL',
        bodyPosition: 'STANDING',
        tempo: '3-1-2-0',
        tempoStructure: {
          eccentricSeconds: 3,
          bottomHoldSeconds: 1,
          concentricSeconds: 2,
          topHoldSeconds: 0,
        },
        rangeOfMotion: 'Full depth below parallel hip crease',
        breathingInstructions: 'Inhale and brace on descent, exhale forcefully through ascent sticking point',
        status: 'ACTIVE',
        contentStatus: 'PUBLISHED',
        muscleRelations: {
          create: [
            {
              muscle: 'QUADRICEPS',
              muscleGroup: 'LOWER_BODY',
              role: 'PRIMARY',
              activationLevel: 'HIGH',
              notes: 'Drives knee extension out of the hole',
            },
            {
              muscle: 'GLUTES',
              muscleGroup: 'LOWER_BODY',
              role: 'PRIMARY',
              activationLevel: 'HIGH',
              notes: 'Drives hip extension to complete the ascent',
            },
            {
              muscle: 'HAMSTRINGS',
              muscleGroup: 'LOWER_BODY',
              role: 'SECONDARY',
              activationLevel: 'MODERATE',
              notes: 'Co-contracts for knee joint stability',
            },
            {
              muscle: 'ABDOMINALS',
              muscleGroup: 'CORE',
              role: 'STABILIZER',
              activationLevel: 'HIGH',
              notes: 'Maintains intra-abdominal pressure',
            },
            {
              muscle: 'LOWER_BACK',
              muscleGroup: 'CORE',
              role: 'STABILIZER',
              activationLevel: 'HIGH',
              notes: 'Resists spinal flexion under axial bar load',
            },
          ],
        },
        movementPhases: {
          create: [
            {
              phaseName: 'Setup & Unrack',
              phaseType: 'SETUP',
              title: 'Establish Bar Shelf & Stance',
              description: 'Step under the barbell creating a tight upper-back shelf with feet shoulder-width apart.',
              orderIndex: 0,
              cueText: 'Pin the bar against your rear delts and take two crisp steps back.',
              bodyPosition: 'STANDING',
              tempoSeconds: 2,
              breathingPattern: 'INHALE_PREPARATION',
            },
            {
              phaseName: 'Eccentric Descent',
              phaseType: 'ECCENTRIC',
              title: 'Controlled Descent',
              description: 'Hinge hips and bend knees simultaneously, descending with control over 3 seconds.',
              orderIndex: 1,
              cueText: 'Control the descent, keeping knees tracking over your second toe.',
              tempoSeconds: 3,
              breathingPattern: 'INHALE_DESCENT',
            },
            {
              phaseName: 'Bottom Transition',
              phaseType: 'TRANSITION_BOTTOM',
              title: 'Depth Reversal',
              description: 'Reach below parallel depth without pelvic tuck (butt wink).',
              orderIndex: 2,
              cueText: 'Stay tight at the bottom; do not bounce off your joints.',
              tempoSeconds: 1,
              breathingPattern: 'HOLD_VALSALVA',
            },
            {
              phaseName: 'Concentric Ascent',
              phaseType: 'CONCENTRIC',
              title: 'Drive Upward',
              description: 'Drive the floor away through midfoot, extending knees and hips in unison.',
              orderIndex: 3,
              cueText: 'Drive your traps back into the bar as you stand.',
              tempoSeconds: 2,
              breathingPattern: 'EXHALE_EFFORT',
            },
          ],
        },
        equipmentRelations: {
          create: [
            {
              equipmentName: 'Olympic Barbell',
              requirementType: 'REQUIRED',
              equipmentCategory: 'FREE_WEIGHTS',
              alternatives: ['Dumbbells', 'Kettlebell'],
            },
            {
              equipmentName: 'Squat Rack',
              requirementType: 'REQUIRED',
              equipmentCategory: 'BENCHES_SUPPORTS',
            },
          ],
        },
      },
    });

    // Create private exercise for Tenant B for isolation testing
    testExerciseB = await prisma.exercise.create({
      data: {
        name: 'Day 74 Apex Deadlift',
        slug: `day-74-apex-deadlift-${Date.now()}`,
        organisationId: orgB.id,
        ownershipType: 'ORGANISATION',
        exerciseType: 'STRENGTH',
        difficulty: 'ADVANCED',
        movementPattern: 'HINGE',
        primaryMuscleGroup: 'HAMSTRINGS',
        equipment: 'BARBELL',
        status: 'ACTIVE',
        contentStatus: 'PUBLISHED',
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (testExerciseA?.id) {
      await prisma.exercise.delete({ where: { id: testExerciseA.id } }).catch(() => {});
    }
    if (testExerciseB?.id) {
      await prisma.exercise.delete({ where: { id: testExerciseB.id } }).catch(() => {});
    }
    await app.close();
  });

  // =========================================================================
  // 1. EXERCISE ANATOMY & MECHANICS
  // =========================================================================

  describe('Aggregated Exercise Anatomy & Biomechanics', () => {
    it('should aggregate exercise anatomy with primary, secondary, and stabilizer muscles', async () => {
      const anatomy = await anatomyService.getExerciseAnatomy(orgA.id, testExerciseA.id, userA.id);

      expect(anatomy).toBeDefined();
      expect(anatomy.exercise.id).toBe(testExerciseA.id);
      expect(anatomy.exercise.movementPattern).toBe('SQUAT');

      // Verify muscles grouping
      expect(anatomy.musclesInvolved).toBeDefined();
      expect(anatomy.musclesInvolved.totalCount).toBe(5);

      // Primary: Quadriceps and Glutes
      expect(anatomy.musclesInvolved.primary.length).toBe(2);
      const primaryCodes = anatomy.musclesInvolved.primary.map((m) => m.code);
      expect(primaryCodes).toContain('QUADRICEPS');
      expect(primaryCodes).toContain('GLUTES');

      // Secondary: Hamstrings
      expect(anatomy.musclesInvolved.secondary.length).toBe(1);
      expect(anatomy.musclesInvolved.secondary[0].code).toBe('HAMSTRINGS');

      // Stabilizers: Abdominals and Lower Back
      expect(anatomy.musclesInvolved.stabilizers.length).toBe(2);
      const stabilizerCodes = anatomy.musclesInvolved.stabilizers.map((m) => m.code);
      expect(stabilizerCodes).toContain('ABDOMINALS');
      expect(stabilizerCodes).toContain('LOWER_BACK');

      // Verify explicit role text exists and no fake EMG percentage
      for (const m of anatomy.musclesInvolved.primary) {
        expect(m.role).toBe('PRIMARY');
        expect(m.roleExplanation).toBeTruthy();
        expect(m.educationalDescription).toBeTruthy();
        expect((m as any).activationPercentage).toBeUndefined();
      }
    });

    it('should return movement mechanics with phase details, tempo, and breathing synchronization', async () => {
      const anatomy = await anatomyService.getExerciseAnatomy(orgA.id, testExerciseA.id, userA.id);

      expect(anatomy.movementMechanics).toBeDefined();
      expect(anatomy.movementMechanics.pattern.code).toBe('SQUAT');
      expect(anatomy.movementMechanics.pattern.primaryJointActions.length).toBeGreaterThan(0);

      // Verify phases
      expect(anatomy.movementMechanics.phases.length).toBe(4);
      const phaseNames = anatomy.movementMechanics.phases.map((p) => p.phaseName);
      expect(phaseNames).toContain('Setup & Unrack');
      expect(phaseNames).toContain('Eccentric Descent');
      expect(phaseNames).toContain('Bottom Transition');
      expect(phaseNames).toContain('Concentric Ascent');

      // Verify tempo guide
      expect(anatomy.movementMechanics.tempoSummary.tempoString).toBe('3-1-2-0');
      expect(anatomy.movementMechanics.tempoSummary.eccentricSeconds).toBe(3);
      expect(anatomy.movementMechanics.tempoSummary.concentricSeconds).toBe(2);
      expect(anatomy.movementMechanics.tempoSummary.tempoExplanation).toBeTruthy();

      // Verify breathing guide
      expect(anatomy.movementMechanics.breathingSummary.guidance).toBeTruthy();
    });

    it('should synthesize deterministic "Why This Exercise Works" with educational disclaimer', async () => {
      const anatomy = await anatomyService.getExerciseAnatomy(orgA.id, testExerciseA.id, userA.id);

      expect(anatomy.whyThisExerciseWorks).toBeDefined();
      expect(anatomy.whyThisExerciseWorks.overview).toContain('Day 74 Barbell Back Squat');
      expect(anatomy.whyThisExerciseWorks.primaryDrivers.length).toBeGreaterThan(0);
      expect(anatomy.whyThisExerciseWorks.jointAction).toBeTruthy();
      expect(anatomy.whyThisExerciseWorks.stabilizationFocus).toBeTruthy();
      expect(anatomy.whyThisExerciseWorks.benefits.length).toBeGreaterThan(0);

      // Verify non-diagnostic fitness educational disclaimer
      expect(anatomy.whyThisExerciseWorks.educationalDisclaimer).toContain(
        'Fitness education only. Not intended as medical diagnosis',
      );
    });

    it('should compute anterior and posterior body map highlights accurately', async () => {
      const anatomy = await anatomyService.getExerciseAnatomy(orgA.id, testExerciseA.id, userA.id);

      expect(anatomy.bodyMapData).toBeDefined();
      // Anterior: Quads, Abdominals
      expect(anatomy.bodyMapData.anteriorHighlighted).toContain('QUADRICEPS');
      expect(anatomy.bodyMapData.anteriorHighlighted).toContain('ABDOMINALS');

      // Posterior: Glutes, Hamstrings, Lower Back
      expect(anatomy.bodyMapData.posteriorHighlighted).toContain('GLUTES');
      expect(anatomy.bodyMapData.posteriorHighlighted).toContain('HAMSTRINGS');
      expect(anatomy.bodyMapData.posteriorHighlighted).toContain('LOWER_BACK');

      // All involved muscles list
      expect(anatomy.bodyMapData.allInvolvedMuscles.length).toBe(5);
    });

    it('should include equipment relations with alternatives', async () => {
      const anatomy = await anatomyService.getExerciseAnatomy(orgA.id, testExerciseA.id, userA.id);

      expect(anatomy.equipment.length).toBe(2);
      const barbell = anatomy.equipment.find((eq) => eq.equipmentName === 'Olympic Barbell');
      expect(barbell).toBeDefined();
      expect(barbell?.requirementType).toBe('REQUIRED');
      expect(barbell?.alternatives).toContain('Dumbbells');
    });
  });

  // =========================================================================
  // 2. MUSCLE TAXONOMY & DETAIL
  // =========================================================================

  describe('Muscle Education Catalog & Detail', () => {
    it('should return catalog of all muscle groups categorized by region', async () => {
      const muscles = await anatomyService.getMusclesCatalog(orgA.id);

      expect(Array.isArray(muscles)).toBe(true);
      expect(muscles.length).toBeGreaterThan(10);

      const quads = muscles.find((m) => m.code === 'QUADRICEPS');
      expect(quads).toBeDefined();
      expect(quads?.group).toBe('LOWER_BODY');
      expect(quads?.region).toBe('ANTERIOR');
      expect(quads?.exerciseCount).toBeGreaterThan(0);

      const lats = muscles.find((m) => m.code === 'LATS');
      expect(lats).toBeDefined();
      expect(lats?.group).toBe('UPPER_BODY');
      expect(lats?.region).toBe('POSTERIOR');
    });

    it('should return deep educational profile and categorized exercises for a muscle', async () => {
      const detail = await anatomyService.getMuscleDetail(orgA.id, 'QUADRICEPS');

      expect(detail.code).toBe('QUADRICEPS');
      expect(detail.name).toContain('Quadriceps');
      expect(detail.educationalDescription).toContain('four-headed muscle group');
      expect(detail.primaryActions).toContain('Knee extension');
      expect(detail.synergistMuscles.length).toBeGreaterThan(0);

      // Verify testExerciseA is in primary exercises
      expect(detail.exercises.primary.some((e) => e.id === testExerciseA.id)).toBe(true);
    });

    it('should throw NotFoundException for unknown muscle code', async () => {
      await expect(
        anatomyService.getMuscleDetail(orgA.id, 'NON_EXISTENT_MUSCLE_123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // 3. MOVEMENT PATTERNS CATALOG & DETAIL
  // =========================================================================

  describe('Movement Patterns Catalog & Detail', () => {
    it('should return foundational movement patterns catalog with definitions', async () => {
      const movements = await anatomyService.getMovementsCatalog(orgA.id);

      expect(Array.isArray(movements)).toBe(true);
      expect(movements.length).toBeGreaterThanOrEqual(10);

      const squat = movements.find((m) => m.code === 'SQUAT');
      expect(squat).toBeDefined();
      expect(squat?.definition).toContain('simultaneous flexion and extension of the hips, knees, and ankles');
      expect(squat?.exerciseCount).toBeGreaterThan(0);

      const hinge = movements.find((m) => m.code === 'HINGE');
      expect(hinge).toBeDefined();
      expect(hinge?.definition).toContain('maximum hip flexion and minimal knee flexion');
    });

    it('should return movement pattern detail with biomechanical actions and exercises', async () => {
      const detail = await anatomyService.getMovementPatternDetail(orgA.id, 'SQUAT');

      expect(detail.code).toBe('SQUAT');
      expect(detail.name).toBe('Squat Pattern');
      expect(detail.primaryJointActions.length).toBeGreaterThan(0);
      expect(detail.commonBodyPositions).toContain('SQUATTING');

      // Test exercise should be listed in common exercises
      expect(detail.exercises.some((e) => e.id === testExerciseA.id)).toBe(true);
    });

    it('should throw NotFoundException for unknown movement pattern', async () => {
      await expect(
        anatomyService.getMovementPatternDetail(orgA.id, 'FLYING_PATTERN'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // 4. AUTHORING: WHY THIS EXERCISE WORKS
  // =========================================================================

  describe('Authoring "Why This Exercise Works"', () => {
    it('should allow trainer to author custom biomechanical educational content', async () => {
      const customContent = {
        overview: 'Custom trainer-authored squat breakdown emphasizing posterior pelvic stability.',
        mechanicsExplanation: 'Knee tracking alignment prevents meniscus shearing forces under heavy axial bar loads.',
        primaryDrivers: ['Vastus Medialis', 'Gluteus Maximus'],
        jointAction: 'Triple extension across ankle, knee, and hip joints',
        stabilizationFocus: 'Transverse abdominis intra-abdominal cylinder bracing',
        benefits: [
          'Maximizes quad hypertrophy without patellofemoral irritation',
          'Reinforces functional upright posture under load',
        ],
      };

      const updated = await anatomyService.updateExerciseWhyItWorks(
        orgA.id,
        testExerciseA.id,
        customContent,
        actorTrainerA,
      );

      expect(updated).toBeDefined();
      expect((updated.whyItWorks as any).overview).toBe(customContent.overview);

      // Verify that subsequent getExerciseAnatomy serves the authored content
      const anatomy = await anatomyService.getExerciseAnatomy(orgA.id, testExerciseA.id, userA.id);
      expect(anatomy.whyThisExerciseWorks.overview).toBe(customContent.overview);
      expect(anatomy.whyThisExerciseWorks.mechanicsExplanation).toBe(customContent.mechanicsExplanation);
      expect(anatomy.whyThisExerciseWorks.primaryDrivers).toContain('Vastus Medialis');
      expect(anatomy.whyThisExerciseWorks.jointAction).toBe(customContent.jointAction);
    });
  });

  // =========================================================================
  // 5. MULTI-TENANT SECURITY & IDOR PROTECTION
  // =========================================================================

  describe('Multi-Tenant Security & Isolation', () => {
    it('should prevent Tenant B from accessing Tenant A private exercise anatomy', async () => {
      await expect(
        anatomyService.getExerciseAnatomy(orgB.id, testExerciseA.id, userB.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent Tenant A trainer from authoring educational content on Tenant B exercise', async () => {
      await expect(
        anatomyService.updateExerciseWhyItWorks(
          orgA.id,
          testExerciseB.id,
          { overview: 'Malicious cross-tenant edit' },
          actorTrainerA,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
