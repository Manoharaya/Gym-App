import { AIToolContext } from '@fitcore/types';
import { PrismaService } from '../../../../database/prisma.service';
import { authorizeRetentionToolAccess } from './get-retention-risk.tool';

export async function executeGetMemberGoalsTool(
  input: any,
  context: AIToolContext,
  prisma: PrismaService,
) {
  const memberId = await authorizeRetentionToolAccess(input?.memberId, context, prisma);

  const [goals, member] = await Promise.all([
    prisma.trainingGoal.findMany({
      where: {
        memberProfileId: memberId,
        organisationId: context.organisationId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        title: true,
        category: true,
        currentValue: true,
        targetValue: true,
        baselineValue: true,
        targetDate: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.memberProfile.findUnique({
      where: { id: memberId },
      select: { createdAt: true },
    }),
  ]);

  const tenureDays = member?.createdAt
    ? Math.floor((Date.now() - new Date(member.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    memberId,
    tenureDays,
    activeGoalsCount: goals.length,
    goals: goals.map((g) => {
      let progressPercent = 0;
      if (g.targetValue !== null && g.baselineValue !== null && g.targetValue !== g.baselineValue) {
        const curr = g.currentValue ?? g.baselineValue;
        progressPercent = Math.min(100, Math.max(0, Math.round(((curr - g.baselineValue) / (g.targetValue - g.baselineValue)) * 100)));
      }
      return {
        title: g.title,
        category: g.category,
        progressPercent,
        targetDate: g.targetDate?.toISOString() || null,
      };
    }),
  };
}
