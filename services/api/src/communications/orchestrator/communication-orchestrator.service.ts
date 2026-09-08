import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { ChannelSelectionService } from './channel-selection.service';
import { DeliveryPolicyService } from './delivery-policy.service';
import { TemplateService } from '../templates/template.service';
import { DeliveryService } from '../delivery/delivery.service';
import {
  CommunicationRequest,
  CommunicationChannel,
  CommunicationStatus,
} from '../communications.types';
import { COMMUNICATION_AUDIT_ACTIONS } from '../communications.constants';

@Injectable()
export class CommunicationOrchestratorService {
  private readonly logger = new Logger(CommunicationOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly channelSelector: ChannelSelectionService,
    private readonly policyService: DeliveryPolicyService,
    private readonly templateService: TemplateService,
    private readonly deliveryService: DeliveryService,
  ) {}

  /**
   * Primary entry point for submitting outbound communications.
   * Enforces tenant context, idempotency, policy/consent, template rendering, and delivery dispatch.
   */
  async submitCommunication(request: CommunicationRequest) {
    const {
      organisationId,
      outletId,
      recipientUserId,
      recipientMemberId,
      type,
      requestedChannel,
      templateId,
      subject: directSubject,
      body: directBody,
      variables = {},
      source,
      sourceReferenceId,
      requiresApproval = false,
      scheduledAt,
      idempotencyKey,
      metadata = {},
    } = request as any;

    if (!organisationId) {
      throw new BadRequestException('organisationId is required for tenant isolation');
    }

    // 1. Idempotency Check (Section 34)
    if (idempotencyKey) {
      const existing = await this.prisma.communication.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        this.logger.log(`Idempotent request match for key: ${idempotencyKey} (ID: ${existing.id})`);
        return existing;
      }
    }

    // 2. Recipient Resolution
    let resolvedUserId = recipientUserId;
    let recipientEmail = request.recipientEmail;
    let recipientPhone = request.recipientPhone;

    if (recipientMemberId && !resolvedUserId) {
      const member = await this.prisma.memberProfile.findUnique({
        where: { id: recipientMemberId },
        include: { user: true },
      });
      if (member) {
        resolvedUserId = member.userId;
        recipientEmail = recipientEmail || member.user.email;
        recipientPhone = recipientPhone || member.user.phone || undefined;
      }
    } else if (resolvedUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: resolvedUserId },
      });
      if (user) {
        recipientEmail = recipientEmail || user.email;
        recipientPhone = recipientPhone || user.phone || undefined;
      }
    }

    // 3. Resolve Push Device Tokens
    let hasPushTokens = false;
    if (resolvedUserId) {
      const activeDevices = await this.prisma.pushDevice.count({
        where: { userId: resolvedUserId, status: 'ACTIVE' },
      });
      hasPushTokens = activeDevices > 0;
    }

    // 4. Channel Selection (Section 27)
    const selectedChannel: CommunicationChannel = this.channelSelector.selectChannel({
      requestedChannel: request.channel || requestedChannel,
      type,
      capabilities: {
        hasEmail: Boolean(recipientEmail),
        hasPhone: Boolean(recipientPhone),
        hasPushTokens,
      },
    });

    // 5. Template Resolution & Safe Rendering (Section 19, 20)
    let renderedSubject = directSubject;
    let renderedBody = directBody || '';
    let templateVersionId: string | undefined = undefined;

    if (templateId) {
      const template = await this.templateService.getTemplateById(templateId, organisationId);
      const rendered = await this.templateService.renderTemplate(templateId, variables);
      renderedSubject = rendered.subject || directSubject;
      renderedBody = rendered.body;

      const activeVersion = await this.prisma.communicationTemplateVersion.findFirst({
        where: { templateId, version: rendered.version },
      });
      templateVersionId = activeVersion?.id;
    }

    // 6. Delivery Policy & Consent Evaluation (Section 24, 26, 44, 45)
    const policyResult = await this.policyService.evaluatePolicy({
      organisationId,
      outletId,
      userId: resolvedUserId,
      memberId: recipientMemberId,
      channel: selectedChannel,
      type,
      templateId,
    });

    const isSuppressed = policyResult.result !== 'ALLOWED';
    let initialStatus: CommunicationStatus = 'QUEUED';

    if (isSuppressed) {
      initialStatus = 'SUPPRESSED';
    } else if (requiresApproval) {
      initialStatus = 'PENDING_APPROVAL';
    }

    // 7. Persist Communication Record
    const parsedScheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    const isFutureScheduled = parsedScheduledAt && parsedScheduledAt > new Date();

    const communication = await this.prisma.communication.create({
      data: {
        organisationId,
        outletId,
        recipientUserId: resolvedUserId,
        recipientMemberId,
        recipientStaffId: request.recipientStaffId,
        type,
        channel: selectedChannel,
        templateId,
        templateVersionId,
        subject: renderedSubject,
        contentPreview: renderedBody.substring(0, 160),
        body: renderedBody,
        variables: variables as any,
        status: initialStatus,
        scheduledAt: parsedScheduledAt,
        queuedAt: new Date(),
        provider: 'PENDING',
        attemptCount: 0,
        maxAttempts: 3,
        source: source || 'SYSTEM',
        sourceReferenceId,
        idempotencyKey,
        suppressionReason: isSuppressed ? policyResult.reason : null,
        metadata: {
          ...metadata,
          recipientEmail,
          recipientPhone,
        } as any,
      },
    });

    await this.auditService.log({
      userId: resolvedUserId,
      organisationId,
      action: isSuppressed
        ? COMMUNICATION_AUDIT_ACTIONS.SUPPRESSED
        : requiresApproval
        ? COMMUNICATION_AUDIT_ACTIONS.CREATED
        : COMMUNICATION_AUDIT_ACTIONS.QUEUED,
      resource: 'communication',
      resourceId: communication.id,
      metadata: {
        channel: selectedChannel,
        type,
        status: initialStatus,
        source,
      },
    });

    // 8. Immediate Dispatch if approved and not scheduled for future
    if (!isSuppressed && !requiresApproval && !isFutureScheduled) {
      await this.deliveryService.dispatch(communication.id);
      return this.prisma.communication.findUnique({ where: { id: communication.id } });
    }

    return communication;
  }

  /**
   * Approves a PENDING_APPROVAL communication and triggers immediate delivery.
   */
  async approveCommunication(communicationId: string, actorUserId: string, organisationId: string) {
    const communication = await this.prisma.communication.findUnique({
      where: { id: communicationId },
    });

    if (!communication) {
      throw new NotFoundException(`Communication '${communicationId}' not found`);
    }

    if (communication.organisationId !== organisationId) {
      throw new BadRequestException('Tenant mismatch on approval');
    }

    if (communication.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(
        `Communication cannot be approved: current status is '${communication.status}'`
      );
    }

    await this.prisma.communication.update({
      where: { id: communicationId },
      data: { status: 'APPROVED' },
    });

    await this.auditService.log({
      userId: actorUserId,
      organisationId,
      action: COMMUNICATION_AUDIT_ACTIONS.APPROVED,
      resource: 'communication',
      resourceId: communicationId,
    });

    // Dispatch now that approval was granted
    await this.deliveryService.dispatch(communicationId);

    return this.prisma.communication.findUnique({ where: { id: communicationId } });
  }

  /**
   * Cancels a communication if in draft, pending approval, or queued/scheduled state.
   */
  async cancelCommunication(communicationId: string, actorUserId: string, organisationId: string) {
    const communication = await this.prisma.communication.findUnique({
      where: { id: communicationId },
    });

    if (!communication) {
      throw new NotFoundException(`Communication '${communicationId}' not found`);
    }

    if (communication.organisationId !== organisationId) {
      throw new BadRequestException('Tenant mismatch on cancellation');
    }

    const cancellableStatuses = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'QUEUED'];
    if (!cancellableStatuses.includes(communication.status)) {
      throw new BadRequestException(
        `Communication cannot be cancelled in state '${communication.status}'`
      );
    }

    const updated = await this.prisma.communication.update({
      where: { id: communicationId },
      data: {
        status: 'CANCELLED',
        suppressionReason: `Cancelled by staff user ${actorUserId}`,
      },
    });

    await this.auditService.log({
      userId: actorUserId,
      organisationId,
      action: COMMUNICATION_AUDIT_ACTIONS.CANCELLED,
      resource: 'communication',
      resourceId: communicationId,
    });

    return updated;
  }
}
