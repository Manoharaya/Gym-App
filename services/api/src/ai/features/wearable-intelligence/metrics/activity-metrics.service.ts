import { Injectable } from '@nestjs/common';
import { HealthDataRecord } from '@prisma/client';
import { ActivityMetricsDto, WearableMetricAvailability } from '@fitcore/types';

@Injectable()
export class ActivityMetricsService {
  /**
   * Derives deterministic activity metrics from normalized Day 23 records.
   */
  calculateActivityMetrics(records: HealthDataRecord[], targetDate: Date = new Date()): ActivityMetricsDto {
    const todayStr = targetDate.toISOString().slice(0, 10);

    const stepRecords = records.filter((r) => r.dataType === 'STEPS');
    const calorieRecords = records.filter((r) => r.dataType === 'ACTIVE_CALORIES');
    const distanceRecords = records.filter((r) => r.dataType === 'DISTANCE');

    // Aggregate daily steps
    const dailySteps = new Map<string, number>();
    for (const r of stepRecords) {
      const dateKey = r.startTime.toISOString().slice(0, 10);
      dailySteps.set(dateKey, (dailySteps.get(dateKey) || 0) + Math.round(r.value));
    }

    // Aggregate daily calories
    const dailyCalories = new Map<string, number>();
    for (const r of calorieRecords) {
      const dateKey = r.startTime.toISOString().slice(0, 10);
      dailyCalories.set(dateKey, (dailyCalories.get(dateKey) || 0) + Math.round(r.value));
    }

    // Aggregate daily distance
    const dailyDistance = new Map<string, number>();
    for (const r of distanceRecords) {
      const dateKey = r.startTime.toISOString().slice(0, 10);
      dailyDistance.set(dateKey, (dailyDistance.get(dateKey) || 0) + r.value);
    }

    const uniqueStepDays = Array.from(dailySteps.entries()).sort(
      (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime(),
    );
    const dataDaysCount = uniqueStepDays.length;

    const availability: WearableMetricAvailability =
      dataDaysCount >= 3
        ? 'AVAILABLE'
        : dataDaysCount > 0
        ? 'INSUFFICIENT_DATA'
        : 'NOT_AVAILABLE';

    // Today metrics
    const todaySteps = dailySteps.get(todayStr) || (uniqueStepDays.length > 0 ? uniqueStepDays[0][1] : 0);
    const todayActiveCaloriesKcal =
      dailyCalories.get(todayStr) || (dailyCalories.size > 0 ? Array.from(dailyCalories.values())[0] : 0);
    const todayDistanceKm = Number(
      (dailyDistance.get(todayStr) || (dailyDistance.size > 0 ? Array.from(dailyDistance.values())[0] : 0)).toFixed(2),
    );

    // 7-day windows
    const recent7StepDays = uniqueStepDays.slice(0, 7);
    const weeklyTotalSteps = recent7StepDays.reduce((acc, [, steps]) => acc + steps, 0);
    const sevenDayAverageSteps =
      recent7StepDays.length > 0 ? Math.round(weeklyTotalSteps / recent7StepDays.length) : 0;

    const recent7CalDays = Array.from(dailyCalories.values()).slice(0, 7);
    const sevenDayAverageCaloriesKcal =
      recent7CalDays.length > 0
        ? Math.round(recent7CalDays.reduce((acc, cal) => acc + cal, 0) / recent7CalDays.length)
        : 0;

    // Active days in last 7 with >= 5,000 steps
    const activityFrequencyPerWeek = recent7StepDays.filter(([, s]) => s >= 5000).length;

    // Estimated active minutes (approx 100 steps = 1 active minute if not directly recorded)
    const activeMinutes = Math.round(todaySteps / 100);

    return {
      availability,
      todaySteps,
      sevenDayAverageSteps,
      todayActiveCaloriesKcal,
      sevenDayAverageCaloriesKcal,
      todayDistanceKm,
      activeMinutes,
      activityFrequencyPerWeek,
      weeklyTotalSteps,
      dataDaysCount,
    };
  }
}
