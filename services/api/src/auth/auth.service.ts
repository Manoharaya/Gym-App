import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      return null;
    }

    return user;
  }

  async login(
    dto: LoginDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE' || user.deletedAt) {
      throw new UnauthorizedException('Account is inactive or has been suspended');
    }

    // Generate Session and Token Family
    const tokenFamily = crypto.randomUUID();
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenFamily,
        isValid: true,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        expiresAt: sessionExpiresAt,
      },
    });

    // Create Access Token
    const jwtSecret = this.configService.get<string>('jwt.secret')!;
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        sessionId: session.id,
      },
      {
        secret: jwtSecret,
        expiresIn: '15m',
      },
    );

    // Create Refresh Token
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret')!;
    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        sessionId: session.id,
        tokenFamily,
        jti: crypto.randomUUID(),
      },
      {
        secret: refreshSecret,
        expiresIn: '7d',
      },
    );

    // Store Hashed Refresh Token
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.create({
      data: {
        sessionId: session.id,
        tokenHash,
        isRevoked: false,
        expiresAt: sessionExpiresAt,
      },
    });

    // Update lastLoginAt
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const roles = user.userRoles.map((ur) => ({
      role: ur.role.name,
      organisationId: ur.organisationId,
      outletId: ur.outletId,
    }));

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes
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
      // Invalidate the session immediately
      await this.prisma.session.update({
        where: { id: existingToken.sessionId },
        data: { isValid: false },
      });
      throw new UnauthorizedException('Security violation: Token reuse detected. Session terminated.');
    }

    if (!existingToken.session.isValid || existingToken.session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session is revoked or expired');
    }

    // Revoke old refresh token
    await this.prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: { isRevoked: true },
    });

    // Issue new token pair (rotation)
    const jwtSecret = this.configService.get<string>('jwt.secret')!;
    const newAccessToken = this.jwtService.sign(
      {
        sub: payload.sub,
        email: payload.email,
        sessionId: existingToken.sessionId,
      },
      {
        secret: jwtSecret,
        expiresIn: '15m',
      },
    );

    const newRefreshToken = this.jwtService.sign(
      {
        sub: payload.sub,
        sessionId: existingToken.sessionId,
        tokenFamily: existingToken.session.tokenFamily,
        jti: crypto.randomUUID(),
      },
      {
        secret: refreshSecret,
        expiresIn: '7d',
      },
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

  async logout(userId: string, rawRefreshToken?: string) {
    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      const token = await this.prisma.refreshToken.findUnique({
        where: { tokenHash },
      });

      if (token) {
        await this.prisma.session.update({
          where: { id: token.sessionId },
          data: { isValid: false },
        });
        await this.prisma.refreshToken.update({
          where: { id: token.id },
          data: { isRevoked: true },
        });
        return { message: 'Logged out successfully' };
      }
    }

    // Invalidate all active sessions for this user
    await this.prisma.session.updateMany({
      where: { userId, isValid: true },
      data: { isValid: false },
    });

    return { message: 'All sessions logged out successfully' };
  }
}
