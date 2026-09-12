import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MockSaasBillingProvider } from '../providers/mock-saas-billing.provider';

export interface DunningExecutionResult {
  overdueInvoicesEvaluated: number;
  retriedPaymentsCount: number;
  recoveredCount: number;
  suspendedCount: number;
}

@Injectable()
export class SaasDunningService {
  private readonly logger = new Logger(SaasDunningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: MockSaasBillingProvider,
  ) {}

  /**
   * Evaluates overdue SaaS invoices and applies retry policies, dunning notices, and graceful suspension.
   * Day 55 Principle: SaaS past-due status limits administrative SaaS features, NEVER immediately locking members out of doors!
   */
  async processDunningCycle(): Promise<DunningExecutionResult> {
    const overdueInvoices = await this.prisma.saasInvoice.findMany({
      where: {
        status: { in: ['OPEN', 'OVERDUE'] },
        amountDueMinor: { gt: 0 },
        dueDate: { lt: new Date() },
      },
      include: {
        organisation: {
          include: { saasBillingPolicies: true, saasBillingCustomers: true },
        },
        subscription: true,
      },
    });

    let retried = 0;
    let recovered = 0;
    let suspended = 0;

    for (const inv of overdueInvoices) {
      const customer = inv.organisation.saasBillingCustomers?.[0];
      if (!customer) continue;

      // Attempt payment retry
      retried++;
      const res = await this.provider.collectInvoicePayment({
        providerCustomerReference: customer.externalCustomerReference,
        amountMinor: inv.amountDueMinor,
        currency: inv.currency,
        invoiceNumber: inv.invoiceNumber,
      });

      if (res.status === 'SUCCEEDED') {
        recovered++;
        await this.prisma.saasInvoice.update({
          where: { id: inv.id },
          data: {
            status: 'PAID',
            amountPaidMinor: inv.totalMinor,
            amountDueMinor: 0,
            paidAt: new Date(),
          },
        });

        if (inv.subscriptionId) {
          await this.prisma.saasSubscription.update({
            where: { id: inv.subscriptionId },
            data: { status: 'ACTIVE' },
          });
        }
      } else {
        // Payment failed again. Mark invoice OVERDUE
        await this.prisma.saasInvoice.update({
          where: { id: inv.id },
          data: { status: 'OVERDUE' },
        });

        // Check grace period before suspension
        const policy = inv.organisation.saasBillingPolicies?.[0];
        const graceDays = policy?.gracePeriodDays ?? 7;
        const daysPastDue = Math.floor(
          (Date.now() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysPastDue > graceDays && inv.subscriptionId) {
          suspended++;
          await this.prisma.saasSubscription.update({
            where: { id: inv.subscriptionId },
            data: { status: 'SUSPENDED' },
          });
          this.logger.warn(
            `Organisation ${inv.organisationId} SaaS subscription ${inv.subscriptionId} SUSPENDED due to overdue payment (${daysPastDue} days past due)`,
          );
        }
      }
    }

    return {
      overdueInvoicesEvaluated: overdueInvoices.length,
      retriedPaymentsCount: retried,
      recoveredCount: recovered,
      suspendedCount: suspended,
    };
  }
}
