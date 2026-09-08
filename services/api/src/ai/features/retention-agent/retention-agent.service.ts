import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../audit/audit.service';
import { RetentionWorkflowService } from './workflows/retention-workflow.service';
import { RetentionApprovalService } from './workflows/retention-approval.service';
import { RetentionAnalysisService } from './analysis/retention-analysis.service';
import { RetentionOutcomeService } from './workflows/retention-outcome.service';
import {
  RetentionAgentQueueQueryDto,
  AnalyzeRetentionAgentMemberDto,
  CreateRetentionOutreachDto,
  ApproveRetentionOutreachDto,
  RejectRetentionOutreachDto,
  RescheduleRetentionOutreachDto,
  SubmitRetentionOutreachFeedbackDto,
  RecordRetentionOutcomeDto,
} from './dto/retention-agent.dto';
import { AuthenticatedUser } from '../../../common/interfaces/request-with-user.interface';
import { RETENTION_AGENT_AUDIT_ACTIONS } from './retention-agent.constants';
import { RetentionMetricsEngineService } from './metrics/retention-metrics-engine.service';

@Injectable()
export class RetentionAgentService {
  private readonly logger = new Logger(RetentionAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly workflowService: RetentionWorkflowService,
    private readonly approvalService: RetentionApprovalService,
    private readonly analysisService: RetentionAnalysisService,
    private readonly outcomeService: RetentionOutcomeService,
    private readonly metricsEngine: RetentionMetricsEngineService,
  ) {}

  /**
   * Retrieves deterministic retention data bundle and evidence points for a member (Section 7A).
   */
  async getMemberMetrics(memberId: string, organisationId: string, user: AuthenticatedUser) {
    await this.assertMemberAccess(memberId, organisationId, user);
    return this.metricsEngine.computeRetentionDataBundle(memberId, organisationId);
  }

  /**
   * Retrieves the staff retention queue.
   */
  async getQueue(organisationId: string, query: RetentionAgentQueueQueryDto, user: AuthenticatedUser) {
    const effectiveQuery = { ...query };
    if (user.roles?.some((r) => r.role === 'TRAINER')) {
      effectiveQuery.assignedStaffId = user.id;
    }
    return this.workflowService.getQueue(organisationId, effectiveQuery as any);
  }

  /**
   * Retrieves latest retention analysis and engagement profile for a member.
   */
  async getMemberAnalysis(memberId: string, organisationId: string, user: AuthenticatedUser) {
    await this.assertMemberAccess(memberId, organisationId, user);

    const latest = await this.prisma.retentionAgentAnalysis.findFirst({
      where: { memberId, organisationId },
      orderBy: { createdAt: 'desc' },
    });

    const activeOutreach = await this.prisma.retentionOutreach.findFirst({
      where: { memberId, organisationId, status: 'PENDING_APPROVAL' },
      orderBy: { createdAt: 'desc' },
      include: {
        memberProfile: { include: { user: true } },
        outlet: true,
        assignedStaff: true,
        approvedByStaff: true,
      },
    });

    return {
      latestAnalysis: latest,
      pendingOutreach: activeOutreach ? this.approvalService.mapToDto(activeOutreach) : null,
    };
  }

  /**
   * Triggers an on-demand retention analysis and generates an outreach draft.
   */
  async analyzeMember(
    memberId: string,
    organisationId: string,
    user: AuthenticatedUser,
    dto?: AnalyzeRetentionAgentMemberDto,
  ) {
    await this.assertMemberAccess(memberId, organisationId, user);

    return this.workflowService.createOutreachForMember(
      memberId,
      organisationId,
      user.id,
      dto?.promptQuery,
    );
  }

  /**
   * Creates a manual outreach record (e.g. from staff composer).
   */
  async createOutreach(
    dto: CreateRetentionOutreachDto,
    user: AuthenticatedUser,
    organisationId: string,
  ) {
    await this.assertMemberAccess(dto.memberId, organisationId, user);

    const created = await this.prisma.retentionOutreach.create({
      data: {
        organisationId,
        memberId: dto.memberId,
        outletId: dto.outletId,
        interventionType: dto.interventionType,
        selectedChannel: dto.selectedChannel,
        recommendedChannel: dto.selectedChannel,
        messageDraft: dto.messageDraft,
        status: 'PENDING_APPROVAL',
        approvalStatus: 'PENDING',
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        assignedStaffId: dto.assignedStaffId || user.id,
      },
      include: {
        memberProfile: { include: { user: true } },
        outlet: true,
        assignedStaff: true,
        approvedByStaff: true,
      },
    });

    return this.approvalService.mapToDto(created);
  }

  /**
   * Retrieves outreach detail.
   */
  async getOutreachById(id: string, organisationId: string, user: AuthenticatedUser) {
    const outreach = await this.workflowService.getOutreachById(id, organisationId);
    await this.assertMemberAccess(outreach.memberId, organisationId, user);
    return outreach;
  }

  /**
   * Approves outreach and submits to Day 28 Communication Orchestrator.
   */
  async approveOutreach(
    id: string,
    dto: ApproveRetentionOutreachDto,
    user: AuthenticatedUser,
    organisationId: string,
  ) {
    const outreach = await this.workflowService.getOutreachById(id, organisationId);
    await this.assertMemberAccess(outreach.memberId, organisationId, user);
    return this.approvalService.approveOutreach(id, dto, user.id, organisationId);
  }

  /**
   * Rejects outreach with a rationale.
   */
  async rejectOutreach(
    id: string,
    dto: RejectRetentionOutreachDto,
    user: AuthenticatedUser,
    organisationId: string,
  ) {
    const outreach = await this.workflowService.getOutreachById(id, organisationId);
    await this.assertMemberAccess(outreach.memberId, organisationId, user);
    return this.approvalService.rejectOutreach(id, dto, user.id, organisationId);
  }

  /**
   * Cancels a pending or scheduled outreach.
   */
  async cancelOutreach(id: string, user: AuthenticatedUser, organisationId: string) {
    const outreach = await this.workflowService.getOutreachById(id, organisationId);
    await this.assertMemberAccess(outreach.memberId, organisationId, user);
    return this.approvalService.cancelOutreach(id, user.id, organisationId);
  }

  /**
   * Reschedules an outreach.
   */
  async rescheduleOutreach(
    id: string,
    dto: RescheduleRetentionOutreachDto,
    user: AuthenticatedUser,
    organisationId: string,
  ) {
    const outreach = await this.workflowService.getOutreachById(id, organisationId);
    await this.assertMemberAccess(outreach.memberId, organisationId, user);
    return this.approvalService.rescheduleOutreach(id, dto, user.id, organisationId);
  }

  /**
   * Submits staff feedback on an outreach recommendation.
   */
  async submitFeedback(
    id: string,
    dto: SubmitRetentionOutreachFeedbackDto,
    user: AuthenticatedUser,
    organisationId: string,
  ) {
    const outreach = await this.workflowService.getOutreachById(id, organisationId);
    await this.assertMemberAccess(outreach.memberId, organisationId, user);

    if (outreach.retentionAnalysisId) {
      await this.prisma.retentionAgentAnalysis.update({
        where: { id: outreach.retentionAnalysisId },
        data: {
          staffNote: `Staff feedback (${dto.rating}): ${dto.comment || 'No comment'}`,
        },
      });
    }

    return { success: true, message: 'Feedback recorded successfully' };
  }

  /**
   * Records an observed re-engagement outcome.
   */
  async recordOutcome(dto: RecordRetentionOutcomeDto, user: AuthenticatedUser, organisationId: string) {
    const outreach = await this.workflowService.getOutreachById(dto.outreachId, organisationId);
    await this.assertMemberAccess(outreach.memberId, organisationId, user);
    return this.outcomeService.recordOutcome(dto, user.id, organisationId);
  }

  /**
   * Gets retention agent operational analytics.
   */
  async getAnalytics(organisationId: string, outletId?: string) {
    return this.workflowService.getAnalytics(organisationId, outletId);
  }

  /**
   * Asserts tenant and trainer assignment boundaries.
   */
  private async assertMemberAccess(
    memberId: string,
    organisationId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const member = await this.prisma.memberProfile.findFirst({
      where: { id: memberId },
      include: {
        trainerClientAssignments: { where: { status: 'ACTIVE' } },
        memberOutlets: { where: { status: 'ACTIVE' } },
      },
    });

    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found`);
    }

    if (member.organisationId !== organisationId) {
      throw new ForbiddenException('Cannot access member from another organisation');
    }

    const userRole = user.roles?.[0]?.role;
    const userOutletId = user.roles?.[0]?.outletId;

    // Outlet scope for OUTLET_MANAGER
    if (userRole === 'OUTLET_MANAGER' && userOutletId) {
      const isMemberInOutlet = member.memberOutlets.some((mo) => mo.outletId === userOutletId);
      if (!isMemberInOutlet) {
        throw new ForbiddenException('Outlet managers can only access members within their outlet');
      }
    }

    // Trainer client assignment for TRAINER
    if (userRole === 'TRAINER') {
      const trainer = await this.prisma.trainerProfile.findFirst({
        where: { organisationId, staffProfile: { userId: user.id } },
      });
      if (!trainer) {
        throw new ForbiddenException('Trainer profile not found');
      }

      const assignment = await this.prisma.trainerClientAssignment.findFirst({
        where: {
          memberProfileId: memberId,
          trainerProfileId: trainer.id,
          status: 'ACTIVE',
        },
      });

      if (!assignment) {
        throw new ForbiddenException('Trainers can only access their assigned clients');
      }
    }
  }
}
