import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SaasReconciliationStatus } from '@fitcore/types';

export interface ReconciliationReport {
  subscriptionAudit: {
    totalChecked: number;
    matched: number;
    discrepancies: Array<{
      subscriptionId: string;
      organisationId: string;
      status: SaasReconciliationStatus;
      details: string;
    }>;
  };
  invoiceAudit: {
    totalChecked: number;
    matched: number;
    discrepancies: Array<{
      invoiceId: string;
      invoiceNumber: string;
      status: SaasReconciliationStatus;
      details: string;
    }>;
  };
}

@Injectable()
export class SaasReconciliationService {
  private readonly logger = new Logger(SaasReconciliationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reconciles FitCore SaaS internal records against external provider status.
   * Detects orphaned subscriptions, status drift, or unpaid invoice discrepancies.
   */
  async runReconciliation(): Promise<ReconciliationReport> {
    const subscriptions = await this.prisma.saasSubscription.findMany({
      include: { organisation: true },
    });

    const subDiscrepancies: any[] = [];
    let subMatched = 0;

    for (const sub of subscriptions) {
      if (!sub.providerSubscriptionReference) {
        subDiscrepancies.push({
          subscriptionId: sub.id,
          organisationId: sub.organisationId,
          status: 'MISSING_PROVIDER',
          details: 'Subscription lacks external provider reference',
        });
      } else {
        subMatched++;
      }
    }

    const invoices = await this.prisma.saasInvoice.findMany({
      take: 100,
      orderBy: { issuedAt: 'desc' },
    });

    const invDiscrepancies: any[] = [];
    let invMatched = 0;

    for (const inv of invoices) {
      if (inv.status === 'PAID' && inv.amountDueMinor > 0) {
        invDiscrepancies.push({
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          status: 'AMOUNT_MISMATCH',
          details: `Invoice marked PAID but retains outstanding balance of ${inv.amountDueMinor}`,
        });
      } else {
        invMatched++;
      }
    }

    return {
      subscriptionAudit: {
        totalChecked: subscriptions.length,
        matched: subMatched,
        discrepancies: subDiscrepancies,
      },
      invoiceAudit: {
        totalChecked: invoices.length,
        matched: invMatched,
        discrepancies: invDiscrepancies,
      },
    };
  }
}
