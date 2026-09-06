import type {
  PermissionAction,
  PermissionResource,
  PermissionScope,
  UserPermissionContext,
} from '@fitcore/types';

export interface CheckPermissionParams {
  context: UserPermissionContext;
  resource: PermissionResource;
  action: PermissionAction;
  targetScope?: PermissionScope;
  targetOutletId?: string;
  targetUserId?: string;
  currentUserId?: string;
}

/**
 * Evaluates whether a user context satisfies a resource-action-scope permission request.
 */
export function hasPermission({
  context,
  resource,
  action,
  targetScope,
  targetOutletId,
  targetUserId,
  currentUserId,
}: CheckPermissionParams): boolean {
  if (context.role === 'SUPERADMIN') {
    return true;
  }

  // Find matching rules for this resource and action (or 'manage' action which covers all actions)
  const matchingRules = context.permissions.filter(
    (rule) => rule.resource === resource && (rule.action === action || rule.action === 'manage')
  );

  if (matchingRules.length === 0) {
    return false;
  }

  for (const rule of matchingRules) {
    // Platform scope covers everything
    if (rule.scope === 'PLATFORM') {
      return true;
    }

    // Organisation scope covers all outlets within tenant
    if (rule.scope === 'ORGANISATION') {
      return true;
    }

    // Outlet scope requires user to be authorized for the specified outlet
    if (rule.scope === 'OUTLET') {
      if (!targetOutletId) {
        return true;
      }
      if (context.allowedOutlets.includes(targetOutletId)) {
        return true;
      }
    }

    // Assigned clients scope (e.g. Trainers accessing their assigned members)
    if (rule.scope === 'ASSIGNED_CLIENTS') {
      if (!targetUserId) {
        return true;
      }
      if (context.assignedMemberIds && context.assignedMemberIds.includes(targetUserId)) {
        return true;
      }
    }

    // Self scope allows accessing own data
    if (rule.scope === 'SELF') {
      if (targetUserId && currentUserId) {
        return targetUserId === currentUserId;
      }
      return true;
    }

    // Target scope check
    if (targetScope && rule.scope === targetScope) {
      return true;
    }
  }

  return false;
}
