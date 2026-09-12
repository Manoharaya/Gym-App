import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PLATFORM_PERMISSIONS_KEY,
  PLATFORM_SCOPE_KEY,
  REQUIRE_STEP_UP_KEY,
} from './platform-permission.decorator';
import { PlatformPermission, PlatformAdminScope } from '@fitcore/types';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PlatformPermissionGuard implements CanActivate {
  private readonly logger = new Logger(PlatformPermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<PlatformPermission[]>(
      PLATFORM_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredScope = this.reflector.getAllAndOverride<PlatformAdminScope>(
      PLATFORM_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requireStepUp = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_STEP_UP_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no platform permissions required, allow passage
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required for platform operations');
    }

    // Must be a platform-level actor
    const hasPlatformRole =
      user.isSuperAdmin ||
      user.roles?.some((r) => ['SUPERADMIN', 'PLATFORM_ADMIN', 'PLATFORM_SUPPORT', 'PLATFORM_OPERATOR'].includes(r.role));

    if (!hasPlatformRole) {
      this.logger.warn(`User ${user.email} denied platform access: not a platform administrator`);
      throw new ForbiddenException('Access denied: Platform administrator privileges required');
    }

    // Extract all user permissions into normalized set
    const userPermStrings = new Set<string>();
    
    // Check if user has explicit platform permissions in their context
    (user.permissions || []).forEach((p) => {
      // Formats: resource='platform', action='organisations.read'
      userPermStrings.add(`${p.resource}.${p.action}`.toLowerCase());
      userPermStrings.add(`${p.resource}:${p.action}`.toLowerCase());
      userPermStrings.add(p.resource.toLowerCase());
      if (p.scope) {
        userPermStrings.add(`${p.resource}.${p.action}@${p.scope}`.toLowerCase());
      }
    });

    // Check database if user has custom Platform Role permissions assigned
    const dbUserRoles = await this.prisma.userRole.findMany({
      where: { userId: user.id },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    dbUserRoles.forEach((ur) => {
      ur.role.permissions.forEach((rp) => {
        const res = rp.permission.resource.toLowerCase();
        const act = rp.permission.action.toLowerCase();
        userPermStrings.add(`${res}.${act}`);
        userPermStrings.add(`${res}:${act}`);
        userPermStrings.add(res);
      });
    });

    // Check for root platform wildcard
    const hasRootPlatformWildcard =
      userPermStrings.has('platform.*') ||
      userPermStrings.has('platform:manage') ||
      userPermStrings.has('platform.manage') ||
      userPermStrings.has('*.*') ||
      (user.isSuperAdmin && (user.permissions?.length === 0 || userPermStrings.has('platform')));

    // Enforce explicit platform permissions
    for (const requiredPerm of requiredPermissions) {
      const normalizedReq = requiredPerm.toLowerCase();
      
      const hasExact = userPermStrings.has(normalizedReq);
      const hasResourceWildcard =
        userPermStrings.has(`${normalizedReq.split('.')[0]}.*`) ||
        userPermStrings.has(`${normalizedReq.split('.')[0]}:manage`) ||
        userPermStrings.has(`${normalizedReq.split('.')[0]}.${normalizedReq.split('.')[1]}.manage`);

      if (!hasExact && !hasResourceWildcard && !hasRootPlatformWildcard) {
        this.logger.warn(
          `Platform admin ${user.email} lacking required platform permission: ${requiredPerm}`,
        );
        throw new ForbiddenException(
          `Missing required platform permission: ${requiredPerm}. Superadmin role alone does not bypass explicit permissions.`,
        );
      }
    }

    // Scope check: If scope required, ensure user's platform scope covers it
    if (requiredScope && requiredScope !== 'GLOBAL') {
      const targetOrgId = request.params?.id || request.params?.organisationId || request.headers['x-organisation-id'];
      if (requiredScope === 'ORGANISATION' && !targetOrgId && !user.isSuperAdmin) {
        throw new ForbiddenException('Organisation scope target must be specified');
      }
    }

    return true;
  }
}
