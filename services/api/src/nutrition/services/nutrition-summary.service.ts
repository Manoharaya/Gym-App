import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { NutritionProfileService } from './nutrition-profile.service';
import { NutritionTargetService } from './nutrition-target.service';
import { FoodLogService } from './food-log.service';
import { MealTypeEnum } from '../dto/nutrition.dto';

@Injectable()
export class NutritionSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly profileService: NutritionProfileService,
    private readonly targetService: NutritionTargetService,
    private readonly foodLogService: FoodLogService,
  ) {}

  private getSummaryCacheKey(orgId: string, memberId: string, dateStr: string): string {
    return `org:${orgId}:member:${memberId}:nutrition:summary:${dateStr}`;
  }

  /**
   * Calculate daily nutrition summary from real persisted food and water logs.
   * Zero fake analytics. Two-tier caching with 300s TTL.
   */
  async getDailySummary(
    organisationId: string,
    memberProfileId: string,
    date: Date,
    actor: AuthenticatedUser,
  ) {
    await this.profileService.assertNutritionAccess(organisationId, memberProfileId, actor);

    const dateStr = date.toISOString().split('T')[0];
    const cacheKey = this.getSummaryCacheKey(organisationId, memberProfileId, dateStr);

    // Check Redis cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // Fall through on deserialization error
      }
    }

    // 1. Retrieve real food and water logs for the day
    const [foodLogs, waterLogs, target] = await Promise.all([
      this.foodLogService.getFoodLogs(organisationId, memberProfileId, date, actor),
      this.foodLogService.getWaterLogs(organisationId, memberProfileId, date, actor),
      this.targetService.getActiveTarget(organisationId, memberProfileId, actor),
    ]);

    // 2. Compute aggregated consumption
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbohydrates = 0;
    let totalFat = 0;
    let totalFiber = 0;

    for (const log of foodLogs) {
      totalCalories += log.calories;
      totalProtein += log.protein;
      totalCarbohydrates += log.carbohydrates;
      totalFat += log.fat;
      totalFiber += log.fiber;
    }

    totalCalories = Math.round(totalCalories * 10) / 10;
    totalProtein = Math.round(totalProtein * 10) / 10;
    totalCarbohydrates = Math.round(totalCarbohydrates * 10) / 10;
    totalFat = Math.round(totalFat * 10) / 10;
    totalFiber = Math.round(totalFiber * 10) / 10;

    const totalWaterMl = waterLogs.reduce((acc, log) => acc + log.amountMl, 0);

    // 3. Compute adherence percentages against configured targets
    const targetCalories = target?.dailyCalories ?? 2000;
    const targetProtein = target?.proteinGrams ?? 150;
    const targetCarbs = target?.carbohydrateGrams ?? 200;
    const targetFat = target?.fatGrams ?? 65;
    const targetWater = target?.waterMl ?? 2500;

    const calorieAdherencePct =
      targetCalories > 0 ? Math.round((totalCalories / targetCalories) * 100) : 0;
    const proteinAdherencePct =
      targetProtein > 0 ? Math.round((totalProtein / targetProtein) * 100) : 0;
    const carbAdherencePct =
      targetCarbs > 0 ? Math.round((totalCarbohydrates / targetCarbs) * 100) : 0;
    const fatAdherencePct =
      targetFat > 0 ? Math.round((totalFat / targetFat) * 100) : 0;
    const waterAdherencePct =
      targetWater > 0 ? Math.round((totalWaterMl / targetWater) * 100) : 0;

    // 4. Group logs by meal type
    const mealTypes: MealTypeEnum[] = [
      MealTypeEnum.BREAKFAST,
      MealTypeEnum.LUNCH,
      MealTypeEnum.DINNER,
      MealTypeEnum.SNACK,
      MealTypeEnum.PRE_WORKOUT,
      MealTypeEnum.POST_WORKOUT,
      MealTypeEnum.OTHER,
    ];

    const meals = mealTypes
      .map((type) => {
        const items = foodLogs.filter((log) => log.mealType === type);
        if (items.length === 0) return null;

        const mealCalories = Math.round(items.reduce((sum, item) => sum + item.calories, 0) * 10) / 10;
        const mealProtein = Math.round(items.reduce((sum, item) => sum + item.protein, 0) * 10) / 10;
        const mealCarbs = Math.round(items.reduce((sum, item) => sum + item.carbohydrates, 0) * 10) / 10;
        const mealFat = Math.round(items.reduce((sum, item) => sum + item.fat, 0) * 10) / 10;

        return {
          mealType: type,
          calories: mealCalories,
          protein: mealProtein,
          carbohydrates: mealCarbs,
          fat: mealFat,
          items,
        };
      })
      .filter(Boolean);

    const summary = {
      memberProfileId,
      date: dateStr,
      totalCalories,
      totalProtein,
      totalCarbohydrates,
      totalFat,
      totalFiber,
      totalWaterMl,
      targetCalories,
      targetProtein,
      targetCarbohydrates: targetCarbs,
      targetFat,
      targetWaterMl: targetWater,
      remainingCalories: Math.max(0, Math.round((targetCalories - totalCalories) * 10) / 10),
      remainingProtein: Math.max(0, Math.round((targetProtein - totalProtein) * 10) / 10),
      remainingCarbs: Math.max(0, Math.round((targetCarbs - totalCarbohydrates) * 10) / 10),
      remainingFat: Math.max(0, Math.round((targetFat - totalFat) * 10) / 10),
      calorieAdherencePct,
      proteinAdherencePct,
      carbAdherencePct,
      fatAdherencePct,
      waterAdherencePct,
      mealCount: meals.length,
      foodItemCount: foodLogs.length,
      meals,
    };

    // Cache in Redis (TTL = 300s)
    await this.redis.set(cacheKey, JSON.stringify(summary), 300);

    // Upsert Postgres snapshot for persistent analytical indexing
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    await this.prisma.nutritionSummary.upsert({
      where: {
        memberProfileId_date: {
          memberProfileId,
          date: startOfDay,
        },
      },
      create: {
        organisationId,
        memberProfileId,
        date: startOfDay,
        totalCalories,
        totalProtein,
        totalCarbohydrates,
        totalFat,
        totalFiber,
        totalWaterMl,
        targetCalories,
        targetProtein,
        targetCarbohydrates: targetCarbs,
        targetFat,
        targetWaterMl: targetWater,
        calorieAdherencePct,
        proteinAdherencePct,
        carbAdherencePct,
        fatAdherencePct,
        waterAdherencePct,
        mealCount: meals.length,
        foodItemCount: foodLogs.length,
      },
      update: {
        totalCalories,
        totalProtein,
        totalCarbohydrates,
        totalFat,
        totalFiber,
        totalWaterMl,
        targetCalories,
        targetProtein,
        targetCarbohydrates: targetCarbs,
        targetFat,
        targetWaterMl: targetWater,
        calorieAdherencePct,
        proteinAdherencePct,
        carbAdherencePct,
        fatAdherencePct,
        waterAdherencePct,
        mealCount: meals.length,
        foodItemCount: foodLogs.length,
      },
    });

    return summary;
  }

  /**
   * Get historical nutrition trends over recent days (e.g. 7D, 30D).
   */
  async getNutritionTrends(
    organisationId: string,
    memberProfileId: string,
    days: number = 7,
    actor: AuthenticatedUser,
  ) {
    await this.profileService.assertNutritionAccess(organisationId, memberProfileId, actor);

    const summaries = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const daySummary = await this.getDailySummary(organisationId, memberProfileId, d, actor);
      summaries.push(daySummary);
    }

    const totalCal = summaries.reduce((s, d) => s + d.totalCalories, 0);
    const totalProt = summaries.reduce((s, d) => s + d.totalProtein, 0);
    const totalCarb = summaries.reduce((s, d) => s + d.totalCarbohydrates, 0);
    const totalF = summaries.reduce((s, d) => s + d.totalFat, 0);
    const totalW = summaries.reduce((s, d) => s + d.totalWaterMl, 0);

    return {
      period: `${days}D`,
      days: summaries,
      averages: {
        calories: Math.round(totalCal / days),
        protein: Math.round((totalProt / days) * 10) / 10,
        carbohydrates: Math.round((totalCarb / days) * 10) / 10,
        fat: Math.round((totalF / days) * 10) / 10,
        waterMl: Math.round(totalW / days),
      },
    };
  }
}
