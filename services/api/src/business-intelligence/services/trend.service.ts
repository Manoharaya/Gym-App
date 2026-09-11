import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ResolvedBiScope } from '../domain/business-intelligence.permissions';
import { DateWindowBounds } from './comparison.service';
import { BusinessFilterDto } from '../dto/business-filter.dto';
import {
  BusinessTrendSeries,
  BusinessTrendPoint,
  BusinessMetricDomain,
} from '@fitcore/types';

@Injectable()
export class BusinessTrendService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates time-series trend points for a requested metric key across the data window.
   */
  async getMetricTrend(
    scope: ResolvedBiScope,
    metricKey: string,
    bounds: DateWindowBounds,
    filters: BusinessFilterDto,
  ): Promise<BusinessTrendSeries> {
    const interval = filters.interval || 'DAILY';
    const currency = filters.currency || 'AUD';

    // 1. Resolve domain and unit
    let domain: BusinessMetricDomain = 'MEMBERSHIP';
    let unit = 'COUNT';

    if (metricKey.startsWith('finance.')) {
      domain = 'FINANCE';
      unit = 'CURRENCY';
    } else if (metricKey.startsWith('sales.')) {
      domain = 'SALES';
      unit = metricKey.includes('rate') ? 'PERCENTAGE' : 'COUNT';
    } else if (metricKey.startsWith('attendance.')) {
      domain = 'ATTENDANCE';
      unit = 'COUNT';
    } else if (metricKey.startsWith('booking.')) {
      domain = 'BOOKING';
      unit = 'COUNT';
    } else if (metricKey.startsWith('training.')) {
      domain = 'TRAINING';
      unit = 'PERCENTAGE';
    }

    // 2. Query time-series from projection table if available, else derive from authoritative domain
    const projections = await this.prisma.businessMetricProjection.findMany({
      where: {
        organisationId: scope.organisationId,
        outletId: scope.outletId || null,
        metricKey,
        periodStart: { gte: bounds.startDate, lte: bounds.endDate },
        ...(unit === 'CURRENCY' ? { currency } : {}),
      },
      orderBy: { periodStart: 'asc' },
    });

    if (projections.length > 0) {
      const points: BusinessTrendPoint[] = projections.map((p) => ({
        date: p.periodStart.toISOString().split('T')[0],
        value: p.value,
        dataQuality: 'HIGH',
      }));

      return {
        metricKey,
        domain,
        interval,
        unit,
        currency: unit === 'CURRENCY' ? currency : undefined,
        points,
      };
    }

    // Fallback: derive actual points from authoritative domain tables
    const points: BusinessTrendPoint[] = await this.deriveDomainTrendPoints(
      scope,
      metricKey,
      bounds,
      currency,
    );

    return {
      metricKey,
      domain,
      interval,
      unit,
      currency: unit === 'CURRENCY' ? currency : undefined,
      points,
    };
  }

  private async deriveDomainTrendPoints(
    scope: ResolvedBiScope,
    metricKey: string,
    bounds: DateWindowBounds,
    currency: string,
  ): Promise<BusinessTrendPoint[]> {
    const points: BusinessTrendPoint[] = [];
    const stepMs = 24 * 60 * 60 * 1000;
    let curr = new Date(bounds.startDate);

    while (curr <= bounds.endDate) {
      const next = new Date(curr.getTime() + stepMs);
      const dateStr = curr.toISOString().split('T')[0];

      let val = 0;

      if (metricKey === 'finance.net_revenue' || metricKey === 'finance.gross_revenue') {
        const txs = await this.prisma.financialTransactionReference.findMany({
          where: {
            organisationId: scope.organisationId,
            ...(scope.outletId ? { outletId: scope.outletId } : {}),
            status: 'SUCCEEDED',
            currency,
            transactionDate: { gte: curr, lt: next },
          },
        });
        const gross = txs.filter((t) => t.transactionType !== 'REFUND').reduce((acc, t) => acc + t.amountMinor, 0);
        const refunds = txs.filter((t) => t.transactionType === 'REFUND').reduce((acc, t) => acc + Math.abs(t.amountMinor), 0);
        val = metricKey === 'finance.net_revenue' ? (gross - refunds) / 100 : gross / 100;
      } else if (metricKey === 'attendance.total_visits') {
        val = await this.prisma.checkIn.count({
          where: {
            organisationId: scope.organisationId,
            ...(scope.outletId ? { outletId: scope.outletId } : {}),
            checkedInAt: { gte: curr, lt: next },
          },
        });
      } else if (metricKey === 'sales.new_leads') {
        val = await this.prisma.lead.count({
          where: {
            organisationId: scope.organisationId,
            ...(scope.outletId ? { outletId: scope.outletId } : {}),
            createdAt: { gte: curr, lt: next },
          },
        });
      } else if (metricKey === 'membership.new_members') {
        val = await this.prisma.memberMembership.count({
          where: {
            organisationId: scope.organisationId,
            ...(scope.outletId ? { originOutletId: scope.outletId } : {}),
            status: { in: ['ACTIVE', 'TRIAL'] },
            activatedAt: { gte: curr, lt: next },
          },
        });
      }

      points.push({
        date: dateStr,
        value: val,
        dataQuality: 'HIGH',
      });

      curr = next;
    }

    return points;
  }
}
