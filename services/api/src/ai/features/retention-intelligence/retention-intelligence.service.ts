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
import { EngagementSignalService } from '../engagement-intelligence/signals/engagement-signal.service';
import { MemberEngagementBaselineService } from '../engagement-intelligence/profile/member-engagement-baseline.service';
import { RetentionRiskService } from '../engagement-intelligence/risk/retention-risk.service';
import { RiskFactorService } from './analysis/risk-factor.service';
import { InterventionSelectionService } from './analysis/intervention-selection.service';
import { RetentionAnalysisService } from './analysis/retention-analysis.service';
import {
  RetentionRiskAssessment,
  RetentionRiskFactor,
  RetentionPositiveSignal,
  RetentionDashboardSummaryDto,
  RetentionQueueItemDto,
  RetentionFollowUpTaskDto,
  RetentionRiskLevel,
  RetentionRiskTrend,
  RetentionInterventionType,
  MemberLifecycleStage,
} from '@fitcore/types';
import {
  AnalyzeRetentionDto,
  RetentionQueueQueryDto,
  RetentionSummaryQueryDto,
  CreateFollowUpTaskDto,
  UpdateFollowUpTaskDto,
} from './dto/retention-analysis.dto';
import { SubmitRetentionFeedbackDto } from './dto/retention-feedback.dto';
import { RETENTION_AUDIT_ACTIONS, RETENTION_EVENTS } from './retention-intelligence.constants';

@Injectable()
export class RetentionIntelligenceService {
  private readonly logger = new Logger(RetentionIntelligenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly signalService: EngagementSignalService,
    private readonly baselineService: MemberEngagementBaselineService,
    private readonly retentionRiskService: RetentionRiskService,
    private readonly riskFactorService: RiskFactorService,
    private readonly interventionSelectionService: InterventionSelectionService,
    private readonly analysisService: RetentionAnalysisService,
  ) {}

  /**
   * 1. GET /api/v1/ai/retention/summary
   * High-level retention metrics & distribution for organisation / outlet dashboard.
   */
  async getSummary(
    organisationId: string,
    query?: RetentionSummaryQueryDto,
  ): Promise<RetentionDashboardSummaryDto> {
    const outletId = query?.outletId;

    // Filter members belonging to target organisation (and optional outlet)
    const members = await this.prisma.memberProfile.findMany({
      where: {
        organisationId,
        status: 'ACTIVE',
        ...(outletId
          ? {
              memberOutlets: {
                some: { outletId, status: 'ACTIVE' },
              },
            }
          : {}),
      },
      select: { id: true, createdAt: true },
    });

    const totalActiveMembers = members.length;
    let membersWithElevatedRisk = 0;
    let membersWithHighRisk = 0;
    let membersWithDecliningEngagement = 0;
    let membersReengaging = 0;
    let membersRequiringFollowUp = 0;

    const riskDistribution: Record<RetentionRiskLevel, number> = {
      INSUFFICIENT_DATA: 0,
      LOW: 0,
      MODERATE: 0,
      ELEVATED: 0,
      HIGH: 0,
    };

    const trendDistribution: Record<RetentionRiskTrend, number> = {
      IMPROVING: 0,
      STABLE: 0,
      WORSENING: 0,
      INSUFFICIENT_DATA: 0,
    };

    const interventionDistribution: Record<RetentionInterventionType, number> = {
      TRAINER_CHECK_IN: 0,
      GOAL_REVIEW: 0,
      TRAINING_RESTART: 0,
      CLASS_RECOMMENDATION: 0,
      PERSONAL_TRAINING_FOLLOW_UP: 0,
      RECOVERY_SUPPORT: 0,
      APP_ENGAGEMENT: 0,
      NUTRITION_ENGAGEMENT: 0,
      MEMBERSHIP_CONVERSATION: 0,
      GENERAL_SUPPORT: 0,
      NO_ACTION: 0,
      INSUFFICIENT_DATA: 0,
    };

    const now = new Date();

    // Evaluate risk summary across members (sample or full set)
    for (const member of members.slice(0, 100)) {
      try {
        const signals = await this.signalService.collectAllSignals(member.id, organisationId, now);
        const baseline = await this.baselineService.computeBaseline(member.id, organisationId, now);
        const assessment = this.retentionRiskService.evaluateRetentionRisk(signals, baseline, 'NO_ACTION', now);
        const positiveSignals = this.riskFactorService.evaluatePositiveSignals(signals, baseline);
        const trend = this.riskFactorService.computeRiskTrend(signals, baseline, positiveSignals);

        riskDistribution[assessment.riskLevel]++;
        trendDistribution[trend]++;

        if (assessment.riskLevel === 'ELEVATED') membersWithElevatedRisk++;
        if (assessment.riskLevel === 'HIGH') membersWithHighRisk++;
        if (trend === 'WORSENING') membersWithDecliningEngagement++;
        if (positiveSignals.some((s) => s.type === 'RECENT_REENGAGEMENT' || s.type === 'ATTENDANCE_RECOVERY')) {
          membersReengaging++;
        }
        if (assessment.riskLevel === 'HIGH' || assessment.riskLevel === 'ELEVATED') {
          membersRequiringFollowUp++;
        }
      } catch (err: any) {
        this.logger.debug(`Member ${member.id} summary skipped: ${err.message}`);
      }
    }

    // Task counts
    const [openTasksCount, completedTasksCount] = await Promise.all([
      this.prisma.retentionFollowUpTask.count({
        where: {
          organisationId,
          ...(outletId ? { outletId } : {}),
          status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
        },
      }),
      this.prisma.retentionFollowUpTask.count({
        where: {
          organisationId,
          ...(outletId ? { outletId } : {}),
          status: 'COMPLETED',
        },
      }),
    ]);

    return {
      organisationId,
      outletId,
      totalActiveMembers,
      membersWithElevatedRisk,
      membersWithHighRisk,
      membersWithDecliningEngagement,
      membersReengaging,
      membersRequiringFollowUp,
      riskDistribution,
      trendDistribution,
      interventionDistribution,
      openTasksCount,
      completedTasksCount,
      calculatedAt: now.toISOString(),
    };
  }

  /**
   * 2. GET /api/v1/ai/retention/risk
   * Returns deterministic retention risk assessment and trend.
   */
  async getRisk(
    memberId: string,
    organisationId: string,
    refresh: boolean = false,
  ): Promise<RetentionRiskAssessment & { trend: RetentionRiskTrend }> {
    const member = await this.prisma.memberProfile.findFirst({
      where: { id: memberId, organisationId },
    });
    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found in organisation.`);
    }

    const now = new Date();
    const signals = await this.signalService.collectAllSignals(memberId, organisationId, now);
    const baseline = await this.baselineService.computeBaseline(memberId, organisationId, now);
    const assessment = this.retentionRiskService.evaluateRetentionRisk(signals, baseline, 'NO_ACTION', now);
    const positiveSignals = this.riskFactorService.evaluatePositiveSignals(signals, baseline);
    const trend = this.riskFactorService.computeRiskTrend(signals, baseline, positiveSignals);

    return {
      ...assessment,
      trend,
    };
  }

  /**
   * 3. GET /api/v1/ai/retention/factors
   * Returns structured risk factors with evidence and positive signals.
   */
  async getFactors(
    memberId: string,
    organisationId: string,
  ): Promise<{
    primaryFactors: RetentionRiskFactor[];
    positiveSignals: RetentionPositiveSignal[];
    riskTrend: RetentionRiskTrend;
  }> {
    const member = await this.prisma.memberProfile.findFirst({
      where: { id: memberId, organisationId },
    });
    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found in organisation.`);
    }

    const now = new Date();
    const signals = await this.signalService.collectAllSignals(memberId, organisationId, now);
    const baseline = await this.baselineService.computeBaseline(memberId, organisationId, now);
    const primaryFactors = this.riskFactorService.evaluateRiskFactors(signals, baseline);
    const positiveSignals = this.riskFactorService.evaluatePositiveSignals(signals, baseline);
    const riskTrend = this.riskFactorService.computeRiskTrend(signals, baseline, positiveSignals);

    return {
      primaryFactors,
      positiveSignals,
      riskTrend,
    };
  }

  /**
   * 4. GET /api/v1/ai/retention/queue
   * Staff retention follow-up queue with filters for outlet, risk level, trainer, search.
   */
  async getQueue(
    organisationId: string,
    query: RetentionQueueQueryDto,
  ): Promise<{ items: RetentionQueueItemDto[]; total: number; limit: number; offset: number }> {
    const limit = query.limit || 50;
    const offset = query.offset || 0;

    const members = await this.prisma.memberProfile.findMany({
      where: {
        organisationId,
        status: 'ACTIVE',
        ...(query.outletId
          ? {
              memberOutlets: {
                some: { outletId: query.outletId, status: 'ACTIVE' },
              },
            }
          : {}),
        ...(query.trainerId
          ? {
              trainerClientAssignments: {
                some: { trainerProfileId: query.trainerId, status: 'ACTIVE' },
              },
            }
          : {}),
        ...(query.search
          ? {
              user: {
                OR: [
                  { firstName: { contains: query.search, mode: 'insensitive' } },
                  { lastName: { contains: query.search, mode: 'insensitive' } },
                  { email: { contains: query.search, mode: 'insensitive' } },
                ],
              },
            }
          : {}),
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
        memberOutlets: {
          take: 1,
          include: { outlet: { select: { id: true, name: true } } },
        },
        trainerClientAssignments: {
          where: { status: 'ACTIVE' },
          take: 1,
          include: {
            trainerProfile: {
              include: {
                staffProfile: {
                  include: {
                    user: { select: { id: true, firstName: true, lastName: true } },
                  },
                },
              },
            },
          },
        },
        retentionFollowUpTasks: {
          where: { status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      take: 100,
    });

    const now = new Date();
    const queueItems: RetentionQueueItemDto[] = [];

    for (const member of members) {
      try {
        const signals = await this.signalService.collectAllSignals(member.id, organisationId, now);
        const baseline = await this.baselineService.computeBaseline(member.id, organisationId, now);
        const assessment = this.retentionRiskService.evaluateRetentionRisk(signals, baseline, 'NO_ACTION', now);

        if (query.riskLevel && assessment.riskLevel !== query.riskLevel) {
          continue;
        }

        const factors = this.riskFactorService.evaluateRiskFactors(signals, baseline);
        const positiveSignals = this.riskFactorService.evaluatePositiveSignals(signals, baseline);
        const trend = this.riskFactorService.computeRiskTrend(signals, baseline, positiveSignals);

        const activeTrainer = member.trainerClientAssignments?.[0]?.trainerProfile?.staffProfile?.user;
        const activeOutlet = member.memberOutlets?.[0]?.outlet;

        // Lifecycle determination
        const tenureDays = Math.floor((now.getTime() - new Date(member.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        let lifecycleStage: MemberLifecycleStage = 'ACTIVE_MEMBER';
        if (tenureDays < 30) lifecycleStage = 'NEW_MEMBER';
        else if (tenureDays <= 90) lifecycleStage = 'EARLY_MEMBERSHIP';
        else if (tenureDays > 365) lifecycleStage = 'LONG_TERM_MEMBER';

        const recommendations = this.interventionSelectionService.selectInterventions({
          riskLevel: assessment.riskLevel,
          riskFactors: factors,
          positiveSignals,
          hasAssignedTrainer: !!activeTrainer,
          lifecycle: { stage: lifecycleStage, tenureDays, status: 'ACTIVE' },
          hasActiveGoals: false,
          hasRecentNoShows: signals.attendance.noShowCountLast28d > 0,
          isExpiringSoon: signals.membership.isExpiringSoon,
        });

        const activeTask = member.retentionFollowUpTasks?.[0];

        queueItems.push({
          memberId: member.id,
          memberName: `${member.user.firstName} ${member.user.lastName}`.trim(),
          memberEmail: member.user.email,
          avatarUrl: member.user.avatarUrl,
          outletId: activeOutlet?.id,
          outletName: activeOutlet?.name,
          riskLevel: assessment.riskLevel,
          riskTrend: trend,
          primaryReason: factors[0]?.observation || assessment.contributingReasons[0] || 'Standard baseline activity',
          recommendedIntervention: recommendations[0]?.type || 'GENERAL_SUPPORT',
          interventionPriority: recommendations[0]?.priority || 'LOW',
          assignedTrainer: activeTrainer
            ? { id: activeTrainer.id, name: `${activeTrainer.firstName} ${activeTrainer.lastName}` }
            : null,
          lastVisit: signals.attendance.lastGymVisitAt ? signals.attendance.lastGymVisitAt.toISOString() : null,
          lastWorkout: signals.workout.lastWorkoutAt ? signals.workout.lastWorkoutAt.toISOString() : null,
          lastContact: signals.checkin.lastCheckInAt ? signals.checkin.lastCheckInAt.toISOString() : null,
          lifecycleStage,
          activeTask: activeTask
            ? {
                id: activeTask.id,
                organisationId: activeTask.organisationId,
                outletId: activeTask.outletId,
                memberId: activeTask.memberId,
                riskLevel: activeTask.riskLevel as any,
                interventionType: activeTask.interventionType as any,
                source: activeTask.source,
                status: activeTask.status as any,
                priority: activeTask.priority as any,
                title: activeTask.title,
                notes: activeTask.notes,
                dueAt: activeTask.dueAt?.toISOString() || null,
                completedAt: activeTask.completedAt?.toISOString() || null,
                createdAt: activeTask.createdAt.toISOString(),
                updatedAt: activeTask.updatedAt.toISOString(),
              }
            : null,
        });
      } catch (err: any) {
        this.logger.debug(`Queue row skipped for member ${member.id}: ${err.message}`);
      }
    }

    // Sort queue items: High risk first, then Elevated, Moderate, Low
    const riskOrder: Record<RetentionRiskLevel, number> = {
      HIGH: 4,
      ELEVATED: 3,
      MODERATE: 2,
      LOW: 1,
      INSUFFICIENT_DATA: 0,
    };

    queueItems.sort((a, b) => riskOrder[b.riskLevel] - riskOrder[a.riskLevel]);

    const paginated = queueItems.slice(offset, offset + limit);

    return {
      items: paginated,
      total: queueItems.length,
      limit,
      offset,
    };
  }

  /**
   * 5. POST /api/v1/ai/retention/analyze
   * Deep analysis generation with caching and idempotency.
   */
  async analyze(params: {
    user: AuthenticatedUser;
    organisationId: string;
    dto: AnalyzeRetentionDto;
    idempotencyKey?: string;
  }) {
    return this.analysisService.analyzeMember({
      user: params.user,
      memberId: params.dto.memberId,
      organisationId: params.organisationId,
      promptQuery: params.dto.promptQuery,
      idempotencyKey: params.idempotencyKey,
      forceRecalculate: params.dto.forceRecalculate,
    });
  }

  /**
   * 6. POST /api/v1/ai/retention/feedback
   * Staff feedback recording (Section 30).
   */
  async submitFeedback(params: {
    user: AuthenticatedUser;
    organisationId: string;
    dto: SubmitRetentionFeedbackDto;
  }) {
    const { user, organisationId, dto } = params;

    // Update retention analysis if ID supplied
    if (dto.analysisId) {
      await this.prisma.retentionAnalysis.updateMany({
        where: { id: dto.analysisId, organisationId },
        data: {
          feedbackRating: dto.rating,
          feedbackComment: dto.comment || null,
        },
      });
    }

    // Record audit event
    await this.auditService.log({
      organisationId,
      userId: user.id,
      action: RETENTION_AUDIT_ACTIONS.FEEDBACK_SUBMITTED,
      resource: 'RETENTION_ANALYSIS',
      resourceId: dto.analysisId || dto.memberId,
      metadata: {
        memberId: dto.memberId,
        rating: dto.rating,
        category: dto.category,
      },
    });

    return {
      success: true,
      message: 'Retention feedback recorded successfully.',
    };
  }

  /**
   * 7. POST /api/v1/ai/retention/follow-ups
   * Creates a human follow-up task (Section 27). Idempotent.
   */
  async createFollowUpTask(params: {
    user: AuthenticatedUser;
    organisationId: string;
    dto: CreateFollowUpTaskDto;
  }): Promise<RetentionFollowUpTaskDto> {
    const { user, organisationId, dto } = params;

    // Verify member exists in tenant
    const member = await this.prisma.memberProfile.findFirst({
      where: { id: dto.memberId, organisationId },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    if (!member) {
      throw new NotFoundException(`Member ${dto.memberId} not found.`);
    }

    // Prevent duplicate open task for the same intervention type and member
    const existingOpen = await this.prisma.retentionFollowUpTask.findFirst({
      where: {
        organisationId,
        memberId: dto.memberId,
        interventionType: dto.interventionType,
        status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
      },
    });

    if (existingOpen) {
      return {
        id: existingOpen.id,
        organisationId: existingOpen.organisationId,
        outletId: existingOpen.outletId,
        memberId: existingOpen.memberId,
        memberName: `${member.user.firstName} ${member.user.lastName}`.trim(),
        assignedStaffId: existingOpen.assignedStaffId,
        riskLevel: existingOpen.riskLevel as any,
        interventionType: existingOpen.interventionType as any,
        source: existingOpen.source,
        status: existingOpen.status as any,
        priority: existingOpen.priority as any,
        title: existingOpen.title,
        notes: existingOpen.notes,
        dueAt: existingOpen.dueAt?.toISOString() || null,
        completedAt: existingOpen.completedAt?.toISOString() || null,
        createdAt: existingOpen.createdAt.toISOString(),
        updatedAt: existingOpen.updatedAt.toISOString(),
      };
    }

    const created = await this.prisma.retentionFollowUpTask.create({
      data: {
        organisationId,
        outletId: dto.outletId || null,
        memberId: dto.memberId,
        assignedStaffId: dto.assignedStaffId || null,
        riskLevel: 'ELEVATED', // will be refined or matched
        interventionType: dto.interventionType,
        source: dto.source || 'AI_RECOMMENDATION',
        status: dto.assignedStaffId ? 'ASSIGNED' : 'OPEN',
        priority: dto.priority || 'MEDIUM',
        title: dto.title || `Follow-up: ${dto.interventionType.replace(/_/g, ' ')}`,
        notes: dto.notes || null,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      include: {
        assignedStaff: { select: { firstName: true, lastName: true } },
      },
    });

    await this.auditService.log({
      organisationId,
      userId: user.id,
      action: RETENTION_AUDIT_ACTIONS.FOLLOWUP_CREATED,
      resource: 'RETENTION_FOLLOWUP_TASK',
      resourceId: created.id,
      metadata: {
        memberId: dto.memberId,
        interventionType: dto.interventionType,
        assignedStaffId: dto.assignedStaffId,
      },
    });

    return {
      id: created.id,
      organisationId: created.organisationId,
      outletId: created.outletId,
      memberId: created.memberId,
      memberName: `${member.user.firstName} ${member.user.lastName}`.trim(),
      assignedStaffId: created.assignedStaffId,
      assignedStaffName: created.assignedStaff
        ? `${created.assignedStaff.firstName} ${created.assignedStaff.lastName}`.trim()
        : null,
      riskLevel: created.riskLevel as any,
      interventionType: created.interventionType as any,
      source: created.source,
      status: created.status as any,
      priority: created.priority as any,
      title: created.title,
      notes: created.notes,
      dueAt: created.dueAt?.toISOString() || null,
      completedAt: created.completedAt?.toISOString() || null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  /**
   * 8. PATCH /api/v1/ai/retention/follow-ups/:id
   * Updates task status, staff assignment, notes, or dismissal.
   */
  async updateFollowUpTask(params: {
    user: AuthenticatedUser;
    taskId: string;
    organisationId: string;
    dto: UpdateFollowUpTaskDto;
  }): Promise<RetentionFollowUpTaskDto> {
    const { user, taskId, organisationId, dto } = params;

    const task = await this.prisma.retentionFollowUpTask.findFirst({
      where: { id: taskId, organisationId },
      include: {
        memberProfile: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Retention follow-up task ${taskId} not found.`);
    }

    const isCompleting = dto.status === 'COMPLETED' && task.status !== 'COMPLETED';
    const now = new Date();

    const updated = await this.prisma.retentionFollowUpTask.update({
      where: { id: taskId },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.assignedStaffId !== undefined ? { assignedStaffId: dto.assignedStaffId } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.dismissalReason !== undefined ? { dismissalReason: dto.dismissalReason } : {}),
        ...(isCompleting
          ? {
              completedAt: now,
              completedByStaffId: user.id,
            }
          : {}),
      },
      include: {
        assignedStaff: { select: { firstName: true, lastName: true } },
      },
    });

    await this.auditService.log({
      organisationId,
      userId: user.id,
      action: isCompleting
        ? RETENTION_AUDIT_ACTIONS.FOLLOWUP_COMPLETED
        : RETENTION_AUDIT_ACTIONS.FOLLOWUP_UPDATED,
      resource: 'RETENTION_FOLLOWUP_TASK',
      resourceId: updated.id,
      metadata: {
        memberId: updated.memberId,
        newStatus: updated.status,
      },
    });

    return {
      id: updated.id,
      organisationId: updated.organisationId,
      outletId: updated.outletId,
      memberId: updated.memberId,
      memberName: `${task.memberProfile.user.firstName} ${task.memberProfile.user.lastName}`.trim(),
      assignedStaffId: updated.assignedStaffId,
      assignedStaffName: updated.assignedStaff
        ? `${updated.assignedStaff.firstName} ${updated.assignedStaff.lastName}`.trim()
        : null,
      riskLevel: updated.riskLevel as any,
      interventionType: updated.interventionType as any,
      source: updated.source,
      status: updated.status as any,
      priority: updated.priority as any,
      title: updated.title,
      notes: updated.notes,
      dueAt: updated.dueAt?.toISOString() || null,
      completedAt: updated.completedAt?.toISOString() || null,
      completedByStaffId: updated.completedByStaffId,
      dismissalReason: updated.dismissalReason,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
