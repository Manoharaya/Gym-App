import { AIToolContext } from '@fitcore/types';
import { PrismaService } from '../../../../database/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

/**
 * Shared authorization helper for reactivation AI tools:
 * Validates authentication, organisationId, member profile, trainer assignment, and staff permissions.
 */
export async function authorizeReactivationToolAccess(
  targetMemberId: string | undefined,
  context: AIToolContext,
  prisma: PrismaService,
): Promise<string> {
  if (!context || !context.organisationId || !context.userId) {
    throw new ForbiddenException('Tool context missing required authentication or organisation.');
  }

  const memberId = targetMemberId || context.memberId;
  if (!memberId) {
    throw new NotFoundException('Member ID required for reactivation tool execution.');
  }

  // Verify member belongs to context organisation
  const member = await prisma.memberProfile.findFirst({
    where: { id: memberId, organisationId: context.organisationId },
    select: { id: true, userId: true },
  });

  if (!member) {
    throw new NotFoundException(`Member ${memberId} not found in organisation ${context.organisationId}.`);
  }

  const role = context.userRole;
  const isSuperAdmin = role === 'SUPERADMIN';
  const isOwner = role === 'ORGANISATION_OWNER' || role === 'OWNER';
  const isManager = role === 'OUTLET_MANAGER' || role === 'CLUB_MANAGER';
  const isReception = role === 'RECEPTION';
  const isTrainer = role === 'TRAINER';
  const isSystem = role === 'SYSTEM';

  if (isSuperAdmin || isOwner || isManager || isReception || isSystem) {
    return member.id;
  }

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
        memberProfileId: member.id,
        trainerProfileId: trainerProfile.id,
        status: 'ACTIVE',
      },
    });

    if (!assignment) {
      throw new ForbiddenException('Trainers can only access reactivation tools for assigned clients.');
    }

    return member.id;
  }

  throw new ForbiddenException('Only authorized staff and assigned trainers can access reactivation tools.');
}
