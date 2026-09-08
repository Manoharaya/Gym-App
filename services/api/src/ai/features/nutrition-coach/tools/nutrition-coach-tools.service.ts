import {
  Injectable,
  Logger,
  OnModuleInit,
  ForbiddenException,
} from '@nestjs/common';
import { AIToolRegistryService } from '../../../services/ai-tool-registry.service';
import { PrismaService } from '../../../../database/prisma.service';
import { AIToolContext } from '@fitcore/types';

@Injectable()
export class NutritionCoachToolsService implements OnModuleInit {
  private readonly logger = new Logger(NutritionCoachToolsService.name);

  constructor(
    private readonly toolRegistry: AIToolRegistryService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.registerNutritionCoachTools();
  }

  private registerNutritionCoachTools() {
    // 1. get_nutrition_profile
    this.toolRegistry.registerTool({
      name: 'get_nutrition_profile',
      description:
        'Retrieves documented nutrition preferences, dietary pattern, and safety-critical allergies for the authenticated member.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: { type: 'object', properties: {} },
      execute: async (_input: any, context: AIToolContext) => {
        const memberId = this.resolveValidatedMemberId(context);
        const profile = await this.prisma.nutritionProfile.findUnique({
          where: { memberProfileId: memberId },
          select: {
            dietaryPattern: true,
            nutritionGoal: true,
            activityLevel: true,
            allergies: true,
            intolerances: true,
            foodsAvoided: true,
            preferredUnits: true,
          },
        });

        return { memberId, profile: profile || null };
      },
    });

    // 2. get_nutrition_targets
    this.toolRegistry.registerTool({
      name: 'get_nutrition_targets',
      description:
        'Returns the current active daily calorie and macronutrient targets for the authenticated member.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: { type: 'object', properties: {} },
      execute: async (_input: any, context: AIToolContext) => {
        const memberId = this.resolveValidatedMemberId(context);
        const target = await this.prisma.nutritionTarget.findFirst({
          where: { memberProfileId: memberId, status: 'ACTIVE' },
          select: {
            dailyCalories: true,
            proteinGrams: true,
            carbohydrateGrams: true,
            fatGrams: true,
            fiberGrams: true,
            waterMl: true,
            source: true,
            effectiveFrom: true,
          },
        });

        return { memberId, hasActiveTarget: !!target, target: target || null };
      },
    });

    // 3. get_current_meal_plan
    this.toolRegistry.registerTool({
      name: 'get_current_meal_plan',
      description:
        'Fetches the currently assigned meal plan, version, daily structure, and prescribed foods for the authenticated member.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: { type: 'object', properties: {} },
      execute: async (_input: any, context: AIToolContext) => {
        const memberId = this.resolveValidatedMemberId(context);
        const assignment = await this.prisma.memberMealPlanAssignment.findFirst({
          where: { memberProfileId: memberId, status: 'ACTIVE' },
          include: {
            mealPlan: {
              select: {
                id: true,
                name: true,
                description: true,
                version: true,
                targetDailyCalories: true,
                targetProteinGrams: true,
              },
            },
          },
        });

        return {
          memberId,
          hasAssignedPlan: !!assignment,
          mealPlan: assignment?.mealPlan || null,
        };
      },
    });

    // 4. get_recent_food_logs
    this.toolRegistry.registerTool({
      name: 'get_recent_food_logs',
      description:
        'Retrieves verified food logs recorded by the authenticated member for a given date or recent window.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 20 },
        },
      },
      execute: async (input: any, context: AIToolContext) => {
        const memberId = this.resolveValidatedMemberId(context);
        const limit = Math.min(input.limit || 10, 20);

        const logs = await this.prisma.foodLog.findMany({
          where: { memberProfileId: memberId },
          orderBy: { consumedAt: 'desc' },
          take: limit,
          include: {
            food: { select: { name: true, category: true } },
          },
        });

        return {
          memberId,
          count: logs.length,
          logs: logs.map((l) => ({
            id: l.id,
            foodName: l.food?.name || 'Custom item',
            mealType: l.mealType,
            quantity: l.quantity,
            unit: l.unit,
            calories: l.calories,
            protein: l.protein,
            carbohydrates: l.carbohydrates,
            fat: l.fat,
            consumedAt: l.consumedAt,
          })),
        };
      },
    });

    // 5. get_daily_nutrition_summary
    this.toolRegistry.registerTool({
      name: 'get_daily_nutrition_summary',
      description:
        'Returns deterministic macro and calorie adherence statistics for the authenticated member on a given date.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'YYYY-MM-DD format' },
        },
      },
      execute: async (input: any, context: AIToolContext) => {
        const memberId = this.resolveValidatedMemberId(context);
        const queryDate = input.date ? new Date(input.date) : new Date();
        const startOfDay = new Date(queryDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(queryDate);
        endOfDay.setHours(23, 59, 59, 999);

        const [foodLogs, waterLogs, target] = await Promise.all([
          this.prisma.foodLog.findMany({
            where: {
              memberProfileId: memberId,
              consumedAt: { gte: startOfDay, lte: endOfDay },
            },
          }),
          this.prisma.waterLog.findMany({
            where: {
              memberProfileId: memberId,
              loggedAt: { gte: startOfDay, lte: endOfDay },
            },
          }),
          this.prisma.nutritionTarget.findFirst({
            where: { memberProfileId: memberId, status: 'ACTIVE' },
          }),
        ]);

        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbohydrates = 0;
        let totalFat = 0;

        for (const l of foodLogs) {
          totalCalories += l.calories;
          totalProtein += l.protein;
          totalCarbohydrates += l.carbohydrates;
          totalFat += l.fat;
        }

        const totalWaterMl = waterLogs.reduce((acc, w) => acc + w.amountMl, 0);
        const targetCalories = target?.dailyCalories ?? 2000;
        const targetProtein = target?.proteinGrams ?? 150;

        return {
          date: startOfDay.toISOString().split('T')[0],
          consumed: {
            calories: Math.round(totalCalories),
            protein: Math.round(totalProtein),
            carbohydrates: Math.round(totalCarbohydrates),
            fat: Math.round(totalFat),
            waterMl: totalWaterMl,
          },
          target: {
            calories: targetCalories,
            protein: targetProtein,
            waterMl: target?.waterMl ?? 2500,
          },
          adherencePct: {
            calories: targetCalories > 0 ? Math.round((totalCalories / targetCalories) * 100) : 0,
            protein: targetProtein > 0 ? Math.round((totalProtein / targetProtein) * 100) : 0,
          },
        };
      },
    });

    // 6. get_food_alternatives
    this.toolRegistry.registerTool({
      name: 'get_food_alternatives',
      description:
        'Searches the verified Food Library for alternative food items matching a target category or macro profile, safely excluding member allergens.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          minProtein: { type: 'number' },
        },
      },
      execute: async (input: any, context: AIToolContext) => {
        const memberId = this.resolveValidatedMemberId(context);

        // Fetch member allergies to filter out unsafe alternatives
        const profile = await this.prisma.nutritionProfile.findUnique({
          where: { memberProfileId: memberId },
          select: { allergies: true },
        });

        const allergies = (profile?.allergies || []).map((a) => a.toLowerCase());

        const where: any = {
          status: 'ACTIVE',
          ownership: 'SYSTEM',
        };

        if (input.category) {
          where.category = input.category;
        }
        if (input.minProtein) {
          where.protein = { gte: input.minProtein };
        }

        const foods = await this.prisma.food.findMany({
          where,
          take: 10,
          select: {
            id: true,
            name: true,
            category: true,
            servingSize: true,
            servingUnit: true,
            calories: true,
            protein: true,
            carbohydrates: true,
            fat: true,
          },
        });

        // Safe filter: remove foods matching member allergies
        const safeFoods = foods.filter((f) => {
          const lowerName = f.name.toLowerCase();
          return !allergies.some((a) => a.length > 2 && lowerName.includes(a));
        });

        return {
          memberId,
          alternatives: safeFoods,
        };
      },
    });

    // 7. get_training_nutrition_context
    this.toolRegistry.registerTool({
      name: 'get_training_nutrition_context',
      description:
        'Fetches scheduled workouts or recent sessions for the authenticated member to inform pre/post workout nutrition guidance.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: { type: 'object', properties: {} },
      execute: async (_input: any, context: AIToolContext) => {
        const memberId = this.resolveValidatedMemberId(context);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const workout = await this.prisma.workout.findFirst({
          where: {
            memberProfileId: memberId,
            scheduledDate: { gte: todayStart, lte: todayEnd },
          },
          select: { id: true, title: true, scheduledDate: true, status: true },
        });

        return {
          memberId,
          todayScheduledWorkout: workout || null,
          hasSessionToday: !!workout,
        };
      },
    });

    this.logger.log('AI Nutrition Coach read-only tools registered successfully.');
  }

  /**
   * Slice 34: Strict tool authorization. Never trust model-generated IDs.
   * Binds execution strictly to the authenticated member context.
   */
  private resolveValidatedMemberId(context: AIToolContext): string {
    if (!context.memberId) {
      throw new ForbiddenException('Tool execution requires authenticated member context');
    }
    return context.memberId;
  }
}
