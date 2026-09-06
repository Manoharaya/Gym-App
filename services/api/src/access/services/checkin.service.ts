import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AccessDecisionService } from './access-decision.service';
import { AccessEventService } from './access-event.service';
import { CheckInDto } from '../dto/check-in.dto';
import { ManualCheckInDto } from '../dto/manual-checkin.dto';
import {
  ACCESS_DEVICE_PROVIDER,
  IAccessDeviceProvider,
} from '../interfaces/access-device-provider.interface';

@Injectable()
export class CheckInService {
  private readonly logger = new Logger(CheckInService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly decisionService: AccessDecisionService,
    private readonly eventService: AccessEventService,
    @Inject(ACCESS_DEVICE_PROVIDER)
    private readonly deviceProvider: IAccessDeviceProvider
  ) {}

  /**
   * Processes a physical or digital check-in request.
   *
   * Idempotent: duplicate device events (same deviceId + deviceEventId) return the existing check-in.
   */
  async checkIn(organisationId: string, dto: CheckInDto) {
    // 1. IDEMPOTENCY CHECK (Section 21 & 47)
    if (dto.deviceId && dto.deviceEventId) {
      const existing = await this.prisma.checkIn.findUnique({
        where: {
          deviceId_deviceEventId: {
            deviceId: dto.deviceId,
            deviceEventId: dto.deviceEventId,
          },
        },
        include: {
          memberProfile: {
            select: {
              id: true,
              preferredName: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
          outlet: { select: { id: true, name: true, code: true } },
        },
      });

      if (existing) {
        this.logger.log(
          `[IDEMPOTENT SCAN] Duplicate event ${dto.deviceEventId} on device ${dto.deviceId} returned cached check-in`
        );
        return {
          allowed: existing.status === 'SUCCESS',
          checkIn: existing,
          isDuplicate: true,
          decision: {
            allowed: existing.status === 'SUCCESS',
            reason: (existing.status === 'SUCCESS' ? 'ALLOWED' : existing.denialReason || 'DENIED') as any,
            outletId: existing.outletId,
            memberProfileId: existing.memberProfileId,
            timestamp: existing.checkedInAt.toISOString(),
          },
        };
      }
    }

    // 2. RUN AUTHORITATIVE ACCESS DECISION
    const decision = await this.decisionService.canAccess({
      memberProfileId: dto.memberProfileId,
      credentialReference: dto.credentialReference,
      outletId: dto.outletId,
      credentialId: dto.credentialId,
      accessPointId: dto.accessPointId,
      deviceId: dto.deviceId,
      requestedAt: new Date(),
    });

    const memberProfileId = decision.memberProfileId || dto.memberProfileId;
    const now = new Date();

    if (!decision.allowed) {
      // Record DENIED check-in attempt (Section 18)
      let deniedRecord = null;
      if (memberProfileId) {
        deniedRecord = await this.prisma.checkIn.create({
          data: {
            organisationId,
            outletId: dto.outletId,
            memberProfileId,
            memberMembershipId: decision.membershipId,
            credentialId: decision.credentialId,
            accessPointId: dto.accessPointId,
            deviceId: dto.deviceId,
            method: dto.method || 'QR',
            status: 'DENIED',
            checkedInAt: now,
            source: dto.deviceId ? 'TURNSTILE' : 'API',
            deviceEventId: dto.deviceEventId,
            denialReason: decision.reason,
            metadata: dto.metadata ? JSON.parse(JSON.stringify(dto.metadata)) : undefined,
          },
        });
      }

      // Log immutable access event
      await this.eventService.logEvent({
        organisationId,
        outletId: dto.outletId,
        memberProfileId,
        credentialId: decision.credentialId,
        deviceId: dto.deviceId,
        accessPointId: dto.accessPointId,
        eventType: 'ACCESS_DENIED',
        decision: 'DENIED',
        reason: decision.reason,
        providerEventId: dto.deviceEventId,
        occurredAt: now,
        metadata: {
          details: decision.details,
        },
      });

      return {
        allowed: false,
        checkIn: deniedRecord,
        decision,
        isDuplicate: false,
      };
    }

    // 3. ALLOWED: Check active visit limit (Section 20: 1 active visit per member per org)
    const existingActiveVisit = await this.getActiveVisit(organisationId, memberProfileId!);
    if (existingActiveVisit && existingActiveVisit.outletId !== dto.outletId) {
      // Automatically close stale open visit at other outlet before creating new one
      await this.prisma.checkIn.update({
        where: { id: existingActiveVisit.id },
        data: { checkedOutAt: now },
      });
      this.logger.log(
        `[VISIT RECONCILED] Auto-checked out member ${memberProfileId} from prior visit ${existingActiveVisit.id}`
      );
    }

    // Record SUCCESS CheckIn
    const checkIn = await this.prisma.checkIn.create({
      data: {
        organisationId,
        outletId: dto.outletId,
        memberProfileId: memberProfileId!,
        memberMembershipId: decision.membershipId,
        credentialId: decision.credentialId,
        accessPointId: dto.accessPointId,
        deviceId: dto.deviceId,
        method: dto.method || 'QR',
        status: 'SUCCESS',
        checkedInAt: now,
        source: dto.deviceId ? 'TURNSTILE' : 'API',
        deviceEventId: dto.deviceEventId,
        metadata: dto.metadata ? JSON.parse(JSON.stringify(dto.metadata)) : undefined,
      },
      include: {
        outlet: { select: { id: true, name: true, code: true } },
        memberProfile: {
          select: {
            id: true,
            preferredName: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    // Update credential lastUsedAt if credential used
    if (decision.credentialId) {
      await this.prisma.accessCredential
        .update({
          where: { id: decision.credentialId },
          data: { lastUsedAt: now },
        })
        .catch(() => null);
    }

    // Log immutable access events
    await this.eventService.logEvent({
      organisationId,
      outletId: dto.outletId,
      memberProfileId,
      credentialId: decision.credentialId,
      deviceId: dto.deviceId,
      accessPointId: dto.accessPointId,
      eventType: 'ACCESS_GRANTED',
      decision: 'ALLOWED',
      reason: decision.reason,
      providerEventId: dto.deviceEventId,
      occurredAt: now,
      metadata: { checkInId: checkIn.id, allowedByOverride: decision.allowedByOverride },
    });

    await this.eventService.logEvent({
      organisationId,
      outletId: dto.outletId,
      memberProfileId,
      credentialId: decision.credentialId,
      deviceId: dto.deviceId,
      accessPointId: dto.accessPointId,
      eventType: 'CHECK_IN',
      decision: 'ALLOWED',
      reason: decision.reason,
      providerEventId: dto.deviceEventId,
      occurredAt: now,
    });

    // 4. TRIGGER HARDWARE DOOR/TURNSTILE UNLOCK (Section 9)
    if (dto.deviceId) {
      const device = await this.prisma.accessDevice.findUnique({
        where: { id: dto.deviceId },
      });
      if (device && device.providerDeviceId) {
        await this.deviceProvider.unlock(device.providerDeviceId, 3000);
        await this.deviceProvider.sendAccessDecision(device.providerDeviceId, decision);
        await this.eventService.logEvent({
          organisationId,
          outletId: dto.outletId,
          memberProfileId,
          deviceId: dto.deviceId,
          eventType: 'DOOR_UNLOCKED',
          decision: 'ALLOWED',
          occurredAt: new Date(),
        });
      }
    }

    return {
      allowed: true,
      checkIn,
      decision,
      isDuplicate: false,
    };
  }

  /**
   * Reception staff manual check-in with provenance and audit trail.
   * INVARIANT 1: Physical access still verified unless override exists.
   */
  async manualCheckIn(
    organisationId: string,
    dto: ManualCheckInDto,
    staffUser: { id: string; email: string }
  ) {
    const decision = await this.decisionService.canAccess({
      memberProfileId: dto.memberProfileId,
      outletId: dto.outletId,
      requestedAt: new Date(),
    });

    if (!decision.allowed) {
      throw new BadRequestException(
        `Manual check-in denied: ${decision.details || decision.reason}`
      );
    }

    const now = new Date();
    const checkIn = await this.prisma.checkIn.create({
      data: {
        organisationId,
        outletId: dto.outletId,
        memberProfileId: dto.memberProfileId,
        memberMembershipId: decision.membershipId,
        method: 'MANUAL',
        status: 'SUCCESS',
        checkedInAt: now,
        source: 'RECEPTION',
        metadata: {
          staffActorId: staffUser.id,
          staffActorEmail: staffUser.email,
          reason: dto.reason || 'Reception front-desk check-in',
          notes: dto.notes,
        },
      },
      include: {
        outlet: { select: { id: true, name: true, code: true } },
        memberProfile: {
          select: {
            id: true,
            preferredName: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    await this.eventService.logEvent({
      organisationId,
      outletId: dto.outletId,
      memberProfileId: dto.memberProfileId,
      eventType: 'CHECK_IN',
      decision: 'ALLOWED',
      reason: decision.reason,
      occurredAt: now,
      metadata: {
        manual: true,
        staffActorId: staffUser.id,
        reason: dto.reason,
      },
    });

    return checkIn;
  }

  /**
   * Retrieves active ongoing visit for a member in an organisation.
   */
  async getActiveVisit(organisationId: string, memberProfileId: string) {
    return this.prisma.checkIn.findFirst({
      where: {
        organisationId,
        memberProfileId,
        status: 'SUCCESS',
        checkedOutAt: null,
      },
      include: {
        outlet: { select: { id: true, name: true, code: true } },
      },
      orderBy: { checkedInAt: 'desc' },
    });
  }

  /**
   * Paginated visit history query.
   */
  async getVisits(
    organisationId: string,
    params?: {
      outletId?: string;
      memberProfileId?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Math.max(params?.page || 1, 1);
    const limit = Math.min(params?.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where = {
      organisationId,
      ...(params?.outletId ? { outletId: params.outletId } : {}),
      ...(params?.memberProfileId ? { memberProfileId: params.memberProfileId } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.checkIn.count({ where }),
      this.prisma.checkIn.findMany({
        where,
        include: {
          outlet: { select: { id: true, name: true, code: true } },
          memberProfile: {
            select: {
              id: true,
              preferredName: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { checkedInAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
