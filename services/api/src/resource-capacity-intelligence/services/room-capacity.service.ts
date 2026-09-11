import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ResourceDataQualityService } from './resource-data-quality.service';
import { RoomCapacityDto, ResourceIntelligenceType } from '@fitcore/types';

@Injectable()
export class RoomCapacityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qualityService: ResourceDataQualityService,
  ) {}

  /**
   * Evaluates operational capacity and booking utilization for a physical room/studio.
   */
  async getRoomCapacity(params: {
    organisationId: string;
    resourceId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<RoomCapacityDto> {
    const { organisationId, resourceId, startDate, endDate } = params;

    const resource = await this.prisma.resource.findFirst({
      where: { id: resourceId, organisationId },
      include: { outlet: true },
    });

    const roomName = resource?.name || 'Unknown Room';
    const roomType = (resource?.type as ResourceIntelligenceType) || 'STUDIO';
    const configuredCapacity = resource?.capacity || 20;
    const outletId = resource?.outletId || '';
    const outletName = resource?.outlet?.name;

    // Operating hours calculation (default: 14 hours/day operational window)
    const daysInPeriod = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const availableHours = daysInPeriod * 14;

    const sessions = await this.prisma.classSession.findMany({
      where: {
        organisationId,
        resourceId,
        startsAt: { gte: startDate, lte: endDate },
        status: { not: 'CANCELLED' },
      },
      include: {
        bookings: { where: { status: { in: ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'] } } },
        attendanceRecords: { where: { status: { in: ['CHECKED_IN', 'COMPLETED'] } } },
      },
    });

    let bookedHours = 0;
    let totalAttendees = 0;

    for (const s of sessions) {
      const durationHours = Math.max(0, (s.endsAt.getTime() - s.startsAt.getTime()) / (1000 * 60 * 60));
      bookedHours += durationHours;
      totalAttendees += s.attendanceRecords.length || s.bookings.length;
    }

    const division = this.qualityService.safeDivide({
      numerator: bookedHours,
      denominator: availableHours,
      minimumSample: 5,
      metricLabel: 'Room Utilisation',
    });

    const averageMembersPerSession =
      sessions.length > 0 ? Math.round((totalAttendees / sessions.length) * 10) / 10 : null;

    return {
      roomId: resourceId,
      roomName,
      roomType,
      outletId,
      outletName,
      configuredCapacity,
      availableHours,
      bookedHours: Math.round(bookedHours * 10) / 10,
      actualUtilisedHours: Math.round(bookedHours * 0.9 * 10) / 10,
      roomUtilisation: division.value,
      sessionsCount: sessions.length,
      totalAttendees,
      averageMembersPerSession,
      peakHours: ['06:00-08:00', '18:00-20:00'],
      underutilisedSlotsCount: Math.max(0, Math.floor(availableHours / 2) - sessions.length),
      overCapacityAttempts: 0,
      dataQuality: division.dataQuality,
    };
  }

  /**
   * Lists all rooms/studios for an organisation / outlet.
   */
  async listRoomCapacities(params: {
    organisationId: string;
    outletId?: string;
    startDate: Date;
    endDate: Date;
  }): Promise<RoomCapacityDto[]> {
    const { organisationId, outletId, startDate, endDate } = params;

    const resources = await this.prisma.resource.findMany({
      where: {
        organisationId,
        ...(outletId ? { outletId } : {}),
        status: { in: ['ACTIVE', 'MAINTENANCE'] },
        type: { in: ['STUDIO', 'ROOM', 'COURT', 'AREA', 'CLASS_SPACE'] },
      },
    });

    const results: RoomCapacityDto[] = [];
    for (const r of resources) {
      const cap = await this.getRoomCapacity({
        organisationId,
        resourceId: r.id,
        startDate,
        endDate,
      });
      results.push(cap);
    }

    return results;
  }
}
