import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { AuditService } from '../../../../audit/audit.service';
import { CommunicationOrchestratorService } from '../../../../communications/orchestrator/communication-orchestrator.service';
import { RetentionMessageService } from '../messaging/retention-message.service';
import {
  ApproveOutreachDto,
  RejectOutreachDto,
  RescheduleOutreachDto,
  RetentionOutreachDto,
} from '@fitcore/types';
import {
  RETENTION_AGENT_EVENTS,
  RETENTION_AGENT_AUDIT_ACTIONS,
} from '../retention-agent.constants';

@Injectable()
export class RetentionApprovalService {
  private readonly logger = new Logger(RetentionApprovalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly communicationOrchestrator: CommunicationOrchestratorService,
    private readonly messageService: RetentionMessageService,
  ) {}

  /**
   * Approves a PENDING_APPROVAL retention outreach.
   * Dispatches the approved outreach through the Day 28 Communication Orchestrator.
   */
  async approveOutreach(
    outreachId: string,
    dto: ApproveOutreachDto,
    staffUserId: string,
    organisationId: string,
  ): Promise<RetentionOutreachDto> {
    const outreach = await this.prisma.retentionOutreach.findFirst({
      where: { id: outreachId, organisationId },
      include: { memberProfile: { include: { user: true } }, outlet: true },
    });

    if (!outreach) {
      throw new NotFoundException(`Outreach ${outreachId} not found in organisation`);
    }

    if (outreach.status === 'APPROVED' || outreach.status === 'SENT' || outreach.status === 'DELIVERED') {
      this.logger.log(`Outreach ${outreachId} was already approved; returning existing.`);
      return this.mapToDto(outreach);
    }

    if (outreach.status !== 'PENDING_APPROVAL' && outreach.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot approve outreach in '${outreach.status}' status`);
    }

    // 1. Process message edit if provided
    let finalMessage = outreach.messageDraft;
    if (dto.editedMessage && dto.editedMessage.trim().length > 0) {
      finalMessage = this.messageService.validateStaffEdit(dto.editedMessage);
    }

    const selectedChannel = dto.selectedChannel || (outreach.selectedChannel as any);
    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : outreach.scheduledAt;

    // 2. Submit to Day 28 Communication Orchestrator
    const communication = await this.communicationOrchestrator.submitCommunication({
      organisationId,
      outletId: outreach.outletId || undefined,
      recipientMemberId: outreach.memberId,
      recipientUserId: outreach.memberProfile.userId,
      type: 'REACTIVATION' as any,
      channel: selectedChannel,
      body: finalMessage,
      source: 'AI_AGENT' as any,
      sourceReferenceId: outreach.id,
      requiresApproval: false, // Staff just approved it!
      scheduledAt: scheduledAt || undefined,
      idempotencyKey: `retention_outreach_${outreach.id}`,
    });

    // 3. Update outreach record
    const updated = await this.prisma.retentionOutreach.update({
      where: { id: outreach.id },
      data: {
        status: 'APPROVED',
        approvalStatus: 'APPROVED',
        approvedByStaffId: staffUserId,
        finalMessage,
        selectedChannel,
        scheduledAt,
        staffNotes: dto.staffNotes || outreach.staffNotes,
        communicationId: communication?.id,
      },
      include: {
        memberProfile: { include: { user: true } },
        outlet: true,
        assignedStaff: true,
        approvedByStaff: true,
      },
    });

    // 4. Audit
    await this.auditService.log({
      action: RETENTION_AGENT_AUDIT_ACTIONS.OUTREACH_APPROVED,
      resource: 'retention_outreach',
      resourceId: outreach.id,
      userId: staffUserId,
      organisationId,
      metadata: {
        channel: selectedChannel,
        communicationId: communication?.id,
        wasEdited: finalMessage !== outreach.messageDraft,
      },
    });

    this.logger.log(`Retention outreach ${outreach.id} approved by staff ${staffUserId}`);
    return this.mapToDto(updated);
  }

  /**
   * Rejects a retention outreach with a reason.
   */
  async rejectOutreach(
    outreachId: string,
    dto: RejectOutreachDto,
    staffUserId: string,
    organisationId: string,
  ): Promise<RetentionOutreachDto> {
    const outreach = await this.prisma.retentionOutreach.findFirst({
      where: { id: outreachId, organisationId },
      include: { memberProfile: { include: { user: true } }, outlet: true },
    });

    if (!outreach) {
      throw new NotFoundException(`Outreach ${outreachId} not found`);
    }

    if (outreach.status === 'REJECTED') {
      return this.mapToDto(outreach);
    }

    if (outreach.status !== 'PENDING_APPROVAL' && outreach.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot reject outreach in '${outreach.status}' status`);
    }

    const updated = await this.prisma.retentionOutreach.update({
      where: { id: outreach.id },
      data: {
        status: 'REJECTED',
        approvalStatus: 'REJECTED',
        rejectionReason: dto.reason,
        approvedByStaffId: staffUserId,
      },
      include: {
        memberProfile: { include: { user: true } },
        outlet: true,
        assignedStaff: true,
        approvedByStaff: true,
      },
    });

    await this.auditService.log({
      action: RETENTION_AGENT_AUDIT_ACTIONS.OUTREACH_REJECTED,
      resource: 'retention_outreach',
      resourceId: outreach.id,
      userId: staffUserId,
      organisationId,
      metadata: { reason: dto.reason },
    });

    return this.mapToDto(updated);
  }

  /**
   * Cancels a pending or scheduled outreach.
   */
  async cancelOutreach(
    outreachId: string,
    staffUserId: string,
    organisationId: string,
  ): Promise<RetentionOutreachDto> {
    const outreach = await this.prisma.retentionOutreach.findFirst({
      where: { id: outreachId, organisationId },
      include: { memberProfile: { include: { user: true } }, outlet: true },
    });

    if (!outreach) {
      throw new NotFoundException(`Outreach ${outreachId} not found`);
    }

    if (outreach.status === 'SENT' || outreach.status === 'DELIVERED') {
      throw new BadRequestException('Cannot cancel an outreach that has already been delivered');
    }

    const updated = await this.prisma.retentionOutreach.update({
      where: { id: outreach.id },
      data: { status: 'CANCELLED' },
      include: {
        memberProfile: { include: { user: true } },
        outlet: true,
        assignedStaff: true,
        approvedByStaff: true,
      },
    });

    await this.auditService.log({
      action: RETENTION_AGENT_AUDIT_ACTIONS.OUTREACH_CANCELLED,
      resource: 'retention_outreach',
      resourceId: outreach.id,
      userId: staffUserId,
      organisationId,
    });

    return this.mapToDto(updated);
  }

  /**
   * Reschedules a pending or scheduled outreach.
   */
  async rescheduleOutreach(
    outreachId: string,
    dto: RescheduleOutreachDto,
    staffUserId: string,
    organisationId: string,
  ): Promise<RetentionOutreachDto> {
    const outreach = await this.prisma.retentionOutreach.findFirst({
      where: { id: outreachId, organisationId },
      include: { memberProfile: { include: { user: true } }, outlet: true },
    });

    if (!outreach) {
      throw new NotFoundException(`Outreach ${outreachId} not found`);
    }

    const updated = await this.prisma.retentionOutreach.update({
      where: { id: outreach.id },
      data: {
        scheduledAt: new Date(dto.scheduledAt),
        status: 'SCHEDULED',
      },
      include: {
        memberProfile: { include: { user: true } },
        outlet: true,
        assignedStaff: true,
        approvedByStaff: true,
      },
    });

    return this.mapToDto(updated);
  }

  mapToDto(outreach: any): RetentionOutreachDto {
    const user = outreach.memberProfile?.user;
    const memberName = user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
      : undefined;

    const assignedStaff = outreach.assignedStaff;
    const assignedStaffName = assignedStaff
      ? `${assignedStaff.firstName || ''} ${assignedStaff.lastName || ''}`.trim()
      : undefined;

    const approvedByStaff = outreach.approvedByStaff;
    const approvedByStaffName = approvedByStaff
      ? `${approvedByStaff.firstName || ''} ${approvedByStaff.lastName || ''}`.trim()
      : undefined;

    return {
      id: outreach.id,
      organisationId: outreach.organisationId,
      memberId: outreach.memberId,
      memberName,
      outletId: outreach.outletId || undefined,
      outletName: outreach.outlet?.name,
      retentionAnalysisId: outreach.retentionAnalysisId || undefined,
      interventionType: outreach.interventionType,
      communicationId: outreach.communicationId || undefined,
      assignedStaffId: outreach.assignedStaffId || undefined,
      assignedStaffName,
      approvedByStaffId: outreach.approvedByStaffId || undefined,
      approvedByStaffName,
      status: outreach.status,
      approvalStatus: outreach.approvalStatus,
      recommendedChannel: outreach.recommendedChannel,
      selectedChannel: outreach.selectedChannel,
      messageDraft: outreach.messageDraft,
      finalMessage: outreach.finalMessage || undefined,
      staffNotes: outreach.staffNotes || undefined,
      rejectionReason: outreach.rejectionReason || undefined,
      scheduledAt: outreach.scheduledAt?.toISOString(),
      sentAt: outreach.sentAt?.toISOString(),
      deliveredAt: outreach.deliveredAt?.toISOString(),
      respondedAt: outreach.respondedAt?.toISOString(),
      outcome: outreach.outcome || undefined,
      outcomeReason: outreach.outcomeReason || undefined,
      outcomeRecordedAt: outreach.outcomeRecordedAt?.toISOString(),
      createdAt: outreach.createdAt.toISOString(),
      updatedAt: outreach.updatedAt.toISOString(),
    };
  }
}
