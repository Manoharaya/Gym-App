import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationOrchestratorService } from '../../communication/services/notification-orchestrator.service';
import {
  NotificationCategoryEnum,
  NotificationPriorityEnum,
} from '../../communication/dto/communication.dto';

export interface EngagementNotificationPayload {
  type: string;
  organisationId: string;
  outletId?: string | null;
  memberId: string;
  title?: string;
  variables: Record<string, any>;
  data?: Record<string, any>;
  priority?: NotificationPriorityEnum;
}

export const MAX_DAILY_ENGAGEMENT_NOTIFICATIONS = 3;
export const ENGAGEMENT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class EngagementNotificationService {
  private readonly logger = new Logger(EngagementNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly orchestrator?: NotificationOrchestratorService,
  ) {}

  /**
   * Dispatches an engagement event to the Day 17 NotificationOrchestrator
   * with anti-spam rate limiting, duplicate suppression, and cooldown checks.
   */
  async dispatchEngagementNotification(payload: EngagementNotificationPayload): Promise<boolean> {
    if (!this.orchestrator) {
      this.logger.warn('NotificationOrchestrator not registered or available. Notification dropped.');
      return false;
    }

    // Resolve recipient user from member profile
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: payload.memberId },
      select: { userId: true, organisationId: true },
    });

    if (!member) {
      this.logger.warn(`MemberProfile '${payload.memberId}' not found. Cannot send notification.`);
      return false;
    }

    const userId = member.userId;
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const cooldownCutoff = new Date(now.getTime() - ENGAGEMENT_COOLDOWN_MS);

    // 1. Duplicate suppression: has this exact event type been sent in the last 24 hours?
    const recentDuplicate = await this.prisma.notification.findFirst({
      where: {
        recipientUserId: userId,
        type: payload.type,
        createdAt: { gte: twentyFourHoursAgo },
      },
    });

    if (recentDuplicate) {
      this.logger.log(
        `Suppressed duplicate engagement notification '${payload.type}' for user '${userId}' within 24h.`,
      );
      return false;
    }

    // 2. Daily frequency cap check: max 3 engagement notifications per 24 hours
    const dailyCount = await this.prisma.notification.count({
      where: {
        recipientUserId: userId,
        category: { in: [NotificationCategoryEnum.TRAINING, NotificationCategoryEnum.PROGRESS] },
        createdAt: { gte: twentyFourHoursAgo },
      },
    });

    if (dailyCount >= MAX_DAILY_ENGAGEMENT_NOTIFICATIONS) {
      this.logger.log(
        `Engagement notification rate limit reached (${dailyCount}/${MAX_DAILY_ENGAGEMENT_NOTIFICATIONS}) for user '${userId}'.`,
      );
      return false;
    }

    // 3. Cooldown check: min 1 hour between engagement notifications (unless priority is HIGH/URGENT)
    if (payload.priority !== NotificationPriorityEnum.HIGH && payload.priority !== NotificationPriorityEnum.URGENT) {
      const recentNotification = await this.prisma.notification.findFirst({
        where: {
          recipientUserId: userId,
          category: { in: [NotificationCategoryEnum.TRAINING, NotificationCategoryEnum.PROGRESS] },
          createdAt: { gte: cooldownCutoff },
        },
      });

      if (recentNotification) {
        this.logger.log(
          `Engagement notification cooldown active for user '${userId}'. Dropping notification.`,
        );
        return false;
      }
    }

    // 4. Dispatch to Day 17 NotificationOrchestrator
    try {
      await this.orchestrator.handleDomainEvent({
        type: payload.type,
        organisationId: payload.organisationId,
        outletId: payload.outletId,
        recipientUserId: userId,
        memberId: payload.memberId,
        category: NotificationCategoryEnum.PROGRESS,
        priority: payload.priority ?? NotificationPriorityEnum.NORMAL,
        variables: payload.variables,
        data: payload.data,
        isMarketing: false,
        idempotencyKey: `eng:${payload.memberId}:${payload.type}:${now.toISOString().split('T')[0]}`,
      });
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to dispatch engagement notification: ${err.message}`, err.stack);
      return false;
    }
  }
}
