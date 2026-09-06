import { SetMetadata } from '@nestjs/common';

export interface RequiredPermission {
  resource: string;
  action: string;
  scope?: string;
}

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermission = (resource: string, action: string, scope?: string) =>
  SetMetadata(PERMISSIONS_KEY, [{ resource, action, scope }]);

export const RequirePermissions = (...permissions: RequiredPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
