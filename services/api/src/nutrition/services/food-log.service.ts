import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { NutritionProfileService } from './nutrition-profile.service';
import { FoodLibraryService } from './food-library.service';
import { LogFoodDto, LogWaterDto, NutritionHistoryQueryDto } from '../dto/nutrition.dto';

@Injectable()
export class FoodLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly auditService: AuditService,
    private readonly profileService: NutritionProfileService,
    private readonly foodService: FoodLibraryService,
  ) {}

  private getSummaryCacheKey(orgId: string, memberId: string, dateStr: string): string {
    return `org:${orgId}:member:${memberId}:nutrition:summary:${dateStr}`;
  }

  /**
   * Log food consumption with an immutable nutritional snapshot and idempotency protection.
   */
  async logFood(
    organisationId: string,
    memberProfileId: string,
    dto: LogFoodDto,
    actor: AuthenticatedUser,
  ) {
    await this.profileService.assertNutritionAccess(organisationId, memberProfileId, actor);

    // 1. Idempotency check: prevent duplicate logs on network retries
    if (dto.idempotencyKey) {
      const existing = await this.prisma.foodLog.findFirst({
        where: {
          memberProfileId,
          idempotencyKey: dto.idempotencyKey,
        },
        include: { food: true },
      });
      if (existing) {
        return existing;
      }
    }

    // 2. Fetch source food item from library
    const food = await this.foodService.getFoodById(organisationId, dto.foodId, actor);

    // 3. Compute immutable nutrition snapshot based on quantity and serving size
    const factor = dto.quantity / (food.servingSize || 100);
    const calories = Math.round(food.calories * factor * 10) / 10;
    const protein = Math.round(food.protein * factor * 10) / 10;
    const carbohydrates = Math.round(food.carbohydrates * factor * 10) / 10;
    const fat = Math.round(food.fat * factor * 10) / 10;
    const fiber = Math.round((food.fiber ?? 0) * factor * 10) / 10;
    const sugar = Math.round((food.sugar ?? 0) * factor * 10) / 10;
    const sodium = Math.round((food.sodium ?? 0) * factor * 10) / 10;

    const consumedAt = dto.consumedAt ? new Date(dto.consumedAt) : new Date();

    // 4. Create FoodLog with snapshot
    const foodLog = await this.prisma.foodLog.create({
      data: {
        organisationId,
        memberProfileId,
        mealId: dto.mealId ?? null,
        foodId: dto.foodId,
        mealType: dto.mealType,
        quantity: dto.quantity,
        unit: dto.unit.trim(),
        consumedAt,
        // Immutable Snapshot
        foodNameAtLog: food.name,
        brandAtLog: food.brand ?? null,
        calories,
        protein,
        carbohydrates,
        fat,
        fiber,
        sugar,
        sodium,
        idempotencyKey: dto.idempotencyKey ?? null,
        notes: dto.notes ?? null,
        loggedById: actor.id,
      },
      include: { food: true },
    });

    // 5. Invalidate daily summary cache for this date
    const dateStr = consumedAt.toISOString().split('T')[0];
    const cacheKey = this.getSummaryCacheKey(organisationId, memberProfileId, dateStr);
    await this.redis.del(cacheKey);

    await this.auditService.log({
      userId: actor.id,
      action: 'FOOD_LOG_CREATED',
      resource: 'food_logs',
      resourceId: foodLog.id,
      organisationId,
      metadata: {
        memberProfileId,
        foodName: foodLog.foodNameAtLog,
        calories: foodLog.calories,
        protein: foodLog.protein,
      },
    });

    return foodLog;
  }

  /**
   * Delete food log record and invalidate summary cache.
   */
  async deleteFoodLog(
    organisationId: string,
    memberProfileId: string,
    logId: string,
    actor: AuthenticatedUser,
  ) {
    await this.profileService.assertNutritionAccess(organisationId, memberProfileId, actor);

    const log = await this.prisma.foodLog.findFirst({
      where: { id: logId, organisationId, memberProfileId },
    });

    if (!log) {
      throw new NotFoundException(`Food log with id '${logId}' not found`);
    }

    await this.prisma.foodLog.delete({
      where: { id: logId },
    });

    const dateStr = log.consumedAt.toISOString().split('T')[0];
    const cacheKey = this.getSummaryCacheKey(organisationId, memberProfileId, dateStr);
    await this.redis.del(cacheKey);

    return { success: true };
  }

  /**
   * Record water consumption.
   */
  async logWater(
    organisationId: string,
    memberProfileId: string,
    dto: LogWaterDto,
    actor: AuthenticatedUser,
  ) {
    await this.profileService.assertNutritionAccess(organisationId, memberProfileId, actor);

    const loggedAt = dto.loggedAt ? new Date(dto.loggedAt) : new Date();

    const waterLog = await this.prisma.waterLog.create({
      data: {
        organisationId,
        memberProfileId,
        amountMl: dto.amountMl,
        loggedAt,
      },
    });

    const dateStr = loggedAt.toISOString().split('T')[0];
    const cacheKey = this.getSummaryCacheKey(organisationId, memberProfileId, dateStr);
    await this.redis.del(cacheKey);

    return waterLog;
  }

  /**
   * Get all food logs for a given member on a specific date.
   */
  async getFoodLogs(
    organisationId: string,
    memberProfileId: string,
    date: Date,
    actor: AuthenticatedUser,
  ) {
    await this.profileService.assertNutritionAccess(organisationId, memberProfileId, actor);

    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return this.prisma.foodLog.findMany({
      where: {
        organisationId,
        memberProfileId,
        consumedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: { food: true },
      orderBy: { consumedAt: 'asc' },
    });
  }

  /**
   * Get all water logs for a given member on a specific date.
   */
  async getWaterLogs(
    organisationId: string,
    memberProfileId: string,
    date: Date,
    actor: AuthenticatedUser,
  ) {
    await this.profileService.assertNutritionAccess(organisationId, memberProfileId, actor);

    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return this.prisma.waterLog.findMany({
      where: {
        organisationId,
        memberProfileId,
        loggedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { loggedAt: 'asc' },
    });
  }

  /**
   * Get paginated food log history across a date range.
   */
  async getFoodLogHistory(
    organisationId: string,
    memberProfileId: string,
    query: NutritionHistoryQueryDto,
    actor: AuthenticatedUser,
  ) {
    await this.profileService.assertNutritionAccess(organisationId, memberProfileId, actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const skip = (page - 1) * limit;

    const where: any = {
      organisationId,
      memberProfileId,
    };

    if (query.startDate || query.endDate) {
      where.consumedAt = {};
      if (query.startDate) where.consumedAt.gte = new Date(query.startDate);
      if (query.endDate) where.consumedAt.lte = new Date(query.endDate);
    }

    const [logs, total] = await Promise.all([
      this.prisma.foodLog.findMany({
        where,
        orderBy: { consumedAt: 'desc' },
        skip,
        take: limit,
        include: { food: true },
      }),
      this.prisma.foodLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
