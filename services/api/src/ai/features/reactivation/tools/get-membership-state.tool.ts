import { AIToolContext } from '@fitcore/types';
import { PrismaService } from '../../../../database/prisma.service';
import { authorizeReactivationToolAccess } from './reactivation-tool-auth';

export async function executeGetMembershipStateTool(
  input: { memberId?: string },
  context: AIToolContext,
  prisma: PrismaService,
) {
  const memberId = await authorizeReactivationToolAccess(input.memberId, context, prisma);

  const memberships = await prisma.memberMembership.findMany({
    where: { memberProfileId: memberId, organisationId: context.organisationId },
    orderBy: { createdAt: 'desc' },
    take: 1,
    include: {
      membershipPlan: { select: { name: true } },
    },
  });

  const current = memberships[0];
  const now = new Date();
  const isExpiringSoon = Boolean(
    current?.endDate &&
      new Date(current.endDate).getTime() - now.getTime() < 14 * 24 * 60 * 60 * 1000 &&
      new Date(current.endDate).getTime() > now.getTime(),
  );

  return {
    memberId,
    membershipPlanName: current?.membershipPlan?.name || 'Standard Plan',
    status: current?.status || 'ACTIVE',
    startDate: current?.startDate,
    endDate: current?.endDate,
    isExpiringSoon,
  };
}
