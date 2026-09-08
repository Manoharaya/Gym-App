import { AIToolContext } from '@fitcore/types';
import { PrismaService } from '../../../../database/prisma.service';
import { authorizeReactivationToolAccess } from './reactivation-tool-auth';

export async function executeGetGoalHistoryTool(
  input: { memberId?: string },
  context: AIToolContext,
  prisma: PrismaService,
) {
  const memberId = await authorizeReactivationToolAccess(input.memberId, context, prisma);

  const goals = await prisma.trainingGoal.findMany({
    where: { memberProfileId: memberId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      category: true,
      status: true,
      currentValue: true,
      targetValue: true,
      targetDate: true,
      updatedAt: true,
    },
  });

  return {
    memberId,
    activeGoalsCount: goals.filter((g) => g.status === 'ACTIVE').length,
    goals: goals.map((g) => ({
      title: g.title,
      category: g.category,
      status: g.status,
      targetDate: g.targetDate,
      lastUpdated: g.updatedAt,
    })),
  };
}
