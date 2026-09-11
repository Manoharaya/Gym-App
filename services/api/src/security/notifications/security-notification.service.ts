import { Injectable, Logger, Optional } from '@nestjs/common';
import { NotificationOrchestratorService } from '../../communication/services/notification-orchestrator.service';

export interface SecurityNotificationInput {
  userId: string;
  organisationId?: string;
  type:
    | 'NEW_DEVICE_LOGIN'
    | 'MFA_ENABLED'
    | 'MFA_DISABLED'
    | 'PASSWORD_CHANGED'
    | 'SESSION_REVOKED'
    | 'SECURITY_ALERT';
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * SecurityNotificationService
 *
 * Routes security notifications through the Day 28 Communication Engine.
 * Invariant: Never leaks sensitive authentication secrets, tokens, or recovery codes.
 */
@Injectable()
export class SecurityNotificationService {
  private readonly logger = new Logger(SecurityNotificationService.name);

  constructor(
    @Optional()
    private readonly notificationOrchestrator?: NotificationOrchestratorService,
  ) {}

  /**
   * Dispatches a security notification safely.
   */
  async notify(input: SecurityNotificationInput): Promise<void> {
    this.logger.log(
      `[SECURITY NOTIFICATION] ${input.type} dispatched to user ${input.userId}: ${input.title}`,
    );

    if (!this.notificationOrchestrator) {
      return;
    }

    try {
      await (this.notificationOrchestrator as any).handleDomainEvent?.({
        type: `SECURITY_${input.type}`,
        recipientUserId: input.userId,
        organisationId: input.organisationId || '',
        data: {
          title: input.title,
          body: input.message,
          metadata: input.metadata || {},
        },
      });
    } catch (err: any) {
      // Do not break critical security paths if notification delivery has transient failure
      this.logger.warn(`Failed to dispatch security notification via orchestrator: ${err.message}`);
    }
  }
}
