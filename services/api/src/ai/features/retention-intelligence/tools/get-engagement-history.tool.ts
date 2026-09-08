import { AIToolContext } from '@fitcore/types';
import { PrismaService } from '../../../../database/prisma.service';
import { EngagementSignalService } from '../../engagement-intelligence/signals/engagement-signal.service';
import { MemberEngagementBaselineService } from '../../engagement-intelligence/profile/member-engagement-baseline.service';
import { authorizeRetentionToolAccess } from './get-retention-risk.tool';

export async function executeGetEngagementHistoryTool(
  input: any,
  context: AIToolContext,
  prisma: PrismaService,
  signalService: EngagementSignalService,
  baselineService: MemberEngagementBaselineService,
) {
  const memberId = await authorizeRetentionToolAccess(input?.memberId, context, prisma);
  const signals = await signalService.collectAllSignals(memberId, context.organisationId);
  const baseline = await baselineService.computeBaseline(memberId, context.organisationId);

  return {
    memberId,
    attendance: signals.attendance,
    bookings: signals.booking,
    appActivity: signals.app,
    baselineComparison: {
      baselineVisitsPerWeek: baseline.baselineVisitsPerWeek,
      recentVisitsPerWeek: baseline.recentVisitsPerWeek,
      attendanceDeltaPct: signals.attendance.visitsDeltaPct,
      baselineBookingsPerWeek: baseline.baselineBookingsPerWeek,
      recentBookingsPerWeek: baseline.recentBookingsPerWeek,
      momentum: baseline.momentum,
    },
  };
}
