/**
 * Day 31 — Receptionist Trainer Tools
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class TrainerTools {
  constructor(private readonly prisma: PrismaService) {}

  async lookupTrainers(organisationId: string, outletId?: string | null, specialty?: string) {
    const trainers = await this.prisma.trainerProfile.findMany({
      where: {
        organisationId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        professionalName: true,
        bio: true,
        specialties: true,
        yearsExperience: true,
        languages: true,
        coachingStyle: true,
      },
      take: 10,
    });

    const filtered = specialty
      ? trainers.filter((t) =>
          (t.specialties || []).some((s) => s.toLowerCase().includes(specialty.toLowerCase())),
        )
      : trainers;

    return {
      count: filtered.length,
      trainers: filtered.map((t) => ({
        id: t.id,
        name: t.professionalName,
        specialties: t.specialties || [],
        bio: t.bio || 'Certified Fitness Professional',
        yearsExperience: t.yearsExperience,
        languages: t.languages,
        coachingStyle: t.coachingStyle,
      })),
    };
  }
}
