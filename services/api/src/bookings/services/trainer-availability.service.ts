import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTrainerAvailabilityDto } from '../dto';

@Injectable()
export class TrainerAvailabilityService {
  private readonly logger = new Logger(TrainerAvailabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records availability or blockout for a trainer.
   */
  async setAvailability(organisationId: string, dto: CreateTrainerAvailabilityDto) {
    const trainer = await this.prisma.user.findFirst({
      where: {
        id: dto.trainerId,
        userRoles: { some: { role: { name: { in: ['TRAINER', 'SUPERADMIN', 'OUTLET_MANAGER'] } } } },
      },
    });

    if (!trainer) {
      throw new NotFoundException('Trainer not found or user does not possess trainer role');
    }

    return this.prisma.trainerAvailability.create({
      data: {
        organisationId,
        trainerId: dto.trainerId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        specificDate: dto.specificDate ? new Date(dto.specificDate) : undefined,
        isAvailable: dto.isAvailable !== undefined ? dto.isAvailable : true,
        notes: dto.notes,
      },
    });
  }

  /**
   * Checks whether a trainer is available during a given time window.
   */
  async isTrainerAvailable(
    trainerId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<{ available: boolean; reason?: string }> {
    // 1. Check for specific date blockout
    const specificBlockout = await this.prisma.trainerAvailability.findFirst({
      where: {
        trainerId,
        specificDate: startsAt,
        isAvailable: false,
      },
    });

    if (specificBlockout) {
      return {
        available: false,
        reason: specificBlockout.notes || 'Trainer is marked unavailable for this date',
      };
    }

    // 2. Check for active scheduled class session
    const conflictingSession = await this.prisma.classSession.findFirst({
      where: {
        trainerId,
        status: { not: 'CANCELLED' },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      include: { outlet: true },
    });

    if (conflictingSession) {
      return {
        available: false,
        reason: `Trainer has a conflicting class "${conflictingSession.name}" at ${conflictingSession.outlet.name}`,
      };
    }

    return { available: true };
  }

  /**
   * Fetches full trainer schedule for staff view.
   */
  async getTrainerSchedule(trainerId: string, startDate: Date, endDate: Date) {
    const [sessions, availability] = await Promise.all([
      this.prisma.classSession.findMany({
        where: {
          trainerId,
          startsAt: { gte: startDate, lte: endDate },
          status: { not: 'CANCELLED' },
        },
        include: {
          classType: true,
          outlet: { select: { id: true, name: true, code: true } },
          resource: { select: { id: true, name: true } },
          _count: { select: { bookings: true } },
        },
        orderBy: { startsAt: 'asc' },
      }),
      this.prisma.trainerAvailability.findMany({
        where: {
          trainerId,
        },
      }),
    ]);

    return {
      trainerId,
      startDate,
      endDate,
      sessions,
      availability,
    };
  }
}
