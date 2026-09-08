import { Injectable } from '@nestjs/common';
import { HealthDataRecord } from '@prisma/client';
import { SleepMetricsDto, WearableMetricAvailability } from '@fitcore/types';

@Injectable()
export class SleepMetricsService {
  /**
   * Derives deterministic sleep metrics from normalized Day 23 records.
   */
  calculateSleepMetrics(records: HealthDataRecord[]): SleepMetricsDto {
    const sleepRecords = records.filter(
      (r) =>
        r.dataType === 'SLEEP' ||
        r.dataType === 'SLEEP_DURATION' ||
        r.dataType === 'SLEEP_SESSION',
    );

    if (sleepRecords.length === 0) {
      return {
        availability: 'NOT_AVAILABLE',
        lastSleepDurationMinutes: null,
        lastSleepStart: null,
        lastSleepEnd: null,
        sevenDayAverageMinutes: null,
        fourteenDayAverageMinutes: null,
        consistencyScore: null,
        dataDaysCount: 0,
      };
    }

    // Sort by startTime descending
    const sorted = [...sleepRecords].sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime(),
    );

    const latest = sorted[0];

    // Group records by calendar date string (YYYY-MM-DD)
    const dailyDurations = new Map<string, number>();
    for (const r of sleepRecords) {
      const dateKey = r.startTime.toISOString().slice(0, 10);
      const current = dailyDurations.get(dateKey) || 0;
      dailyDurations.set(dateKey, current + Math.round(r.value));
    }

    const uniqueDays = Array.from(dailyDurations.entries()).sort(
      (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime(),
    );
    const dataDaysCount = uniqueDays.length;

    const availability: WearableMetricAvailability =
      dataDaysCount >= 3
        ? 'AVAILABLE'
        : dataDaysCount > 0
        ? 'INSUFFICIENT_DATA'
        : 'NOT_AVAILABLE';

    // 7-day average
    const recent7Days = uniqueDays.slice(0, 7);
    const sevenDayAverageMinutes =
      recent7Days.length > 0
        ? Math.round(recent7Days.reduce((acc, [, dur]) => acc + dur, 0) / recent7Days.length)
        : null;

    // 14-day average
    const recent14Days = uniqueDays.slice(0, 14);
    const fourteenDayAverageMinutes =
      recent14Days.length > 0
        ? Math.round(recent14Days.reduce((acc, [, dur]) => acc + dur, 0) / recent14Days.length)
        : null;

    // Bedtime consistency score (0-100) based on sleep start regularity
    let consistencyScore: number | null = null;
    if (uniqueDays.length >= 3) {
      const startMinutesArray = sorted.slice(0, 10).map((r) => {
        const d = new Date(r.startTime);
        return d.getUTCHours() * 60 + d.getUTCMinutes();
      });

      const avgStart =
        startMinutesArray.reduce((acc, v) => acc + v, 0) / startMinutesArray.length;
      const variance =
        startMinutesArray.reduce((acc, v) => acc + Math.pow(v - avgStart, 2), 0) /
        startMinutesArray.length;
      const stdDev = Math.sqrt(variance);

      // Score: stdDev <= 30 mins -> 95+, stdDev >= 120 mins -> 50 or lower
      consistencyScore = Math.max(10, Math.min(100, Math.round(100 - (stdDev / 120) * 50)));
    }

    return {
      availability,
      lastSleepDurationMinutes: latest ? Math.round(latest.value) : null,
      lastSleepStart: latest?.startTime ? latest.startTime.toISOString() : null,
      lastSleepEnd: latest?.endTime ? latest.endTime.toISOString() : null,
      sevenDayAverageMinutes,
      fourteenDayAverageMinutes,
      consistencyScore,
      dataDaysCount,
    };
  }
}
