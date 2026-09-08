import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import {
  PersonalBaselineDto,
  RetentionRiskAssessment,
  InactivityAnalysisDto,
  ReactivationBarrierItem,
  ReactivationPositiveSignalItem,
  RecoveryState,
  ReactivationLifecycleState,
  ReactivationStatus,
} from '@fitcore/types';
import { EngagementSignalsBundle } from '../../engagement-intelligence/engagement-intelligence.types';
import { ReactivationContextProjection } from '../reactivation.types';

@Injectable()
export class ReactivationContextService {
  private readonly logger = new Logger(ReactivationContextService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assembles the controlled, privacy-sanitized ReactivationContextProjection.
   */
  async buildContext(params: {
    memberId: string;
    organisationId: string;
    lifecycleState: ReactivationLifecycleState;
    reactivationStatus: ReactivationStatus;
    recoveryState: RecoveryState;
    inactivityAnalysis: InactivityAnalysisDto;
    barriers: ReactivationBarrierItem[];
    recoverySignals: ReactivationPositiveSignalItem[];
    signals: EngagementSignalsBundle;
    baseline: PersonalBaselineDto;
    riskAssessment?: RetentionRiskAssessment | null;
    now?: Date;
  }): Promise<ReactivationContextProjection> {
    const {
      memberId,
      organisationId,
      lifecycleState,
      reactivationStatus,
      recoveryState,
      inactivityAnalysis,
      barriers,
      recoverySignals,
      signals,
      baseline,
      riskAssessment,
      now = new Date(),
    } = params;

    // 1. Fetch Member Profile and related data
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
          select: { title: true, targetDate: true },
          take: 3,
        },
        memberReactivationProfiles: {
          where: { organisationId },
          take: 1,
        },
        memberRecoveryPlans: {
          where: { organisationId },
          select: { status: true },
        },
      },
    });

    const joinedDate = member?.createdAt || new Date();
    const tenureDays = Math.max(
      0,
      Math.floor((now.getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24)),
    );

    // Trainer Relationship
    let trainerRelationship = null;
    const activeTrainer = member?.trainerClientAssignments[0];
    if (activeTrainer?.trainerProfile?.staffProfile?.user) {
      const u = activeTrainer.trainerProfile.staffProfile.user;
      trainerRelationship = {
        assignedTrainerId: activeTrainer.trainerProfileId,
        trainerName: `${u.firstName} ${u.lastName}`.trim(),
        assignmentType: activeTrainer.assignmentType || 'GENERAL_TRAINER',
      };
    }

    // Membership summary
    const currentMembership = member?.memberships[0];
    const isExpiringSoon = Boolean(
      currentMembership?.endDate &&
        new Date(currentMembership.endDate).getTime() - now.getTime() < 14 * 24 * 60 * 60 * 1000 &&
        new Date(currentMembership.endDate).getTime() > now.getTime(),
    );

    // Reactivation history
    const prevProfile = member?.memberReactivationProfiles[0];
    const completedPlansCount =
      member?.memberRecoveryPlans?.filter((p) => p.status === 'COMPLETED' || p.status === 'REENGAGED')
        .length || 0;

    const totalObservations =
      (signals.attendance?.visitsLast28d || 0) +
      (signals.booking?.bookingsLast28d || 0) +
      (signals.workout?.workoutsCompletedLast28d || 0);

    const projection: ReactivationContextProjection = {
      memberSummary: {
        id: memberId,
        firstName: member?.user?.firstName || 'Member',
        lastName: member?.user?.lastName || '',
        lifecycleStage: tenureDays < 30 ? 'ONBOARDING' : 'ESTABLISHED',
        tenureDays,
        joinedDate: joinedDate.toISOString(),
      },
      lifecycleState,
      reactivationStatus,
      recoveryState,
      inactivitySummary: inactivityAnalysis,
      engagementSummary: {
        previousEngagementLevel: baseline?.baselineVisitsPerWeek && baseline.baselineVisitsPerWeek > 2 ? 'HIGH' : 'MODERATE',
        currentEngagementLevel: signals.attendance?.visitsLast7d && signals.attendance.visitsLast7d > 1 ? 'HIGH' : 'LOW',
        trendMomentum: baseline?.momentum || 'STABLE',
      },
      retentionRisk: {
        level: riskAssessment?.riskLevel || 'LOW',
        trend: baseline?.momentum || 'STABLE',
        contributingReasons: riskAssessment?.contributingReasons || [],
      },
      retentionFactors: barriers,
      recoverySignals,
      trainingSummary: {
        activePlanName: 'Standard Training',
        lastWorkoutCompletedAt: signals.workout?.lastWorkoutAt ? signals.workout.lastWorkoutAt.toISOString() : null,
        completedWorkoutsLast28d: signals.workout?.workoutsCompletedLast28d || 0,
        workoutAdherencePct: signals.workout?.workoutAdherencePct || 0,
      },
      bookingSummary: {
        totalBookingsLast28d: signals.booking?.bookingsLast28d || 0,
        upcomingBookingsCount: signals.booking?.bookingsLast7d || 0,
        lastBookingAt: signals.booking?.lastBookingAt ? signals.booking.lastBookingAt.toISOString() : null,
        attendedCount: signals.attendance?.classAttendanceCount || 0,
        noShowCount: signals.attendance?.noShowCountLast28d || 0,
      },
      attendanceSummary: {
        lastVisitAt: signals.attendance?.lastGymVisitAt ? signals.attendance.lastGymVisitAt.toISOString() : null,
        visitsLast28d: signals.attendance?.visitsLast28d || 0,
        visitsDeltaPct: inactivityAnalysis.activityDropPercent ? -inactivityAnalysis.activityDropPercent : 0,
      },
      goalsSummary: {
        activeGoalsCount: member?.trainingGoals?.length || 0,
        primaryGoalTitle: member?.trainingGoals[0]?.title,
        goalTargetDate: member?.trainingGoals[0]?.targetDate ? member.trainingGoals[0].targetDate.toISOString() : null,
      },
      trainerRelationship,
      membershipSummary: {
        membershipName: currentMembership?.membershipPlan?.name || 'Standard Gym Access',
        status: currentMembership?.status || 'ACTIVE',
        expiresAt: currentMembership?.endDate ? currentMembership.endDate.toISOString() : null,
        isExpiringSoon,
      },
      previousReactivationHistory: {
        previousSpellsCount: 0,
        longestInactivityDays: Math.max(
          prevProfile?.inactivityDays || 0,
          inactivityAnalysis.daysInactive,
        ),
        previousCompletedPlansCount: completedPlansCount,
      },
      dataQuality: {
        sufficientData: totalObservations >= 3,
        observationsCount: totalObservations,
      },
    };

    return projection;
  }
}
