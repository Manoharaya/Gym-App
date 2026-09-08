import { Injectable } from '@nestjs/common';
import {
  RetentionInterventionType,
  CommunicationChannel,
  StructuredRetentionStrategy,
} from '@fitcore/types';
import { RetentionAgentMemberContext } from '../context/retention-agent-context.types';
import { RetentionPriorityService } from '../analysis/retention-priority.service';
import { TimingRecommendationService } from './timing-recommendation.service';

@Injectable()
export class InterventionRecommendationService {
  constructor(
    private readonly priorityService: RetentionPriorityService,
    private readonly timingService: TimingRecommendationService,
  ) {}

  /**
   * Recommends the least intrusive appropriate retention intervention.
   */
  recommendStrategy(context: RetentionAgentMemberContext): StructuredRetentionStrategy {
    const priority = this.priorityService.evaluatePriority(context);
    const timing = this.timingService.recommendTiming(context);
    const { trainer, engagement, retentionSignals, communicationPolicy } = context;

    let intervention: RetentionInterventionType = 'TRAINER_CHECK_IN';
    let reason = 'Direct, supportive check-in to ask about training progress and offer schedule flexibility.';
    let suggestedStaffRole = 'TRAINER';
    let expectedNextStep = 'Trainer to greet member and verify next available session time.';

    if (retentionSignals.riskLevel === 'INSUFFICIENT_DATA') {
      return {
        intervention: 'INSUFFICIENT_DATA',
        reason: 'Insufficient attendance telemetry to justify an unsolicited retention intervention.',
        priority: 'LOW',
        suggestedStaffRole: 'RECEPTION',
        suggestedChannel: 'IN_APP',
        suggestedTiming: timing,
        expectedNextStep: 'Allow member to establish baseline attendance.',
        confidence: 0.9,
      };
    }

    if (engagement.noShowsLast30Days >= 2) {
      intervention = 'CLASS_RECOMMENDATION';
      reason = 'Recent no-shows indicate scheduled class timings may conflict with member availability.';
      suggestedStaffRole = 'RECEPTION';
      expectedNextStep = 'Help member identify alternative class time slots or formats.';
    } else if (context.goals && context.goals.length > 0 && engagement.dropPercentage >= 40) {
      intervention = 'GOAL_REVIEW';
      reason = 'Re-aligning fitness milestones re-ignites motivation without pressure.';
      suggestedStaffRole = 'TRAINER';
      expectedNextStep = 'Review active goals and calibrate current weekly workout target.';
    } else if (engagement.daysInactive >= 21) {
      intervention = 'TRAINING_RESTART';
      reason = 'Extended absence benefits from a gentle, low-friction re-entry workout routine.';
      suggestedStaffRole = trainer ? 'TRAINER' : 'STAFF';
      expectedNextStep = 'Propose a quick 20-minute re-activation workout on the gym floor.';
    } else if (trainer) {
      intervention = 'TRAINER_CHECK_IN';
      reason = 'Established coach relationship provides high response and comfort for informal check-in.';
      suggestedStaffRole = 'TRAINER';
      expectedNextStep = 'Assigned trainer Marcus to reach out with personalized greeting.';
    } else {
      intervention = 'GENERAL_SUPPORT';
      reason = 'General supportive check-in to inquire if member needs assistance with equipment or schedules.';
      suggestedStaffRole = 'STAFF';
      expectedNextStep = 'Staff outreach via preferred channel.';
    }

    // Determine channel (respecting allowed channels and preferred order)
    const channelOrder: CommunicationChannel[] = ['WHATSAPP', 'SMS', 'EMAIL', 'PUSH', 'IN_APP'];
    const suggestedChannel: CommunicationChannel =
      channelOrder.find((c) => communicationPolicy.allowedChannels.includes(c)) || 'EMAIL';

    return {
      intervention,
      reason,
      priority,
      suggestedStaffRole,
      suggestedChannel,
      suggestedTiming: timing,
      expectedNextStep,
      confidence: 0.9,
    };
  }
}
