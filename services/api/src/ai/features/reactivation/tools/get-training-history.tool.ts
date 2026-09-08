import { AIToolContext } from '@fitcore/types';
import { PrismaService } from '../../../../database/prisma.service';
import { authorizeReactivationToolAccess } from './reactivation-tool-auth';

export async function executeGetTrainingHistoryTool(
  input: { memberId?: string },
  context: AIToolContext,
  prisma: PrismaService,
) {
  const memberId = await authorizeReactivationToolAccess(input.memberId, context, prisma);

  const workouts = await prisma.workout.findMany({
    where: { memberProfileId: memberId, status: 'COMPLETED' },
    orderBy: { completedAt: 'desc' },
    take: 5,
    select: { id: true, completedAt: true, estimatedDurationMinutes: true },
  });

  const bookings = await prisma.booking.findMany({
    where: { memberProfileId: memberId, organisationId: context.organisationId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      classSession: {
        include: {
          classType: { select: { name: true } },
        },
      },
    },
  });

  return {
    memberId,
    recentWorkoutsCount: workouts.length,
    lastWorkoutCompletedAt: workouts[0]?.completedAt || null,
    recentBookingsCount: bookings.length,
    recentClasses: bookings.map((b: any) => ({
      className: b.classSession?.classType?.name || 'Class',
      status: b.status,
      date: b.classSession?.startTime,
    })),
  };
}
