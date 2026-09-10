import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ResolvedFinancialScope } from '../domain/financial-intelligence.permissions';
import { FinancialReconciliationReportDto } from '@fitcore/types';

@Injectable()
export class FinancialReconciliationService {
  private readonly logger = new Logger(FinancialReconciliationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotently projects authoritative payment transactions into FinancialTransactionReference.
   */
  async syncTransactionProjections(organisationId: string): Promise<{ syncedCount: number }> {
    const transactions = await this.prisma.paymentTransaction.findMany({
      where: { organisationId },
      include: {
        memberMembership: { select: { originOutletId: true } },
      },
    });

    let syncedCount = 0;

    for (const tx of transactions) {
      let txType = 'OTHER';
      if (tx.memberMembershipId) {
        txType = 'MEMBERSHIP_PAYMENT';
      } else if (tx.invoiceId) {
        txType = 'MANUAL_PAYMENT';
      }

      await this.prisma.financialTransactionReference.upsert({
        where: { paymentTransactionId: tx.id },
        create: {
          organisationId: tx.organisationId,
          outletId: tx.memberMembership?.originOutletId || null,
          memberProfileId: tx.memberProfileId,
          invoiceId: tx.invoiceId,
          paymentTransactionId: tx.id,
          memberMembershipId: tx.memberMembershipId,
          transactionType: txType,
          status: tx.status,
          amountMinor: tx.amountMinor,
          currency: tx.currency,
          transactionDate: tx.createdAt,
          source: 'PAYMENT_TRANSACTION',
          sourceReferenceId: tx.providerTransactionId,
        },
        update: {
          outletId: tx.memberMembership?.originOutletId || null,
          status: tx.status,
          amountMinor: tx.amountMinor,
          transactionDate: tx.createdAt,
        },
      });

      syncedCount++;
    }

    return { syncedCount };
  }

  /**
   * Runs reconciliation comparing authoritative PaymentTransaction rows
   * against projected FinancialTransactionReference rows.
   */
  async runReconciliation(
    scope: ResolvedFinancialScope,
    currency: string = 'AUD',
  ): Promise<FinancialReconciliationReportDto> {
    const orgWhere = scope.organisationId !== 'all' ? { organisationId: scope.organisationId } : {};

    const [authCount, authSumAgg, projCount, projSumAgg] = await Promise.all([
      this.prisma.paymentTransaction.count({
        where: { ...orgWhere, currency: currency.toUpperCase() },
      }),
      this.prisma.paymentTransaction.aggregate({
        where: { ...orgWhere, currency: currency.toUpperCase(), status: 'SUCCEEDED' },
        _sum: { amountMinor: true },
      }),
      this.prisma.financialTransactionReference.count({
        where: { ...orgWhere, currency: currency.toUpperCase() },
      }),
      this.prisma.financialTransactionReference.aggregate({
        where: { ...orgWhere, currency: currency.toUpperCase(), status: 'SUCCEEDED' },
        _sum: { amountMinor: true },
      }),
    ]);

    const authGross = authSumAgg._sum.amountMinor || 0;
    const projGross = projSumAgg._sum.amountMinor || 0;

    const discrepancies: Array<{
      type: string;
      id: string;
      details: string;
      expected: any;
      actual: any;
    }> = [];

    if (authCount !== projCount) {
      discrepancies.push({
        type: 'RECORD_COUNT_MISMATCH',
        id: `org_${scope.organisationId}`,
        details: `Authoritative transaction count (${authCount}) differs from projected count (${projCount})`,
        expected: authCount,
        actual: projCount,
      });
    }

    if (authGross !== projGross) {
      discrepancies.push({
        type: 'GROSS_AMOUNT_MISMATCH',
        id: `org_${scope.organisationId}`,
        details: `Authoritative gross amount (${authGross}) differs from projected gross (${projGross})`,
        expected: authGross,
        actual: projGross,
      });
    }

    return {
      reconciledAt: new Date().toISOString(),
      organisationId: scope.organisationId,
      currency: currency.toUpperCase(),
      authoritativeTransactionCount: authCount,
      authoritativeGrossAmountMinor: authGross,
      projectedTransactionCount: projCount,
      projectedGrossAmountMinor: projGross,
      unprojectedTransactions: Math.max(0, authCount - projCount),
      discrepancyCount: discrepancies.length,
      discrepancies,
      status: discrepancies.length === 0 ? 'IN_SYNC' : 'DISCREPANCIES_DETECTED',
    };
  }
}
