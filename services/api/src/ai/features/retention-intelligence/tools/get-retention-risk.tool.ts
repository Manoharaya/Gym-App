import { AIToolContext } from '@fitcore/types';
import { PrismaService } from '../../../../database/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RetentionRiskService } from '../../engagement-intelligence/risk/retention-risk.service';
import { EngagementSignalService } from '../../engagement-intelligence/signals/engagement-signal.service';
import { MemberEngagementBaselineService } from '../../engagement-intelligence/profile/member-engagement-baseline.service';

/**
 * Shared authorization helper for retention tools:
 * Validates authentication, organisationId, member profile, trainer assignment, and role permissions.
 */
export async function authorizeRetentionToolAccess(
  targetMemberId: string | undefined,
  context: AIToolContext,
  prisma: PrismaService,
): Promise<string> {
  if (!context || !context.organisationId || !context.userId) {
    throw new ForbiddenException('Tool context missing required authentication or organisation.');
  }

  const memberId = targetMemberId || context.memberId;
  if (!memberId) {
    throw new NotFoundException('Member ID required for retention tool execution.');
  }

  // Verify member belongs to context organisation
  const member = await prisma.memberProfile.findFirst({
    where: { id: memberId, organisationId: context.organisationId },
    select: { id: true, userId: true },
  });

  if (!member) {
    throw new NotFoundException(`Member ${memberId} not found in organisation ${context.organisationId}.`);
  }

  // Verify role permissions
  const role = context.userRole;
  const isSuperAdmin = role === 'SUPERADMIN';
  const isOwner = role === 'ORGANISATION_OWNER' || role === 'OWNER';
  const isManager = role === 'OUTLET_MANAGER' || role === 'CLUB_MANAGER';
  const isTrainer = role === 'TRAINER';

  if (isSuperAdmin || isOwner || isManager) {
    return member.id;
  }

  // If Trainer, must be assigned via TrainerClientAssignment
  if (isTrainer) {
    const trainerProfile = await prisma.trainerProfile.findFirst({
      where: {
        organisationId: context.organisationId,
        staffProfile: { userId: context.userId },
      },
    });

    if (!trainerProfile) {
      throw new ForbiddenException('Trainer profile not found.');
    }

    const assignment = await prisma.trainerClientAssignment.findFirst({
      where: {
        trainerProfileId: trainerProfile.id,
        memberProfileId: member.id,
        status: 'ACTIVE',
      },
    });

    if (!assignment) {
      throw new ForbiddenException('Trainer is not authorized to access retention intelligence for unassigned member.');
    }

    return member.id;
  }

  throw new ForbiddenException('Current user role is not authorized to access internal retention tools.');
}

export async function executeGetRetentionRiskTool(
  input: any,
  context: AIToolContext,
  prisma: PrismaService,
  signalService: EngagementSignalService,
  baselineService: MemberEngagementBaselineService,
  retentionRiskService: RetentionRiskService,
) {
  const memberId = await authorizeRetentionToolAccess(input?.memberId, context, prisma);
  const signals = await signalService.collectAllSignals(memberId, context.organisationId);
  const baseline = await baselineService.computeBaseline(memberId, context.organisationId);
  return retentionRiskService.evaluateRetentionRisk(signals, baseline);
}
