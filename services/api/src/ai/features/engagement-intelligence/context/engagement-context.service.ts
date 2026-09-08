import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { AIContextPermissionService } from '../../../context/ai-context-permission.service';
import { SensitiveDataSanitizerService } from '../../../context/sensitive-data-sanitizer.service';
import { EngagementSignalsBundle } from '../engagement-intelligence.types';
import {
  MemberEngagementProfileDto,
  EngagementTrendItem,
  RetentionRiskAssessment,
} from '@fitcore/types';

export interface EngagementIntelligenceContext {
  memberId: string;
  organisationId: string;
  date: string;
  timezone: string;
  engagementSummary: MemberEngagementProfileDto;
  attendanceSummary: {
    visitsLast7d: number;
    visitsLast28d: number;
    attendanceFrequencyPerWeek: number;
    noShowCountLast28d: number;
    lastVisitDate: string | null;
  };
  bookingSummary: {
    bookingsLast7d: number;
    bookingsLast28d: number;
    cancellationsLast28d: number;
    bookingFrequencyPerWeek: number;
  };
  workoutSummary: {
    workoutsCompletedLast7d: number;
    workoutsCompletedLast28d: number;
    workoutsScheduledLast28d: number;
    adherencePercent: number;
  };
  goalSummary: {
    activeGoalsCount: number;
    completedGoalsCount: number;
    averageProgressPct: number;
  };
  membershipSummary?: {
    status: string;
    isExpiringSoon: boolean;
    daysUntilExpiry: number | null;
  };
  appEngagementSummary: {
    eventsLast7d: number;
    eventsLast28d: number;
    featuresUsedCount: number;
    lastActivityDate: string | null;
  };
  dailyCheckInSummary?: {
    checkInsLast7d: number;
    checkInsLast28d: number;
    completionRatePct: number;
    trajectory: string;
  };
  wearableEngagementSummary?: {
    syncDaysLast7d: number;
    syncDaysLast28d: number;
    syncConsistencyPct: number;
  };
  detectedTrends: EngagementTrendItem[];
  retentionRisk?: {
    level: string;
    reasons: string[];
    observedSignalsCount: number;
  };
  dataQuality: string;
}

@Injectable()
export class EngagementContextService {
  private readonly logger = new Logger(EngagementContextService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: AIContextPermissionService,
    private readonly sanitizerService: SensitiveDataSanitizerService,
  ) {}

  /**
   * Constructs controlled context for AI engagement synthesis.
   * STRICT PRIVACY GUARANTEE:
   * Excludes PAR-Q, medical clearances, medications, diagnoses, private trainer notes,
   * credit cards/bank details, passwords, and unrelated records.
   */
  async buildContext(
    memberId: string,
    organisationId: string,
    signals: EngagementSignalsBundle,
    profile: MemberEngagementProfileDto,
    trends: EngagementTrendItem[],
    risk: RetentionRiskAssessment,
    now: Date = new Date(),
  ): Promise<EngagementIntelligenceContext> {
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberId },
      select: { id: true, timezone: true, organisationId: true },
    });

    const timezone = member?.timezone || 'Australia/Perth';

    const context: EngagementIntelligenceContext = {
      memberId,
      organisationId,
      date: now.toISOString().split('T')[0],
      timezone,
      engagementSummary: profile,
      attendanceSummary: {
        visitsLast7d: signals.attendance.visitsLast7d,
        visitsLast28d: signals.attendance.visitsLast28d,
        attendanceFrequencyPerWeek: signals.attendance.attendanceFrequencyPerWeek,
        noShowCountLast28d: signals.attendance.noShowCountLast28d,
        lastVisitDate: signals.attendance.lastGymVisitAt?.toISOString().split('T')[0] || null,
      },
      bookingSummary: {
        bookingsLast7d: signals.booking.bookingsLast7d,
        bookingsLast28d: signals.booking.bookingsLast28d,
        cancellationsLast28d: signals.booking.cancellationsLast28d,
        bookingFrequencyPerWeek: signals.booking.bookingFrequencyPerWeek,
      },
      workoutSummary: {
        workoutsCompletedLast7d: signals.workout.workoutsCompletedLast7d,
        workoutsCompletedLast28d: signals.workout.workoutsCompletedLast28d,
        workoutsScheduledLast28d: signals.workout.workoutsScheduledLast28d,
        adherencePercent: signals.workout.workoutAdherencePct,
      },
      goalSummary: {
        activeGoalsCount: signals.goals.activeGoalsCount,
        completedGoalsCount: signals.goals.completedGoalsCount,
        averageProgressPct: signals.goals.averageProgressPct,
      },
      membershipSummary: {
        status: signals.membership.status,
        isExpiringSoon: signals.membership.isExpiringSoon,
        daysUntilExpiry: signals.membership.daysUntilExpiry ?? null,
      },
      appEngagementSummary: {
        eventsLast7d: signals.app.eventsLast7d,
        eventsLast28d: signals.app.eventsLast28d,
        featuresUsedCount: signals.app.featuresUsedCount,
        lastActivityDate: signals.app.lastAppActivityAt?.toISOString().split('T')[0] || null,
      },
      dailyCheckInSummary: {
        checkInsLast7d: signals.checkin.checkInsLast7d,
        checkInsLast28d: signals.checkin.checkInsLast28d,
        completionRatePct: signals.checkin.completionRatePct,
        trajectory: signals.checkin.motivationTrajectory,
      },
      wearableEngagementSummary: {
        syncDaysLast7d: signals.wearables.syncDaysLast7d,
        syncDaysLast28d: signals.wearables.syncDaysLast28d,
        syncConsistencyPct: signals.wearables.syncConsistencyPct,
      },
      detectedTrends: trends,
      retentionRisk: {
        level: risk.riskLevel,
        reasons: risk.contributingReasons,
        observedSignalsCount: risk.observedSignals.length,
      },
      dataQuality: risk.dataQuality,
    };

    // Sanitize any free-form fields through SensitiveDataSanitizerService
    const sanitized = this.sanitizerService.sanitizeContext(context as any);
    return sanitized as EngagementIntelligenceContext;
  }
}
