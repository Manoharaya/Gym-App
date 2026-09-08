import { Injectable } from '@nestjs/common';
import { HealthDataRecord } from '@prisma/client';
import { WearableBaselineDto, DataQualityRating } from '@fitcore/types';

@Injectable()
export class WearableBaselineService {
  /**
   * Calculates deterministic member-specific baselines across 7, 14, and 28-day windows.
   */
  calculateBaseline(params: {
    metric: string;
    records: HealthDataRecord[];
    currentValue: number;
    preferredWindowDays?: number;
  }): WearableBaselineDto {
    const { metric, records, currentValue, preferredWindowDays = 14 } = params;

    // Filter matching metric records
    const matchingRecords = records.filter(
      (r) =>
        r.dataType === metric ||
        (metric === 'SLEEP' &&
          (r.dataType === 'SLEEP' ||
            r.dataType === 'SLEEP_DURATION' ||
            r.dataType === 'SLEEP_SESSION')),
    );

    // Group by calendar day
    const dailyValues = new Map<string, number>();
    for (const r of matchingRecords) {
      const dateKey = r.startTime.toISOString().slice(0, 10);
      dailyValues.set(dateKey, (dailyValues.get(dateKey) || 0) + r.value);
    }

    const uniqueDays = Array.from(dailyValues.entries()).sort(
      (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime(),
    );
    const dataDaysCount = uniqueDays.length;

    let dataQuality: DataQualityRating = 'NO_DATA';
    if (dataDaysCount >= 14) {
      dataQuality = 'NORMAL_DATA';
    } else if (dataDaysCount >= 7) {
      dataQuality = 'PARTIAL_DATA';
    } else if (dataDaysCount >= 3) {
      dataQuality = 'INSUFFICIENT_DATA';
    }

    // Window averages
    const calcWindowAvg = (days: number): number | null => {
      const slice = uniqueDays.slice(0, days);
      if (slice.length < Math.min(3, days)) return null;
      const sum = slice.reduce((acc, [, val]) => acc + val, 0);
      return Math.round((sum / slice.length) * 10) / 10;
    };

    const baseline7Day = calcWindowAvg(7);
    const baseline14Day = calcWindowAvg(14);
    const baseline28Day = calcWindowAvg(28);

    const activeBaseline =
      preferredWindowDays === 7
        ? baseline7Day
        : preferredWindowDays === 28
        ? baseline28Day || baseline14Day || baseline7Day
        : baseline14Day || baseline7Day;

    let difference: number | null = null;
    let percentageChange: number | null = null;

    if (activeBaseline != null && activeBaseline > 0) {
      difference = Math.round((currentValue - activeBaseline) * 10) / 10;
      percentageChange = Math.round(((currentValue - activeBaseline) / activeBaseline) * 1000) / 10;
    }

    return {
      metric,
      currentValue,
      baseline7Day,
      baseline14Day,
      baseline28Day,
      difference,
      percentageChange,
      observationWindowDays: preferredWindowDays,
      dataQuality,
    };
  }
}
