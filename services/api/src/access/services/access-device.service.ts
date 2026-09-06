import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RegisterAccessDeviceDto } from '../dto/device-event.dto';
import { DeviceStatus } from '@fitcore/types';

@Injectable()
export class AccessDeviceService {
  private readonly logger = new Logger(AccessDeviceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registers a hardware device to an organisation and outlet.
   */
  async registerDevice(organisationId: string, dto: RegisterAccessDeviceDto) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: dto.outletId, organisationId },
    });
    if (!outlet) {
      throw new NotFoundException('Outlet not found in organisation');
    }

    if (dto.accessPointId) {
      const ap = await this.prisma.accessPoint.findFirst({
        where: { id: dto.accessPointId, organisationId, outletId: dto.outletId },
      });
      if (!ap) {
        throw new NotFoundException('Access point not found in outlet');
      }
    }

    return this.prisma.accessDevice.create({
      data: {
        organisationId,
        outletId: dto.outletId,
        accessPointId: dto.accessPointId,
        name: dto.name,
        type: dto.type,
        provider: dto.provider || 'MOCK',
        providerDeviceId: dto.providerDeviceId,
        direction: dto.direction || 'ENTRY',
        location: dto.location,
        status: 'ONLINE',
        lastHeartbeatAt: new Date(),
      },
    });
  }

  /**
   * Validates device registration and guarantees tenant isolation.
   * INVARIANT 9: Cross-organisation device access is always denied.
   */
  async validateDeviceTenant(deviceId: string, expectedOrgId: string) {
    const device = await this.prisma.accessDevice.findUnique({
      where: { id: deviceId },
      include: { outlet: true },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (device.organisationId !== expectedOrgId) {
      this.logger.warn(
        `[SECURITY ALERT] Cross-tenant device violation attempt. Device ${deviceId} belongs to Org ${device.organisationId}, requested by Org ${expectedOrgId}`
      );
      throw new UnauthorizedException('Device does not belong to the authenticated organisation');
    }

    return device;
  }

  /**
   * Records device heartbeat to maintain online status.
   */
  async recordHeartbeat(deviceId: string, status: DeviceStatus = 'ONLINE') {
    return this.prisma.accessDevice.update({
      where: { id: deviceId },
      data: {
        status,
        lastHeartbeatAt: new Date(),
      },
    });
  }

  /**
   * Lists devices for an outlet or organisation.
   */
  async listDevices(organisationId: string, outletId?: string) {
    return this.prisma.accessDevice.findMany({
      where: {
        organisationId,
        ...(outletId ? { outletId } : {}),
      },
      include: {
        accessPoint: true,
        outlet: { select: { id: true, name: true, code: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Retrieves single device.
   */
  async getDevice(organisationId: string, deviceId: string) {
    const device = await this.prisma.accessDevice.findFirst({
      where: { id: deviceId, organisationId },
      include: { accessPoint: true, outlet: true },
    });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    return device;
  }
}
