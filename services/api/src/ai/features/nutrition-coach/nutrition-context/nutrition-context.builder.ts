import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { NutritionProfileService } from '../../../../nutrition/services/nutrition-profile.service';
import { NutritionTargetService } from '../../../../nutrition/services/nutrition-target.service';
import { MealPlanService } from '../../../../nutrition/services/meal-plan.service';
import { FoodLogService } from '../../../../nutrition/services/food-log.service';
import { NutritionSummaryService } from '../../../../nutrition/services/nutrition-summary.service';
import { NutritionContextPolicy } from './nutrition-context.policy';
import { AuthenticatedUser } from '../../../../common/interfaces/request-with-user.interface';
import type {
  NutritionAIContext,
  NutritionAIContextFoodLogItem,
} from './nutrition-context.types';
import type { AINutritionCoachProfileDto } from '@fitcore/types';

@Injectable()
export class NutritionContextBuilder {
  private readonly logger = new Logger(NutritionContextBuilder.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly profileService: NutritionProfileService,
    private readonly targetService: NutritionTargetService,
    private readonly mealPlanService: MealPlanService,
    private readonly foodLogService: FoodLogService,
    private readonly summaryService: NutritionSummaryService,
    private readonly contextPolicy: NutritionContextPolicy,
  ) {}

  /**
   * Assembles authorized, grounded nutrition context for a member.
   * Performs deterministic calculations server-side.
   */
  async buildContext(
    memberId: string,
    organisationId: string,
    coachProfile: AINutritionCoachProfileDto,
    actor: AuthenticatedUser,
    options: { includeTrainingContext?: boolean; targetDate?: Date } = {},
  ): Promise<NutritionAIContext> {
    const targetDate = options.targetDate || new Date();

    // 1. Fetch domain data in parallel
    const [profileData, activeTarget, assignedMealPlan, foodLogs, dailySummary] =
      await Promise.all([
        this.profileService.getProfile(organisationId, memberId, actor).catch((e) => {
          this.logger.warn(`Could not load nutrition profile for ${memberId}: ${e.message}`);
          return null;
        }),
        this.targetService.getActiveTarget(organisationId, memberId, actor).catch((e) => {
          this.logger.warn(`Could not load nutrition target for ${memberId}: ${e.message}`);
          return null;
        }),
        this.mealPlanService.getAssignedMealPlan(organisationId, memberId, actor).catch((e) => {
          this.logger.warn(`Could not load meal plan for ${memberId}: ${e.message}`);
          return null;
        }),
        this.foodLogService.getFoodLogs(organisationId, memberId, targetDate, actor).catch((e) => {
          this.logger.warn(`Could not load food logs for ${memberId}: ${e.message}`);
          return [];
        }),
        this.summaryService.getDailySummary(organisationId, memberId, targetDate, actor).catch((e) => {
          this.logger.warn(`Could not load daily summary for ${memberId}: ${e.message}`);
          return null;
        }),
      ]);

    // 2. Training context if authorized
    let trainingContext = undefined;
    if (options.includeTrainingContext) {
      trainingContext = await this.buildTrainingContext(memberId);
    }

    // 3. Format recent food logs
    const formattedLogs: NutritionAIContextFoodLogItem[] = (foodLogs || []).slice(0, 10).map((log: any) => ({
      id: log.id,
      foodName: log.food?.name || 'Custom Food',
      mealType: log.mealType,
      quantity: log.quantity,
      unit: log.unit || 'g',
      calories: log.calories,
      protein: log.protein,
      carbohydrates: log.carbohydrates,
      fat: log.fat,
      consumedAt: log.consumedAt?.toISOString() || new Date().toISOString(),
    }));

    // 4. Meal Breakdown for summary
    const mealBreakdown: Record<string, { calories: number; protein: number; itemsCount: number }> = {};
    for (const log of foodLogs || []) {
      if (!mealBreakdown[log.mealType]) {
        mealBreakdown[log.mealType] = { calories: 0, protein: 0, itemsCount: 0 };
      }
      mealBreakdown[log.mealType].calories += log.calories;
      mealBreakdown[log.mealType].protein += log.protein;
      mealBreakdown[log.mealType].itemsCount += 1;
    }

    // 5. Assigned Meal Plan Day & Meals extraction
    const todayMeals: Array<{
      mealName: string;
      mealType: string;
      timeOfDay?: string | null;
      items: Array<{ foodName: string; quantity: number; unit: string }>;
    }> = [];

    if (assignedMealPlan?.mealPlan?.days?.[0]?.meals) {
      for (const m of assignedMealPlan.mealPlan.days[0].meals) {
        todayMeals.push({
          mealName: m.name,
          mealType: m.mealType,
          items: (m.items || []).map((it: any) => ({
            foodName: it.food?.name || 'Food Item',
            quantity: it.quantity,
            unit: it.unit,
          })),
        });
      }
    }

    // 6. Assemble complete context
    const rawContext: NutritionAIContext = {
      identity: {
        memberId,
        organisationId,
        preferredLanguage: coachProfile.language || 'en',
        unitSystem: coachProfile.unitPreference || 'METRIC',
      },
      profile: {
        dietaryPattern: profileData?.dietaryPattern || 'OMNIVORE',
        nutritionGoal: profileData?.nutritionGoal || null,
        activityLevel: profileData?.activityLevel || null,
        allergies: profileData?.allergies || [],
        intolerances: profileData?.intolerances || [],
        foodsAvoided: profileData?.foodsAvoided || [],
        dietaryRestrictions: profileData?.dietaryRestrictions || null,
        preferences: (profileData?.preferences || []).map((p: any) => ({
          category: p.category,
          item: p.item,
          preferenceType: p.preferenceType,
        })),
      },
      targets: {
        hasActiveTarget: !!activeTarget,
        dailyCalories: activeTarget?.dailyCalories,
        proteinGrams: activeTarget?.proteinGrams,
        carbohydrateGrams: activeTarget?.carbohydrateGrams,
        fatGrams: activeTarget?.fatGrams,
        fiberGrams: activeTarget?.fiberGrams,
        waterMl: activeTarget?.waterMl,
        source: activeTarget?.source,
      },
      dailySummary: {
        date: targetDate.toISOString().split('T')[0],
        totalCalories: dailySummary?.totalCalories ?? 0,
        totalProtein: dailySummary?.totalProtein ?? 0,
        totalCarbohydrates: dailySummary?.totalCarbohydrates ?? 0,
        totalFat: dailySummary?.totalFat ?? 0,
        totalFiber: dailySummary?.totalFiber ?? 0,
        totalWaterMl: dailySummary?.totalWaterMl ?? 0,
        calorieAdherencePct: dailySummary?.calorieAdherencePct ?? 0,
        proteinAdherencePct: dailySummary?.proteinAdherencePct ?? 0,
        carbAdherencePct: dailySummary?.carbAdherencePct ?? 0,
        fatAdherencePct: dailySummary?.fatAdherencePct ?? 0,
        waterAdherencePct: dailySummary?.waterAdherencePct ?? 0,
        mealBreakdown,
      },
      recentFoodLogs: formattedLogs,
      mealPlan: {
        hasAssignedMealPlan: !!assignedMealPlan,
        planId: assignedMealPlan?.mealPlanId,
        planName: assignedMealPlan?.mealPlan?.name,
        version: assignedMealPlan?.mealPlan?.version,
        dietaryPattern: assignedMealPlan?.mealPlan?.dietaryPattern,
        targetDailyCalories: assignedMealPlan?.mealPlan?.targetDailyCalories,
        targetProteinGrams: assignedMealPlan?.mealPlan?.targetProteinGrams,
        daysCount: assignedMealPlan?.mealPlan?.days?.length || 0,
        todayMeals,
      },
      training: trainingContext,
      safetyConstraints: {
        documentedAllergies: profileData?.allergies || [],
        isAllergyProtected: (profileData?.allergies || []).length > 0,
        medicalBoundaryDisclaimer:
          'FitCore AI provides nutritional guidance for educational purposes and is not a substitute for clinical medical care.',
      },
    };

    // 7. Sanitize via context policy (removing PAR-Q, medical clearances, private notes, credentials)
    return this.contextPolicy.sanitizeContext(rawContext);
  }

  private async buildTrainingContext(memberId: string) {
    try {
      const activePlan = await this.prisma.trainingPlan.findFirst({
        where: { memberProfileId: memberId, status: 'ACTIVE' },
        select: { id: true, name: true },
      });

      const recentWorkouts = await this.prisma.workout.findMany({
        where: { memberProfileId: memberId, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: 3,
        select: {
          title: true,
          completedAt: true,
          estimatedDurationMinutes: true,
        },
      });

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const todayWorkout = await this.prisma.workout.findFirst({
        where: {
          memberProfileId: memberId,
          scheduledDate: { gte: todayStart, lte: todayEnd },
        },
      });

      return {
        hasActiveTrainingPlan: !!activePlan,
        activePlanName: activePlan?.name,
        recentWorkouts: recentWorkouts.map((w) => ({
          name: w.title,
          date: w.completedAt?.toISOString() || '',
          durationMinutes: w.estimatedDurationMinutes || undefined,
        })),
        todayHasWorkout: !!todayWorkout,
      };
    } catch {
      return undefined;
    }
  }
}
