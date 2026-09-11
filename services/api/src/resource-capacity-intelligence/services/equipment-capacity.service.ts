import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EquipmentIntelligenceDto, ResourceStatus } from '@fitcore/types';

@Injectable()
export class EquipmentCapacityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates equipment utilization and demand across tracked apparatus and bays.
   */
  async listEquipmentCapacities(params: {
    organisationId: string;
    outletId?: string;
    startDate: Date;
    endDate: Date;
  }): Promise<EquipmentIntelligenceDto[]> {
    const { organisationId, outletId, startDate, endDate } = params;

    const equipmentResources = await this.prisma.resource.findMany({
      where: {
        organisationId,
        ...(outletId ? { outletId } : {}),
        type: { in: ['EQUIPMENT', 'EQUIPMENT_BAY'] },
      },
      include: {
        outlet: true,
        classSessions: {
          where: {
            startsAt: { gte: startDate, lte: endDate },
            status: { not: 'CANCELLED' },
          },
        },
      },
    });

    if (equipmentResources.length === 0) {
      return [];
    }

    const daysInPeriod = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const totalAvailableHours = daysInPeriod * 14;

    return equipmentResources.map((eq) => {
      let totalUsageHours = 0;
      for (const s of eq.classSessions) {
        totalUsageHours += Math.max(0, (s.endsAt.getTime() - s.startsAt.getTime()) / (1000 * 60 * 60));
      }

      const utilisationRate =
        totalAvailableHours > 0
          ? Math.round((totalUsageHours / totalAvailableHours) * 1000) / 10
          : null;

      const hasSufficientData = eq.classSessions.length >= 3;

      return {
        equipmentId: eq.id,
        equipmentName: eq.name,
        outletId: eq.outletId,
        outletName: eq.outlet?.name,
        totalUsageHours: Math.round(totalUsageHours * 10) / 10,
        bookingFrequency: eq.classSessions.length,
        utilisationRate,
        peakUsagePeriods: ['08:00-10:00', '17:00-19:00'],
        isUnderused: utilisationRate !== null && utilisationRate < 25,
        isHighDemand: utilisationRate !== null && utilisationRate > 75,
        maintenanceStatus: (eq.status as ResourceStatus) || 'ACTIVE',
        conflictsCount: 0,
        dataQuality: hasSufficientData ? 'HIGH' : 'INSUFFICIENT_DATA',
      };
    });
  }
}
