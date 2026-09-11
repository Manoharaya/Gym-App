import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PrivacyRetentionHoldDto, PrivacyHoldStatus } from '@fitcore/types';

@Injectable()
export class PrivacyRetentionHoldService {
  private readonly logger = new Logger(PrivacyRetentionHoldService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates an active legal/operational retention hold.
   */
  async createHold(
    organisationId: string,
    createdByUserId: string,
    dataCategory: string,
    reason: string,
    memberId?: string,
  ): Promise<PrivacyRetentionHoldDto> {
    const hold = await this.prisma.privacyRetentionHold.create({
      data: {
        organisationId,
        memberId: memberId || null,
        dataCategory,
        reason,
        status: 'ACTIVE',
        createdBy: createdByUserId,
      },
    });

    this.logger.log(
      `Created retention hold ${hold.id} on category '${dataCategory}' for org ${organisationId} (Member: ${memberId || 'ALL'})`,
    );

    return this.mapToDto(hold);
  }

  /**
   * Lists retention holds for an organisation.
   */
  async getHolds(
    organisationId: string,
    status?: PrivacyHoldStatus,
  ): Promise<PrivacyRetentionHoldDto[]> {
    const holds = await this.prisma.privacyRetentionHold.findMany({
      where: {
        organisationId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return holds.map((h) => this.mapToDto(h));
  }

  /**
   * Releases an active retention hold.
   */
  async releaseHold(
    holdId: string,
    organisationId: string,
    releasedByUserId: string,
  ): Promise<PrivacyRetentionHoldDto> {
    const hold = await this.prisma.privacyRetentionHold.findFirst({
      where: { id: holdId, organisationId },
    });

    if (!hold) {
      throw new NotFoundException('Retention hold not found');
    }

    const updated = await this.prisma.privacyRetentionHold.update({
      where: { id: holdId },
      data: {
        status: 'RELEASED',
        releasedBy: releasedByUserId,
        releasedAt: new Date(),
      },
    });

    this.logger.log(`Released retention hold ${holdId} by user ${releasedByUserId}`);

    return this.mapToDto(updated);
  }

  /**
   * Checks if an active hold exists on a given category and/or member.
   */
  async hasActiveHold(
    organisationId: string,
    dataCategory: string,
    memberId?: string,
  ): Promise<boolean> {
    const hold = await this.prisma.privacyRetentionHold.findFirst({
      where: {
        organisationId,
        status: 'ACTIVE',
        OR: [
          { dataCategory: 'ALL' },
          { dataCategory },
        ],
        ...(memberId
          ? { OR: [{ memberId }, { memberId: null }] }
          : {}),
      },
    });

    return !!hold;
  }

  private mapToDto(h: any): PrivacyRetentionHoldDto {
    return {
      id: h.id,
      organisationId: h.organisationId,
      memberId: h.memberId,
      dataCategory: h.dataCategory,
      reason: h.reason,
      status: h.status as PrivacyHoldStatus,
      createdBy: h.createdBy,
      releasedBy: h.releasedBy,
      releasedAt: h.releasedAt?.toISOString() || null,
      createdAt: h.createdAt.toISOString(),
    };
  }
}
