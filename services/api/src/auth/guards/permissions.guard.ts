import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, RequiredPermission } from '../../common/decorators/permissions.decorator';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<RequiredPermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();
    if (!user) {
      return false;
    }

    if (user.isSuperAdmin) {
      return true;
    }

    // Check if user has all required permissions
    return requiredPermissions.every((reqPerm) => {
      return user.permissions.some((p) => {
        const matchesResource =
          p.resource.toLowerCase() === reqPerm.resource.toLowerCase() || p.resource === '*';
        const permAction = p.action.toUpperCase();
        const reqAction = reqPerm.action.toUpperCase();
        const matchesAction =
          permAction === reqAction ||
          permAction === 'MANAGE' ||
          (permAction === 'WRITE' && ['CREATE', 'UPDATE', 'DELETE', 'WRITE'].includes(reqAction)) ||
          (reqAction === 'WRITE' && ['CREATE', 'UPDATE', 'WRITE'].includes(permAction));
        const matchesScope =
          !reqPerm.scope ||
          p.scope.toUpperCase() === reqPerm.scope.toUpperCase() ||
          p.scope.toUpperCase() === 'PLATFORM';

        return matchesResource && matchesAction && matchesScope;
      });
    });
  }
}
