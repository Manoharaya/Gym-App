import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';

export interface JwtPayload {
  sub: string;
  email: string;
  sessionId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret', 'fitcore-dev-jwt-access-secret-2026-very-secure-random-key'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        userOutlets: true,
      },
    });

    if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
      throw new UnauthorizedException('User account is invalid, deactivated, or deleted');
    }

    const roles = user.userRoles.map((ur) => ({
      role: ur.role.name,
      organisationId: ur.organisationId,
      outletId: ur.outletId,
    }));

    const permissionsMap = new Map<string, { resource: string; action: string; scope: string }>();
    user.userRoles.forEach((ur) => {
      ur.role.permissions.forEach((rp) => {
        const key = `${rp.permission.resource}:${rp.permission.action}:${rp.permission.scope}`;
        permissionsMap.set(key, {
          resource: rp.permission.resource,
          action: rp.permission.action,
          scope: rp.permission.scope,
        });
      });
    });

    const isSuperAdmin = roles.some((r) => r.role === 'SUPERADMIN');
    const primaryOrganisationId = roles[0]?.organisationId;
    const primaryOutletId = user.userOutlets[0]?.outletId || roles[0]?.outletId || null;

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      status: user.status,
      roles,
      permissions: Array.from(permissionsMap.values()),
      primaryOrganisationId,
      primaryOutletId,
      isSuperAdmin,
    };
  }
}
