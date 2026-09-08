import { AIToolContext } from '@fitcore/types';
import { PrismaService } from '../../../../database/prisma.service';
import { authorizeReactivationToolAccess } from './reactivation-tool-auth';

export async function executeGetMemberRecoveryStateTool(
  input: { memberId?: string },
  context: AIToolContext,
  prisma: PrismaService,
) {
  const memberId = await authorizeReactivationToolAccess(input.memberId, context, prisma);

  const profile = await prisma.memberReactivationProfile.findFirst({
    where: {
      organisationId: context.organisationId,
      memberId,
    },
    include: {
      currentRecoveryPlan: true,
    },
  });

  if (!profile) {
    return {
      memberId,
      hasReactivationProfile: false,
      recoveryState: 'NO_RECOVERY_SIGNAL',
      reactivationStatus: 'NO_ACTION',
      daysInactive: 0,
      activePlan: null,
    };
  }

  return {
    memberId,
    hasReactivationProfile: true,
    recoveryState: profile.recoveryState,
    reactivationStatus: profile.reactivationStatus,
    lifecycleState: profile.lifecycleState,
    daysInactive: profile.inactivityDays,
    lastMeaningfulActivityAt: profile.lastMeaningfulActivityAt,
    lastMeaningfulActivityType: profile.lastMeaningfulActivityType,
    reengagementDetectedAt: profile.reengagementDetectedAt,
    activePlan: profile.currentRecoveryPlan
      ? {
          id: profile.currentRecoveryPlan.id,
          strategy: profile.currentRecoveryPlan.strategyType || profile.currentRecoveryPlan.strategy,
          status: profile.currentRecoveryPlan.status,
          priority: profile.currentRecoveryPlan.priority,
          createdAt: profile.currentRecoveryPlan.createdAt,
        }
      : null,
  };
}
