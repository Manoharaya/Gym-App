import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SaasSubscriptionsService } from './subscriptions/saas-subscriptions.service';
import { SaasUsageService } from './usage/saas-usage.service';
import { SaasCreditsService } from './credits/saas-credits.service';
import {
  SaasBillingOverviewDto,
  SaasSuperadminMetricsDto,
} from '@fitcore/types';

@Injectable()
export class SaasBillingService {
  private readonly logger = new Logger(SaasBillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SaasSubscriptionsService,
    private readonly usageService: SaasUsageService,
    private readonly creditsService: SaasCreditsService,
  ) {}

  /**
   * Retrieves comprehensive SaaS billing overview for an organisation.
   */
  async getOrganisationBillingOverview(organisationId: string): Promise<SaasBillingOverviewDto> {
    const subscription = await this.subscriptionsService.getSubscription(organisationId);
    const billingCustomer = await this.prisma.saasBillingCustomer.findUnique({
      where: { organisationId },
    });

    const meters = await this.usageService.getUsageSummary(organisationId);
    const credit = await this.creditsService.getCreditBalance(organisationId);

    const openInvoices = await this.prisma.saasInvoice.findMany({
      where: {
        organisationId,
        status: { in: ['OPEN', 'OVERDUE'] },
      },
    });

    const pastDueAmountMinor = openInvoices.reduce(
      (acc: number, inv: { amountDueMinor: number }) => acc + (inv.amountDueMinor || 0),
      0,
    );

    const estimatedOverageTotal = meters.reduce(
      (acc, m) => acc + (m.estimatedOverageChargeMinor || 0),
      0,
    );

    const estimatedCharges = (subscription?.baseAmountMinor || 0) + estimatedOverageTotal;

    const periodStart = subscription
      ? subscription.currentPeriodStart.toISOString()
      : new Date().toISOString();
    const periodEnd = subscription
      ? subscription.currentPeriodEnd.toISOString()
      : new Date().toISOString();

    const daysRemaining = subscription
      ? Math.max(
          0,
          Math.ceil(
            (subscription.currentPeriodEnd.getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 0;

    return {
      organisationId,
      subscription: subscription as any,
      billingCustomer: billingCustomer as any,
      currentPeriod: {
        periodStart,
        periodEnd,
        daysRemaining,
      },
      meters: meters as any,
      estimatedCurrentChargesMinor: estimatedCharges,
      currency: subscription?.currency || 'AUD',
      creditBalanceMinor: credit.balanceMinor,
      openInvoicesCount: openInvoices.length,
      pastDueAmountMinor,
    };
  }

  /**
   * Retrieves platform-level SaaS MRR, revenue, and health metrics for Superadmins.
   */
  async getSuperadminBillingMetrics(): Promise<SaasSuperadminMetricsDto> {
    const totalOrganisations = await this.prisma.organisation.count();

    const subscriptions = await this.prisma.saasSubscription.findMany({
      include: { plan: true },
    });

    let activeCount = 0;
    let trialCount = 0;
    let pastDueCount = 0;
    let cancelledCount = 0;

    const mrrByCurrency: Record<string, number> = {};
    const arrByCurrency: Record<string, number> = {};
    const planDistribution: Record<string, number> = {};

    for (const sub of subscriptions) {
      planDistribution[sub.plan.name] = (planDistribution[sub.plan.name] || 0) + 1;

      if (sub.status === 'ACTIVE') {
        activeCount++;
        const curr = sub.currency;
        mrrByCurrency[curr] = (mrrByCurrency[curr] || 0) + sub.baseAmountMinor;
        arrByCurrency[curr] = (arrByCurrency[curr] || 0) + sub.baseAmountMinor * 12;
      } else if (sub.status === 'TRIALING') {
        trialCount++;
      } else if (sub.status === 'PAST_DUE') {
        pastDueCount++;
      } else if (['CANCELLED', 'EXPIRED'].includes(sub.status)) {
        cancelledCount++;
      }
    }

    const totalInvoices = await this.prisma.saasInvoice.count();
    const paidInvoices = await this.prisma.saasInvoice.count({
      where: { status: 'PAID' },
    });

    const collectionRate = totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 100;

    const overageLines = await this.prisma.saasInvoiceLine.findMany({
      where: { lineType: 'OVERAGE' },
    });
    const overageRevenue = overageLines.reduce((acc: number, l: { amountMinor: number }) => acc + l.amountMinor, 0);

    const failedCount = await this.prisma.saasInvoice.count({
      where: { status: 'OVERDUE' },
    });

    return {
      mrrByCurrency,
      arrByCurrency,
      activeSubscriptions: activeCount,
      trialSubscriptions: trialCount,
      pastDueSubscriptions: pastDueCount,
      cancelledSubscriptions: cancelledCount,
      totalOrganisations,
      collectionRatePercent: collectionRate,
      planDistribution,
      overageRevenueMinor: overageRevenue,
      failedPaymentsCount: failedCount,
    };
  }

  /**
   * Updates billing contact metadata for an organisation.
   */
  async updateBillingContact(organisationId: string, data: any) {
    let customer = await this.prisma.saasBillingCustomer.findUnique({
      where: { organisationId },
    });

    if (!customer) {
      customer = await this.prisma.saasBillingCustomer.create({
        data: {
          organisationId,
          provider: 'MOCK_SAAS_PROVIDER',
          externalCustomerReference: `cus_saas_${organisationId.substring(0, 10)}`,
          billingEmail: data.billingEmail || 'billing@fitcore.internal',
          billingContactName: data.billingContactName,
          taxIdentifier: data.taxIdentifier,
          country: data.country || 'Australia',
          currency: data.currency || 'AUD',
        },
      });
    } else {
      customer = await this.prisma.saasBillingCustomer.update({
        where: { organisationId },
        data: {
          ...(data.billingEmail ? { billingEmail: data.billingEmail } : {}),
          ...(data.billingContactName ? { billingContactName: data.billingContactName } : {}),
          ...(data.taxIdentifier ? { taxIdentifier: data.taxIdentifier } : {}),
          ...(data.country ? { country: data.country } : {}),
          ...(data.currency ? { currency: data.currency } : {}),
          ...(data.billingAddress ? { billingAddress: data.billingAddress } : {}),
        },
      });
    }

    return customer;
  }
}
