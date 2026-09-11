import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface UpsertProjectionParams {
  organisationId: string;
  outletId?: string | null;
  metricKey: string;
  periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  periodStart: Date;
  periodEnd: Date;
  value: number;
  currency?: string | null;
  sourceVersion?: string;
}

@Injectable()
export class ProjectionService {
  private readonly logger = new Logger(ProjectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotently upserts an analytics metric projection rollup record.
   * Concurrency-safe and tenant-isolated.
   */
  async upsertMetricProjection(params: UpsertProjectionParams): Promise<void> {
    const {
      organisationId,
      outletId = null,
      metricKey,
      periodType,
      periodStart,
      periodEnd,
      value,
      currency = null,
      sourceVersion = 'v1.0',
    } = params;

    try {
      await this.prisma.businessMetricProjection.upsert({
        where: {
          organisationId_outletId_metricKey_periodType_periodStart_currency: {
            organisationId,
            outletId: outletId || '',
            metricKey,
            periodType,
            periodStart,
            currency: currency || '',
          },
        },
        create: {
          organisationId,
          outletId: outletId || null,
          metricKey,
          periodType,
          periodStart,
          periodEnd,
          value,
          currency,
          sourceVersion,
          dataVersion: 1,
        },
        update: {
          value,
          periodEnd,
          sourceVersion,
          dataVersion: { increment: 1 },
          generatedAt: new Date(),
        },
      });
    } catch (err: any) {
      // If unique constraint uses null vs empty string difference across DB drivers, fallback to clean find/update
      const existing = await this.prisma.businessMetricProjection.findFirst({
        where: {
          organisationId,
          outletId: outletId || null,
          metricKey,
          periodType,
          periodStart,
          currency: currency || null,
        },
      });

      if (existing) {
        await this.prisma.businessMetricProjection.update({
          where: { id: existing.id },
          data: {
            value,
            periodEnd,
            generatedAt: new Date(),
          },
        });
      } else {
        await this.prisma.businessMetricProjection.create({
          data: {
            organisationId,
            outletId: outletId || null,
            metricKey,
            periodType,
            periodStart,
            periodEnd,
            value,
            currency: currency || null,
            sourceVersion,
          },
        });
      }
    }
  }

  /**
   * Records a point-in-time snapshot of domain metrics for comparison.
   */
  async recordDomainSnapshot(params: {
    organisationId: string;
    outletId?: string | null;
    domain: string;
    metrics: Record<string, any>;
    currency?: string;
    snapshotDate?: Date;
  }): Promise<void> {
    const { organisationId, outletId = null, domain, metrics, currency = null, snapshotDate = new Date() } = params;

    const existing = await this.prisma.businessMetricSnapshot.findFirst({
      where: {
        organisationId,
        outletId: outletId || null,
        domain,
        snapshotDate,
        currency: currency || null,
      },
    });

    if (existing) {
      await this.prisma.businessMetricSnapshot.update({
        where: { id: existing.id },
        data: {
          metrics: JSON.parse(JSON.stringify(metrics)),
          generatedAt: new Date(),
        },
      });
    } else {
      await this.prisma.businessMetricSnapshot.create({
        data: {
          organisationId,
          outletId: outletId || null,
          domain,
          snapshotDate,
          currency: currency || null,
          metrics: JSON.parse(JSON.stringify(metrics)),
        },
      });
    }
  }
}
