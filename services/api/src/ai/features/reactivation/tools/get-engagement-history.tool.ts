import { AIToolContext } from '@fitcore/types';
import { PrismaService } from '../../../../database/prisma.service';
import { EngagementSignalService } from '../../engagement-intelligence/signals/engagement-signal.service';
import { MemberEngagementBaselineService } from '../../engagement-intelligence/profile/member-engagement-baseline.service';
import { authorizeReactivationToolAccess } from './reactivation-tool-auth';

export async function executeGetEngagementHistoryTool(
  input: { memberId?: string },
  context: AIToolContext,
  prisma: PrismaService,
  signalService: EngagementSignalService,
  baselineService: MemberEngagementBaselineService,
) {
  const memberId = await authorizeReactivationToolAccess(input.memberId, context, prisma);

  const [signals, baseline] = await Promise.all([
    signalService.collectAllSignals(memberId, context.organisationId),
    baselineService.computeBaseline(memberId, context.organisationId),
  ]);

  return {
    memberId,
    signals: {
      visits7d: signals.attendance?.visitsLast7d || 0,
      visits28d: signals.attendance?.visitsLast28d || 0,
      lastVisitAt: signals.attendance?.lastGymVisitAt,
      bookingsCount: signals.booking?.bookingsLast28d || 0,
      workoutsCompleted: signals.workout?.workoutsCompletedLast28d || 0,
    },
    baseline: {
      baselineVisitsPerWeek: baseline.baselineVisitsPerWeek,
      recentVisitsPerWeek: baseline.recentVisitsPerWeek,
      baselineWorkoutAdherence: baseline.baselineWorkoutAdherence,
      momentum: baseline.momentum,
      sufficientHistory: baseline.sufficientHistory,
    },
  };
}
