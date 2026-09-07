import { Injectable, Logger } from '@nestjs/common';
import { ChallengeService } from '../services/challenge.service';
import { RewardService } from '../services/reward.service';
import { EngagementEvent, EngagementEventType } from '@fitcore/types';

@Injectable()
export class EngagementEventProcessor {
  private readonly logger = new Logger(EngagementEventProcessor.name);

  constructor(
    private readonly challengeService: ChallengeService,
    private readonly rewardService: RewardService,
  ) {}

  /**
   * Processes domain engagement events to drive challenges, badges, and retention loops.
   */
  async processEvent(event: EngagementEvent): Promise<void> {
    this.logger.log(`Processing engagement event '${event.eventType}' for member '${event.memberId}'`);

    // 1. Challenge progress integration (Slice 18)
    if (event.eventType === EngagementEventType.WORKOUT_COMPLETED) {
      await this.challengeService.incrementProgressForMember(
        event.memberId,
        event.organisationId,
        'WORKOUT_COMPLETION',
        1,
      );
    } else if (event.eventType === EngagementEventType.GYM_CHECKED_IN) {
      await this.challengeService.incrementProgressForMember(
        event.memberId,
        event.organisationId,
        'ATTENDANCE',
        1,
      );
    } else if (event.eventType === EngagementEventType.CLASS_ATTENDED) {
      await this.challengeService.incrementProgressForMember(
        event.memberId,
        event.organisationId,
        'CLASS_ATTENDANCE',
        1,
      );
    }

    // 2. Badge qualification evaluation (Slice 22)
    await this.rewardService.evaluateBadges(event.memberId, event.organisationId);
  }
}
