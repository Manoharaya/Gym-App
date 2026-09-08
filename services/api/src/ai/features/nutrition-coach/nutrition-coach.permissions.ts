import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../../../common/interfaces/request-with-user.interface';

export const NUTRITION_COACH_PERMISSIONS = {
  USE: { resource: 'ai', action: 'use' },
  VIEW_PREVIEW: { resource: 'ai', action: 'preview' },
  MANAGE: { resource: 'ai', action: 'manage' },
};

/**
 * Validates that actor is permitted to access nutrition coach for member.
 * - Superadmin / Org owner: allowed.
 * - Member: can only access their own profile.
 * - Trainer: can only access if actively assigned via TrainerClientAssignment.
 */
export function assertActorCanAccessMember(
  actor: AuthenticatedUser,
  targetMemberProfileId: string,
  targetMemberUserId?: string,
): void {
  if (actor.isSuperAdmin) {
    return;
  }

  // Self-access
  if (targetMemberUserId && actor.id === targetMemberUserId) {
    return;
  }

  // Trainer or staff role
  const isTrainerOrStaff = actor.roles?.some((r) =>
    ['TRAINER', 'OUTLET_MANAGER', 'ORGANISATION_OWNER'].includes(r.role),
  );

  if (!isTrainerOrStaff && (!targetMemberUserId || actor.id !== targetMemberUserId)) {
    throw new ForbiddenException({
      code: 'FORBIDDEN_NUTRITION_COACH_ACCESS',
      message: 'You do not have permission to access AI Nutrition Coach for this member',
    });
  }
}
