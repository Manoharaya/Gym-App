import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RateLimiterService } from '../common/services/rate-limiter.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ContextSwitchDto } from './dto/context-switch.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { AuthenticatedUser } from '../common/interfaces/request-with-user.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async validateUser(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
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
      },
    });

    if (!user) {
      return null;
    }

    if (user.status === 'DISABLED' || user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Account is disabled or suspended');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      return null;
    }

    return user;
  }

  async register(
    dto: RegisterDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Check email collision
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictException('An account with this email address already exists');
    }

    // Role escalation check: prevent self-assigning elevated roles
    if (dto.role && dto.role.toUpperCase() !== 'MEMBER') {
      throw new ForbiddenException(
        `Client cannot self-assign administrative role '${dto.role}'`,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const memberRole = await this.prisma.role.findUnique({
      where: { name: 'MEMBER' },
    });

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        displayName: `${dto.firstName.trim()} ${dto.lastName.trim()}`,
        phone: dto.phone,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    });

    // Resolve target organisation for member registration
    let org = dto.organisationId
      ? await this.prisma.organisation.findUnique({ where: { id: dto.organisationId } })
      : null;

    if (!org) {
      org = await this.prisma.organisation.findFirst({ where: { status: 'ACTIVE' } });
    }

    if (org && memberRole) {
      await this.prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: memberRole.id,
          organisationId: org.id,
          outletId: dto.outletId ?? null,
        },
      });

      if (dto.outletId) {
        await this.prisma.userOutlet.create({
          data: {
            userId: user.id,
            outletId: dto.outletId,
          },
        });
      }

      const memberProfile = await this.prisma.memberProfile.create({
        data: {
          userId: user.id,
          organisationId: org.id,
          preferredName: user.firstName,
          status: 'ONBOARDING',
          onboardingStatus: 'NOT_STARTED',
        },
      });

      if (dto.outletId) {
        await this.prisma.memberOutlet.create({
          data: {
            memberProfileId: memberProfile.id,
            outletId: dto.outletId,
            status: 'ACTIVE',
          },
        });
      }

      await this.prisma.memberOnboarding.create({
        data: {
          memberProfileId: memberProfile.id,
          currentStep: 'PROFILE',
          status: 'NOT_STARTED',
        },
      });
    }

    // Create default Session
    const tokenFamily = crypto.randomUUID();
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenFamily,
        isValid: true,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        expiresAt: sessionExpiresAt,
        lastUsedAt: new Date(),
      },
    });

    const jwtSecret = this.configService.get<string>('jwt.secret')!;
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret')!;

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, sessionId: session.id },
      { secret: jwtSecret, expiresIn: '15m' },
    );

    const refreshToken = this.jwtService.sign(
      { sub: user.id, sessionId: session.id, tokenFamily, jti: crypto.randomUUID() },
      { secret: refreshSecret, expiresIn: '7d' },
    );

    await this.prisma.refreshToken.create({
      data: {
        sessionId: session.id,
        tokenHash: this.hashToken(refreshToken),
        isRevoked: false,
        expiresAt: sessionExpiresAt,
      },
    });

    await this.auditService.log({
      userId: user.id,
      action: 'AUTH_REGISTER',
      resource: 'users',
      resourceId: user.id,
      metadata: { email: user.email, role: 'MEMBER' },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        roles: memberRole ? [{ role: memberRole.name, organisationId: org?.id ?? '', outletId: dto.outletId ?? null }] : [],
      },
    };
  }

  async login(
    dto: LoginDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const rateLimitKey = dto.email.toLowerCase().trim();
    await this.rateLimiter.checkLimit(rateLimitKey);

    let user: any;
    try {
      user = await this.validateUser(dto.email, dto.password);
    } catch (err: any) {
      await this.rateLimiter.recordFailedAttempt(rateLimitKey);
      await this.auditService.log({
        action: 'AUTH_LOGIN_FAILED',
        resource: 'auth',
        metadata: { email: dto.email, reason: err.message },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        requestId: meta?.requestId,
      });
      throw err;
    }

    if (!user) {
      await this.rateLimiter.recordFailedAttempt(rateLimitKey);
      await this.auditService.log({
        action: 'AUTH_LOGIN_FAILED',
        resource: 'auth',
        metadata: { email: dto.email, reason: 'Invalid credentials' },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        requestId: meta?.requestId,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    // Reset rate limiter on successful auth
    await this.rateLimiter.reset(rateLimitKey);

    const tokenFamily = crypto.randomUUID();
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenFamily,
        isValid: true,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        expiresAt: sessionExpiresAt,
        lastUsedAt: new Date(),
      },
    });

    const jwtSecret = this.configService.get<string>('jwt.secret')!;
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret')!;

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, sessionId: session.id },
      { secret: jwtSecret, expiresIn: '15m' },
    );

    const refreshToken = this.jwtService.sign(
      { sub: user.id, sessionId: session.id, tokenFamily, jti: crypto.randomUUID() },
      { secret: refreshSecret, expiresIn: '7d' },
    );

    await this.prisma.refreshToken.create({
      data: {
        sessionId: session.id,
        tokenHash: this.hashToken(refreshToken),
        isRevoked: false,
        expiresAt: sessionExpiresAt,
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.auditService.log({
      userId: user.id,
      organisationId: user.userRoles[0]?.organisationId,
      outletId: user.userRoles[0]?.outletId,
      action: 'AUTH_LOGIN_SUCCESS',
      resource: 'auth',
      resourceId: session.id,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    const roles = user.userRoles.map((ur: any) => ({
      role: ur.role.name,
      organisationId: ur.organisationId,
      outletId: ur.outletId,
    }));

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        roles,
      },
    };
  }

  async refreshToken(rawRefreshToken: string) {
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret')!;
    let payload: any;
    try {
      payload = this.jwtService.verify(rawRefreshToken, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenHash = this.hashToken(rawRefreshToken);
    const existingToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { session: true },
    });

    if (!existingToken) {
      throw new UnauthorizedException('Refresh token not recognized');
    }

    // Token Reuse Detection
    if (existingToken.isRevoked) {
      this.logger.warn(
        `SECURITY ALERT: Refresh token reuse detected for session ${existingToken.sessionId}. Terminating session family.`,
      );
      await this.prisma.session.update({
        where: { id: existingToken.sessionId },
        data: { isValid: false, revokedAt: new Date() },
      });
      await this.auditService.log({
        userId: payload.sub,
        action: 'AUTH_REFRESH_REUSE_DETECTED',
        resource: 'auth',
        resourceId: existingToken.sessionId,
      });
      throw new UnauthorizedException('Security violation: Token reuse detected. Session terminated.');
    }

    if (!existingToken.session.isValid || existingToken.session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session is revoked or expired');
    }

    await this.prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: { isRevoked: true },
    });

    await this.prisma.session.update({
      where: { id: existingToken.sessionId },
      data: { lastUsedAt: new Date() },
    });

    const jwtSecret = this.configService.get<string>('jwt.secret')!;
    const newAccessToken = this.jwtService.sign(
      { sub: payload.sub, email: payload.email, sessionId: existingToken.sessionId },
      { secret: jwtSecret, expiresIn: '15m' },
    );

    const newRefreshToken = this.jwtService.sign(
      {
        sub: payload.sub,
        sessionId: existingToken.sessionId,
        tokenFamily: existingToken.session.tokenFamily,
        jti: crypto.randomUUID(),
      },
      { secret: refreshSecret, expiresIn: '7d' },
    );

    const newTokenHash = this.hashToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        sessionId: existingToken.sessionId,
        tokenHash: newTokenHash,
        isRevoked: false,
        expiresAt: newExpiresAt,
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900,
    };
  }

  async logout(
    userId: string,
    rawRefreshToken?: string,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      const token = await this.prisma.refreshToken.findUnique({
        where: { tokenHash },
      });

      if (token) {
        await this.prisma.session.update({
          where: { id: token.sessionId },
          data: { isValid: false, revokedAt: new Date() },
        });
        await this.prisma.refreshToken.update({
          where: { id: token.id },
          data: { isRevoked: true },
        });
      }
    }

    await this.auditService.log({
      userId,
      action: 'AUTH_LOGOUT',
      resource: 'auth',
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return { message: 'Logged out successfully' };
  }

  async logoutAll(
    userId: string,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    await this.prisma.session.updateMany({
      where: { userId, isValid: true },
      data: { isValid: false, revokedAt: new Date() },
    });

    await this.auditService.log({
      userId,
      action: 'AUTH_LOGOUT_ALL',
      resource: 'auth',
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return { message: 'All active sessions have been terminated' };
  }

  async switchContext(user: AuthenticatedUser, dto: ContextSwitchDto) {
    if (!user.isSuperAdmin) {
      const allowedOrgIds = new Set(user.roles.map((r) => r.organisationId));
      if (!allowedOrgIds.has(dto.organisationId)) {
        throw new ForbiddenException(
          `Cannot switch to organisation ${dto.organisationId}: User is not a member`,
        );
      }

      if (dto.outletId) {
        const isOrgWide = user.roles.some(
          (r) =>
            r.organisationId === dto.organisationId &&
            ['ORGANISATION_OWNER', 'FINANCE'].includes(r.role),
        );

        if (!isOrgWide) {
          const allowedOutletIds = new Set(
            [user.primaryOutletId, ...user.roles.map((r) => r.outletId)].filter(Boolean),
          );
          if (!allowedOutletIds.has(dto.outletId)) {
            throw new ForbiddenException(
              `Cannot switch to outlet ${dto.outletId}: User is not assigned to this outlet`,
            );
          }
        }
      }
    }

    await this.auditService.log({
      userId: user.id,
      organisationId: dto.organisationId,
      outletId: dto.outletId,
      action: 'AUTH_CONTEXT_SWITCH',
      resource: 'auth',
      metadata: { targetOrgId: dto.organisationId, targetOutletId: dto.outletId },
    });

    return {
      activeOrganisationId: dto.organisationId,
      activeOutletId: dto.outletId || null,
      status: 'SWITCHED',
    };
  }

  async acceptInvitation(
    dto: AcceptInvitationDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const tokenHash = this.hashToken(dto.token);

    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
      include: {
        role: true,
        organisation: true,
        outlet: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation token not recognized or already consumed');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(`Invitation is no longer valid (status: ${invitation.status})`);
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Invitation has expired');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      // Upsert User
      const user = await tx.user.upsert({
        where: { email: invitation.email },
        update: {
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          displayName: `${dto.firstName.trim()} ${dto.lastName.trim()}`,
          status: 'ACTIVE',
        },
        create: {
          email: invitation.email,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          displayName: `${dto.firstName.trim()} ${dto.lastName.trim()}`,
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        },
      });

      // Bind UserRole
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: invitation.roleId,
          organisationId: invitation.organisationId,
          outletId: invitation.outletId,
        },
      });

      // Bind UserOutlet if branch-scoped
      if (invitation.outletId) {
        await tx.userOutlet.upsert({
          where: {
            userId_outletId: {
              userId: user.id,
              outletId: invitation.outletId,
            },
          },
          update: {},
          create: {
            userId: user.id,
            outletId: invitation.outletId,
          },
        });
      }

      // Mark Invitation as ACCEPTED
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      });

      return user;
    });

    // Automatically issue authenticated session
    const tokenFamily = crypto.randomUUID();
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = await this.prisma.session.create({
      data: {
        userId: result.id,
        tokenFamily,
        isValid: true,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        expiresAt: sessionExpiresAt,
        lastUsedAt: new Date(),
      },
    });

    const jwtSecret = this.configService.get<string>('jwt.secret')!;
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret')!;

    const accessToken = this.jwtService.sign(
      { sub: result.id, email: result.email, sessionId: session.id },
      { secret: jwtSecret, expiresIn: '15m' },
    );

    const refreshToken = this.jwtService.sign(
      { sub: result.id, sessionId: session.id, tokenFamily, jti: crypto.randomUUID() },
      { secret: refreshSecret, expiresIn: '7d' },
    );

    await this.prisma.refreshToken.create({
      data: {
        sessionId: session.id,
        tokenHash: this.hashToken(refreshToken),
        isRevoked: false,
        expiresAt: sessionExpiresAt,
      },
    });

    await this.auditService.log({
      userId: result.id,
      organisationId: invitation.organisationId,
      outletId: invitation.outletId || undefined,
      action: 'AUTH_INVITATION_ACCEPTED',
      resource: 'invitations',
      resourceId: invitation.id,
      metadata: { email: result.email, role: invitation.role.name },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        id: result.id,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        displayName: result.displayName,
        roles: [
          {
            role: invitation.role.name,
            organisationId: invitation.organisationId,
            outletId: invitation.outletId,
          },
        ],
      },
    };
  }

  async getMe(user: AuthenticatedUser) {
    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        avatarUrl: true,
        phone: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        userRoles: {
          include: {
            role: true,
            organisation: { select: { id: true, name: true, slug: true } },
            outlet: { select: { id: true, name: true, slug: true, code: true } },
          },
        },
        userOutlets: {
          include: {
            outlet: { select: { id: true, name: true, slug: true, code: true } },
          },
        },
      },
    });

    if (!fullUser) {
      throw new NotFoundException('User profile not found');
    }

    const organisations = Array.from(
      new Map(
        fullUser.userRoles
          .map((ur) => ur.organisation)
          .filter(Boolean)
          .map((org) => [org.id, org]),
      ).values(),
    );

    const outlets = Array.from(
      new Map(
        fullUser.userOutlets
          .map((uo) => uo.outlet)
          .filter(Boolean)
          .map((out) => [out.id, out]),
      ).values(),
    );

    return {
      id: fullUser.id,
      email: fullUser.email,
      firstName: fullUser.firstName,
      lastName: fullUser.lastName,
      displayName: fullUser.displayName,
      avatarUrl: fullUser.avatarUrl,
      phone: fullUser.phone,
      status: fullUser.status,
      lastLoginAt: fullUser.lastLoginAt,
      createdAt: fullUser.createdAt,
      roles: fullUser.userRoles.map((ur) => ({
        role: ur.role.name,
        organisationId: ur.organisationId,
        organisationName: ur.organisation.name,
        outletId: ur.outletId,
        outletName: ur.outlet?.name || null,
      })),
      organisations,
      outlets,
      permissions: user.permissions,
    };
  }
}
