import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';

export interface DeviceRegistrationInput {
  userId: string;
  userAgent?: string;
  ipAddress?: string;
  clientDeviceName?: string;
  platform?: string;
  appVersion?: string;
}

export interface DeviceInfoResult {
  id: string;
  deviceName: string;
  platform?: string | null;
  browser?: string | null;
  status: string;
  isTrusted: boolean;
  trustedAt?: Date | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  activeSessionCount: number;
}

/**
 * DeviceService
 *
 * Manages device fingerprinting, registration, trust state, and device-level session revocation.
 * Security Invariant: Device trust NEVER bypasses MFA when MFA is required by policy.
 */
@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a deterministic SHA-256 hash for a device fingerprint.
   */
  generateDeviceIdentifierHash(userId: string, userAgent?: string, platform?: string): string {
    const raw = `${userId}::${userAgent || 'unknown-ua'}::${platform || 'web'}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Registers a device upon login or authentication.
   * If new, registers with status 'NEW'. If already existing, updates lastSeenAt and IP.
   */
  async registerOrUpdateDevice(input: DeviceRegistrationInput): Promise<{ deviceId: string; isNewDevice: boolean }> {
    const hash = this.generateDeviceIdentifierHash(input.userId, input.userAgent, input.platform);

    const existing = await this.prisma.userDevice.findFirst({
      where: {
        userId: input.userId,
        deviceIdentifierHash: hash,
      },
    });

    if (existing) {
      await this.prisma.userDevice.update({
        where: { id: existing.id },
        data: {
          lastSeenAt: new Date(),
          ipAddress: input.ipAddress || existing.ipAddress,
          appVersion: input.appVersion || existing.appVersion,
        },
      });

      return { deviceId: existing.id, isNewDevice: false };
    }

    // Infer friendly device name
    const deviceName = input.clientDeviceName || this.inferDeviceName(input.userAgent, input.platform);

    const created = await this.prisma.userDevice.create({
      data: {
        userId: input.userId,
        deviceIdentifierHash: hash,
        deviceName,
        platform: input.platform || 'Web',
        browser: this.inferBrowser(input.userAgent),
        ipAddress: input.ipAddress,
        appVersion: input.appVersion,
        status: 'NEW',
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      },
    });

    this.logger.log(`Registered new device ${created.id} (${deviceName}) for user ${input.userId}`);
    return { deviceId: created.id, isNewDevice: true };
  }

  /**
   * Lists all devices for a user.
   */
  async getUserDevices(userId: string): Promise<DeviceInfoResult[]> {
    const devices = await this.prisma.userDevice.findMany({
      where: { userId },
      include: {
        sessions: {
          where: {
            isValid: true,
            status: 'ACTIVE',
            expiresAt: { gt: new Date() },
          },
        },
      },
      orderBy: { lastSeenAt: 'desc' },
    });

    return devices.map((d) => ({
      id: d.id,
      deviceName: d.deviceName,
      platform: d.platform,
      browser: d.browser,
      status: d.status,
      isTrusted: d.status === 'TRUSTED',
      trustedAt: d.trustedAt,
      firstSeenAt: d.firstSeenAt,
      lastSeenAt: d.lastSeenAt,
      activeSessionCount: d.sessions.length,
    }));
  }

  /**
   * Marks a device as TRUSTED (requires user authorization).
   */
  async trustDevice(deviceId: string, userId: string): Promise<void> {
    const device = await this.prisma.userDevice.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (device.userId !== userId) {
      throw new ForbiddenException('Cannot modify device belonging to another user');
    }

    await this.prisma.userDevice.update({
      where: { id: deviceId },
      data: {
        status: 'TRUSTED',
        trustedAt: new Date(),
      },
    });

    this.logger.log(`Device ${deviceId} marked as TRUSTED by user ${userId}`);
  }

  /**
   * Renames a device.
   */
  async renameDevice(deviceId: string, userId: string, newName: string): Promise<void> {
    const device = await this.prisma.userDevice.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (device.userId !== userId) {
      throw new ForbiddenException('Cannot modify device belonging to another user');
    }

    await this.prisma.userDevice.update({
      where: { id: deviceId },
      data: { deviceName: newName.trim() },
    });
  }

  /**
   * Revokes a device and terminates all its associated active sessions.
   */
  async revokeDevice(
    deviceId: string,
    userId: string,
    options?: { isSuperAdmin?: boolean; allowedOrgIds?: string[] } | boolean,
  ): Promise<void> {
    const device = await this.prisma.userDevice.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const isOwn = device.userId === userId;
    const isSuperAdmin =
      typeof options === 'boolean'
        ? options
        : options?.isSuperAdmin === true;

    if (!isOwn && !isSuperAdmin) {
      throw new ForbiddenException('Cannot revoke device belonging to another user');
    }

    await this.prisma.$transaction(async (tx) => {
      // Revoke the device
      await tx.userDevice.update({
        where: { id: deviceId },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
        },
      });

      // Revoke all associated sessions
      const sessions = await tx.session.findMany({
        where: { deviceId, isValid: true },
        select: { id: true },
      });

      const sessionIds = sessions.map((s) => s.id);
      if (sessionIds.length > 0) {
        await tx.session.updateMany({
          where: { id: { in: sessionIds } },
          data: {
            isValid: false,
            status: 'REVOKED',
            revokedAt: new Date(),
          },
        });

        await tx.refreshToken.updateMany({
          where: { sessionId: { in: sessionIds } },
          data: { isRevoked: true },
        });
      }
    });

    this.logger.log(`Device ${deviceId} revoked for user ${device.userId}`);
  }

  private inferDeviceName(userAgent?: string, platform?: string): string {
    if (!userAgent) return platform ? `${platform} Device` : 'Generic Device';
    const ua = userAgent.toLowerCase();

    if (ua.includes('iphone')) return 'iPhone';
    if (ua.includes('ipad')) return 'iPad';
    if (ua.includes('android')) return 'Android Device';
    if (ua.includes('macintosh') || ua.includes('mac os')) return 'Mac';
    if (ua.includes('windows')) return 'Windows PC';
    if (ua.includes('linux')) return 'Linux Workstation';

    return platform ? `${platform} Device` : 'Web Browser';
  }

  private inferBrowser(userAgent?: string): string {
    if (!userAgent) return 'Browser';
    const ua = userAgent.toLowerCase();

    if (ua.includes('edg/')) return 'Edge';
    if (ua.includes('chrome/')) return 'Chrome';
    if (ua.includes('safari/') && !ua.includes('chrome/')) return 'Safari';
    if (ua.includes('firefox/')) return 'Firefox';

    return 'Browser';
  }
}
