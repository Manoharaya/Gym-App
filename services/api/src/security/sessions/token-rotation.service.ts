import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';

export interface TokenRotationResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  sessionId: string;
  userId: string;
}

export interface TokenReuseDetectionResult {
  detected: boolean;
  sessionId?: string;
  userId?: string;
  organisationId?: string | null;
}

/**
 * TokenRotationService
 *
 * Implements single-use refresh token rotation:
 * - Refresh Token A -> Validated -> Invalidate A -> Issue Refresh Token B
 * - Reuse Detection: Reusing an already invalidated Refresh Token A terminates
 *   the entire token family and marks the session as COMPROMISED.
 */
@Injectable()
export class TokenRotationService {
  private readonly logger = new Logger(TokenRotationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Rotates a refresh token: validates, rotates, or catches reuse anomalies.
   */
  async rotateRefreshToken(
    rawRefreshToken: string,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string },
  ): Promise<{ result?: TokenRotationResult; anomaly?: TokenReuseDetectionResult }> {
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret') || 'default-refresh-secret';

    try {
      this.jwtService.verify(rawRefreshToken, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenHash = this.hashToken(rawRefreshToken);
    const existingToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        session: {
          include: {
            user: {
              include: {
                userRoles: true,
              },
            },
          },
        },
      },
    });

    if (!existingToken || !existingToken.session) {
      throw new UnauthorizedException('Refresh token not recognized');
    }

    const session = existingToken.session;

    // --- REUSE DETECTION ---
    if (existingToken.isRevoked || !session.isValid || session.status === 'REVOKED' || session.status === 'COMPROMISED') {
      this.logger.warn(
        `SECURITY ALERT: Refresh token reuse detected for session ${session.id} (user: ${session.userId}). Terminating session family.`,
      );

      // Invalidate the entire session and token family
      await this.prisma.$transaction([
        this.prisma.session.update({
          where: { id: session.id },
          data: {
            isValid: false,
            status: 'COMPROMISED',
            revokedAt: new Date(),
          },
        }),
        this.prisma.refreshToken.updateMany({
          where: { sessionId: session.id },
          data: { isRevoked: true },
        }),
      ]);

      return {
        anomaly: {
          detected: true,
          sessionId: session.id,
          userId: session.userId,
          organisationId: session.organisationId || session.user.userRoles[0]?.organisationId,
        },
      };
    }

    // Check expiration
    if (existingToken.expiresAt.getTime() <= Date.now()) {
      await this.prisma.refreshToken.update({
        where: { id: existingToken.id },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException('Refresh token has expired');
    }

    // --- NORMAL ROTATION ---
    const tokenFamily = session.tokenFamily;
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const jwtSecret = this.configService.get<string>('jwt.secret') || 'default-jwt-secret';

    const newAccessToken = this.jwtService.sign(
      {
        sub: session.userId,
        email: session.user.email,
        sessionId: session.id,
        mfaVerified: session.mfaVerified,
      },
      { secret: jwtSecret, expiresIn: '15m' },
    );

    const newRefreshToken = this.jwtService.sign(
      {
        sub: session.userId,
        sessionId: session.id,
        tokenFamily,
        jti: crypto.randomUUID(),
      },
      { secret: refreshSecret, expiresIn: '7d' },
    );

    // Atomically invalidate old refresh token, record new refresh token, and update session activity
    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: existingToken.id },
        data: { isRevoked: true },
      }),
      this.prisma.refreshToken.create({
        data: {
          sessionId: session.id,
          tokenHash: this.hashToken(newRefreshToken),
          isRevoked: false,
          expiresAt: sessionExpiresAt,
        },
      }),
      this.prisma.session.update({
        where: { id: session.id },
        data: {
          lastUsedAt: new Date(),
          ipAddress: meta?.ipAddress || session.ipAddress,
          userAgent: meta?.userAgent || session.userAgent,
        },
      }),
    ]);

    return {
      result: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 900,
        sessionId: session.id,
        userId: session.userId,
      },
    };
  }
}
