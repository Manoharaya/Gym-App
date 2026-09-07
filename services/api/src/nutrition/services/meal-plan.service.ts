import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { NutritionProfileService } from './nutrition-profile.service';
import { FoodLibraryService } from './food-library.service';
import {
  CreateMealPlanDto,
  AssignMealPlanDto,
  MealPlanStatusEnum,
} from '../dto/nutrition.dto';

@Injectable()
export class MealPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profileService: NutritionProfileService,
    private readonly foodService: FoodLibraryService,
  ) {}

  /**
   * Create a reusable organisation-owned meal plan.
   */
  async createMealPlan(
    organisationId: string,
    dto: CreateMealPlanDto,
    actor: AuthenticatedUser,
  ) {
    const mealPlan = await this.prisma.mealPlan.create({
      data: {
        organisationId,
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        dietaryPattern: dto.dietaryPattern ?? null,
        targetDailyCalories: dto.targetDailyCalories ?? null,
        targetProteinGrams: dto.targetProteinGrams ?? null,
        targetCarbGrams: dto.targetCarbGrams ?? null,
        targetFatGrams: dto.targetFatGrams ?? null,
        durationDays: dto.durationDays ?? 7,
        version: 1,
        status: dto.status ?? MealPlanStatusEnum.ACTIVE,
        createdById: actor.id,
      },
    });

    // Populate days, meals, items if provided in payload
    if (dto.days && dto.days.length > 0) {
      for (const dayDto of dto.days) {
        const day = await this.prisma.mealPlanDay.create({
          data: {
            mealPlanId: mealPlan.id,
            dayNumber: dayDto.dayNumber,
            dayName: dayDto.dayName ?? `Day ${dayDto.dayNumber}`,
            notes: dayDto.notes ?? null,
          },
        });

        if (dayDto.meals && dayDto.meals.length > 0) {
          for (const mealDto of dayDto.meals) {
            const meal = await this.prisma.mealPlanMeal.create({
              data: {
                mealPlanDayId: day.id,
                name: mealDto.name.trim(),
                mealType: mealDto.mealType,
                notes: mealDto.notes ?? null,
                sortOrder: mealDto.sortOrder ?? 0,
              },
            });

            if (mealDto.items && mealDto.items.length > 0) {
              for (const itemDto of mealDto.items) {
                const food = await this.foodService.getFoodById(
                  organisationId,
                  itemDto.foodId,
                  actor,
                );
                const factor = itemDto.quantity / (food.servingSize || 100);

                await this.prisma.mealPlanFoodItem.create({
                  data: {
                    mealPlanMealId: meal.id,
                    foodId: itemDto.foodId,
                    quantity: itemDto.quantity,
                    unit: itemDto.unit.trim(),
                    calories: Math.round(food.calories * factor * 10) / 10,
                    protein: Math.round(food.protein * factor * 10) / 10,
                    carbohydrates: Math.round(food.carbohydrates * factor * 10) / 10,
                    fat: Math.round(food.fat * factor * 10) / 10,
                    notes: itemDto.notes ?? null,
                  },
                });
              }
            }
          }
        }
      }
    }

    return this.getMealPlanById(organisationId, mealPlan.id, actor);
  }

  /**
   * Versioning: Create a new version of an existing meal plan.
   * Preserves the previous version and existing member assignments.
   */
  async createMealPlanVersion(
    organisationId: string,
    existingPlanId: string,
    dto: CreateMealPlanDto,
    actor: AuthenticatedUser,
  ) {
    const existing = await this.prisma.mealPlan.findFirst({
      where: { id: existingPlanId, organisationId },
    });

    if (!existing) {
      throw new NotFoundException(`Meal plan with id '${existingPlanId}' not found`);
    }

    const newVersionNumber = existing.version + 1;

    const newPlan = await this.prisma.mealPlan.create({
      data: {
        organisationId,
        name: dto.name.trim(),
        description: dto.description?.trim() ?? existing.description,
        dietaryPattern: dto.dietaryPattern ?? existing.dietaryPattern,
        targetDailyCalories: dto.targetDailyCalories ?? existing.targetDailyCalories,
        targetProteinGrams: dto.targetProteinGrams ?? existing.targetProteinGrams,
        targetCarbGrams: dto.targetCarbGrams ?? existing.targetCarbGrams,
        targetFatGrams: dto.targetFatGrams ?? existing.targetFatGrams,
        durationDays: dto.durationDays ?? existing.durationDays,
        version: newVersionNumber,
        parentId: existing.id,
        status: dto.status ?? MealPlanStatusEnum.ACTIVE,
        createdById: actor.id,
      },
    });

    return this.getMealPlanById(organisationId, newPlan.id, actor);
  }

  /**
   * Assign meal plan to a member with historical plan snapshotting.
   */
  async assignMealPlan(
    organisationId: string,
    memberProfileId: string,
    dto: AssignMealPlanDto,
    actor: AuthenticatedUser,
  ) {
    await this.profileService.assertNutritionAccess(organisationId, memberProfileId, actor);

    const mealPlan = await this.getMealPlanById(organisationId, dto.mealPlanId, actor);

    // Deactivate previous active assignments
    await this.prisma.memberMealPlanAssignment.updateMany({
      where: {
        memberProfileId,
        status: 'ACTIVE',
      },
      data: {
        status: 'COMPLETED',
        effectiveTo: new Date(),
      },
    });

    // Create new assignment with snapshot of the plan structure
    const assignment = await this.prisma.memberMealPlanAssignment.create({
      data: {
        organisationId,
        memberProfileId,
        mealPlanId: mealPlan.id,
        assignedById: actor.id,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        status: 'ACTIVE',
        notes: dto.notes ?? null,
        planSnapshot: mealPlan as any,
      },
      include: {
        mealPlan: true,
      },
    });

    return assignment;
  }

  /**
   * Get active meal plan assignment for a member.
   */
  async getAssignedMealPlan(
    organisationId: string,
    memberProfileId: string,
    actor: AuthenticatedUser,
  ) {
    await this.profileService.assertNutritionAccess(organisationId, memberProfileId, actor);

    const assignment = await this.prisma.memberMealPlanAssignment.findFirst({
      where: {
        organisationId,
        memberProfileId,
        status: 'ACTIVE',
      },
      include: {
        mealPlan: {
          include: {
            days: {
              include: {
                meals: {
                  include: {
                    items: {
                      include: { food: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    return assignment;
  }

  /**
   * List organisation meal plans.
   */
  async listMealPlans(organisationId: string, _actor: AuthenticatedUser) {
    return this.prisma.mealPlan.findMany({
      where: { organisationId, status: 'ACTIVE' },
      include: {
        _count: { select: { days: true, assignments: true } },
      },
      orderBy: [{ name: 'asc' }, { version: 'desc' }],
    });
  }

  /**
   * Get detailed meal plan by ID with days, meals, and food items.
   */
  async getMealPlanById(
    organisationId: string,
    mealPlanId: string,
    _actor: AuthenticatedUser,
  ) {
    const mealPlan = await this.prisma.mealPlan.findFirst({
      where: { id: mealPlanId, organisationId },
      include: {
        days: {
          include: {
            meals: {
              include: {
                items: {
                  include: { food: true },
                },
              },
            },
          },
          orderBy: { dayNumber: 'asc' },
        },
      },
    });

    if (!mealPlan) {
      throw new NotFoundException(`Meal plan with id '${mealPlanId}' not found`);
    }

    return mealPlan;
  }
}
