import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ResourceDataQualityService } from './resource-data-quality.service';
import { TrainerCapacityDto } from '@fitcore/types';

@Injectable()
export class TrainerCapacityService {
  private readonly logger = new Logger(TrainerCapacityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly qualityService: ResourceDataQualityService,
  ) {}

  /**
   * Aggregates trainer operational capacity across PT, group classes, and availability blocks.
   */
  async getTrainerCapacity(params: {
    organisationId: string;
    trainerId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<TrainerCapacityDto> {
    const { organisationId, trainerId, startDate, endDate } = params;

    const trainer = await this.prisma.user.findFirst({
      where: {
        id: trainerId,
        userRoles: { some: { organisationId } },
      },
      include: {
        staffProfile: {
          include: {
            trainerProfile: {
              include: {
                clientAssignments: { where: { status: 'ACTIVE' } },
              },
            },
          },
        },
        userRoles: { include: { outlet: true } },
      },
    });

    const trainerName = trainer ? `${trainer.firstName} ${trainer.lastName}`.trim() : 'Unknown Trainer';
    const firstRole = trainer?.userRoles?.[0];
    const outletId = firstRole?.outletId || undefined;
    const outletName = firstRole?.outlet?.name || undefined;
    const activeClientsCount = trainer?.staffProfile?.trainerProfile?.clientAssignments?.length || 0;

    // 1. Calculate Available Hours from TrainerAvailability
    const availabilities = await this.prisma.trainerAvailability.findMany({
      where: {
        organisationId,
        trainerId,
      },
    });

    let availableHours = 0;
    const daysInPeriod = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const weeksInPeriod = daysInPeriod / 7;

    for (const avail of availabilities) {
      if (avail.isAvailable && avail.startTime && avail.endTime) {
        const [startH, startM] = avail.startTime.split(':').map(Number);
        const [endH, endM] = avail.endTime.split(':').map(Number);
        const hoursPerShift = Math.max(0, (endH * 60 + endM - (startH * 60 + startM)) / 60);

        if (avail.dayOfWeek !== null && avail.dayOfWeek !== undefined) {
          // Recurring weekly availability
          availableHours += hoursPerShift * Math.ceil(weeksInPeriod);
        } else if (avail.specificDate && avail.specificDate >= startDate && avail.specificDate <= endDate) {
          // Specific date shift
          availableHours += hoursPerShift;
        }
      }
    }

    // Default fallback: If no explicit availability configured, assume standard 40h/week
    if (availableHours === 0) {
      availableHours = Math.round(weeksInPeriod * 40);
    }

    // 2. Query Personal Training Sessions
    const trainerProfileId = trainer?.staffProfile?.trainerProfile?.id;
    const ptSessions = trainerProfileId
      ? await this.prisma.personalTrainingSession.findMany({
          where: {
            organisationId,
            trainerProfileId,
            scheduledStart: { gte: startDate, lte: endDate },
          },
        })
      : [];

    let ptBookedHours = 0;
    let ptCompletedHours = 0;
    let ptCancelledHours = 0;
    let ptNoShowHours = 0;

    for (const s of ptSessions) {
      const durationHours = Math.max(0, (s.scheduledEnd.getTime() - s.scheduledStart.getTime()) / (1000 * 60 * 60));
      if (s.status === 'COMPLETED') {
        ptBookedHours += durationHours;
        ptCompletedHours += durationHours;
      } else if (s.status === 'SCHEDULED' || s.status === 'CONFIRMED' || s.status === 'IN_PROGRESS') {
        ptBookedHours += durationHours;
      } else if (s.status === 'CANCELLED') {
        ptCancelledHours += durationHours;
      } else if (s.status === 'NO_SHOW') {
        ptBookedHours += durationHours;
        ptNoShowHours += durationHours;
      }
    }

    // 3. Query Group Class Sessions
    const classSessions = await this.prisma.classSession.findMany({
      where: {
        organisationId,
        trainerId,
        startsAt: { gte: startDate, lte: endDate },
      },
    });

    let classBookedHours = 0;
    let classCompletedHours = 0;
    let classCancelledHours = 0;

    for (const cs of classSessions) {
      const durationHours = Math.max(0, (cs.endsAt.getTime() - cs.startsAt.getTime()) / (1000 * 60 * 60));
      if (cs.status === 'COMPLETED') {
        classBookedHours += durationHours;
        classCompletedHours += durationHours;
      } else if (cs.status === 'SCHEDULED' || cs.status === 'OPEN' || cs.status === 'FULL' || cs.status === 'IN_PROGRESS') {
        classBookedHours += durationHours;
      } else if (cs.status === 'CANCELLED') {
        classCancelledHours += durationHours;
      }
    }

    const scheduledHours = Math.round((ptBookedHours + classBookedHours) * 10) / 10;
    const bookedHours = scheduledHours;
    const completedHours = Math.round((ptCompletedHours + classCompletedHours) * 10) / 10;
    const cancelledHours = Math.round((ptCancelledHours + classCancelledHours) * 10) / 10;
    const noShowHours = Math.round(ptNoShowHours * 10) / 10;

    // 4. Utilisation Calculations
    const ptDivision = this.qualityService.safeDivide({
      numerator: ptBookedHours,
      denominator: availableHours,
      minimumSample: 5,
      metricLabel: 'PT Utilisation',
    });

    const classDivision = this.qualityService.safeDivide({
      numerator: classBookedHours,
      denominator: availableHours,
      minimumSample: 5,
      metricLabel: 'Class Utilisation',
    });

    const combinedDivision = this.qualityService.safeDivide({
      numerator: bookedHours,
      denominator: availableHours,
      minimumSample: 5,
      metricLabel: 'Combined Utilisation',
    });

    const totalSessions = ptSessions.length + classSessions.length;

    return {
      trainerId,
      trainerName,
      staffProfileId: trainer?.staffProfile?.id,
      outletId,
      outletName,
      availableHours: Math.round(availableHours * 10) / 10,
      scheduledHours,
      bookedHours,
      completedHours,
      cancelledHours,
      noShowHours,
      ptBookedHours: Math.round(ptBookedHours * 10) / 10,
      classBookedHours: Math.round(classBookedHours * 10) / 10,
      ptUtilisation: ptDivision.value,
      groupClassUtilisation: classDivision.value,
      combinedUtilisation: combinedDivision.value,
      peakDemandPeriods: ['07:00-09:00', '17:00-19:00'],
      scheduleGapsCount: Math.max(0, Math.floor(availableHours / 4) - totalSessions),
      activeClientsCount,
      sampleSize: totalSessions,
      dataQuality: combinedDivision.dataQuality,
      sampleSizeCaveat: combinedDivision.sampleSizeCaveat,
    };
  }

  /**
   * Lists capacity metrics for all trainers in an organisation / outlet.
   */
  async listTrainerCapacities(params: {
    organisationId: string;
    outletId?: string;
    startDate: Date;
    endDate: Date;
  }): Promise<TrainerCapacityDto[]> {
    const { organisationId, outletId, startDate, endDate } = params;

    const trainers = await this.prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            organisationId,
            ...(outletId ? { outletId } : {}),
            role: { name: { in: ['TRAINER', 'OUTLET_MANAGER', 'SUPERADMIN', 'ORGANISATION_OWNER'] } },
          },
        },
      },
    });

    const results: TrainerCapacityDto[] = [];
    for (const t of trainers) {
      const cap = await this.getTrainerCapacity({
        organisationId,
        trainerId: t.id,
        startDate,
        endDate,
      });
      results.push(cap);
    }

    return results;
  }
}
