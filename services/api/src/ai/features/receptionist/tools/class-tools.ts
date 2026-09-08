/**
 * Day 31 — Receptionist Class Tools
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class ClassTools {
  constructor(private readonly prisma: PrismaService) {}

  async lookupClasses(organisationId: string, category?: string) {
    const classTypes = await this.prisma.classType.findMany({
      where: {
        organisationId,
        ...(category ? { category } : {}),
      },
      select: {
        id: true,
        name: true,
        category: true,
        description: true,
        durationMinutes: true,
        defaultCapacity: true,
      },
      take: 10,
    });

    return {
      count: classTypes.length,
      classes: classTypes.map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        durationMinutes: c.durationMinutes,
        description: c.description,
        capacity: c.defaultCapacity,
      })),
    };
  }

  async lookupClassSchedule(organisationId: string, outletId?: string | null, date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const sessions = await this.prisma.classSession.findMany({
      where: {
        organisationId,
        ...(outletId ? { outletId } : {}),
        startsAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        classType: {
          select: { name: true, category: true },
        },
        trainer: {
          select: { firstName: true, lastName: true },
        },
        outlet: {
          select: { id: true, name: true },
        },
        _count: {
          select: { bookings: true },
        },
      },
      orderBy: { startsAt: 'asc' },
      take: 15,
    });

    return {
      date: startOfDay.toISOString().split('T')[0],
      count: sessions.length,
      sessions: sessions.map((s) => ({
        id: s.id,
        className: s.classType.name,
        category: s.classType.category,
        outletName: s.outlet.name,
        startTime: s.startsAt.toISOString(),
        endTime: s.endsAt.toISOString(),
        instructor: s.trainer
          ? `${s.trainer.firstName} ${s.trainer.lastName}`.trim()
          : 'FitCore Coach',
        availableCapacity: Math.max(0, s.capacity - (s._count?.bookings || 0)),
      })),
    };
  }
}
