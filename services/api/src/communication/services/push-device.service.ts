import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { RegisterPushDeviceDto } from '../dto/communication.dto';

@Injectable()
export class PushDeviceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Registers or updates a user push notification device token.
   */
  async registerDevice(
    userId: string,
    organisationId: string,
    dto: RegisterPushDeviceDto,
  ) {
    const device = await this.prisma.pushDevice.upsert({
      where: {
        userId_deviceId: {
          userId,
          deviceId: dto.deviceId,
        },
      },
      update: {
        pushToken: dto.pushToken,
        platform: dto.platform,
        appVersion: dto.appVersion,
        deviceName: dto.deviceName,
        status: 'ACTIVE',
        lastSeenAt: new Date(),
        organisationId,
      },
      create: {
        userId,
        organisationId,
        deviceId: dto.deviceId,
        platform: dto.platform,
        pushToken: dto.pushToken,
        appVersion: dto.appVersion,
        deviceName: dto.deviceName,
        status: 'ACTIVE',
        lastSeenAt: new Date(),
      },
    });

    await this.audit.log({
      userId,
      action: 'PUSH_DEVICE_REGISTERED',
      resource: 'push_devices',
      resourceId: device.id,
      organisationId,
      metadata: { platform: dto.platform, deviceId: dto.deviceId },
    });

    return {
      id: device.id,
      deviceId: device.deviceId,
      platform: device.platform,
      deviceName: device.deviceName,
      status: device.status,
      lastSeenAt: device.lastSeenAt,
      // Raw token is masked for privacy
      pushTokenMasked: this.maskToken(device.pushToken),
    };
  }

  /**
   * Revokes a push device (e.g. on logout).
   */
  async revokeDevice(userId: string, deviceId: string) {
    const device = await this.prisma.pushDevice.findFirst({
      where: { userId, deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const updated = await this.prisma.pushDevice.update({
      where: { id: device.id },
      data: { status: 'REVOKED' },
    });

    await this.audit.log({
      userId,
      action: 'PUSH_DEVICE_REVOKED',
      resource: 'push_devices',
      resourceId: updated.id,
      organisationId: updated.organisationId,
      metadata: { deviceId },
    });

    return { success: true, status: 'REVOKED' };
  }

  /**
   * Retrieves active push tokens for a user (internal use only).
   */
  async getActiveTokens(userId: string): Promise<string[]> {
    const devices = await this.prisma.pushDevice.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { pushToken: true },
    });

    return devices.map((d) => d.pushToken);
  }

  /**
   * Marks a push token as invalid (e.g. when FCM/APNS reports expired/unregistered).
   */
  async markTokenInvalid(pushToken: string): Promise<void> {
    await this.prisma.pushDevice.updateMany({
      where: { pushToken },
      data: { status: 'INVALID' },
    });
  }

  /**
   * Lists devices for a user with masked tokens.
   */
  async getUserDevices(userId: string) {
    const devices = await this.prisma.pushDevice.findMany({
      where: { userId },
      orderBy: { lastSeenAt: 'desc' },
    });

    return devices.map((d) => ({
      id: d.id,
      deviceId: d.deviceId,
      platform: d.platform,
      deviceName: d.deviceName,
      status: d.status,
      lastSeenAt: d.lastSeenAt,
      pushTokenMasked: this.maskToken(d.pushToken),
    }));
  }

  private maskToken(token: string): string {
    if (!token || token.length <= 8) return '****';
    return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
  }
}
