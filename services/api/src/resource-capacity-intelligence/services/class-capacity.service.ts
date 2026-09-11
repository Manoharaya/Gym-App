import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ResourceDataQualityService } from './resource-data-quality.service';
import { ClassCapacityDto } from '@fitcore/types';

@Injectable()
export class ClassCapacityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qualityService: ResourceDataQualityService,
  ) {}

  /**
   * Evaluates capacity, booking fill rate, and attendance utilisation for class sessions.
   */
  async getClassCapacity(params: {
    organisationId: string;
    classSessionId: string;
  }): Promise<ClassCapacityDto> {
    const { organisationId, classSessionId } = params;

    const session = await this.prisma.classSession.findFirst({
      where: { id: classSessionId, organisationId },
      include: {
        classType: true,
        trainer: true,
        resource: true,
        outlet: true,
        bookings: true,
        waitlistEntries: { where: { status: { in: ['PENDING', 'ACTIVE', 'WAITING'] } } },
        attendanceRecords: true,
      },
    });

    if (!session) {
      throw new Error(`ClassSession ${classSessionId} not found`);
    }

    const configuredCapacity = session.capacity || 20;

    const confirmedBookings = session.bookings.filter((b) =>
      ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(b.status),
    );
    const confirmedCount = confirmedBookings.length;
    const availableSeatsCount = Math.max(0, configuredCapacity - confirmedCount);

    const checkedInCount = session.attendanceRecords.filter((a) =>
      ['CHECKED_IN', 'COMPLETED', 'LATE'].includes(a.status),
    ).length;

    const noShowsCount = session.bookings.filter((b) => b.status === 'NO_SHOW').length ||
      Math.max(0, confirmedCount - checkedInCount);

    const waitlistCount = session.waitlistEntries.length;

    // Fill Rate: Confirmed bookings / configured capacity
    const fillDivision = this.qualityService.safeDivide({
      numerator: confirmedCount,
      denominator: configuredCapacity,
      minimumSample: 5,
      metricLabel: 'Fill Rate',
    });

    // Attendance Utilisation: Checked-in members / configured capacity
    const attDivision = this.qualityService.safeDivide({
      numerator: checkedInCount,
      denominator: configuredCapacity,
      minimumSample: 5,
      metricLabel: 'Attendance Utilisation',
    });

    // No-show rate: No shows / confirmed bookings
    const noShowDivision = this.qualityService.safeDivide({
      numerator: noShowsCount,
      denominator: confirmedCount,
      minimumSample: 5,
      metricLabel: 'No-Show Rate',
    });

    let waitlistPressure: 'NONE' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'NONE';
    if (waitlistCount >= 10) waitlistPressure = 'CRITICAL';
    else if (waitlistCount >= 5) waitlistPressure = 'HIGH';
    else if (waitlistCount > 0) waitlistPressure = 'MODERATE';

    return {
      classSessionId: session.id,
      className: session.name || session.classType?.name || 'Group Class',
      classTypeId: session.classTypeId,
      classTypeName: session.classType?.name,
      resourceId: session.resourceId || undefined,
      resourceName: session.resource?.name,
      trainerId: session.trainerId || undefined,
      trainerName: session.trainer ? `${session.trainer.firstName} ${session.trainer.lastName}`.trim() : undefined,
      outletId: session.outletId,
      outletName: session.outlet?.name,
      startsAt: session.startsAt.toISOString(),
      endsAt: session.endsAt.toISOString(),
      configuredCapacity,
      confirmedBookingsCount: confirmedCount,
      availableSeatsCount,
      checkedInMembersCount: checkedInCount,
      noShowsCount,
      waitlistCount,
      fillRate: fillDivision.value,
      attendanceUtilisation: attDivision.value,
      noShowRate: noShowDivision.value,
      waitlistPressure,
      isUnderfilled: fillDivision.value !== null && fillDivision.value < 50,
      isFull: confirmedCount >= configuredCapacity,
      sampleSize: configuredCapacity,
      dataQuality: fillDivision.dataQuality,
    };
  }

  /**
   * Lists class capacity metrics for an organisation / outlet across a date window.
   */
  async listClassCapacities(params: {
    organisationId: string;
    outletId?: string;
    startDate: Date;
    endDate: Date;
    classTypeId?: string;
  }): Promise<ClassCapacityDto[]> {
    const { organisationId, outletId, startDate, endDate, classTypeId } = params;

    const sessions = await this.prisma.classSession.findMany({
      where: {
        organisationId,
        ...(outletId ? { outletId } : {}),
        ...(classTypeId ? { classTypeId } : {}),
        startsAt: { gte: startDate, lte: endDate },
        status: { not: 'CANCELLED' },
      },
      include: {
        classType: true,
        trainer: true,
        resource: true,
        outlet: true,
        bookings: true,
        waitlistEntries: { where: { status: { in: ['PENDING', 'ACTIVE', 'WAITING'] } } },
        attendanceRecords: true,
      },
      orderBy: { startsAt: 'desc' },
      take: 100,
    });

    return sessions.map((session) => {
      const configuredCapacity = session.capacity || 20;
      const confirmedBookings = session.bookings.filter((b) =>
        ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(b.status),
      );
      const confirmedCount = confirmedBookings.length;
      const availableSeatsCount = Math.max(0, configuredCapacity - confirmedCount);

      const checkedInCount = session.attendanceRecords.filter((a) =>
        ['CHECKED_IN', 'COMPLETED', 'LATE'].includes(a.status),
      ).length;

      const noShowsCount = session.bookings.filter((b) => b.status === 'NO_SHOW').length ||
        Math.max(0, confirmedCount - checkedInCount);

      const waitlistCount = session.waitlistEntries.length;

      const fillDivision = this.qualityService.safeDivide({
        numerator: confirmedCount,
        denominator: configuredCapacity,
        minimumSample: 5,
        metricLabel: 'Fill Rate',
      });

      const attDivision = this.qualityService.safeDivide({
        numerator: checkedInCount,
        denominator: configuredCapacity,
        minimumSample: 5,
        metricLabel: 'Attendance Utilisation',
      });

      const noShowDivision = this.qualityService.safeDivide({
        numerator: noShowsCount,
        denominator: confirmedCount,
        minimumSample: 5,
        metricLabel: 'No-Show Rate',
      });

      let waitlistPressure: 'NONE' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'NONE';
      if (waitlistCount >= 10) waitlistPressure = 'CRITICAL';
      else if (waitlistCount >= 5) waitlistPressure = 'HIGH';
      else if (waitlistCount > 0) waitlistPressure = 'MODERATE';

      return {
        classSessionId: session.id,
        className: session.name || session.classType?.name || 'Group Class',
        classTypeId: session.classTypeId,
        classTypeName: session.classType?.name,
        resourceId: session.resourceId || undefined,
        resourceName: session.resource?.name,
        trainerId: session.trainerId || undefined,
        trainerName: session.trainer ? `${session.trainer.firstName} ${session.trainer.lastName}`.trim() : undefined,
        outletId: session.outletId,
        outletName: session.outlet?.name,
        startsAt: session.startsAt.toISOString(),
        endsAt: session.endsAt.toISOString(),
        configuredCapacity,
        confirmedBookingsCount: confirmedCount,
        availableSeatsCount,
        checkedInMembersCount: checkedInCount,
        noShowsCount,
        waitlistCount,
        fillRate: fillDivision.value,
        attendanceUtilisation: attDivision.value,
        noShowRate: noShowDivision.value,
        waitlistPressure,
        isUnderfilled: fillDivision.value !== null && fillDivision.value < 50,
        isFull: confirmedCount >= configuredCapacity,
        sampleSize: configuredCapacity,
        dataQuality: fillDivision.dataQuality,
      };
    });
  }
}
