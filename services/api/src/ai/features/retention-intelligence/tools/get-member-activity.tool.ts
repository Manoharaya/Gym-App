import { AIToolContext } from '@fitcore/types';
import { PrismaService } from '../../../../database/prisma.service';
import { EngagementSignalService } from '../../engagement-intelligence/signals/engagement-signal.service';
import { authorizeRetentionToolAccess } from './get-retention-risk.tool';

export async function executeGetMemberActivityTool(
  input: any,
  context: AIToolContext,
  prisma: PrismaService,
  signalService: EngagementSignalService,
) {
  const memberId = await authorizeRetentionToolAccess(input?.memberId, context, prisma);
  const signals = await signalService.collectAllSignals(memberId, context.organisationId);

  return {
    memberId,
    workoutsScheduledLast28d: signals.workout.workoutsScheduledLast28d,
    workoutsCompletedLast28d: signals.workout.workoutsCompletedLast28d,
    workoutAdherencePct: signals.workout.workoutAdherencePct,
    lastWorkoutDate: signals.workout.lastWorkoutAt ? signals.workout.lastWorkoutAt.toISOString() : null,
    visitsLast7d: signals.attendance.visitsLast7d,
    visitsLast28d: signals.attendance.visitsLast28d,
    lastVisitDate: signals.attendance.lastGymVisitAt ? signals.attendance.lastGymVisitAt.toISOString() : null,
    noShowCountLast28d: signals.attendance.noShowCountLast28d,
  };
}
