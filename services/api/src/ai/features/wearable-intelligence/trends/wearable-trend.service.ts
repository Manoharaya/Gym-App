import { Injectable } from '@nestjs/common';
import { HealthDataRecord } from '@prisma/client';
import {
  WearableTrendDto,
  WearableTrendType,
  WearableIntelligenceConfidence,
} from '@fitcore/types';
import { MIN_OBSERVATION_DAYS_FOR_TRENDS } from '../wearable-intelligence.constants';

@Injectable()
export class WearableTrendService {
  /**
   * Analyzes multi-day telemetry to detect statistically meaningful trends.
   * Strictly enforces minimum observation counts before reporting trends.
   */
  detectTrends(records: HealthDataRecord[]): WearableTrendDto[] {
    const trends: WearableTrendDto[] = [];

    // 1. Sleep Trend Analysis
    const sleepTrend = this.analyzeMetricTrend(
      records.filter((r) => r.dataType === 'SLEEP' || r.dataType === 'SLEEP_DURATION'),
      'SLEEP',
      {
        increasingType: 'SLEEP_IMPROVING',
        decreasingType: 'SLEEP_DECLINING',
        positiveDescriptor: 'Sleep duration has been trending upward over recent days.',
        negativeDescriptor: 'Sleep duration has been trending downward compared to your earlier baseline.',
        stableDescriptor: 'Sleep duration has remained relatively steady.',
        thresholdPercent: 6, // 6% change indicates meaningful movement
      },
    );
    if (sleepTrend) trends.push(sleepTrend);

    // 2. Activity Trend Analysis
    const activityTrend = this.analyzeMetricTrend(
      records.filter((r) => r.dataType === 'STEPS'),
      'STEPS',
      {
        increasingType: 'ACTIVITY_INCREASING',
        decreasingType: 'ACTIVITY_DECREASING',
        positiveDescriptor: 'Daily step and activity volume is on an upward trend.',
        negativeDescriptor: 'Daily movement and step volume has been decreasing recently.',
        stableDescriptor: 'Daily activity volume has remained consistent.',
        thresholdPercent: 12,
      },
    );
    if (activityTrend) trends.push(activityTrend);

    // 3. Resting Heart Rate Trend Analysis
    // Note for resting HR: lower is generally positive/improving recovery, higher can indicate fatigue
    const rhrRecords = records.filter((r) => r.dataType === 'RESTING_HR' || r.dataType === 'RESTING_HEART_RATE');
    if (rhrRecords.length > 0) {
      const rhrTrend = this.analyzeMetricTrend(
        rhrRecords,
        'RESTING_HEART_RATE',
        {
          increasingType: 'RESTING_HR_INCREASING',
          decreasingType: 'RESTING_HR_DECREASING',
          positiveDescriptor: 'Resting heart rate has trended slightly higher recently.',
          negativeDescriptor: 'Resting heart rate has been trending slightly lower, reflecting steady cardiovascular recovery.',
          stableDescriptor: 'Resting heart rate has remained stable.',
          thresholdPercent: 3,
        },
      );
      if (rhrTrend) trends.push(rhrTrend);
    }

    // 4. HRV Trend Analysis (if present)
    const hrvRecords = records.filter((r) => r.dataType === 'HEART_RATE_VARIABILITY');
    if (hrvRecords.length >= MIN_OBSERVATION_DAYS_FOR_TRENDS) {
      const hrvTrend = this.analyzeMetricTrend(
        hrvRecords,
        'HEART_RATE_VARIABILITY',
        {
          increasingType: 'HRV_IMPROVING',
          decreasingType: 'HRV_DECLINING',
          positiveDescriptor: 'Heart rate variability has been trending upward.',
          negativeDescriptor: 'Heart rate variability has shown a downward trend recently.',
          stableDescriptor: 'Heart rate variability has remained in a consistent range.',
          thresholdPercent: 8,
        },
      );
      if (hrvTrend) trends.push(hrvTrend);
    }

    // If no trends could be derived due to lack of records, return INSUFFICIENT_DATA trend
    if (trends.length === 0) {
      trends.push({
        trendType: 'INSUFFICIENT_DATA',
        metric: 'OVERALL',
        direction: 'UNKNOWN',
        strength: 'SLIGHT',
        confidence: 'INSUFFICIENT_DATA',
        dataPointsUsed: records.length,
        observationWindowDays: 7,
        summaryText: 'There is not enough recorded telemetry across consecutive days to detect trends yet.',
        calculatedAt: new Date().toISOString(),
      });
    }

    return trends;
  }

  /**
   * Helper comparing the first half of a chronological window with the second half.
   */
  private analyzeMetricTrend(
    records: HealthDataRecord[],
    metric: string,
    options: {
      increasingType: WearableTrendType;
      decreasingType: WearableTrendType;
      positiveDescriptor: string;
      negativeDescriptor: string;
      stableDescriptor: string;
      thresholdPercent: number;
    },
  ): WearableTrendDto | null {
    if (records.length === 0) return null;

    // Group by day
    const dailyValues = new Map<string, number>();
    for (const r of records) {
      const dateKey = r.startTime.toISOString().slice(0, 10);
      dailyValues.set(dateKey, (dailyValues.get(dateKey) || 0) + r.value);
    }

    // Sort chronologically ascending
    const sortedDays = Array.from(dailyValues.entries()).sort(
      (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime(),
    );

    const dataPointsUsed = sortedDays.length;

    if (dataPointsUsed < MIN_OBSERVATION_DAYS_FOR_TRENDS) {
      return {
        trendType: 'INSUFFICIENT_DATA',
        metric,
        direction: 'UNKNOWN',
        strength: 'SLIGHT',
        confidence: 'INSUFFICIENT_DATA',
        dataPointsUsed,
        observationWindowDays: dataPointsUsed,
        summaryText: `At least ${MIN_OBSERVATION_DAYS_FOR_TRENDS} days of data are needed to identify a reliable ${metric.toLowerCase()} trend.`,
        calculatedAt: new Date().toISOString(),
      };
    }

    // Split into earlier half vs recent half
    const half = Math.floor(dataPointsUsed / 2);
    const earlierSlice = sortedDays.slice(0, half);
    const recentSlice = sortedDays.slice(half);

    const earlierAvg = earlierSlice.reduce((acc, [, val]) => acc + val, 0) / earlierSlice.length;
    const recentAvg = recentSlice.reduce((acc, [, val]) => acc + val, 0) / recentSlice.length;

    const diff = recentAvg - earlierAvg;
    const pctChange = earlierAvg > 0 ? (diff / earlierAvg) * 100 : 0;

    let trendType: WearableTrendType;
    let direction: 'UP' | 'DOWN' | 'STABLE';
    let strength: 'SLIGHT' | 'MODERATE' | 'STRONG' = 'SLIGHT';
    let summaryText: string;

    const absPct = Math.abs(pctChange);
    if (absPct >= options.thresholdPercent * 2) {
      strength = 'STRONG';
    } else if (absPct >= options.thresholdPercent) {
      strength = 'MODERATE';
    }

    if (pctChange >= options.thresholdPercent) {
      trendType = options.increasingType;
      direction = 'UP';
      summaryText = options.positiveDescriptor;
    } else if (pctChange <= -options.thresholdPercent) {
      trendType = options.decreasingType;
      direction = 'DOWN';
      summaryText = options.negativeDescriptor;
    } else {
      trendType = 'CONSISTENCY_IMPROVING';
      direction = 'STABLE';
      summaryText = options.stableDescriptor;
    }

    const confidence: WearableIntelligenceConfidence =
      dataPointsUsed >= 7 ? 'HIGH' : dataPointsUsed >= 4 ? 'MEDIUM' : 'LOW';

    return {
      trendType,
      metric,
      direction,
      strength,
      confidence,
      dataPointsUsed,
      observationWindowDays: dataPointsUsed,
      summaryText,
      calculatedAt: new Date().toISOString(),
    };
  }
}
