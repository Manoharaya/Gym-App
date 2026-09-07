import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { NutritionProfileService } from '../src/nutrition/services/nutrition-profile.service';
import { NutritionTargetService } from '../src/nutrition/services/nutrition-target.service';
import { FoodLibraryService } from '../src/nutrition/services/food-library.service';
import { MealService } from '../src/nutrition/services/meal.service';
import { MealPlanService } from '../src/nutrition/services/meal-plan.service';
import { FoodLogService } from '../src/nutrition/services/food-log.service';
import { NutritionSummaryService } from '../src/nutrition/services/nutrition-summary.service';
import { AuthenticatedUser } from '../src/common/interfaces/request-with-user.interface';
import {
  DietaryPatternEnum,
  NutritionGoalEnum,
  ActivityLevelEnum,
  PreferenceTypeEnum,
  MealTypeEnum,
  FoodCategoryEnum,
  TargetSourceEnum,
} from '../src/nutrition/dto/nutrition.dto';

describe('Day 16: Nutrition, Meal Planning & Food Tracking Foundation E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let profileService: NutritionProfileService;
  let targetService: NutritionTargetService;
  let foodService: FoodLibraryService;
  let mealService: MealService;
  let mealPlanService: MealPlanService;
  let foodLogService: FoodLogService;
  let summaryService: NutritionSummaryService;

  let orgA: any;
  let orgB: any;
  let outletA: any;
  let alexMember: any;
  let bobMemberOrgB: any;
  let marcusTrainer: any;
  let _mikeTrainer: any;

  let actorOwnerOrgA: AuthenticatedUser;
  let actorMarcusTrainer: AuthenticatedUser;
  let actorMikeTrainer: AuthenticatedUser;
  let actorAlexMember: AuthenticatedUser;
  let actorFinanceOrgA: AuthenticatedUser;
  let actorReceptionOrgA: AuthenticatedUser;
  let actorBobMemberOrgB: AuthenticatedUser;

  let systemChickenBreast: any;
  let systemRolledOats: any;

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
    profileService = app.get(NutritionProfileService);
    targetService = app.get(NutritionTargetService);
    foodService = app.get(FoodLibraryService);
    mealService = app.get(MealService);
    mealPlanService = app.get(MealPlanService);
    foodLogService = app.get(FoodLogService);
    summaryService = app.get(NutritionSummaryService);

    // Retrieve seeded organisations & outlets
    orgA = await prisma.organisation.findFirstOrThrow({ where: { slug: 'second-wind' } });
    orgB = await prisma.organisation.findFirstOrThrow({ where: { slug: 'apex-strength' } });
    outletA = await prisma.outlet.findFirstOrThrow({ where: { organisationId: orgA.id } });

    // Organisation Owner
    const ownerUser = await prisma.user.findFirstOrThrow({ where: { email: 'owner@secondwind.com.au' } });
    actorOwnerOrgA = {
      id: ownerUser.id,
      email: ownerUser.email,
      firstName: ownerUser.firstName,
      lastName: ownerUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'ORGANISATION_OWNER', organisationId: orgA.id }],
      permissions: [
        { resource: 'nutrition', action: 'manage', scope: 'ORGANISATION' },
        { resource: 'nutrition_plans', action: 'manage', scope: 'ORGANISATION' },
        { resource: 'foods', action: 'manage', scope: 'ORGANISATION' },
        { resource: 'food_logs', action: 'manage', scope: 'ORGANISATION' },
      ],
    };

    // Member Alex (Org A)
    const alexUser = await prisma.user.findFirstOrThrow({ where: { email: 'member@secondwind.com.au' } });
    alexMember = await prisma.memberProfile.findFirstOrThrow({
      where: { userId: alexUser.id, organisationId: orgA.id },
    });
    actorAlexMember = {
      id: alexUser.id,
      email: alexUser.email,
      firstName: alexUser.firstName,
      lastName: alexUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'MEMBER', organisationId: orgA.id }],
      permissions: [
        { resource: 'nutrition', action: 'read', scope: 'SELF' },
        { resource: 'nutrition', action: 'write', scope: 'SELF' },
        { resource: 'nutrition_plans', action: 'read', scope: 'SELF' },
        { resource: 'foods', action: 'read', scope: 'ORGANISATION' },
        { resource: 'food_logs', action: 'manage', scope: 'SELF' },
      ],
    };

    // Trainer Marcus (Assigned to Alex)
    const marcusUser = await prisma.user.findFirstOrThrow({ where: { email: 'trainer@secondwind.com.au' } });
    marcusTrainer = await prisma.trainerProfile.findFirstOrThrow({
      where: { professionalName: 'Marcus Vance' },
    });
    actorMarcusTrainer = {
      id: marcusUser.id,
      email: marcusUser.email,
      firstName: marcusUser.firstName,
      lastName: marcusUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'TRAINER', organisationId: orgA.id }],
      permissions: [
        { resource: 'nutrition', action: 'manage', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'nutrition_plans', action: 'manage', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'foods', action: 'read', scope: 'ORGANISATION' },
        { resource: 'foods', action: 'write', scope: 'ORGANISATION' },
        { resource: 'food_logs', action: 'manage', scope: 'ASSIGNED_CLIENTS' },
      ],
    };

    // Ensure Marcus has an active client assignment for Alex
    const existingAssignment = await prisma.trainerClientAssignment.findFirst({
      where: { trainerProfileId: marcusTrainer.id, memberProfileId: alexMember.id },
    });
    if (!existingAssignment) {
      await prisma.trainerClientAssignment.create({
        data: {
          organisationId: orgA.id,
          outletId: outletA.id,
          trainerProfileId: marcusTrainer.id,
          memberProfileId: alexMember.id,
          status: 'ACTIVE',
          assignmentType: 'PRIMARY',
          startDate: new Date(),
        },
      });
    }

    // Unassigned Trainer Mike
    const mikeUser = await prisma.user.upsert({
      where: { email: 'mike.nutrition.unassigned@secondwind.com.au' },
      update: {},
      create: {
        email: 'mike.nutrition.unassigned@secondwind.com.au',
        passwordHash: 'dummy',
        firstName: 'Mike',
        lastName: 'Unassigned',
        status: 'ACTIVE',
      },
    });
    const mikeStaff = await prisma.staffProfile.upsert({
      where: { userId: mikeUser.id },
      update: {},
      create: {
        userId: mikeUser.id,
        organisationId: orgA.id,
        displayName: 'Mike Unassigned',
        jobTitle: 'Trainer',
      },
    });
    _mikeTrainer = await prisma.trainerProfile.upsert({
      where: { staffProfileId: mikeStaff.id },
      update: {},
      create: {
        staffProfileId: mikeStaff.id,
        organisationId: orgA.id,
        professionalName: 'Mike Unassigned',
        status: 'ACTIVE',
      },
    });
    actorMikeTrainer = {
      id: mikeUser.id,
      email: mikeUser.email,
      firstName: mikeUser.firstName,
      lastName: mikeUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'TRAINER', organisationId: orgA.id }],
      permissions: [
        { resource: 'nutrition', action: 'manage', scope: 'ASSIGNED_CLIENTS' },
        { resource: 'food_logs', action: 'manage', scope: 'ASSIGNED_CLIENTS' },
      ],
    };

    // Finance user (Org A)
    const financeUser = await prisma.user.findFirstOrThrow({ where: { email: 'finance@secondwind.com.au' } });
    actorFinanceOrgA = {
      id: financeUser.id,
      email: financeUser.email,
      firstName: financeUser.firstName,
      lastName: financeUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'FINANCE', organisationId: orgA.id }],
      permissions: [{ resource: 'payments', action: 'manage', scope: 'ORGANISATION' }],
    };

    // Receptionist user (Org A)
    const receptionUser = await prisma.user.findFirstOrThrow({ where: { email: 'reception@secondwind.com.au' } });
    actorReceptionOrgA = {
      id: receptionUser.id,
      email: receptionUser.email,
      firstName: receptionUser.firstName,
      lastName: receptionUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'RECEPTION', organisationId: orgA.id, outletId: outletA.id }],
      permissions: [{ resource: 'members', action: 'read', scope: 'OUTLET' }],
    };

    // Member in Organisation B (Cross-tenant actor)
    const bobUser = await prisma.user.upsert({
      where: { email: 'bob.nutrition@apexstrength.com.au' },
      update: {},
      create: {
        email: 'bob.nutrition@apexstrength.com.au',
        passwordHash: 'dummy',
        firstName: 'Bob',
        lastName: 'Apex',
        status: 'ACTIVE',
      },
    });
    bobMemberOrgB = await prisma.memberProfile.upsert({
      where: { userId: bobUser.id },
      update: {},
      create: {
        userId: bobUser.id,
        organisationId: orgB.id,
        status: 'ACTIVE',
      },
    });
    actorBobMemberOrgB = {
      id: bobUser.id,
      email: bobUser.email,
      firstName: bobUser.firstName,
      lastName: bobUser.lastName,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ role: 'MEMBER', organisationId: orgB.id }],
      permissions: [
        { resource: 'nutrition', action: 'read', scope: 'SELF' },
        { resource: 'food_logs', action: 'manage', scope: 'SELF' },
      ],
    };

    // Clean up any test records for alexMember to ensure clean idempotent runs
    await prisma.foodLog.deleteMany({ where: { memberProfileId: alexMember.id } });
    await prisma.waterLog.deleteMany({ where: { memberProfileId: alexMember.id } });
    await prisma.nutritionSummary.deleteMany({ where: { memberProfileId: alexMember.id } });
    await prisma.memberMealPlanAssignment.deleteMany({ where: { memberProfileId: alexMember.id } });
    await prisma.mealPlanFoodItem.deleteMany({ where: { mealPlanMeal: { mealPlanDay: { mealPlan: { organisationId: orgA.id } } } } });
    await prisma.mealPlanMeal.deleteMany({ where: { mealPlanDay: { mealPlan: { organisationId: orgA.id } } } });
    await prisma.mealPlanDay.deleteMany({ where: { mealPlan: { organisationId: orgA.id } } });
    await prisma.mealPlan.deleteMany({ where: { organisationId: orgA.id } });
    await prisma.mealFoodItem.deleteMany({ where: { meal: { organisationId: orgA.id } } });
    await prisma.meal.deleteMany({ where: { organisationId: orgA.id } });
    await prisma.nutritionTarget.deleteMany({ where: { memberProfileId: alexMember.id } });
    await prisma.dietaryPreference.deleteMany({ where: { memberProfileId: alexMember.id } });
    await prisma.nutritionProfile.deleteMany({ where: { memberProfileId: alexMember.id } });
    await prisma.food.deleteMany({ where: { organisationId: orgA.id } });
    await prisma.food.deleteMany({ where: { organisationId: orgB.id } });

    // Ensure system foods are seeded
    await foodService.seedSystemFoods();
    systemChickenBreast = await prisma.food.findFirstOrThrow({
      where: { name: 'Chicken Breast (Raw, Skinless)', ownership: 'SYSTEM' },
    });
    systemRolledOats = await prisma.food.findFirstOrThrow({
      where: { name: 'Rolled Oats (Raw)', ownership: 'SYSTEM' },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================================================
  // 1. NUTRITION PROFILE & PREFERENCES LIFECYCLE
  // ============================================================================
  describe('1. Nutrition Profile & Preferences Lifecycle', () => {
    it('should retrieve or create default member profile (OMNIVORE)', async () => {
      const profile = await profileService.getProfile(orgA.id, alexMember.id, actorAlexMember);
      expect(profile).toBeDefined();
      expect(profile.memberProfileId).toBe(alexMember.id);
      expect(profile.dietaryPattern).toBe('OMNIVORE');
      expect(profile.preferredUnits).toBe('METRIC');
      expect(profile.status).toBe('ACTIVE');
    });

    it('should update profile with dietary pattern, activity level, and nutrition goal', async () => {
      const updated = await profileService.createOrUpdateProfile(
        orgA.id,
        alexMember.id,
        {
          dietaryPattern: DietaryPatternEnum.HIGH_PROTEIN,
          activityLevel: ActivityLevelEnum.VERY_ACTIVE,
          nutritionGoal: NutritionGoalEnum.MUSCLE_GAIN,
          timezone: 'Australia/Perth',
          notes: 'Focus on lean mass gains',
        },
        actorAlexMember,
      );

      expect(updated.dietaryPattern).toBe('HIGH_PROTEIN');
      expect(updated.activityLevel).toBe('VERY_ACTIVE');
      expect(updated.nutritionGoal).toBe('MUSCLE_GAIN');
      expect(updated.notes).toBe('Focus on lean mass gains');
    });

    it('should add structured dietary preferences and sync items into profile arrays', async () => {
      const allergyPref = await profileService.addDietaryPreference(
        orgA.id,
        alexMember.id,
        {
          preferenceType: PreferenceTypeEnum.ALLERGY,
          itemName: 'Peanuts',
          severity: undefined,
          notes: 'Mild reaction',
        },
        actorAlexMember,
      );

      expect(allergyPref).toBeDefined();
      expect(allergyPref.itemName).toBe('Peanuts');

      const intolerancePref = await profileService.addDietaryPreference(
        orgA.id,
        alexMember.id,
        {
          preferenceType: PreferenceTypeEnum.INTOLERANCE,
          itemName: 'Lactose',
          notes: 'Digestive discomfort',
        },
        actorAlexMember,
      );

      expect(intolerancePref.itemName).toBe('Lactose');

      // Verify synced into profile
      const profile = await profileService.getProfile(orgA.id, alexMember.id, actorAlexMember);
      expect(profile.allergies).toContain('Peanuts');
      expect(profile.intolerances).toContain('Lactose');
      expect(profile.preferences.length).toBe(2);
    });

    it('should delete dietary preference', async () => {
      const profileBefore = await profileService.getProfile(orgA.id, alexMember.id, actorAlexMember);
      const prefToDelete = profileBefore.preferences[0];

      const res = await profileService.deleteDietaryPreference(
        orgA.id,
        alexMember.id,
        prefToDelete.id,
        actorAlexMember,
      );
      expect(res.success).toBe(true);

      const profileAfter = await profileService.getProfile(orgA.id, alexMember.id, actorAlexMember);
      expect(profileAfter.preferences.length).toBe(1);
    });
  });

  // ============================================================================
  // 2. NUTRITION TARGETS LIFECYCLE
  // ============================================================================
  describe('2. Nutrition Targets Lifecycle', () => {
    let initialTarget: any;

    it('should configure initial nutrition target', async () => {
      initialTarget = await targetService.setTarget(
        orgA.id,
        alexMember.id,
        {
          dailyCalories: 2200,
          proteinGrams: 175,
          carbohydrateGrams: 220,
          fatGrams: 70,
          fiberGrams: 30,
          waterMl: 2800,
          source: TargetSourceEnum.TRAINER_ASSIGNED,
          notes: 'Phase 1 Hypertrophy',
        },
        actorMarcusTrainer,
      );

      expect(initialTarget).toBeDefined();
      expect(initialTarget.dailyCalories).toBe(2200);
      expect(initialTarget.proteinGrams).toBe(175);
      expect(initialTarget.status).toBe('ACTIVE');
      expect(initialTarget.source).toBe('TRAINER_ASSIGNED');
    });

    it('should update nutrition target and mark previous target as HISTORICAL with effectiveTo set', async () => {
      const newTarget = await targetService.setTarget(
        orgA.id,
        alexMember.id,
        {
          dailyCalories: 2400,
          proteinGrams: 190,
          carbohydrateGrams: 250,
          fatGrams: 75,
          waterMl: 3000,
          source: TargetSourceEnum.TRAINER_ASSIGNED,
          notes: 'Phase 2 Surplus',
        },
        actorMarcusTrainer,
      );

      expect(newTarget.dailyCalories).toBe(2400);
      expect(newTarget.status).toBe('ACTIVE');

      // Check initial target is now HISTORICAL
      const oldTargetDb = await prisma.nutritionTarget.findUniqueOrThrow({
        where: { id: initialTarget.id },
      });
      expect(oldTargetDb.status).toBe('HISTORICAL');
      expect(oldTargetDb.effectiveTo).toBeDefined();
    });

    it('should retrieve current active target', async () => {
      const active = await targetService.getActiveTarget(orgA.id, alexMember.id, actorAlexMember);
      expect(active.dailyCalories).toBe(2400);
      expect(active.proteinGrams).toBe(190);
      expect(active.status).toBe('ACTIVE');
    });

    it('should retrieve full target history timeline', async () => {
      const history = await targetService.getTargetHistory(orgA.id, alexMember.id, actorAlexMember);
      expect(history.length).toBe(2);
      expect(history[0].status).toBe('ACTIVE');
      expect(history[1].status).toBe('HISTORICAL');
    });
  });

  // ============================================================================
  // 3. FOOD LIBRARY & SEARCH LIFECYCLE
  // ============================================================================
  describe('3. Food Library & Search Lifecycle', () => {
    let orgAFood: any;

    it('should list seeded system foods with macros and micronutrients', async () => {
      expect(systemChickenBreast).toBeDefined();
      expect(systemChickenBreast.ownership).toBe('SYSTEM');
      expect(systemChickenBreast.protein).toBe(22.5);
      expect(systemChickenBreast.calories).toBe(120);

      expect(systemRolledOats).toBeDefined();
      expect(systemRolledOats.ownership).toBe('SYSTEM');
      expect(systemRolledOats.fiber).toBe(5.3);
    });

    it('should create custom organisation-scoped food', async () => {
      orgAFood = await foodService.createOrganisationFood(
        orgA.id,
        {
          name: 'SecondWind Signature Recovery Shake',
          brand: 'SecondWind Lab',
          category: FoodCategoryEnum.SUPPLEMENTS,
          servingSize: 400,
          servingUnit: 'ml',
          calories: 320,
          protein: 35,
          carbohydrates: 30,
          fat: 6,
          fiber: 2,
        },
        actorOwnerOrgA,
      );

      expect(orgAFood).toBeDefined();
      expect(orgAFood.ownership).toBe('ORGANISATION');
      expect(orgAFood.organisationId).toBe(orgA.id);
      expect(orgAFood.calories).toBe(320);
    });

    it('should reject updating system food with 403 SYSTEM_FOOD_IMMUTABLE', async () => {
      await expect(
        foodService.updateOrganisationFood(
          orgA.id,
          systemChickenBreast.id,
          { calories: 999 },
          actorOwnerOrgA,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should search foods returning both system and caller organisation foods', async () => {
      const searchRes = await foodService.searchFoods(
        orgA.id,
        { query: 'Chicken' },
        actorAlexMember,
      );
      expect(searchRes.items.length).toBeGreaterThan(0);
      expect(searchRes.items.some((f) => f.name.includes('Chicken Breast'))).toBe(true);

      const customSearch = await foodService.searchFoods(
        orgA.id,
        { query: 'SecondWind' },
        actorAlexMember,
      );
      expect(customSearch.items.length).toBe(1);
      expect(customSearch.items[0].name).toBe('SecondWind Signature Recovery Shake');
    });

    it('should enforce tenant isolation: Org B cannot see Org A custom food', async () => {
      const orgBSearch = await foodService.searchFoods(
        orgB.id,
        { query: 'SecondWind' },
        actorBobMemberOrgB,
      );
      expect(orgBSearch.items.length).toBe(0);
    });
  });

  // ============================================================================
  // 4. MEALS & MEAL ITEMS LIFECYCLE
  // ============================================================================
  describe('4. Meals & Meal Items Lifecycle', () => {
    let meal: any;
    let mealItem: any;

    it('should create a meal (POST_WORKOUT)', async () => {
      meal = await mealService.createMeal(
        orgA.id,
        alexMember.id,
        {
          name: 'Post-Workout Fuel',
          mealType: MealTypeEnum.POST_WORKOUT,
          scheduledTime: '18:00',
          notes: 'High protein recovery',
        },
        actorAlexMember,
      );

      expect(meal).toBeDefined();
      expect(meal.name).toBe('Post-Workout Fuel');
      expect(meal.mealType).toBe('POST_WORKOUT');
    });

    it('should add food items to meal with calculated macro contributions', async () => {
      // 200g Chicken Breast (servingSize is 100g, 120 kcal, 22.5g protein) -> factor = 2.0 -> 240 kcal, 45g protein
      mealItem = await mealService.addFoodToMeal(
        orgA.id,
        meal.id,
        {
          foodId: systemChickenBreast.id,
          quantity: 200,
          unit: 'g',
        },
        actorAlexMember,
      );

      expect(mealItem).toBeDefined();
      expect(mealItem.calories).toBe(240);
      expect(mealItem.protein).toBe(45);
    });

    it('should retrieve meal with items and aggregated totals', async () => {
      const mealWithTotals = await mealService.getMealWithItems(orgA.id, meal.id, actorAlexMember);
      expect(mealWithTotals.items.length).toBe(1);
      expect(mealWithTotals.totals.calories).toBe(240);
      expect(mealWithTotals.totals.protein).toBe(45);
    });

    it('should remove food item from meal', async () => {
      const res = await mealService.removeFoodFromMeal(
        orgA.id,
        meal.id,
        mealItem.id,
        actorAlexMember,
      );
      expect(res.success).toBe(true);

      const mealAfter = await mealService.getMealWithItems(orgA.id, meal.id, actorAlexMember);
      expect(mealAfter.items.length).toBe(0);
      expect(mealAfter.totals.calories).toBe(0);
    });
  });

  // ============================================================================
  // 5. MEAL PLANS & ASSIGNMENTS LIFECYCLE
  // ============================================================================
  describe('5. Meal Plans & Assignments Lifecycle', () => {
    let mealPlanV1: any;
    let mealPlanV2: any;
    let assignment: any;

    it('should create reusable organisation meal plan with days, meals, and items', async () => {
      mealPlanV1 = await mealPlanService.createMealPlan(
        orgA.id,
        {
          name: '7-Day Lean Bulk',
          description: 'High protein muscle building plan',
          dietaryPattern: DietaryPatternEnum.HIGH_PROTEIN,
          targetDailyCalories: 2600,
          durationDays: 7,
          days: [
            {
              dayNumber: 1,
              dayName: 'Day 1 - Push Day Fuel',
              meals: [
                {
                  name: 'Power Breakfast',
                  mealType: MealTypeEnum.BREAKFAST,
                  items: [
                    {
                      foodId: systemRolledOats.id,
                      quantity: 100, // 2x serving (50g) -> ~378 kcal, 13.6g protein
                      unit: 'g',
                    },
                  ],
                },
              ],
            },
          ],
        },
        actorOwnerOrgA,
      );

      expect(mealPlanV1).toBeDefined();
      expect(mealPlanV1.name).toBe('7-Day Lean Bulk');
      expect(mealPlanV1.version).toBe(1);
      expect(mealPlanV1.days.length).toBe(1);
      expect(mealPlanV1.days[0].meals.length).toBe(1);
    });

    it('should create new version (v2) of meal plan without mutating v1', async () => {
      mealPlanV2 = await mealPlanService.createMealPlanVersion(
        orgA.id,
        mealPlanV1.id,
        {
          name: '7-Day Lean Bulk (Enhanced)',
          targetDailyCalories: 2800,
        },
        actorOwnerOrgA,
      );

      expect(mealPlanV2.version).toBe(2);
      expect(mealPlanV2.parentId).toBe(mealPlanV1.id);
      expect(mealPlanV2.targetDailyCalories).toBe(2800);

      // Verify v1 still exists unchanged
      const v1Db = await mealPlanService.getMealPlanById(orgA.id, mealPlanV1.id, actorOwnerOrgA);
      expect(v1Db.version).toBe(1);
      expect(v1Db.targetDailyCalories).toBe(2600);
    });

    it('should assign meal plan to member with immutable plan snapshot', async () => {
      assignment = await mealPlanService.assignMealPlan(
        orgA.id,
        alexMember.id,
        {
          mealPlanId: mealPlanV1.id,
          effectiveFrom: new Date().toISOString(),
          notes: 'Follow for the next 4 weeks',
        },
        actorMarcusTrainer,
      );

      expect(assignment).toBeDefined();
      expect(assignment.status).toBe('ACTIVE');
      expect(assignment.planSnapshot).toBeDefined();
      expect((assignment.planSnapshot as any).name).toBe('7-Day Lean Bulk');
    });

    it('should retrieve active assigned meal plan', async () => {
      const activePlan = await mealPlanService.getAssignedMealPlan(
        orgA.id,
        alexMember.id,
        actorAlexMember,
      );
      expect(activePlan).toBeDefined();
      expect(activePlan?.mealPlanId).toBe(mealPlanV1.id);
    });
  });

  // ============================================================================
  // 6. FOOD LOGGING & HISTORICAL NUTRITION SNAPSHOTS
  // ============================================================================
  describe('6. Food Logging & Historical Nutrition Snapshots', () => {
    let loggedItem: any;
    let customFoodToMutate: any;

    it('should log food consumption with immutable nutritional snapshot', async () => {
      // 150g Chicken Breast: factor = 150 / 100 = 1.5 -> calories = 120 * 1.5 = 180, protein = 22.5 * 1.5 = 33.8
      loggedItem = await foodLogService.logFood(
        orgA.id,
        alexMember.id,
        {
          foodId: systemChickenBreast.id,
          mealType: MealTypeEnum.LUNCH,
          quantity: 150,
          unit: 'g',
          idempotencyKey: 'idemp-chicken-lunch-001',
          notes: 'Grilled with spices',
        },
        actorAlexMember,
      );

      expect(loggedItem).toBeDefined();
      expect(loggedItem.foodNameAtLog).toBe(systemChickenBreast.name);
      expect(loggedItem.calories).toBe(180);
      expect(loggedItem.protein).toBe(33.8);
      expect(loggedItem.carbohydrates).toBe(0);
      expect(loggedItem.fat).toBe(3.9);
    });

    it('should retain exact snapshot values in food log when source food in library is modified', async () => {
      // Create mutable org food
      customFoodToMutate = await foodService.createOrganisationFood(
        orgA.id,
        {
          name: 'Original Muscle Bar',
          category: FoodCategoryEnum.SNACKS,
          servingSize: 60,
          servingUnit: 'g',
          calories: 200,
          protein: 20,
          carbohydrates: 20,
          fat: 5,
        },
        actorOwnerOrgA,
      );

      // Log it
      const logToProtect = await foodLogService.logFood(
        orgA.id,
        alexMember.id,
        {
          foodId: customFoodToMutate.id,
          mealType: MealTypeEnum.SNACK,
          quantity: 60,
          unit: 'g',
        },
        actorAlexMember,
      );
      expect(logToProtect.calories).toBe(200);
      expect(logToProtect.protein).toBe(20);

      // Now mutate the source food in library (e.g. manufacturer reformulates to 300 kcal, 10g protein)
      await foodService.updateOrganisationFood(
        orgA.id,
        customFoodToMutate.id,
        {
          calories: 300,
          protein: 10,
        },
        actorOwnerOrgA,
      );

      // Re-fetch the old log from DB: its snapshot must NOT have changed!
      const historicalLog = await prisma.foodLog.findUniqueOrThrow({
        where: { id: logToProtect.id },
      });
      expect(historicalLog.calories).toBe(200);
      expect(historicalLog.protein).toBe(20);
    });

    it('should reject duplicate food log submissions with identical idempotencyKey', async () => {
      const duplicateAttempt = await foodLogService.logFood(
        orgA.id,
        alexMember.id,
        {
          foodId: systemChickenBreast.id,
          mealType: MealTypeEnum.LUNCH,
          quantity: 150,
          unit: 'g',
          idempotencyKey: 'idemp-chicken-lunch-001', // Identical key to first test
        },
        actorAlexMember,
      );

      // Should return original log without creating a new row
      expect(duplicateAttempt.id).toBe(loggedItem.id);

      const allChickenLogs = await prisma.foodLog.findMany({
        where: { memberProfileId: alexMember.id, idempotencyKey: 'idemp-chicken-lunch-001' },
      });
      expect(allChickenLogs.length).toBe(1);
    });

    it('should delete food log', async () => {
      const res = await foodLogService.deleteFoodLog(
        orgA.id,
        alexMember.id,
        loggedItem.id,
        actorAlexMember,
      );
      expect(res.success).toBe(true);

      const deleted = await prisma.foodLog.findUnique({
        where: { id: loggedItem.id },
      });
      expect(deleted).toBeNull();
    });
  });

  // ============================================================================
  // 7. HYDRATION & WATER TRACKING
  // ============================================================================
  describe('7. Hydration & Water Tracking', () => {
    it('should log water consumption and calculate daily hydration total', async () => {
      const w1 = await foodLogService.logWater(orgA.id, alexMember.id, { amountMl: 500 }, actorAlexMember);
      const w2 = await foodLogService.logWater(orgA.id, alexMember.id, { amountMl: 750 }, actorAlexMember);

      expect(w1.amountMl).toBe(500);
      expect(w2.amountMl).toBe(750);

      const logs = await foodLogService.getWaterLogs(orgA.id, alexMember.id, new Date(), actorAlexMember);
      const totalWater = logs.reduce((sum, l) => sum + l.amountMl, 0);
      expect(totalWater).toBe(1250);
    });
  });

  // ============================================================================
  // 8. DAILY NUTRITION SUMMARY & TARGET ADHERENCE
  // ============================================================================
  describe('8. Daily Nutrition Summary & Target Adherence', () => {
    beforeAll(async () => {
      // Set active target for Alex: 2400 kcal, 190g protein, 250g carbs, 75g fat, 3000ml water
      await targetService.setTarget(
        orgA.id,
        alexMember.id,
        {
          dailyCalories: 2400,
          proteinGrams: 190,
          carbohydrateGrams: 250,
          fatGrams: 75,
          waterMl: 3000,
        },
        actorMarcusTrainer,
      );

      // Clean logs for today
      await prisma.foodLog.deleteMany({ where: { memberProfileId: alexMember.id } });

      // Log Breakfast: 100g Rolled Oats (Raw) -> 378 kcal, 13.6g protein, 66.4g carbs, 6.8g fat
      await foodLogService.logFood(
        orgA.id,
        alexMember.id,
        {
          foodId: systemRolledOats.id,
          mealType: MealTypeEnum.BREAKFAST,
          quantity: 100,
          unit: 'g',
        },
        actorAlexMember,
      );

      // Log Lunch: 200g Chicken Breast -> 240 kcal, 45g protein, 0g carbs, 5.2g fat
      await foodLogService.logFood(
        orgA.id,
        alexMember.id,
        {
          foodId: systemChickenBreast.id,
          mealType: MealTypeEnum.LUNCH,
          quantity: 200,
          unit: 'g',
        },
        actorAlexMember,
      );
    });

    it('should calculate daily nutrition summary from real persisted food and water logs', async () => {
      const summary = await summaryService.getDailySummary(
        orgA.id,
        alexMember.id,
        new Date(),
        actorAlexMember,
      );

      expect(summary).toBeDefined();
      expect(summary.totalCalories).toBe(618); // 378 + 240
      expect(summary.totalProtein).toBe(58.6); // 13.6 + 45
      expect(summary.mealCount).toBe(2);
      expect(summary.foodItemCount).toBe(2);
      expect(summary.totalWaterMl).toBe(1250);
    });

    it('should calculate adherence percentages against configured targets', async () => {
      const summary = await summaryService.getDailySummary(
        orgA.id,
        alexMember.id,
        new Date(),
        actorAlexMember,
      );

      // Calorie Adherence: 618 / 2400 = ~26%
      expect(summary.calorieAdherencePct).toBe(26);
      // Protein Adherence: 58.6 / 190 = ~31%
      expect(summary.proteinAdherencePct).toBe(31);
      // Water Adherence: 1250 / 3000 = ~42%
      expect(summary.waterAdherencePct).toBe(42);

      // Remaining values
      expect(summary.remainingCalories).toBe(1782); // 2400 - 618
    });

    it('should cache daily summary in Redis and return cached response', async () => {
      const firstCall = await summaryService.getDailySummary(
        orgA.id,
        alexMember.id,
        new Date(),
        actorAlexMember,
      );
      const secondCall = await summaryService.getDailySummary(
        orgA.id,
        alexMember.id,
        new Date(),
        actorAlexMember,
      );

      expect(firstCall.totalCalories).toBe(secondCall.totalCalories);
      expect(secondCall.mealCount).toBe(2);
    });

    it('should invalidate Redis cache when new food log is recorded', async () => {
      // Log an afternoon snack: 100g Chicken Breast (120 kcal)
      await foodLogService.logFood(
        orgA.id,
        alexMember.id,
        {
          foodId: systemChickenBreast.id,
          mealType: MealTypeEnum.SNACK,
          quantity: 100,
          unit: 'g',
        },
        actorAlexMember,
      );

      // Summary should reflect the newly added 120 kcal immediately
      const updatedSummary = await summaryService.getDailySummary(
        orgA.id,
        alexMember.id,
        new Date(),
        actorAlexMember,
      );
      expect(updatedSummary.totalCalories).toBe(738); // 618 + 120
      expect(updatedSummary.mealCount).toBe(3);
    });

    it('should calculate 7-day nutrition trend averages', async () => {
      const trends = await summaryService.getNutritionTrends(
        orgA.id,
        alexMember.id,
        7,
        actorAlexMember,
      );

      expect(trends.period).toBe('7D');
      expect(trends.days.length).toBe(7);
      expect(trends.averages.calories).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // 9. MULTI-TENANT BOUNDARY, RBAC & IDOR SECURITY
  // ============================================================================
  describe('9. Multi-Tenant Boundary, RBAC & IDOR Security', () => {
    it('should allow member to view their own nutrition data', async () => {
      const profile = await profileService.getProfile(orgA.id, alexMember.id, actorAlexMember);
      expect(profile.memberProfileId).toBe(alexMember.id);
    });

    it('should reject cross-member IDOR attempt by unassigned member with 403 Forbidden', async () => {
      await expect(
        profileService.getProfile(orgA.id, alexMember.id, actorBobMemberOrgB),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        foodLogService.logFood(
          orgA.id,
          alexMember.id,
          {
            foodId: systemChickenBreast.id,
            mealType: MealTypeEnum.DINNER,
            quantity: 100,
            unit: 'g',
          },
          actorBobMemberOrgB,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow assigned trainer Marcus to view assigned client Alex nutrition', async () => {
      const summary = await summaryService.getDailySummary(
        orgA.id,
        alexMember.id,
        new Date(),
        actorMarcusTrainer,
      );
      expect(summary).toBeDefined();
      expect(summary.memberProfileId).toBe(alexMember.id);
    });

    it('should reject unassigned trainer Mike from viewing Alex nutrition with 403 TRAINER_UNASSIGNED_CLIENT', async () => {
      try {
        await summaryService.getDailySummary(orgA.id, alexMember.id, new Date(), actorMikeTrainer);
        fail('Should have thrown ForbiddenException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ForbiddenException);
        expect(err.response?.code).toBe('TRAINER_UNASSIGNED_CLIENT');
      }
    });

    it('should reject FINANCE role from accessing nutrition data with 403 ACCESS_DENIED_FINANCE_RESTRICTION', async () => {
      try {
        await summaryService.getDailySummary(orgA.id, alexMember.id, new Date(), actorFinanceOrgA);
        fail('Should have thrown ForbiddenException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ForbiddenException);
        expect(err.response?.code).toBe('ACCESS_DENIED_FINANCE_RESTRICTION');
      }
    });

    it('should reject RECEPTION role from accessing nutrition data with 403 ACCESS_DENIED_RECEPTION_RESTRICTION', async () => {
      try {
        await summaryService.getDailySummary(orgA.id, alexMember.id, new Date(), actorReceptionOrgA);
        fail('Should have thrown ForbiddenException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ForbiddenException);
        expect(err.response?.code).toBe('ACCESS_DENIED_RECEPTION_RESTRICTION');
      }
    });
  });

  // ============================================================================
  // 10. INPUT VALIDATION & SAFETY
  // ============================================================================
  describe('10. Input Validation & Safety', () => {
    it('should reject non-existent food ID with NotFoundException', async () => {
      await expect(
        foodLogService.logFood(
          orgA.id,
          alexMember.id,
          {
            foodId: 'non-existent-food-id-999',
            mealType: MealTypeEnum.LUNCH,
            quantity: 100,
            unit: 'g',
          },
          actorAlexMember,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject accessing member in wrong organisation with NotFoundException', async () => {
      await expect(
        profileService.getProfile(orgB.id, alexMember.id, actorOwnerOrgA),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
