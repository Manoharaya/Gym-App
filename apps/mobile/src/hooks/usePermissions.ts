import { useTenant } from '../providers/TenantProvider';
import { DEFAULT_ROLE_PERMISSIONS } from '@fitcore/constants';
import { hasPermission } from '@fitcore/utils';
import type {
  PermissionAction,
  PermissionResource,
  PermissionScope,
  UserPermissionContext,
} from '@fitcore/types';

export function usePermissions() {
  const { role, outletId, userId } = useTenant();

  const userContext: UserPermissionContext = {
    role,
    permissions: DEFAULT_ROLE_PERMISSIONS[role] || [],
    allowedOutlets: outletId ? [outletId] : [],
  };

  const can = (
    resource: PermissionResource,
    action: PermissionAction,
    scope?: PermissionScope,
    targetOutletId?: string,
    targetUserId?: string
  ): boolean => {
    return hasPermission({
      context: userContext,
      resource,
      action,
      targetScope: scope,
      targetOutletId: targetOutletId ?? outletId,
      targetUserId,
      currentUserId: userId,
    });
  };

  return {
    can,
    role,
    permissions: userContext.permissions,
  };
}
