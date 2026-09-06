import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateResourceDto } from '../dto';

@Injectable()
export class ResourceService {
  private readonly logger = new Logger(ResourceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists physical resources / rooms / studios for an outlet.
   */
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

  /**
   * Registers a new physical studio room or equipment zone.
   */
  async createResource(organisationId: string, dto: CreateResourceDto) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: dto.outletId, organisationId },
    });

    if (!outlet) {
      throw new NotFoundException('Outlet not found in this organisation');
    }

    return this.prisma.resource.create({
      data: {
        organisationId,
        outletId: dto.outletId,
        name: dto.name,
        type: dto.type || 'STUDIO',
        capacity: dto.capacity || 30,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Checks whether a room / resource is available without overlapping class sessions.
   */
  async isResourceAvailable(
    resourceId: string,
    startsAt: Date,
    endsAt: Date,
    options?: { excludeSessionId?: string },
  ): Promise<{ available: boolean; conflictingSessionId?: string; conflictingSessionName?: string }> {
    const conflict = await this.prisma.classSession.findFirst({
      where: {
        resourceId,
        status: { not: 'CANCELLED' },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
        ...(options?.excludeSessionId ? { id: { not: options.excludeSessionId } } : {}),
      },
      include: { resource: true },
    });

    if (conflict) {
      return {
        available: false,
        conflictingSessionId: conflict.id,
        conflictingSessionName: conflict.name || 'Class',
      };
    }

    return { available: true };
  }

  /**
   * Fetches room timetable schedule for staff view.
   */
  async getResourceTimetable(resourceId: string, startDate: Date, endDate: Date) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      include: { outlet: true },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    const sessions = await this.prisma.classSession.findMany({
      where: {
        resourceId,
        startsAt: { gte: startDate, lte: endDate },
        status: { not: 'CANCELLED' },
      },
      include: {
        classType: true,
        trainer: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { bookings: true } },
      },
      orderBy: { startsAt: 'asc' },
    });

    return {
      resource,
      startDate,
      endDate,
      sessions,
    };
  }
}
