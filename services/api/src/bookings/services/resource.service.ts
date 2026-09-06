import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ResourceService {
  private readonly logger = new Logger(ResourceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listResources(organisationId: string, outletId?: string) {
    return this.prisma.resource.findMany({
      where: {
        organisationId,
        ...(outletId ? { outletId } : {}),
      },
      include: {
        outlet: { select: { id: true, name: true, code: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createResource(
    organisationId: string,
    data: {
      outletId: string;
      name: string;
      type?: string;
      capacity?: number;
    },
  ) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: data.outletId, organisationId },
    });

    if (!outlet) {
      throw new NotFoundException('Outlet not found in this organisation');
    }

    return this.prisma.resource.create({
      data: {
        organisationId,
        outletId: data.outletId,
        name: data.name,
        type: data.type || 'STUDIO',
        capacity: data.capacity || 30,
        status: 'ACTIVE',
      },
    });
  }

  async isResourceAvailable(
    resourceId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<{ available: boolean; conflictingSessionId?: string }> {
    const conflict = await this.prisma.classSession.findFirst({
      where: {
        resourceId,
        status: { not: 'CANCELLED' },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });

    if (conflict) {
      return { available: false, conflictingSessionId: conflict.id };
    }

    return { available: true };
  }
}
