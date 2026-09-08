import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../audit/audit.service';
import { AuthenticatedUser } from '../../../common/interfaces/request-with-user.interface';
import { ReactivationAnalysisService } from './analysis/reactivation-analysis.service';
import { ReactivationWorkflowService } from './workflows/reactivation-workflow.service';
import {
  ReactivationSummaryDto,
  ReactivationQueueItemDto,
  MemberReactivationProfileDto,
  MemberRecoveryPlanDto,
  RecoveryPlanStatus,
  ReactivationStrategyType,
  RecoveryState,
} from '@fitcore/types';
import {
  AnalyzeReactivationDto,
  ReactivationQueueQueryDto,
  ReactivationSummaryQueryDto,
  CreateRecoveryPlanRequestDto,
  UpdateRecoveryPlanRequestDto,
} from './dto/reactivation-analysis.dto';
import { SubmitReactivationFeedbackRequestDto } from './dto/reactivation-feedback.dto';
import {
  REACTIVATION_AUDIT_ACTIONS,
  REACTIVATION_THRESHOLDS,
} from './reactivation.constants';

@Injectable()
export class ReactivationService {
  private readonly logger = new Logger(ReactivationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly analysisService: ReactivationAnalysisService,
    private readonly workflowService: ReactivationWorkflowService,
  ) {}

  /**
   * 1. GET /api/v1/ai/reactivation/summary
   * Provides aggregate reactivation and recovery metrics across an organisation or outlet.
   */
  async getSummary(
    organisationId: string,
    query?: ReactivationSummaryQueryDto,
  ): Promise<ReactivationSummaryDto> {
    const outletId = query?.outletId;

    const memberWhere: any = {
      organisationId,
      status: { notIn: ['DELETED', 'ARCHIVED', 'BANNED', 'TRANSFERRED'] },
      ...(outletId
        ? {
            memberOutlets: {
              some: { outletId, status: 'ACTIVE' },
            },
          }
        : {}),
    };

    const totalMembers = await this.prisma.memberProfile.count({ where: memberWhere });

    const profiles = await this.prisma.memberReactivationProfile.findMany({
      where: {
        organisationId,
        memberProfile: memberWhere,
      },
      select: {
        lifecycleState: true,
        reactivationStatus: true,
        recoveryState: true,
        recommendedStrategy: true,
        inactivityDays: true,
      },
    });

    const plans = await this.prisma.memberRecoveryPlan.findMany({
      where: {
        organisationId,
        ...(outletId
          ? {
              memberProfile: {
                memberOutlets: {
                  some: { outletId, status: 'ACTIVE' },
                },
              },
            }
          : {}),
      },
      select: {
        status: true,
        strategyType: true,
      },
    });

    let reengagedCount = 0;

    const strategyDistribution: Record<ReactivationStrategyType, number> = {
      PERSONAL_TRAINER_CHECK_IN: 0,
      GOAL_RESET: 0,
      TRAINING_RESTART: 0,
      CLASS_REINTRODUCTION: 0,
      PERSONAL_TRAINING_RESTART: 0,
      ROUTINE_REBUILD: 0,
      RECOVERY_FOCUSED_RETURN: 0,
      APP_ENGAGEMENT_RESTART: 0,
      NUTRITION_LOGGING_RESTART: 0,
      MEMBERSHIP_REVIEW: 0,
      GENERAL_SUPPORT: 0,
      NO_ACTION: 0,
      INSUFFICIENT_DATA: 0,
    };

    const recoveryStateDistribution: Record<RecoveryState, number> = {
      NO_RECOVERY_SIGNAL: 0,
      EARLY_REENGAGEMENT: 0,
      PARTIAL_REENGAGEMENT: 0,
      STABLE_REENGAGEMENT: 0,
      REENGAGED: 0,
    };

    for (const p of profiles) {
      if (p.recoveryState && recoveryStateDistribution[p.recoveryState as RecoveryState] !== undefined) {
        recoveryStateDistribution[p.recoveryState as RecoveryState]++;
      }
      if (p.recoveryState === 'REENGAGED' || p.reactivationStatus === 'REENGAGED') {
        reengagedCount++;
      }
      if (p.recommendedStrategy && strategyDistribution[p.recommendedStrategy as ReactivationStrategyType] !== undefined) {
        strategyDistribution[p.recommendedStrategy as ReactivationStrategyType]++;
      }
    }

    const pendingPlansCount = plans.filter((pl) => pl.status === 'PENDING_APPROVAL').length;
    const completedPlans = plans.filter((pl) => pl.status === 'COMPLETED' || pl.status === 'REENGAGED').length;
    const totalTerminatedPlans = plans.filter((pl) =>
      ['COMPLETED', 'REENGAGED', 'DISMISSED', 'EXPIRED'].includes(pl.status),
    ).length;

    const recoverySuccessRate =
      totalTerminatedPlans > 0
        ? Math.round((completedPlans / totalTerminatedPlans) * 100)
        : 0;

    return {
      organisationId,
      outletId: outletId || null,
      totalActiveMembers: totalMembers,
      eligibleMembersCount: profiles.filter((p) => p.lifecycleState === 'ELIGIBLE').length,
      membersInReactivationCount: profiles.filter((p) => p.lifecycleState === 'IN_REACTIVATION').length,
      reengagedMembersCount: reengagedCount,
      followupsPendingApprovalCount: pendingPlansCount,
      followupsInProgressCount: plans.filter((pl) => pl.status === 'IN_PROGRESS').length,
      averageInactivityDaysBeforeRecovery: 21,
      recoveryRatePercent: recoverySuccessRate,
      strategyDistribution,
      recoveryStateDistribution,
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * 2. GET /api/v1/ai/reactivation/queue
   * Staff reactivation follow-up queue with filters.
   */
  async getQueue(
    organisationId: string,
    query: ReactivationQueueQueryDto,
    user: AuthenticatedUser,
  ): Promise<{ items: ReactivationQueueItemDto[]; total: number; limit: number; offset: number }> {
    const limit = query.limit || 20;
    const offset = query.offset || 0;

    let trainerMemberIds: string[] | null = null;
    const isTrainer = user.roles?.some((r) => r.role === 'TRAINER');
    const isPrivileged = user.roles?.some((r) =>
      ['SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER'].includes(r.role),
    );

    if (isTrainer && !isPrivileged) {
      const trainer = await this.prisma.trainerProfile.findFirst({
        where: { organisationId, staffProfile: { userId: user.id } },
      });
      if (trainer) {
        const assignments = await this.prisma.trainerClientAssignment.findMany({
          where: { trainerProfileId: trainer.id, status: 'ACTIVE' },
          select: { memberProfileId: true },
        });
        trainerMemberIds = assignments.map((a) => a.memberProfileId);
      } else {
        trainerMemberIds = [];
      }
    }

    const where: any = {
      organisationId,
      ...(query.lifecycleState ? { lifecycleState: query.lifecycleState } : {}),
      ...(query.reactivationStatus ? { reactivationStatus: query.reactivationStatus } : {}),
      ...(query.recoveryState ? { recoveryState: query.recoveryState } : {}),
      ...(query.strategyType ? { recommendedStrategy: query.strategyType } : {}),
      ...(query.assignedStaffId
        ? {
            currentRecoveryPlan: {
              assignedStaffId: query.assignedStaffId,
            },
          }
        : {}),
      ...(trainerMemberIds !== null
        ? {
            memberId: { in: trainerMemberIds },
          }
        : {}),
      ...(query.outletId
        ? {
            memberProfile: {
              memberOutlets: {
                some: { outletId: query.outletId, status: 'ACTIVE' },
              },
            },
          }
        : {}),
    };

    const [total, profiles] = await Promise.all([
      this.prisma.memberReactivationProfile.count({ where }),
      this.prisma.memberReactivationProfile.findMany({
        where,
        orderBy: [{ inactivityDays: 'desc' }, { updatedAt: 'desc' }],
        skip: offset,
        take: limit,
        include: {
          memberProfile: {
            include: {
              user: {
                select: { firstName: true, lastName: true, email: true, avatarUrl: true },
              },
            },
          },
          currentRecoveryPlan: {
            include: {
              assignedStaff: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
      }),
    ]);

    const items: ReactivationQueueItemDto[] = profiles.map((p) => {
      const u = p.memberProfile?.user;
      const assigned = p.currentRecoveryPlan?.assignedStaff;
      const barriers = Array.isArray(p.primaryBarriers) ? (p.primaryBarriers as any[]) : [];
      const primaryBarrier = barriers[0]?.observation || 'Absence from facility';

      return {
        memberId: p.memberId,
        memberName: u ? `${u.firstName} ${u.lastName}`.trim() : 'Unknown Member',
        memberEmail: u?.email || undefined,
        avatarUrl: u?.avatarUrl || null,
        outletId: query.outletId,
        inactivityDays: p.inactivityDays,
        lastMeaningfulActivityAt: p.lastMeaningfulActivityAt ? p.lastMeaningfulActivityAt.toISOString() : null,
        riskLevel: (p.retentionRiskLevel || 'LOW') as any,
        riskTrend: (p.retentionRiskTrend || 'STABLE') as any,
        recoveryState: p.recoveryState as any,
        primaryBarrier,
        recommendedStrategy: (p.recommendedStrategy || 'GENERAL_SUPPORT') as any,
        strategyPriority: (p.currentRecoveryPlan?.priority || 'MEDIUM') as any,
        assignedStaff: assigned ? { id: assigned.id, name: `${assigned.firstName} ${assigned.lastName}`.trim() } : null,
        recoveryPlanStatus: (p.currentRecoveryPlan?.status as any) || null,
        activePlanId: p.currentRecoveryPlan?.id || null,
      };
    });

    return { items, total, limit, offset };
  }

  /**
   * 3. GET /api/v1/ai/reactivation/members/:memberId
   */
  async getMemberReactivation(
    organisationId: string,
    memberId: string,
    user: AuthenticatedUser,
  ): Promise<{ profile: MemberReactivationProfileDto | null; activePlan: MemberRecoveryPlanDto | null }> {
    const member = await this.prisma.memberProfile.findFirst({
      where: { id: memberId, organisationId },
    });
    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found in organisation.`);
    }

    await this.verifyTrainerAccess(user.id, user.roles, memberId, organisationId);

    const profile = await this.prisma.memberReactivationProfile.findFirst({
      where: { organisationId, memberId },
      include: {
        currentRecoveryPlan: {
          include: { assignedStaff: true, outlet: true },
        },
        memberProfile: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    if (!profile) {
      return { profile: null, activePlan: null };
    }

    const u = profile.memberProfile?.user;

    return {
      profile: {
        id: profile.id,
        organisationId: profile.organisationId,
        memberId: profile.memberId,
        memberName: u ? `${u.firstName} ${u.lastName}`.trim() : undefined,
        lifecycleState: profile.lifecycleState as any,
        reactivationStatus: profile.reactivationStatus as any,
        recoveryState: profile.recoveryState as any,
        inactivityStartDate: profile.inactivityStartDate?.toISOString() || null,
        lastMeaningfulActivityAt: profile.lastMeaningfulActivityAt?.toISOString() || null,
        inactivityDays: profile.inactivityDays,
        previousEngagementLevel: profile.previousEngagementLevel as any,
        currentEngagementLevel: profile.currentEngagementLevel as any,
        retentionRiskLevel: profile.retentionRiskLevel as any,
        retentionRiskTrend: profile.retentionRiskTrend as any,
        primaryBarriers: (profile.primaryBarriers as any) || [],
        positiveSignals: (profile.positiveSignals as any) || [],
        recommendedStrategy: profile.recommendedStrategy as any,
        activePlan: profile.currentRecoveryPlan
          ? this.mapRecoveryPlanToDto(profile.currentRecoveryPlan)
          : null,
        analysisVersion: profile.analysisVersion,
        dataVersion: profile.dataVersion,
        updatedAt: profile.updatedAt.toISOString(),
      },
      activePlan: profile.currentRecoveryPlan
        ? this.mapRecoveryPlanToDto(profile.currentRecoveryPlan)
        : null,
    };
  }

  /**
   * 4. POST /api/v1/ai/reactivation/analyze
   */
  async analyzeMember(
    organisationId: string,
    dto: AnalyzeReactivationDto,
    user: AuthenticatedUser,
  ) {
    await this.verifyTrainerAccess(user.id, user.roles, dto.memberId, organisationId);

    return this.analysisService.analyzeMember({
      user,
      memberId: dto.memberId,
      organisationId,
      forceRefresh: dto.forceRefresh,
      includeAIAssessment: dto.includeAIAssessment,
    });
  }

  /**
   * 5. POST /api/v1/ai/reactivation/plans
   */
  async createRecoveryPlan(
    organisationId: string,
    user: AuthenticatedUser,
    dto: CreateRecoveryPlanRequestDto,
  ): Promise<MemberRecoveryPlanDto> {
    await this.verifyTrainerAccess(user.id, user.roles, dto.memberId, organisationId);

    const member = await this.prisma.memberProfile.findFirst({
      where: { id: dto.memberId, organisationId },
    });

    if (!member) {
      throw new NotFoundException(`Member ${dto.memberId} not found in organisation.`);
    }

    const now = new Date();
    const expiresInDays = dto.expiresInDays || REACTIVATION_THRESHOLDS.DEFAULT_PLAN_EXPIRY_DAYS;
    const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);

    const isPrivileged = user.roles?.some((r) =>
      ['SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER'].includes(r.role),
    );
    const initialStatus: RecoveryPlanStatus = isPrivileged ? 'APPROVED' : 'PENDING_APPROVAL';

    const plan = await this.prisma.memberRecoveryPlan.create({
      data: {
        organisationId,
        memberId: dto.memberId,
        status: initialStatus,
        strategyType: dto.strategyType,
        strategy: dto.strategyType,
        targetChannel: dto.targetChannel,
        recommendedAction: dto.recommendedAction,
        reason: dto.recommendedAction,
        draftMessage: dto.draftMessage || null,
        suggestedStaffMessage: dto.draftMessage || null,
        suggestedNextStep: dto.recommendedAction,
        staffNotes: dto.staffNotes || null,
        outcomeNotes: dto.staffNotes || null,
        assignedStaffId: dto.assignedStaffId || user.id,
        approvedByStaffId: initialStatus === 'APPROVED' ? user.id : null,
        approvedAt: initialStatus === 'APPROVED' ? now : null,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      },
    });

    // Link plan to profile
    await this.prisma.memberReactivationProfile.updateMany({
      where: { organisationId, memberId: dto.memberId },
      data: {
        currentRecoveryPlanId: plan.id,
        reactivationStatus: initialStatus === 'APPROVED' ? 'FOLLOW_UP_IN_PROGRESS' : 'FOLLOW_UP_RECOMMENDED',
        updatedAt: now,
      },
    });

    // Audit log
    await this.auditService.log({
      action: REACTIVATION_AUDIT_ACTIONS.RECOVERY_PLAN_CREATED,
      resource: 'MemberRecoveryPlan',
      resourceId: plan.id,
      userId: user.id,
      organisationId,
      metadata: {
        memberId: dto.memberId,
        strategyType: dto.strategyType,
        status: initialStatus,
      },
    });

    return this.mapRecoveryPlanToDto(plan);
  }

  /**
   * 6. GET /api/v1/ai/reactivation/plans/:planId
   */
  async getRecoveryPlan(
    organisationId: string,
    planId: string,
    user: AuthenticatedUser,
  ): Promise<MemberRecoveryPlanDto> {
    const plan = await this.prisma.memberRecoveryPlan.findFirst({
      where: { id: planId, organisationId },
      include: {
        memberProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
        assignedStaff: { select: { id: true, firstName: true, lastName: true } },
        outlet: { select: { id: true, name: true } },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Recovery plan ${planId} not found.`);
    }

    await this.verifyTrainerAccess(user.id, user.roles, plan.memberId, organisationId);

    return this.mapRecoveryPlanToDto(plan);
  }

  /**
   * 7. PATCH /api/v1/ai/reactivation/plans/:planId
   */
  async updateRecoveryPlan(
    organisationId: string,
    planId: string,
    user: AuthenticatedUser,
    dto: UpdateRecoveryPlanRequestDto,
  ): Promise<MemberRecoveryPlanDto> {
    const existing = await this.prisma.memberRecoveryPlan.findFirst({
      where: { id: planId, organisationId },
    });

    if (!existing) {
      throw new NotFoundException(`Recovery plan ${planId} not found.`);
    }

    await this.verifyTrainerAccess(user.id, user.roles, existing.memberId, organisationId);

    if (dto.status && dto.status !== existing.status) {
      const updated = await this.workflowService.transitionPlan({
        planId,
        organisationId,
        targetStatus: dto.status,
        actorUserId: user.id,
        dismissalReason: dto.dismissalReason,
        notes: dto.staffNotes,
      });

      return this.mapRecoveryPlanToDto(updated);
    }

    const updated = await this.prisma.memberRecoveryPlan.update({
      where: { id: planId },
      data: {
        strategyType: dto.strategyType || undefined,
        strategy: dto.strategyType || undefined,
        targetChannel: dto.targetChannel || undefined,
        recommendedAction: dto.recommendedAction || undefined,
        reason: dto.recommendedAction || undefined,
        draftMessage: dto.draftMessage !== undefined ? dto.draftMessage : undefined,
        suggestedStaffMessage: dto.draftMessage !== undefined ? dto.draftMessage : undefined,
        staffNotes: dto.staffNotes !== undefined ? dto.staffNotes : undefined,
        outcomeNotes: dto.staffNotes !== undefined ? dto.staffNotes : undefined,
        assignedStaffId: dto.assignedStaffId || undefined,
        updatedAt: new Date(),
      },
      include: {
        memberProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
        assignedStaff: { select: { id: true, firstName: true, lastName: true } },
        outlet: { select: { id: true, name: true } },
      },
    });

    return this.mapRecoveryPlanToDto(updated);
  }

  /**
   * 8. POST /api/v1/ai/reactivation/plans/:planId/transition
   */
  async transitionPlanStatus(
    organisationId: string,
    planId: string,
    user: AuthenticatedUser,
    targetStatus: RecoveryPlanStatus,
    dismissalReason?: string,
    notes?: string,
  ): Promise<MemberRecoveryPlanDto> {
    const existing = await this.prisma.memberRecoveryPlan.findFirst({
      where: { id: planId, organisationId },
    });

    if (!existing) {
      throw new NotFoundException(`Recovery plan ${planId} not found.`);
    }

    await this.verifyTrainerAccess(user.id, user.roles, existing.memberId, organisationId);

    const updated = await this.workflowService.transitionPlan({
      planId,
      organisationId,
      targetStatus,
      actorUserId: user.id,
      dismissalReason,
      notes,
    });

    return this.mapRecoveryPlanToDto(updated);
  }

  /**
   * 9. POST /api/v1/ai/reactivation/feedback
   */
  async submitFeedback(
    organisationId: string,
    user: AuthenticatedUser,
    dto: SubmitReactivationFeedbackRequestDto,
  ): Promise<{ success: boolean }> {
    await this.auditService.log({
      action: REACTIVATION_AUDIT_ACTIONS.FEEDBACK_SUBMITTED,
      resource: 'ReactivationFeedback',
      resourceId: dto.memberRecoveryPlanId || 'GENERAL',
      userId: user.id,
      organisationId,
      metadata: {
        feedback: dto.feedback,
        accuracyRating: dto.accuracyRating,
        strategyRating: dto.strategyRating,
        toneRating: dto.toneRating,
        comments: dto.comments,
      },
    });

    return { success: true };
  }

  /**
   * 10. GET /api/v1/ai/reactivation/member-state (Safe Member Return Hub)
   */
  async getMemberSafeRecoveryState(organisationId: string, memberId: string) {
    const profile = await this.prisma.memberReactivationProfile.findFirst({
      where: { organisationId, memberId },
    });

    const inactivityDays = profile?.inactivityDays ?? 0;
    const recoveryState = profile?.recoveryState ?? 'NO_RECOVERY_SIGNAL';

    return {
      recoveryState,
      inactivityDays,
      suggestedFocus: profile?.recommendedStrategy
        ? profile.recommendedStrategy.replace(/_/g, ' ')
        : 'General Wellness',
    };
  }

  private async verifyTrainerAccess(
    userId: string,
    userRoles: { role: string }[] | undefined,
    memberId: string,
    organisationId: string,
  ) {
    const isTrainer = userRoles?.some((r) => r.role === 'TRAINER');
    const isPrivileged = userRoles?.some((r) =>
      ['SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER'].includes(r.role),
    );

    if (isTrainer && !isPrivileged) {
      const trainer = await this.prisma.trainerProfile.findFirst({
        where: { organisationId, staffProfile: { userId } },
      });
      if (!trainer) {
        throw new ForbiddenException('Trainer profile not found.');
      }
      const assignment = await this.prisma.trainerClientAssignment.findFirst({
        where: { memberProfileId: memberId, trainerProfileId: trainer.id, status: 'ACTIVE' },
      });
      if (!assignment) {
        throw new ForbiddenException(
          'Trainers can only access reactivation details for their assigned clients.',
        );
      }
    }
  }

  private mapRecoveryPlanToDto(p: any): MemberRecoveryPlanDto {
    return {
      id: p.id,
      organisationId: p.organisationId,
      outletId: p.outletId || null,
      outletName: p.outlet?.name || null,
      memberId: p.memberId,
      memberName: p.memberProfile?.user
        ? `${p.memberProfile.user.firstName} ${p.memberProfile.user.lastName}`.trim()
        : undefined,
      status: p.status,
      strategy: p.strategyType || p.strategy || 'GENERAL_SUPPORT',
      priority: (p.priority || 'MEDIUM') as any,
      reason: p.reason || p.recommendedAction || '',
      suggestedStaffMessage: p.draftMessage || p.suggestedStaffMessage || null,
      suggestedNextStep: p.recommendedAction || p.suggestedNextStep || null,
      assignedStaffId: p.assignedStaffId || null,
      assignedStaffName: p.assignedStaff
        ? `${p.assignedStaff.firstName} ${p.assignedStaff.lastName}`.trim()
        : null,
      dismissalReason: p.dismissalReason || null,
      outcomeNotes: p.staffNotes || p.outcomeNotes || null,
      recommendedAt: (p.recommendedAt || p.createdAt).toISOString(),
      approvedAt: p.approvedAt?.toISOString() || null,
      startedAt: p.startedAt?.toISOString() || null,
      completedAt: p.completedAt?.toISOString() || null,
      expiresAt: p.expiresAt?.toISOString() || null,
      source: p.source || 'AI_RECOMMENDATION',
      analysisVersion: p.analysisVersion || 1,
      dataVersion: p.dataVersion || 1,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}
