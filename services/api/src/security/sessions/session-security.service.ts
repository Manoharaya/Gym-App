import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface UserSessionSummary {
  id: string;
  isCurrent: boolean;
  status: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceName?: string | null;
  platform?: string | null;
  browser?: string | null;
  authMethod: string;
  mfaVerified: boolean;
  createdAt: Date;
  lastUsedAt?: Date | null;
  expiresAt: Date;
}

/**
 * SessionSecurityService
 *
 * Manages user session lifecycle, tracking, idle timeout, and revocation.
 * Strictly prevents cross-user session tampering.
 */
@Injectable()
export class SessionSecurityService {
  private readonly logger = new Logger(SessionSecurityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves all active sessions for a given user.
   */
  async getUserSessions(
    userId: string,
    currentSessionId?: string,
  ): Promise<UserSessionSummary[]> {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        isValid: true,
        expiresAt: { gt: new Date() },
      },
      include: {
        device: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      isCurrent: s.id === currentSessionId,
      status: s.status,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      deviceName: s.device?.deviceName || 'Unknown Device',
      platform: s.device?.platform || 'Web',
      browser: s.device?.browser || 'Browser',
      authMethod: s.authMethod,
      mfaVerified: s.mfaVerified,
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt,
      expiresAt: s.expiresAt,
    }));
  }

  /**
   * Revokes a specific session.
   * Ensures the session belongs to the user or caller has admin authority.
   */
  async revokeSession(
    sessionId: string,
    userId: string,
    options?: { isSuperAdmin?: boolean; allowedOrgIds?: string[] } | boolean,
  ): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const isOwnSession = session.userId === userId;
    const isSuperAdmin =
      typeof options === 'boolean'
        ? options
        : options?.isSuperAdmin === true;
    const isOrgAdminForSession =
      typeof options === 'object' &&
      session.organisationId &&
      options.allowedOrgIds?.includes(session.organisationId);

    if (!isOwnSession && !isSuperAdmin && !isOrgAdminForSession) {
      throw new ForbiddenException('Cannot revoke sessions belonging to another user or organisation');
    }

    await this.prisma.$transaction([
      this.prisma.session.update({
        where: { id: sessionId },
        data: {
          isValid: false,
          status: 'REVOKED',
          revokedAt: new Date(),
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { sessionId },
        data: { isRevoked: true },
      }),
    ]);

    this.logger.log(`Revoked session ${sessionId} for user ${session.userId}`);
  }

  /**
   * Revokes all sessions for a user, optionally preserving the current active session.
   */
  async revokeAllUserSessions(
    userId: string,
    options?: { exceptSessionId?: string; reason?: string },
  ): Promise<number> {
    const whereClause: any = {
      userId,
      isValid: true,
    };

    if (options?.exceptSessionId) {
      whereClause.id = { not: options.exceptSessionId };
    }

    const sessionsToRevoke = await this.prisma.session.findMany({
      where: whereClause,
      select: { id: true },
    });

    if (sessionsToRevoke.length === 0) return 0;

    const sessionIds = sessionsToRevoke.map((s) => s.id);

    await this.prisma.$transaction([
      this.prisma.session.updateMany({
        where: { id: { in: sessionIds } },
        data: {
          isValid: false,
          status: 'REVOKED',
          revokedAt: new Date(),
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { sessionId: { in: sessionIds } },
        data: { isRevoked: true },
      }),
    ]);

    this.logger.log(`Revoked ${sessionIds.length} sessions for user ${userId} (${options?.reason || 'User requested'})`);
    return sessionIds.length;
  }

  /**
   * Checks whether a session has exceeded its idle timeout or absolute max lifetime.
   */
  isSessionExpired(
    session: { lastUsedAt?: Date | null; createdAt: Date; expiresAt: Date },
    idleTimeoutMinutes = 60,
  ): boolean {
    const now = Date.now();

    // Absolute expiration
    if (session.expiresAt.getTime() <= now) {
      return true;
    }

    // Idle expiration
    if (session.lastUsedAt) {
      const idleTimeMs = now - session.lastUsedAt.getTime();
      if (idleTimeMs > idleTimeoutMinutes * 60 * 1000) {
        return true;
      }
    }

    return false;
  }
}
