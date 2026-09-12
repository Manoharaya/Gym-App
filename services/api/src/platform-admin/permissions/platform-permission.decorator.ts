import { SetMetadata } from '@nestjs/common';
import { PlatformPermission, PlatformAdminScope } from '@fitcore/types';

export const PLATFORM_PERMISSIONS_KEY = 'platform_permissions';
export const PLATFORM_SCOPE_KEY = 'platform_scope';
export const REQUIRE_STEP_UP_KEY = 'require_step_up';

export interface PlatformPermissionRequirement {
  permissions: PlatformPermission[];
  scope?: PlatformAdminScope;
  requireStepUp?: boolean;
}

export const PlatformPermissions = (
  permissions: PlatformPermission | PlatformPermission[],
  options?: { scope?: PlatformAdminScope; requireStepUp?: boolean },
) => {
  const permList = Array.isArray(permissions) ? permissions : [permissions];
  return (target: any, key?: string | symbol, descriptor?: TypedPropertyDescriptor<any>) => {
    SetMetadata(PLATFORM_PERMISSIONS_KEY, permList)(target, key!, descriptor!);
    if (options?.scope) {
      SetMetadata(PLATFORM_SCOPE_KEY, options.scope)(target, key!, descriptor!);
    }
    if (options?.requireStepUp) {
      SetMetadata(REQUIRE_STEP_UP_KEY, true)(target, key!, descriptor!);
    }
  };
};
