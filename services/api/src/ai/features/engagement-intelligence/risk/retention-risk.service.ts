import { Injectable, Logger } from '@nestjs/common';
import {
  RetentionRiskAssessment,
  RetentionRiskLevel,
  DataQualityLevel,
  ReactivationWorkflowState,
} from '@fitcore/types';
import { EngagementSignalsBundle } from '../engagement-intelligence.types';
import { PersonalBaselineDto } from '@fitcore/types';
import { RiskExplanationService } from './risk-explanation.service';

@Injectable()
export class RetentionRiskService {
  private readonly logger = new Logger(RetentionRiskService.name);

  constructor(private readonly explanationService: RiskExplanationService) {}

  /**
   * Deterministic Retention Risk Foundation.
   *
   * CRITICAL FAIRNESS BOUNDARY:
   * Protected attributes (race, religion, ethnicity, gender, sexual orientation, disability,
   * medical conditions, PAR-Q, medications) are strictly excluded and NEVER utilized in calculations.
   *
   * Distinguishes OBSERVED SIGNAL from RISK INTERPRETATION.
   * Never asserts certainty of churn.
   */
  evaluateRetentionRisk(
    signals: EngagementSignalsBundle,
    baseline: PersonalBaselineDto,
    existingWorkflowState: ReactivationWorkflowState = 'NO_ACTION',
    now: Date = new Date(),
  ): RetentionRiskAssessment {
    // 1. Evaluate Data Quality
    const totalSignalsCount =
      signals.attendance.visitsLast28d +
      signals.workout.workoutsScheduledLast28d +
      signals.booking.bookingsLast28d +
      signals.app.eventsLast28d +
      signals.checkin.checkInsLast28d;

    let dataQuality: DataQualityLevel = 'SUFFICIENT_DATA';
    if (totalSignalsCount === 0) {
      dataQuality = 'NO_DATA';
    } else if (!baseline.sufficientHistory || totalSignalsCount < 3) {
      dataQuality = 'INSUFFICIENT_DATA';
    } else if (signals.attendance.visitsLast28d === 0 && signals.workout.workoutsScheduledLast28d === 0) {
      dataQuality = 'PARTIAL_DATA';
    }

    // If data is insufficient or new member, return INSUFFICIENT_DATA
    if (dataQuality === 'NO_DATA' || dataQuality === 'INSUFFICIENT_DATA') {
      return {
        memberId: signals.memberId,
        organisationId: signals.organisationId,
        riskLevel: 'INSUFFICIENT_DATA',
        observedSignals: [],
        contributingReasons: ['Insufficient historical platform activity recorded to establish a behavioral baseline.'],
        workflowState: 'NO_ACTION',
        dataQuality,
        assessedAt: now.toISOString(),
      };
    }

    // 2. Compute explainable contributing signals
    const { observedSignals, contributingReasons } = this.explanationService.generateExplanations(
      signals,
      baseline,
    );

    // 3. Deterministic scoring points (higher points = higher retention risk indicator)
    let riskPoints = 0;

    // Attendance decline against personal baseline (strongest physical indicator)
    if (signals.attendance.visitsDeltaPct <= -60 && baseline.baselineVisitsPerWeek >= 1.5) {
      riskPoints += 40;
    } else if (signals.attendance.visitsDeltaPct <= -30 && baseline.baselineVisitsPerWeek >= 1) {
      riskPoints += 25;
    } else if (signals.attendance.visitsLast28d === 0 && baseline.baselineVisitsPerWeek > 0) {
      riskPoints += 45;
    }

    // Missed sessions / no-shows
    if (signals.attendance.noShowCountLast28d >= 3) {
      riskPoints += 25;
    } else if (signals.attendance.noShowCountLast28d >= 1) {
      riskPoints += 10;
    }

    // Workout adherence drop
    if (signals.workout.workoutsScheduledLast28d >= 2 && signals.workout.workoutAdherencePct < 25) {
      riskPoints += 25;
    } else if (signals.workout.workoutsScheduledLast28d >= 2 && signals.workout.workoutAdherencePct < 50) {
      riskPoints += 15;
    }

    // Booking inactivity
    if (baseline.baselineBookingsPerWeek >= 1 && baseline.recentBookingsPerWeek === 0) {
      riskPoints += 15;
    }

    // App engagement collapse
    if (signals.app.eventsLast28d === 0) {
      riskPoints += 20;
    } else if (signals.app.eventsDeltaPct <= -50 && baseline.baselineAppEventsPerWeek >= 3) {
      riskPoints += 15;
    }

    // Commercial membership warning
    if (signals.membership.isSuspended) {
      riskPoints += 30;
    } else if (signals.membership.isExpiringSoon) {
      riskPoints += 20;
    }

    // Check-in disengagement
    if (signals.checkin.checkInsLast28d >= 3 && signals.checkin.checkInsLast7d === 0) {
      riskPoints += 10;
    }

    // 4. Determine Retention Risk Level
    let riskLevel: RetentionRiskLevel = 'LOW';
    if (riskPoints >= 65) {
      riskLevel = 'HIGH';
    } else if (riskPoints >= 45) {
      riskLevel = 'ELEVATED';
    } else if (riskPoints >= 25) {
      riskLevel = 'MODERATE';
    } else {
      riskLevel = 'LOW';
    }

    // 5. Manage Workflow State (Default progression without autonomous messaging)
    let workflowState = existingWorkflowState;
    if (workflowState === 'NO_ACTION' && (riskLevel === 'HIGH' || riskLevel === 'ELEVATED')) {
      workflowState = 'FOLLOW_UP_RECOMMENDED';
    } else if (riskLevel === 'LOW' && workflowState === 'FOLLOW_UP_RECOMMENDED') {
      workflowState = 'NO_ACTION';
    }

    // If no specific reasons were flagged but risk is LOW, provide positive confirmation
    if (contributingReasons.length === 0) {
      contributingReasons.push('Gym visits, workout adherence, and platform activity are consistent with member baseline.');
    }

    return {
      memberId: signals.memberId,
      organisationId: signals.organisationId,
      riskLevel,
      observedSignals,
      contributingReasons,
      workflowState,
      dataQuality,
      assessedAt: now.toISOString(),
    };
  }
}
