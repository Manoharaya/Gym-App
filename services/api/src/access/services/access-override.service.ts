import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAccessOverrideDto } from '../dto/access-override.dto';

@Injectable()
export class AccessOverrideService {
  private readonly logger = new Logger(AccessOverrideService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a time-bounded staff access override for a member at a specific facility outlet.
   */
  async createOverride(
    organisationId: string,
    dto: CreateAccessOverrideDto,
    createdById: string
  ) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: dto.outletId, organisationId },
    });
    if (!outlet) {
      throw new NotFoundException('Outlet not found in this organisation');
    }

    const member = await this.prisma.memberProfile.findFirst({
      where: { id: dto.memberProfileId, organisationId },
    });
    if (!member) {
      throw new NotFoundException('Member not found in this organisation');
    }

    const durationHours = Math.min(dto.durationHours || 4, 24); // Cap at 24 hours maximum
    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + durationHours * 60 * 60 * 1000);

    const override = await this.prisma.accessOverride.create({
      data: {
        organisationId,
        outletId: dto.outletId,
        memberProfileId: dto.memberProfileId,
        createdById,
        reason: dto.reason,
        startsAt,
        expiresAt,
        status: 'ACTIVE',
        notes: dto.notes,
      },
    });

    this.logger.log(
      `[ACCESS OVERRIDE] Created override ${override.id} for member ${dto.memberProfileId} at outlet ${dto.outletId} until ${expiresAt.toISOString()} by user ${createdById}`
    );

    return override;
  }

  /**
   * Checks if an active unexpired override exists for a member at the requested outlet.
   */
  async getActiveOverride(
    organisationId: string,
    outletId: string,
    memberProfileId: string,
    requestedAt: Date = new Date()
  ) {
    return this.prisma.accessOverride.findFirst({
      where: {
        organisationId,
        outletId,
        memberProfileId,
        status: 'ACTIVE',
        startsAt: { lte: requestedAt },
        expiresAt: { gte: requestedAt },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Lists overrides for an outlet or member.
   */
  async listOverrides(
    organisationId: string,
    params?: { outletId?: string; memberProfileId?: string }
  ) {
    return this.prisma.accessOverride.findMany({
      where: {
        organisationId,
        ...(params?.outletId ? { outletId: params.outletId } : {}),
        ...(params?.memberProfileId ? { memberProfileId: params.memberProfileId } : {}),
      },
      include: {
        memberProfile: {
          select: {
            id: true,
            preferredName: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        outlet: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Manually revokes an active override.
   */
  async revokeOverride(organisationId: string, overrideId: string) {
    const override = await this.prisma.accessOverride.findFirst({
      where: { id: overrideId, organisationId },
    });
    if (!override) {
      throw new NotFoundException('Override not found');
    }

    return this.prisma.accessOverride.update({
      where: { id: overrideId },
      data: { status: 'REVOKED' },
    });
  }
}
