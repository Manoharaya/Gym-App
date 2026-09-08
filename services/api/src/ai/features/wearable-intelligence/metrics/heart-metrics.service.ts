import { Injectable } from '@nestjs/common';
import { HealthDataRecord } from '@prisma/client';
import { HeartMetricsDto, WearableMetricAvailability } from '@fitcore/types';

@Injectable()
export class HeartMetricsService {
  /**
   * Derives deterministic heart and biometric metrics from normalized Day 23 records.
   * Strictly avoids fabricating unprovided metrics (e.g. HRV).
   */
  calculateHeartMetrics(records: HealthDataRecord[]): HeartMetricsDto {
    const rhrRecords = records
      .filter((r) => r.dataType === 'RESTING_HEART_RATE')
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    const hrRecords = records
      .filter((r) => r.dataType === 'HEART_RATE')
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    const hrvRecords = records
      .filter((r) => r.dataType === 'HEART_RATE_VARIABILITY')
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    // Resting Heart Rate metrics
    const dailyRhr = new Map<string, number>();
    for (const r of rhrRecords) {
      const dateKey = r.startTime.toISOString().slice(0, 10);
      if (!dailyRhr.has(dateKey)) {
        dailyRhr.set(dateKey, Math.round(r.value));
      }
    }

    const uniqueRhrDays = Array.from(dailyRhr.entries()).sort(
      (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime(),
    );
    const dataDaysCount = uniqueRhrDays.length;

    const restingHeartRateAvailability: WearableMetricAvailability =
      dataDaysCount >= 3
        ? 'AVAILABLE'
        : dataDaysCount > 0
        ? 'INSUFFICIENT_DATA'
        : 'NOT_AVAILABLE';

    const latestRestingHeartRateBpm = rhrRecords.length > 0 ? Math.round(rhrRecords[0].value) : null;

    const recent7RhrDays = uniqueRhrDays.slice(0, 7);
    const sevenDayAverageRestingHeartRateBpm =
      recent7RhrDays.length > 0
        ? Math.round(recent7RhrDays.reduce((acc, [, val]) => acc + val, 0) / recent7RhrDays.length)
        : null;

    // Average General Heart Rate
    const averageHeartRateBpm =
      hrRecords.length > 0
        ? Math.round(hrRecords.reduce((acc, r) => acc + r.value, 0) / hrRecords.length)
        : null;

    // HRV (Heart Rate Variability)
    const hrvAvailability: WearableMetricAvailability =
      hrvRecords.length >= 3
        ? 'AVAILABLE'
        : hrvRecords.length > 0
        ? 'INSUFFICIENT_DATA'
        : 'NOT_AVAILABLE';

    const latestHrvMs = hrvRecords.length > 0 ? Math.round(hrvRecords[0].value) : null;
    const recent7Hrv = hrvRecords.slice(0, 7);
    const sevenDayAverageHrvMs =
      recent7Hrv.length > 0
        ? Math.round(recent7Hrv.reduce((acc, r) => acc + r.value, 0) / recent7Hrv.length)
        : null;

    return {
      restingHeartRateAvailability,
      latestRestingHeartRateBpm,
      sevenDayAverageRestingHeartRateBpm,
      averageHeartRateBpm,
      hrvAvailability,
      latestHrvMs,
      sevenDayAverageHrvMs,
      dataDaysCount,
    };
  }
}
