import { Injectable, Logger } from '@nestjs/common';
import {
  SCORING_WEIGHTS,
  READINESS_THRESHOLDS,
  READINESS_FORMULA_VERSION,
  READINESS_DESCRIPTIONS,
  READINESS_DISCLAIMER,
} from '../domain/daily-checkin.constants';
import {
  EnergyLevel,
  SleepQuality,
  SorenessLevel,
  StressLevel,
  MotivationLevel,
  DailyReadinessCategory,
} from '../domain/daily-checkin.enums';
import { DailyFitnessScoreResult } from '../domain/daily-checkin.types';

@Injectable()
export class DailyCheckInScoringService {
  private readonly logger = new Logger(DailyCheckInScoringService.name);

  /**
   * Deterministic Fitness Readiness Calculation (v1.0)
   *
   * FitCore Training-Planning Indicator:
   * - Energy points: 5 to 25
   * - Sleep points: 5 to 25 (with optional duration bonus/penalty)
   * - Soreness points (inverted): 2 to 25 (High soreness reduces readiness)
   * - Stress points (inverted): 2 to 15 (High stress reduces readiness)
   * - Motivation points: 2 to 10
   * Total max: 100 points.
   *
   * Thresholds:
   * - >= 80: OPTIMAL
   * - 50 - 79: MODERATE
   * - < 50: RECOVERY_FOCUSED
   *
   * Explicitly non-clinical and non-medical.
   */
  calculateReadiness(params: {
    energyLevel: EnergyLevel;
    sleepQuality: SleepQuality;
    sleepDurationMinutes?: number;
    sorenessLevel: SorenessLevel;
    stressLevel: StressLevel;
    motivationLevel: MotivationLevel;
  }): DailyFitnessScoreResult {
    const energyPoints = SCORING_WEIGHTS.energy[params.energyLevel] ?? 15;

    let sleepPoints = SCORING_WEIGHTS.sleep[params.sleepQuality] ?? 15;
    if (params.sleepDurationMinutes !== undefined) {
      if (params.sleepDurationMinutes < 300) {
        // Less than 5 hours sleep: clamp sleep contribution
        sleepPoints = Math.max(3, sleepPoints - 4);
      } else if (params.sleepDurationMinutes >= 480 && sleepPoints >= 20) {
        // 8+ hours of quality sleep
        sleepPoints = Math.min(25, sleepPoints + 2);
      }
    }

    const sorenessPoints = SCORING_WEIGHTS.soreness[params.sorenessLevel] ?? 15;
    const stressPoints = SCORING_WEIGHTS.stress[params.stressLevel] ?? 10;
    const motivationPoints = SCORING_WEIGHTS.motivation[params.motivationLevel] ?? 6;

    const rawTotal = energyPoints + sleepPoints + sorenessPoints + stressPoints + motivationPoints;
    const score = Math.max(0, Math.min(100, Math.round(rawTotal)));

    let category: DailyReadinessCategory;
    if (score >= READINESS_THRESHOLDS.OPTIMAL) {
      category = DailyReadinessCategory.OPTIMAL;
    } else if (score >= READINESS_THRESHOLDS.MODERATE) {
      category = DailyReadinessCategory.MODERATE;
    } else {
      category = DailyReadinessCategory.RECOVERY_FOCUSED;
    }

    return {
      score,
      category,
      description: READINESS_DESCRIPTIONS[category],
      formulaVersion: READINESS_FORMULA_VERSION,
      breakdown: {
        energyPoints,
        sleepPoints,
        sorenessPoints,
        stressPoints,
        motivationPoints,
      },
      disclaimer: READINESS_DISCLAIMER,
    };
  }
}
