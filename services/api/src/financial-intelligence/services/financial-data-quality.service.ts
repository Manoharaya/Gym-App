import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { FinancialMetricService } from './financial-metric.service';
import { ResolvedFinancialScope } from '../domain/financial-intelligence.permissions';
import { FinancialDataQualityDto } from '@fitcore/types';

@Injectable()
export class FinancialDataQualityService {
  private readonly logger = new Logger(FinancialDataQualityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricService: FinancialMetricService,
  ) {}

  /**
   * Assesses financial data quality and integrity across transactions and invoices.
   */
  async assessDataQuality(scope: ResolvedFinancialScope): Promise<FinancialDataQualityDto> {
    const orgWhere = scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {};

    // 1. Check total payments and missing outlet links
    const [totalPayments, missingOutletCount, failedPayments, overdueInvoices, totalInvoices, unprojectedCount] =
      await Promise.all([
        this.prisma.paymentTransaction.count({ where: orgWhere }),
        this.prisma.paymentTransaction.count({
          where: {
            ...orgWhere,
            memberMembership: { is: null },
          },
        }),
        this.prisma.paymentTransaction.count({
          where: { ...orgWhere, status: 'FAILED' },
        }),
        this.prisma.invoice.count({
          where: {
            ...orgWhere,
            status: { in: ['OPEN', 'PARTIALLY_PAID'] },
            dueDate: { lt: new Date() },
          },
        }),
        this.prisma.invoice.count({ where: orgWhere }),
        this.prisma.paymentTransaction.count({
          where: {
            ...orgWhere,
            id: {
              notIn: (
                await this.prisma.financialTransactionReference.findMany({
                  where: orgWhere,
                  select: { paymentTransactionId: true },
                })
              )
                .map((r) => r.paymentTransactionId)
                .filter(Boolean) as string[],
            },
          },
        }),
      ]);

    const missingOutletPercentage =
      totalPayments > 0 ? Math.round((missingOutletCount / totalPayments) * 1000) / 10 : 0;
    const failedPaymentRate =
      totalPayments > 0 ? Math.round((failedPayments / totalPayments) * 1000) / 10 : 0;
    const overdueInvoiceRate =
      totalInvoices > 0 ? Math.round((overdueInvoices / totalInvoices) * 1000) / 10 : 0;

    const rating = this.metricService.evaluateDataQuality({
      missingOutletPercentage,
      failedPaymentRate,
      unprojectedCount,
    });

    let overallScore = 100;
    overallScore -= Math.min(30, Math.round(missingOutletPercentage * 0.5));
    overallScore -= Math.min(20, Math.round(failedPaymentRate * 0.5));
    overallScore -= Math.min(20, unprojectedCount * 2);
    overallScore = Math.max(10, Math.min(100, overallScore));

    const recommendations: string[] = [];
    if (missingOutletPercentage > 10) {
      recommendations.push(
        `${missingOutletPercentage}% of transactions lack direct outlet attribution. Link origin outlets to membership purchases.`,
      );
    }
    if (failedPaymentRate > 10) {
      recommendations.push(
        `High failed payment rate (${failedPaymentRate}%). Consider configuring card-updater or dunning sequences.`,
      );
    }
    if (overdueInvoiceRate > 20) {
      recommendations.push(
        `${overdueInvoices} invoices are overdue. Review receivables and collections.`,
      );
    }
    if (unprojectedCount > 0) {
      recommendations.push(
        `${unprojectedCount} payments are unprojected. Run financial reconciliation synchronization.`,
      );
    }
    if (recommendations.length === 0) {
      recommendations.push('All financial records and attribution linkages are healthy.');
    }

    return {
      rating,
      overallScore,
      metrics: {
        missingOutletCount,
        missingOutletPercentage,
        failedPaymentRate,
        overdueInvoiceRate,
        unprojectedTransactionCount: unprojectedCount,
      },
      recommendations,
    };
  }
}
