import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import {
  MemberLifecycleContext,
  MemberLifecycleStage,
  PersonalBaselineDto,
  RetentionRiskAssessment,
  RetentionRiskFactor,
  RetentionPositiveSignal,
} from '@fitcore/types';
import { EngagementSignalsBundle } from '../../engagement-intelligence/engagement-intelligence.types';
import { RetentionContext } from '../retention-intelligence.types';

@Injectable()
export class RetentionContextService {
  private readonly logger = new Logger(RetentionContextService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assembles controlled, privacy-sanitized retention context.
   */
  async buildContext(
    memberId: string,
    organisationId: string,
    signals: EngagementSignalsBundle,
    baseline: PersonalBaselineDto,
    riskAssessment: RetentionRiskAssessment,
    riskFactors: RetentionRiskFactor[],
    positiveSignals: RetentionPositiveSignal[],
    now: Date = new Date(),
  ): Promise<RetentionContext> {
    // 1. Fetch Member Profile & Basic Lifecycle Info
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
        trainerClientAssignments: {
          where: { status: 'ACTIVE' },
          include: {
            trainerProfile: {
              include: {
                staffProfile: {
                  include: {
                    user: { select: { firstName: true, lastName: true } },
                  },
                },
              },
            },
          },
          take: 1,
        },
        memberships: {
          where: { status: { in: ['ACTIVE', 'SUSPENDED', 'PENDING'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            membershipPlan: { select: { name: true } },
          },
        },
        trainingGoals: {
          where: { status: 'ACTIVE' },
          select: { title: true, category: true, currentValue: true, targetValue: true, baselineValue: true, targetDate: true },
          take: 3,
        },
        memberOutlets: {
          take: 1,
          include: {
            outlet: { select: { id: true, name: true } },
          },
        },
      },
    });

    const activeMembership = member?.memberships?.[0];
    const activeTrainer = member?.trainerClientAssignments?.[0]?.trainerProfile?.staffProfile?.user;
    const activeOutlet = member?.memberOutlets?.[0]?.outlet;

    // 2. Lifecycle Stage Determination
    const createdAt = member?.createdAt || now;
    const tenureDays = Math.max(
      0,
      Math.floor((now.getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)),
    );

    let stage: MemberLifecycleStage = 'ACTIVE_MEMBER';
    if (tenureDays < 30) {
      stage = 'NEW_MEMBER';
    } else if (tenureDays <= 90) {
      stage = 'EARLY_MEMBERSHIP';
    } else if (tenureDays > 365) {
      stage = 'LONG_TERM_MEMBER';
    }

    const lifecycleContext: MemberLifecycleContext = {
      stage,
      tenureDays,
      joinedDate: member?.createdAt?.toISOString(),
      membershipStartedAt: activeMembership?.startDate?.toISOString(),
      membershipExpiresAt: activeMembership?.endDate?.toISOString() || null,
      daysUntilExpiry: signals.membership.daysUntilExpiry,
      status: activeMembership?.status || 'UNKNOWN',
      renewalType: activeMembership?.autoRenew ? 'AUTO_RENEW' : 'MANUAL',
    };

    // 3. Temporal Attendance Analysis (Multi-window: 7d, 14d, 28d, 60d, 90d)
    const [visits60d, visits90d] = await Promise.all([
      this.prisma.attendanceRecord.count({
        where: {
          memberProfileId: memberId,
          organisationId,
          status: 'CHECKED_IN',
          checkedInAt: {
            gte: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.attendanceRecord.count({
        where: {
          memberProfileId: memberId,
          organisationId,
          status: 'CHECKED_IN',
          checkedInAt: {
            gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      memberSummary: {
        memberId,
        firstName: member?.user?.firstName,
        lastName: member?.user?.lastName,
        outletId: activeOutlet?.id,
        outletName: activeOutlet?.name,
        trainerAssigned: !!activeTrainer,
        assignedTrainerName: activeTrainer
          ? `${activeTrainer.firstName} ${activeTrainer.lastName}`
          : undefined,
      },
      membershipSummary: {
        status: activeMembership?.status || 'UNKNOWN',
        planName: activeMembership?.membershipPlan?.name,
        isSuspended: signals.membership.isSuspended,
        isExpiringSoon: signals.membership.isExpiringSoon,
        daysUntilExpiry: signals.membership.daysUntilExpiry,
      },
      lifecycleContext,
      engagementSummary: {
        overallEngagement: signals.attendance.visitsLast28d > 0 ? 'MODERATE' : 'LOW',
        trend: baseline.momentum,
        attendanceFrequency: baseline.recentVisitsPerWeek,
        workoutAdherence: signals.workout.workoutAdherencePct,
        bookingFrequency: baseline.recentBookingsPerWeek,
        appEngagement: signals.app.eventsLast28d,
      },
      engagementTrend: {
        direction: baseline.momentum,
        metricHighlights: [
          `Visits: ${baseline.baselineVisitsPerWeek}/wk -> ${baseline.recentVisitsPerWeek}/wk (${signals.attendance.visitsDeltaPct}%)`,
          `Adherence: ${signals.workout.workoutAdherencePct}%`,
        ],
      },
      attendanceSummary: {
        visitsLast7d: signals.attendance.visitsLast7d,
        visitsLast14d: Math.round(signals.attendance.visitsLast28d / 2),
        visitsLast28d: signals.attendance.visitsLast28d,
        visitsLast60d: visits60d,
        visitsLast90d: visits90d,
        baselineVisitsPerWeek: baseline.baselineVisitsPerWeek,
        visitsDeltaPct: signals.attendance.visitsDeltaPct,
        noShowCountLast28d: signals.attendance.noShowCountLast28d,
        lastVisitDate: signals.attendance.lastGymVisitAt ? signals.attendance.lastGymVisitAt.toISOString() : null,
      },
      bookingSummary: {
        bookingsLast7d: signals.booking.bookingsLast7d,
        bookingsLast28d: signals.booking.bookingsLast28d,
        baselineBookingsPerWeek: baseline.baselineBookingsPerWeek,
        recentBookingsPerWeek: baseline.recentBookingsPerWeek,
        lastBookingDate: signals.booking.lastBookingAt ? signals.booking.lastBookingAt.toISOString() : null,
      },
      workoutSummary: {
        workoutsScheduledLast28d: signals.workout.workoutsScheduledLast28d,
        workoutsCompletedLast28d: signals.workout.workoutsCompletedLast28d,
        workoutAdherencePct: signals.workout.workoutAdherencePct,
        lastWorkoutDate: signals.workout.lastWorkoutAt ? signals.workout.lastWorkoutAt.toISOString() : null,
      },
      goalSummary: {
        activeGoalsCount: member?.trainingGoals?.length || 0,
        goals: (member?.trainingGoals || []).map((g) => {
          let progressPct = 0;
          if (g.targetValue !== null && g.baselineValue !== null && g.targetValue !== g.baselineValue) {
            const curr = g.currentValue ?? g.baselineValue;
            progressPct = Math.min(100, Math.max(0, Math.round(((curr - g.baselineValue) / (g.targetValue - g.baselineValue)) * 100)));
          }
          return {
            title: g.title,
            category: g.category,
            progressPct,
            targetDate: g.targetDate?.toISOString() || null,
          };
        }),
      },
      recentCheckInSummary: {
        checkInsLast7d: signals.checkin.checkInsLast7d,
        checkInsLast28d: signals.checkin.checkInsLast28d,
        lastCheckInDate: signals.checkin.lastCheckInAt ? signals.checkin.lastCheckInAt.toISOString() : null,
      },
      wearableEngagementSummary: {
        connectedProvider: signals.wearables.syncDaysLast28d > 0 ? 'CONNECTED' : null,
        lastSyncDaysAgo: signals.wearables.lastSyncAt
          ? Math.floor((now.getTime() - new Date(signals.wearables.lastSyncAt).getTime()) / (1000 * 60 * 60 * 24))
          : null,
        weeklySyncDays: signals.wearables.syncDaysLast7d,
      },
      retentionRisk: {
        deterministicRiskLevel: riskAssessment.riskLevel,
        points: 0,
        contributingReasons: riskAssessment.contributingReasons,
      },
      riskFactors,
      recentPositiveSignals: positiveSignals,
      dataQuality: riskAssessment.dataQuality,
    };
  }
}
