import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { NutritionProfileService } from './nutrition-profile.service';
import { FoodLibraryService } from './food-library.service';
import { CreateMealDto, AddFoodToMealDto } from '../dto/nutrition.dto';

@Injectable()
export class MealService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profileService: NutritionProfileService,
    private readonly foodService: FoodLibraryService,
  ) {}

  /**
   * Create a logical meal.
   */
  async createMeal(
    organisationId: string,
    memberProfileId: string | null,
    dto: CreateMealDto,
    actor: AuthenticatedUser,
  ) {
    if (memberProfileId) {
      await this.profileService.assertNutritionAccess(organisationId, memberProfileId, actor);
    }

    return this.prisma.meal.create({
      data: {
        organisationId,
        memberProfileId: memberProfileId ?? null,
        name: dto.name.trim(),
        mealType: dto.mealType,
        scheduledTime: dto.scheduledTime ?? null,
        notes: dto.notes ?? null,
        workoutId: dto.workoutId ?? null,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Add a food item to a meal, calculating its macro contribution.
   */
  async addFoodToMeal(
    organisationId: string,
    mealId: string,
    dto: AddFoodToMealDto,
    actor: AuthenticatedUser,
  ) {
    const meal = await this.prisma.meal.findFirst({
      where: { id: mealId, organisationId },
    });

    if (!meal) {
      throw new NotFoundException(`Meal with id '${mealId}' not found`);
    }

    if (meal.memberProfileId) {
      await this.profileService.assertNutritionAccess(organisationId, meal.memberProfileId, actor);
    }

    const food = await this.foodService.getFoodById(organisationId, dto.foodId, actor);

    const factor = dto.quantity / (food.servingSize || 100);
    const calories = Math.round(food.calories * factor * 10) / 10;
    const protein = Math.round(food.protein * factor * 10) / 10;
    const carbohydrates = Math.round(food.carbohydrates * factor * 10) / 10;
    const fat = Math.round(food.fat * factor * 10) / 10;
    const fiber = Math.round((food.fiber ?? 0) * factor * 10) / 10;

    return this.prisma.mealFoodItem.create({
      data: {
        mealId,
        foodId: dto.foodId,
        quantity: dto.quantity,
        unit: dto.unit.trim(),
        sortOrder: dto.sortOrder ?? 0,
        calories,
        protein,
        carbohydrates,
        fat,
        fiber,
      },
      include: { food: true },
    });
  }

  /**
   * Remove a food item from a meal.
   */
  async removeFoodFromMeal(
    organisationId: string,
    mealId: string,
    itemId: string,
    actor: AuthenticatedUser,
  ) {
    const meal = await this.prisma.meal.findFirst({
      where: { id: mealId, organisationId },
    });

    if (!meal) {
      throw new NotFoundException(`Meal with id '${mealId}' not found`);
    }

    if (meal.memberProfileId) {
      await this.profileService.assertNutritionAccess(organisationId, meal.memberProfileId, actor);
    }

    await this.prisma.mealFoodItem.deleteMany({
      where: { id: itemId, mealId },
    });

    return { success: true };
  }

  /**
   * Get meal details with all constituent foods and total aggregated macros.
   */
  async getMealWithItems(
    organisationId: string,
    mealId: string,
    actor: AuthenticatedUser,
  ) {
    const meal = await this.prisma.meal.findFirst({
      where: { id: mealId, organisationId },
      include: {
        items: {
          include: { food: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!meal) {
      throw new NotFoundException(`Meal with id '${mealId}' not found`);
    }

    if (meal.memberProfileId) {
      await this.profileService.assertNutritionAccess(organisationId, meal.memberProfileId, actor);
    }

    const totals = meal.items.reduce(
      (acc, item) => ({
        calories: Math.round((acc.calories + item.calories) * 10) / 10,
        protein: Math.round((acc.protein + item.protein) * 10) / 10,
        carbohydrates: Math.round((acc.carbohydrates + item.carbohydrates) * 10) / 10,
        fat: Math.round((acc.fat + item.fat) * 10) / 10,
        fiber: Math.round((acc.fiber + item.fiber) * 10) / 10,
      }),
      { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0 },
    );

    return {
      ...meal,
      totals,
    };
  }

  /**
   * List meals for member or organisation.
   */
  async listMeals(
    organisationId: string,
    memberProfileId?: string,
    actor?: AuthenticatedUser,
  ) {
    if (memberProfileId && actor) {
      await this.profileService.assertNutritionAccess(organisationId, memberProfileId, actor);
    }

    return this.prisma.meal.findMany({
      where: {
        organisationId,
        memberProfileId: memberProfileId ?? null,
        status: 'ACTIVE',
      },
      include: {
        items: {
          include: { food: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
