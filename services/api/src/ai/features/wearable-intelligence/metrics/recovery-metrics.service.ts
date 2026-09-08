import { Injectable } from '@nestjs/common';
import {
  RecoverySummaryDto,
  RecoveryCategory,
  WearableIntelligenceConfidence,
  SleepMetricsDto,
  ActivityMetricsDto,
  HeartMetricsDto,
} from '@fitcore/types';
import { NON_MEDICAL_DISCLAIMER } from '../wearable-intelligence.constants';

@Injectable()
export class RecoveryMetricsService {
  /**
   * Derives a deterministic, qualitative recovery indicator from available telemetry.
   * Explicitly avoids fabricating a clinical score or medical diagnosis.
   */
  assessRecovery(params: {
    sleep: SleepMetricsDto;
    activity: ActivityMetricsDto;
    heart: HeartMetricsDto;
    recentCheckInScore?: number | null;
  }): RecoverySummaryDto {
    const { sleep, activity, heart, recentCheckInScore } = params;

    const contributingSignals: string[] = [];
    const caveats: string[] = [];

    // Check data sufficiency: require at least 2 days of sleep or activity
    if (sleep.dataDaysCount < 2 && activity.dataDaysCount < 2) {
      return {
        category: 'INSUFFICIENT_DATA',
        explanation: 'There is not enough synchronized wearable data yet to evaluate recovery indicators.',
        contributingSignals: [],
        caveats: ['Wear your device consistently for at least 3-4 days to establish baseline patterns.'],
        confidence: 'INSUFFICIENT_DATA',
        disclaimer: NON_MEDICAL_DISCLAIMER,
      };
    }

    let recoveryPoints = 0;
    let totalSignals = 0;

    // 1. Sleep Evaluation (Weight: up to 40 pts)
    if (sleep.lastSleepDurationMinutes && sleep.sevenDayAverageMinutes) {
      totalSignals += 1;
      const sleepDiff = sleep.lastSleepDurationMinutes - sleep.sevenDayAverageMinutes;
      if (sleepDiff >= -20) {
        recoveryPoints += 35;
        contributingSignals.push('Recent sleep duration is at or above your 7-day average.');
      } else if (sleepDiff >= -60) {
        recoveryPoints += 20;
        contributingSignals.push('Recent sleep was moderately lower (20-60 min) than your weekly average.');
      } else {
        recoveryPoints += 5;
        contributingSignals.push('Recent sleep was notably lower (>60 min) than your usual baseline.');
      }

      if (sleep.consistencyScore && sleep.consistencyScore >= 75) {
        recoveryPoints += 5;
        contributingSignals.push('Sleep schedule consistency remains strong.');
      }
    } else if (sleep.availability === 'NOT_AVAILABLE') {
      caveats.push('Sleep telemetry is currently unavailable from your connected device.');
    }

    // 2. Resting Heart Rate Evaluation (Weight: up to 30 pts)
    if (heart.latestRestingHeartRateBpm && heart.sevenDayAverageRestingHeartRateBpm) {
      totalSignals += 1;
      const rhrDiff = heart.latestRestingHeartRateBpm - heart.sevenDayAverageRestingHeartRateBpm;
      if (rhrDiff <= 1) {
        recoveryPoints += 30;
        contributingSignals.push('Resting heart rate is stable compared to your 7-day baseline.');
      } else if (rhrDiff <= 4) {
        recoveryPoints += 15;
        contributingSignals.push('Resting heart rate is slightly elevated (+2 to +4 bpm) compared to baseline.');
      } else {
        recoveryPoints += 5;
        contributingSignals.push('Resting heart rate is noticeably elevated (+5 bpm or more) over baseline.');
      }
    } else {
      caveats.push('Resting heart rate telemetry is not available.');
    }

    // 3. Activity Load Context (Weight: up to 20 pts)
    if (activity.todaySteps > 0 && activity.sevenDayAverageSteps > 0) {
      totalSignals += 1;
      const stepRatio = activity.todaySteps / activity.sevenDayAverageSteps;
      if (stepRatio > 1.4) {
        recoveryPoints += 10;
        contributingSignals.push('Daily step and movement volume is significantly above your usual baseline.');
      } else {
        recoveryPoints += 20;
        contributingSignals.push('Daily activity volume is in a balanced, sustainable range.');
      }
    }

    // 4. Daily Check-in Subjective Wellness (Weight: up to 10 pts)
    if (recentCheckInScore != null) {
      totalSignals += 1;
      if (recentCheckInScore >= 75) {
        recoveryPoints += 10;
        contributingSignals.push('Subjective daily readiness score indicates positive energy and low soreness.');
      } else if (recentCheckInScore >= 50) {
        recoveryPoints += 6;
      } else {
        recoveryPoints += 2;
        contributingSignals.push('Subjective check-in reported fatigue or elevated muscle soreness.');
      }
    }

    // Determine category based on point percentage
    // Max possible points varies by available signals
    let maxPoints = 0;
    if (sleep.lastSleepDurationMinutes) maxPoints += 40;
    if (heart.latestRestingHeartRateBpm) maxPoints += 30;
    if (activity.todaySteps > 0) maxPoints += 20;
    if (recentCheckInScore != null) maxPoints += 10;

    const percentage = maxPoints > 0 ? (recoveryPoints / maxPoints) * 100 : 50;

    let category: RecoveryCategory;
    let explanation: string;

    if (percentage >= 70) {
      category = 'GOOD';
      explanation = 'Your recent sleep, resting heart rate, and activity indicators suggest favorable recovery.';
    } else if (percentage >= 45) {
      category = 'MODERATE';
      explanation = 'Recovery indicators appear mixed. Some signals reflect normal training fatigue or slight sleep deficit.';
    } else {
      category = 'LOW';
      explanation = 'Recent indicators suggest prioritizing recovery, with sleep or physiological signals below baseline.';
    }

    const confidence: WearableIntelligenceConfidence =
      totalSignals >= 3 ? 'HIGH' : totalSignals >= 2 ? 'MEDIUM' : 'LOW';

    return {
      category,
      explanation,
      contributingSignals,
      caveats,
      confidence,
      disclaimer: NON_MEDICAL_DISCLAIMER,
    };
  }
}
