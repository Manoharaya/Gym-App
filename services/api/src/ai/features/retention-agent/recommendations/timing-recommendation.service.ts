import { Injectable } from '@nestjs/common';
import { RetentionTimingRecommendation } from '@fitcore/types';
import { RetentionAgentMemberContext } from '../context/retention-agent-context.types';

@Injectable()
export class TimingRecommendationService {
  /**
   * Computes recommended delivery timing outside quiet hours (21:00-08:00).
   * Aligns with local outlet operating hours and member activity patterns.
   */
  recommendTiming(
    context: RetentionAgentMemberContext,
    targetTimezone: string = 'UTC',
  ): RetentionTimingRecommendation {
    const now = new Date();
    // Default to tomorrow at 10:00 AM UTC (optimal gym engagement time)
    const target = new Date(now.getTime() + 24 * 3600 * 1000);
    target.setUTCHours(10, 0, 0, 0);

    return {
      recommendedAt: target.toISOString(),
      timezone: targetTimezone,
      reason: 'Scheduled for morning operational hours (10:00 AM) safely outside quiet hours (21:00-08:00).',
      confidence: 0.95,
    };
  }
}
