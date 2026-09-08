import { Injectable } from '@nestjs/common';
import { RetentionPriorityLevel, RetentionRiskLevel, RetentionRiskTrend } from '@fitcore/types';
import { RetentionAgentMemberContext } from '../context/retention-agent-context.types';

@Injectable()
export class RetentionPriorityService {
  /**
   * Deterministically evaluates retention priority based on objective engagement telemetry.
   * AI may explain priority but must never arbitrarily override platform rules.
   */
  evaluatePriority(context: RetentionAgentMemberContext): RetentionPriorityLevel {
    const { retentionSignals, engagement } = context;
    const { riskLevel, riskTrend } = retentionSignals;
    const { dropPercentage, daysInactive, noShowsLast30Days } = engagement;

    // 1. URGENT Priority:
    // High risk, worsening trend, and severe attendance collapse or repeated no-shows
    if (
      riskLevel === 'HIGH' &&
      (riskTrend === 'WORSENING' || dropPercentage >= 70 || daysInactive >= 21 || noShowsLast30Days >= 3)
    ) {
      return 'URGENT';
    }

    // 2. HIGH Priority:
    // Elevated/High risk with significant attendance drop or sustained inactivity
    if (
      (riskLevel === 'HIGH' || riskLevel === 'ELEVATED') &&
      (dropPercentage >= 40 || daysInactive >= 14 || riskTrend === 'WORSENING')
    ) {
      return 'HIGH';
    }

    // 3. MEDIUM Priority:
    // Moderate risk, noticeable drop, or multiple recent missed activities
    if (
      riskLevel === 'MODERATE' ||
      riskLevel === 'ELEVATED' ||
      dropPercentage >= 25 ||
      daysInactive >= 7 ||
      noShowsLast30Days >= 1
    ) {
      return 'MEDIUM';
    }

    // 4. LOW Priority:
    // Low risk or minor variation
    return 'LOW';
  }
}
