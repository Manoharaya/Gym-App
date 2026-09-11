import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DateWindowBounds } from '../../business-intelligence/services/comparison.service';
import { MultiOutletFilterDto } from '../dto/multi-outlet-filter.dto';
import { OutletTrendSeriesDto } from '@fitcore/types';

@Injectable()
export class OutletTrendService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates time-series trend points for comparable outlets without fabricating missing periods.
   */
  async getOutletTrends(params: {
    organisationId: string;
    outletIds: string[];
    metricKey: string;
    bounds: DateWindowBounds;
    filters: MultiOutletFilterDto;
  }): Promise<OutletTrendSeriesDto[]> {
    const { organisationId, outletIds, metricKey, bounds, filters } = params;

    const outlets = await this.prisma.outlet.findMany({
      where: {
        organisationId,
        id: { in: outletIds },
      },
    });

    const series: OutletTrendSeriesDto[] = [];

    for (const outlet of outlets) {
      const points: Array<{ date: string; value: number; comparisonValue?: number }> = [];

      // Query projections or authoritative daily events
      if (metricKey.startsWith('finance')) {
        const txs = await this.prisma.paymentTransaction.findMany({
          where: {
            organisationId,
            memberMembership: { originOutletId: outlet.id },
            status: 'SUCCEEDED',
            createdAt: { gte: bounds.startDate, lte: bounds.endDate },
          },
        });

        const dayMap = new Map<string, number>();
        txs.forEach((t) => {
          const day = t.createdAt.toISOString().split('T')[0];
          dayMap.set(day, (dayMap.get(day) || 0) + t.amountMinor / 100);
        });

        Array.from(dayMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([date, value]) => {
            points.push({ date, value: Math.round(value * 100) / 100 });
          });
      } else if (metricKey.startsWith('attendance')) {
        const visits = await this.prisma.checkIn.findMany({
          where: {
            organisationId,
            outletId: outlet.id,
            checkedInAt: { gte: bounds.startDate, lte: bounds.endDate },
          },
        });

        const dayMap = new Map<string, number>();
        visits.forEach((v) => {
          const day = v.checkedInAt.toISOString().split('T')[0];
          dayMap.set(day, (dayMap.get(day) || 0) + 1);
        });

        Array.from(dayMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([date, value]) => {
            points.push({ date, value });
          });
      } else {
        // Membership default
        const memberships = await this.prisma.memberMembership.findMany({
          where: {
            organisationId,
            originOutletId: outlet.id,
            status: { in: ['ACTIVE', 'TRIAL'] },
            activatedAt: { gte: bounds.startDate, lte: bounds.endDate },
          },
        });

        const dayMap = new Map<string, number>();
        memberships.forEach((m) => {
          const day = (m.activatedAt || bounds.startDate).toISOString().split('T')[0];
          dayMap.set(day, (dayMap.get(day) || 0) + 1);
        });

        Array.from(dayMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([date, value]) => {
            points.push({ date, value });
          });
      }

      series.push({
        outletId: outlet.id,
        outletName: outlet.name,
        metricKey,
        unit: metricKey.startsWith('finance') ? 'CURRENCY' : 'COUNT',
        currency: (outlet as any).currency || 'AUD',
        points,
      });
    }

    return series;
  }
}
