import { Injectable } from '@nestjs/common';
import { EngagementLevel } from '@fitcore/types';

export interface LevelDeterminationInput {
  score: number;
  currentStreak: number;
  lastActivityAt: Date | null;
  memberJoinedAt: Date;
  totalActivitiesCount: number;
}

@Injectable()
export class EngagementLevelService {
  /**
   * Deterministically resolves member engagement level without ML.
   */
  determineLevel(input: LevelDeterminationInput): EngagementLevel {
    const now = new Date();
    const daysSinceJoin = (now.getTime() - input.memberJoinedAt.getTime()) / (1000 * 60 * 60 * 24);

    const daysSinceLastActivity = input.lastActivityAt
      ? (now.getTime() - input.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;

    // 1. NEW member check: joined <= 14 days ago and fewer than 3 activities
    if (daysSinceJoin <= 14 && input.totalActivitiesCount < 3) {
      return EngagementLevel.NEW;
    }

    // 2. DORMANT: no activity for > 21 days
    if (daysSinceLastActivity > 21) {
      return EngagementLevel.DORMANT;
    }

    // 3. AT_RISK: no activity between 8 and 21 days, or low score after 14 days
    if (daysSinceLastActivity > 7 || input.score < 25) {
      return EngagementLevel.AT_RISK;
    }

    // 4. HIGHLY_ENGAGED: score >= 75 or (streak >= 7 and active in last 2 days)
    if (input.score >= 75 || (input.currentStreak >= 7 && daysSinceLastActivity <= 2)) {
      return EngagementLevel.HIGHLY_ENGAGED;
    }

    // 5. ENGAGED: score >= 50 or (streak >= 3 and active in last 4 days)
    if (input.score >= 50 || (input.currentStreak >= 3 && daysSinceLastActivity <= 4)) {
      return EngagementLevel.ENGAGED;
    }

    // 6. ACTIVE: active in last 7 days and score >= 25
    return EngagementLevel.ACTIVE;
  }
}
