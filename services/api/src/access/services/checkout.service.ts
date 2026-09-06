import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AccessEventService } from './access-event.service';
import { AccessCredentialService } from './access-credential.service';
import { CheckOutDto } from '../dto/check-out.dto';
import { ManualCheckOutDto } from '../dto/manual-checkin.dto';
import {
  ACCESS_DEVICE_PROVIDER,
  IAccessDeviceProvider,
} from '../interfaces/access-device-provider.interface';

@Injectable()
export class CheckOutService {
  private readonly logger = new Logger(CheckOutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventService: AccessEventService,
    private readonly credentialService: AccessCredentialService,
    @Inject(ACCESS_DEVICE_PROVIDER)
    private readonly deviceProvider: IAccessDeviceProvider
  ) {}

  /**
   * Processes a physical or digital check-out.
   */
  async checkOut(organisationId: string, dto: CheckOutDto) {
    let memberProfileId = dto.memberProfileId;

    if (!memberProfileId && dto.credentialReference) {
      const resolved = await this.credentialService.resolveCredential(
        organisationId,
        dto.credentialReference
      );
      if (resolved.valid && resolved.memberProfile) {
        memberProfileId = resolved.memberProfile.id;
      }
    }

    if (!memberProfileId) {
      throw new BadRequestException('Cannot determine member for checkout');
    }

    // Find active visit
    const activeVisit = await this.prisma.checkIn.findFirst({
      where: {
        organisationId,
        memberProfileId,
        status: 'SUCCESS',
        checkedOutAt: null,
      },
      orderBy: { checkedInAt: 'desc' },
    });

    if (!activeVisit) {
      throw new NotFoundException('No active check-in found for this member');
    }

    const now = new Date();
    const durationMinutes = Math.round(
      (now.getTime() - activeVisit.checkedInAt.getTime()) / (1000 * 60)
    );

    const updated = await this.prisma.checkIn.update({
      where: { id: activeVisit.id },
      data: {
        checkedOutAt: now,
      },
      include: {
        outlet: { select: { id: true, name: true, code: true } },
      },
    });

    // Log check-out access event
    await this.eventService.logEvent({
      organisationId,
      outletId: activeVisit.outletId,
      memberProfileId,
      deviceId: dto.deviceId,
      accessPointId: dto.accessPointId,
      eventType: 'CHECK_OUT',
      decision: 'ALLOWED',
      occurredAt: now,
      metadata: {
        checkInId: activeVisit.id,
        durationMinutes,
      },
    });

    // If exit turnstile/door device attached, unlock for exit
    if (dto.deviceId) {
      const device = await this.prisma.accessDevice.findUnique({
        where: { id: dto.deviceId },
      });
      if (device && device.providerDeviceId) {
        await this.deviceProvider.unlock(device.providerDeviceId, 3000);
      }
    }

    return {
      success: true,
      checkIn: updated,
      durationMinutes,
    };
  }

  /**
   * Reception staff manual check-out.
   */
  async manualCheckOut(
    organisationId: string,
    dto: ManualCheckOutDto,
    staffUser: { id: string; email: string }
  ) {
    const activeVisit = await this.prisma.checkIn.findFirst({
      where: {
        organisationId,
        memberProfileId: dto.memberProfileId,
        status: 'SUCCESS',
        checkedOutAt: null,
      },
      orderBy: { checkedInAt: 'desc' },
    });

    if (!activeVisit) {
      throw new NotFoundException('No active check-in found for member');
    }

    const now = new Date();
    const durationMinutes = Math.round(
      (now.getTime() - activeVisit.checkedInAt.getTime()) / (1000 * 60)
    );

    const updated = await this.prisma.checkIn.update({
      where: { id: activeVisit.id },
      data: {
        checkedOutAt: now,
      },
      include: {
        outlet: { select: { id: true, name: true, code: true } },
      },
    });

    await this.eventService.logEvent({
      organisationId,
      outletId: activeVisit.outletId,
      memberProfileId: dto.memberProfileId,
      eventType: 'CHECK_OUT',
      decision: 'ALLOWED',
      occurredAt: now,
      metadata: {
        manual: true,
        staffActorId: staffUser.id,
        reason: dto.reason,
        durationMinutes,
      },
    });

    return {
      success: true,
      checkIn: updated,
      durationMinutes,
    };
  }
}
