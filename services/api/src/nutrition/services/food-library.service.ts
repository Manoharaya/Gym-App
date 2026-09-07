import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import {
  CreateFoodDto,
  UpdateFoodDto,
  FoodSearchQueryDto,
  FoodOwnershipEnum,
  FoodCategoryEnum,
} from '../dto/nutrition.dto';

@Injectable()
export class FoodLibraryService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedSystemFoods();
  }

  /**
   * Seed baseline system-wide verified food library items if none exist.
   */
  async seedSystemFoods(): Promise<void> {
    const existingSystemFoods = await this.prisma.food.count({
      where: { ownership: 'SYSTEM' },
    });

    if (existingSystemFoods > 0) {
      return;
    }

    const systemFoods: Array<{
      name: string;
      brand?: string;
      category: FoodCategoryEnum;
      servingSize: number;
      servingUnit: string;
      calories: number;
      protein: number;
      carbohydrates: number;
      fat: number;
      fiber: number;
      sugar: number;
      sodium: number;
      calcium?: number;
      iron?: number;
      potassium?: number;
      vitaminD?: number;
      vitaminB12?: number;
    }> = [
      {
        name: 'Chicken Breast (Raw, Skinless)',
        category: FoodCategoryEnum.PROTEIN,
        servingSize: 100,
        servingUnit: 'g',
        calories: 120,
        protein: 22.5,
        carbohydrates: 0,
        fat: 2.6,
        fiber: 0,
        sugar: 0,
        sodium: 74,
        potassium: 334,
        iron: 0.7,
      },
      {
        name: 'Salmon Fillet (Atlantic, Raw)',
        category: FoodCategoryEnum.PROTEIN,
        servingSize: 100,
        servingUnit: 'g',
        calories: 208,
        protein: 20.4,
        carbohydrates: 0,
        fat: 13.4,
        fiber: 0,
        sugar: 0,
        sodium: 59,
        potassium: 363,
        vitaminD: 11,
        vitaminB12: 3.2,
      },
      {
        name: 'Whole Eggs (Large)',
        category: FoodCategoryEnum.PROTEIN,
        servingSize: 50,
        servingUnit: 'piece',
        calories: 72,
        protein: 6.3,
        carbohydrates: 0.4,
        fat: 4.8,
        fiber: 0,
        sugar: 0.2,
        sodium: 71,
        calcium: 28,
        iron: 0.9,
      },
      {
        name: 'Egg Whites (Liquid)',
        category: FoodCategoryEnum.PROTEIN,
        servingSize: 100,
        servingUnit: 'ml',
        calories: 52,
        protein: 11,
        carbohydrates: 0.7,
        fat: 0.2,
        fiber: 0,
        sugar: 0.7,
        sodium: 166,
      },
      {
        name: 'Whey Protein Isolate (Standard)',
        brand: 'Generic Nutrition',
        category: FoodCategoryEnum.SUPPLEMENTS,
        servingSize: 30,
        servingUnit: 'scoop',
        calories: 120,
        protein: 25,
        carbohydrates: 2,
        fat: 1,
        fiber: 0,
        sugar: 1,
        sodium: 140,
        calcium: 150,
      },
      {
        name: 'Rolled Oats (Raw)',
        category: FoodCategoryEnum.GRAINS,
        servingSize: 50,
        servingUnit: 'g',
        calories: 189,
        protein: 6.8,
        carbohydrates: 33.2,
        fat: 3.4,
        fiber: 5.3,
        sugar: 0.5,
        sodium: 3,
        iron: 2.3,
      },
      {
        name: 'Brown Rice (Cooked)',
        category: FoodCategoryEnum.GRAINS,
        servingSize: 150,
        servingUnit: 'g',
        calories: 168,
        protein: 3.8,
        carbohydrates: 35.1,
        fat: 1.4,
        fiber: 2.7,
        sugar: 0.4,
        sodium: 5,
      },
      {
        name: 'White Jasmine Rice (Cooked)',
        category: FoodCategoryEnum.GRAINS,
        servingSize: 150,
        servingUnit: 'g',
        calories: 195,
        protein: 3.6,
        carbohydrates: 42.6,
        fat: 0.4,
        fiber: 0.6,
        sugar: 0.1,
        sodium: 2,
      },
      {
        name: 'Sweet Potato (Baked)',
        category: FoodCategoryEnum.VEGETABLES,
        servingSize: 150,
        servingUnit: 'g',
        calories: 135,
        protein: 3.0,
        carbohydrates: 31.5,
        fat: 0.2,
        fiber: 4.5,
        sugar: 6.3,
        sodium: 82,
        potassium: 708,
      },
      {
        name: 'Broccoli (Steamed)',
        category: FoodCategoryEnum.VEGETABLES,
        servingSize: 100,
        servingUnit: 'g',
        calories: 35,
        protein: 2.4,
        carbohydrates: 7.2,
        fat: 0.4,
        fiber: 3.3,
        sugar: 1.4,
        sodium: 41,
        calcium: 40,
        iron: 0.7,
      },
      {
        name: 'Banana (Medium)',
        category: FoodCategoryEnum.FRUITS,
        servingSize: 118,
        servingUnit: 'piece',
        calories: 105,
        protein: 1.3,
        carbohydrates: 27,
        fat: 0.3,
        fiber: 3.1,
        sugar: 14.4,
        sodium: 1,
        potassium: 422,
      },
      {
        name: 'Apple (Medium, with skin)',
        category: FoodCategoryEnum.FRUITS,
        servingSize: 182,
        servingUnit: 'piece',
        calories: 95,
        protein: 0.5,
        carbohydrates: 25,
        fat: 0.3,
        fiber: 4.4,
        sugar: 19,
        sodium: 2,
        potassium: 195,
      },
      {
        name: 'Greek Yogurt (Non-Fat, Plain)',
        category: FoodCategoryEnum.DAIRY,
        servingSize: 170,
        servingUnit: 'g',
        calories: 100,
        protein: 17,
        carbohydrates: 6,
        fat: 0.7,
        fiber: 0,
        sugar: 6,
        sodium: 61,
        calcium: 187,
      },
      {
        name: 'Extra Virgin Olive Oil',
        category: FoodCategoryEnum.FATS_OILS,
        servingSize: 15,
        servingUnit: 'tbsp',
        calories: 119,
        protein: 0,
        carbohydrates: 0,
        fat: 13.5,
        fiber: 0,
        sugar: 0,
        sodium: 0,
      },
      {
        name: 'Peanut Butter (Natural, Crunchy)',
        category: FoodCategoryEnum.FATS_OILS,
        servingSize: 32,
        servingUnit: 'tbsp',
        calories: 190,
        protein: 8,
        carbohydrates: 7,
        fat: 16,
        fiber: 2,
        sugar: 2,
        sodium: 5,
        potassium: 200,
      },
      {
        name: 'Almonds (Raw)',
        category: FoodCategoryEnum.SNACKS,
        servingSize: 30,
        servingUnit: 'g',
        calories: 173,
        protein: 6.4,
        carbohydrates: 6.1,
        fat: 15,
        fiber: 3.7,
        sugar: 1.3,
        sodium: 1,
        calcium: 80,
      },
      {
        name: 'Canned Tuna in Springwater (Drained)',
        category: FoodCategoryEnum.PROTEIN,
        servingSize: 95,
        servingUnit: 'g',
        calories: 98,
        protein: 22.8,
        carbohydrates: 0,
        fat: 0.8,
        fiber: 0,
        sugar: 0,
        sodium: 260,
      },
      {
        name: 'Lean Beef Mince (90/10, Cooked)',
        category: FoodCategoryEnum.PROTEIN,
        servingSize: 100,
        servingUnit: 'g',
        calories: 217,
        protein: 26.1,
        carbohydrates: 0,
        fat: 11.8,
        fiber: 0,
        sugar: 0,
        sodium: 72,
        iron: 2.8,
      },
    ];

    for (const food of systemFoods) {
      await this.prisma.food.create({
        data: {
          ownership: 'SYSTEM',
          organisationId: null,
          verified: true,
          status: 'ACTIVE',
          ...food,
        },
      });
    }
  }

  /**
   * Search food library: Caller sees SYSTEM foods + their own organisation's foods.
   * Cross-tenant search is strictly prohibited.
   */
  async searchFoods(
    organisationId: string,
    query: FoodSearchQueryDto,
    _actor: AuthenticatedUser,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'ACTIVE',
      OR: [
        { ownership: 'SYSTEM' },
        { ownership: 'ORGANISATION', organisationId },
      ],
    };

    if (query.ownership) {
      if (query.ownership === FoodOwnershipEnum.SYSTEM) {
        where.OR = [{ ownership: 'SYSTEM' }];
      } else if (query.ownership === FoodOwnershipEnum.ORGANISATION) {
        where.OR = [{ ownership: 'ORGANISATION', organisationId }];
      }
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.query && query.query.trim().length > 0) {
      const searchTerm = query.query.trim();
      where.AND = [
        {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { brand: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.food.findMany({
        where,
        orderBy: [{ ownership: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.food.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieve food by ID with tenant boundary verification.
   */
  async getFoodById(
    organisationId: string,
    foodId: string,
    _actor: AuthenticatedUser,
  ) {
    const food = await this.prisma.food.findUnique({
      where: { id: foodId },
    });

    if (!food) {
      throw new NotFoundException(`Food with id '${foodId}' not found`);
    }

    // System foods are visible to all tenants; Organisation foods are scoped
    if (food.ownership === 'ORGANISATION' && food.organisationId !== organisationId) {
      throw new NotFoundException(`Food with id '${foodId}' not found in organisation`);
    }

    return food;
  }

  /**
   * Create custom organisation-scoped food.
   */
  async createOrganisationFood(
    organisationId: string,
    dto: CreateFoodDto,
    actor: AuthenticatedUser,
  ) {
    return this.prisma.food.create({
      data: {
        organisationId,
        ownership: 'ORGANISATION',
        name: dto.name.trim(),
        brand: dto.brand?.trim() ?? null,
        category: dto.category,
        servingSize: dto.servingSize,
        servingUnit: dto.servingUnit.trim(),
        calories: dto.calories,
        protein: dto.protein,
        carbohydrates: dto.carbohydrates,
        fat: dto.fat,
        fiber: dto.fiber ?? 0,
        sugar: dto.sugar ?? 0,
        sodium: dto.sodium ?? 0,
        calcium: dto.calcium ?? null,
        iron: dto.iron ?? null,
        potassium: dto.potassium ?? null,
        vitaminD: dto.vitaminD ?? null,
        vitaminB12: dto.vitaminB12 ?? null,
        barcode: dto.barcode ?? null,
        verified: false,
        status: 'ACTIVE',
        createdById: actor.id,
      },
    });
  }

  /**
   * Update organisation food. System foods are immutable to organisation callers.
   */
  async updateOrganisationFood(
    organisationId: string,
    foodId: string,
    dto: UpdateFoodDto,
    _actor: AuthenticatedUser,
  ) {
    const existing = await this.prisma.food.findUnique({
      where: { id: foodId },
    });

    if (!existing) {
      throw new NotFoundException(`Food with id '${foodId}' not found`);
    }

    if (existing.ownership === 'SYSTEM') {
      throw new ForbiddenException({
        code: 'SYSTEM_FOOD_IMMUTABLE',
        message: 'System foods are immutable and cannot be modified by organisation users',
      });
    }

    if (existing.organisationId !== organisationId) {
      throw new ForbiddenException({
        code: 'CROSS_TENANT_FOOD_UPDATE',
        message: 'Cannot modify foods belonging to another organisation',
      });
    }

    return this.prisma.food.update({
      where: { id: foodId },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        brand: dto.brand !== undefined ? dto.brand.trim() : undefined,
        category: dto.category !== undefined ? dto.category : undefined,
        servingSize: dto.servingSize !== undefined ? dto.servingSize : undefined,
        servingUnit: dto.servingUnit !== undefined ? dto.servingUnit.trim() : undefined,
        calories: dto.calories !== undefined ? dto.calories : undefined,
        protein: dto.protein !== undefined ? dto.protein : undefined,
        carbohydrates: dto.carbohydrates !== undefined ? dto.carbohydrates : undefined,
        fat: dto.fat !== undefined ? dto.fat : undefined,
        fiber: dto.fiber !== undefined ? dto.fiber : undefined,
        sugar: dto.sugar !== undefined ? dto.sugar : undefined,
        sodium: dto.sodium !== undefined ? dto.sodium : undefined,
      },
    });
  }

  /**
   * Delete or archive organisation food.
   */
  async deleteOrganisationFood(
    organisationId: string,
    foodId: string,
    _actor: AuthenticatedUser,
  ) {
    const existing = await this.prisma.food.findUnique({
      where: { id: foodId },
    });

    if (!existing) {
      throw new NotFoundException(`Food with id '${foodId}' not found`);
    }

    if (existing.ownership === 'SYSTEM') {
      throw new ForbiddenException({
        code: 'SYSTEM_FOOD_IMMUTABLE',
        message: 'System foods cannot be deleted',
      });
    }

    if (existing.organisationId !== organisationId) {
      throw new ForbiddenException('Cannot delete foods belonging to another organisation');
    }

    await this.prisma.food.update({
      where: { id: foodId },
      data: { status: 'ARCHIVED' },
    });

    return { success: true };
  }
}
