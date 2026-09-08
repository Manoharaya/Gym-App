/**
 * Day 30 — Communication Action Integration Service
 *
 * Dispatches workflow outbound communications exclusively through
 * the centralized Day 28 Communication Engine (CommunicationOrchestratorService).
 * Direct external provider invocations (Twilio, SendGrid, etc.) are strictly prohibited.
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CommunicationOrchestratorService } from '../../communications/orchestrator/communication-orchestrator.service';
import { CommunicationChannel } from '../../communications/communications.types';

export interface ExecuteCommunicationActionParams {
  organisationId: string;
  outletId?: string | null;
  memberId: string;
  channel?: string; // SMS, EMAIL, WHATSAPP, PUSH
  subject?: string;
  message?: string;
  messageNepali?: string;
  templateId?: string;
  variables?: Record<string, any>;
  workflowInstanceId: string;
  stepId: string;
}

@Injectable()
export class CommunicationActionService {
  private readonly logger = new Logger(CommunicationActionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly communicationOrchestrator?: CommunicationOrchestratorService,
  ) {}

  /**
   * Executes a SEND_COMMUNICATION workflow action.
   */
  async executeCommunicationAction(params: ExecuteCommunicationActionParams): Promise<{
    success: boolean;
    communicationId?: string;
    details: string;
  }> {
    const {
      organisationId,
      outletId,
      memberId,
      channel = 'PUSH',
      subject,
      message,
      messageNepali,
      templateId,
      variables = {},
      workflowInstanceId,
      stepId,
    } = params;

    // 1. Fetch member with user relation
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!member) {
      return {
        success: false,
        details: `Member profile '${memberId}' not found. Cannot send communication.`,
      };
    }

    // 2. Build template variable substitution map
    const nowStr = new Date().toLocaleDateString('en-US', { dateStyle: 'medium' });
    const fullVars: Record<string, any> = {
      firstName: member.user?.firstName || 'Member',
      lastName: member.user?.lastName || '',
      fullName: `${member.user?.firstName || ''} ${member.user?.lastName || ''}`.trim() || 'Member',
      phone: member.user?.phone || '',
      email: member.user?.email || '',
      date: nowStr,
      ...variables,
    };

    // Render variables into template string
    const render = (tpl?: string) => {
      if (!tpl) return '';
      return tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => fullVars[key] !== undefined ? String(fullVars[key]) : '');
    };

    const renderedSubject = render(subject) || 'Gym Update';
    // If Nepali copy is present and desired, or fallback to message
    const bodyTemplate = fullVars.language === 'ne' && messageNepali ? messageNepali : message;
    const renderedBody = render(bodyTemplate) || 'You have an update from your gym.';

    // 3. Dispatch through centralized Communication Engine
    if (this.communicationOrchestrator) {
      try {
        const commChannel = (channel.toUpperCase() as CommunicationChannel) || 'PUSH';
        const result = await this.communicationOrchestrator.submitCommunication({
          organisationId,
          outletId: outletId || undefined,
          recipientUserId: member.userId,
          recipientMemberId: member.id,
          type: 'ENGAGEMENT',
          requestedChannel: commChannel,
          templateId: templateId || undefined,
          subject: renderedSubject,
          body: renderedBody,
          variables: fullVars,
          source: 'WORKFLOW_AUTOMATION',
          sourceReferenceId: workflowInstanceId,
          requiresApproval: false,
          metadata: {
            workflowInstanceId,
            stepId,
            actionType: 'SEND_COMMUNICATION',
          },
        } as any);

        return {
          success: true,
          communicationId: (result as any)?.id,
          details: `Communication dispatched via ${commChannel}. Id: ${(result as any)?.id || 'SUBMITTED'}`,
        };
      } catch (err: any) {
        this.logger.error(`Failed to submit communication to orchestrator: ${err.message}`, err.stack);
        return {
          success: false,
          details: `Failed to submit communication: ${err.message}`,
        };
      }
    } else {
      // Graceful fallback if orchestrator is running without email/sms workers
      this.logger.warn('CommunicationOrchestratorService not available; logging simulated delivery.');
      return {
        success: true,
        details: `Simulated communication dispatched to member ${memberId} via ${channel}: "${renderedBody}"`,
      };
    }
  }
}
