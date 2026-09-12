import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MockSaasBillingProvider } from '../providers/mock-saas-billing.provider';
import { MoneyUtil } from '../../payments/utils/money.util';

@Injectable()
export class SaasInvoicesService {
  private readonly logger = new Logger(SaasInvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: MockSaasBillingProvider,
  ) {}

  /**
   * Finalizes an open billing period:
   * 1. Snapshots usage aggregates
   * 2. Calculates base subscription + metered overages - credits
   * 3. Creates immutable SaasInvoice and lines
   * 4. Collects payment via provider
   * 5. Advances billing period
   */
  async finalizePeriodAndGenerateInvoice(subscriptionId: string) {
    const sub = await this.prisma.saasSubscription.findUnique({
      where: { id: subscriptionId },
      include: {
        plan: true,
        planVersion: {
          include: {
            entitlements: {
              include: { entitlement: true },
            },
          },
        },
        organisation: true,
      },
    });

    if (!sub) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    const customer = await this.prisma.saasBillingCustomer.findUnique({
      where: { organisationId: sub.organisationId },
    });

    // 1. Fetch unfinalized aggregates for this subscription's period
    const aggregates = await this.prisma.saasUsageAggregate.findMany({
      where: {
        organisationId: sub.organisationId,
        periodStart: { gte: sub.currentPeriodStart },
        periodEnd: { lte: sub.currentPeriodEnd },
        isFinalized: false,
      },
    });

    const invNumber = `INV-SAAS-${Date.now().toString().slice(-6)}`;
    const lineItemsData: any[] = [];

    // Base Plan Line
    lineItemsData.push({
      lineType: 'BASE_PLAN',
      description: `${sub.plan.name} Subscription (${sub.billingInterval})`,
      quantity: 1,
      unitPriceMinor: sub.baseAmountMinor,
      amountMinor: sub.baseAmountMinor,
      currency: sub.currency,
      periodStart: sub.currentPeriodStart,
      periodEnd: sub.currentPeriodEnd,
    });

    let overageTotalMinor = 0;

    // Evaluate overages
    for (const pe of sub.planVersion.entitlements) {
      if (!pe.overageAllowed || !pe.overageUnitMinor || pe.overageUnitMinor <= 0) {
        continue;
      }
      const meterKey = pe.entitlement.meterKey || pe.entitlement.code;
      const strippedKey = meterKey.replace(/_LIMIT$/, '');
      const agg = aggregates.find(
        (a) => a.meterKey === meterKey || a.meterKey === strippedKey,
      );
      const used = agg?.quantity || 0;
      if (used > pe.includedAllowance) {
        const overage = used - pe.includedAllowance;
        const batches = pe.overageBatchSize > 0 ? Math.ceil(overage / pe.overageBatchSize) : overage;
        const lineAmount = batches * pe.overageUnitMinor;
        overageTotalMinor = MoneyUtil.add(overageTotalMinor, lineAmount);

        lineItemsData.push({
          lineType: 'OVERAGE',
          description: `${pe.entitlement.name} overage (${overage} units)`,
          quantity: batches,
          unitPriceMinor: pe.overageUnitMinor,
          amountMinor: lineAmount,
          currency: sub.currency,
          meterKey,
          periodStart: sub.currentPeriodStart,
          periodEnd: sub.currentPeriodEnd,
        });
      }
    }

    const subtotalMinor = MoneyUtil.add(sub.baseAmountMinor, overageTotalMinor);

    // Apply available credit balance if any
    let discountMinor = 0;
    const credit = await this.prisma.saasCreditBalance.findUnique({
      where: { organisationId: sub.organisationId },
    });

    let creditToApply = 0;
    if (credit && credit.balanceMinor > 0) {
      creditToApply = Math.min(credit.balanceMinor, subtotalMinor);
      discountMinor = creditToApply;
      if (creditToApply > 0) {
        lineItemsData.push({
          lineType: 'CREDIT',
          description: 'Account Credit Applied',
          quantity: 1,
          unitPriceMinor: -creditToApply,
          amountMinor: -creditToApply,
          currency: sub.currency,
        });
      }
    }

    const totalMinor = MoneyUtil.subtract(subtotalMinor, discountMinor);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Invoice
      const invoice = await tx.saasInvoice.create({
        data: {
          organisationId: sub.organisationId,
          subscriptionId: sub.id,
          invoiceNumber: invNumber,
          status: 'OPEN',
          currency: sub.currency,
          subtotalMinor,
          discountMinor,
          totalMinor,
          amountPaidMinor: 0,
          amountDueMinor: totalMinor,
          periodStart: sub.currentPeriodStart,
          periodEnd: sub.currentPeriodEnd,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Net 14
        },
      });

      // 2. Create Invoice Lines
      for (const line of lineItemsData) {
        await tx.saasInvoiceLine.create({
          data: {
            invoiceId: invoice.id,
            ...line,
          },
        });
      }

      // 3. Mark aggregates finalized
      await tx.saasUsageAggregate.updateMany({
        where: {
          organisationId: sub.organisationId,
          periodStart: { gte: sub.currentPeriodStart },
          periodEnd: { lte: sub.currentPeriodEnd },
        },
        data: { isFinalized: true, finalizedAt: new Date() },
      });

      // 4. Update Credit balance if applied
      if (creditToApply > 0 && credit) {
        const newBal = credit.balanceMinor - creditToApply;
        await tx.saasCreditBalance.update({
          where: { organisationId: sub.organisationId },
          data: { balanceMinor: newBal },
        });

        await tx.saasCreditTransaction.create({
          data: {
            creditBalanceId: credit.id,
            type: 'APPLIED',
            amountMinor: -creditToApply,
            balanceAfterMinor: newBal,
            reason: `Applied to SaaS Invoice ${invoice.invoiceNumber}`,
            invoiceId: invoice.id,
          },
        });
      }

      // 5. Attempt Payment Collection via Provider
      let isPaid = false;
      if (customer && totalMinor > 0) {
        const payRes = await this.provider.collectInvoicePayment({
          providerCustomerReference: customer.externalCustomerReference,
          amountMinor: totalMinor,
          currency: sub.currency,
          invoiceNumber: invoice.invoiceNumber,
        });

        if (payRes.status === 'SUCCEEDED') {
          isPaid = true;
          await tx.saasInvoice.update({
            where: { id: invoice.id },
            data: {
              status: 'PAID',
              amountPaidMinor: totalMinor,
              amountDueMinor: 0,
              paidAt: new Date(),
            },
          });
        }
      } else if (totalMinor === 0) {
        isPaid = true;
        await tx.saasInvoice.update({
          where: { id: invoice.id },
          data: {
            status: 'PAID',
            amountPaidMinor: 0,
            amountDueMinor: 0,
            paidAt: new Date(),
          },
        });
      }

      // 6. Advance Billing Period
      const nextStart = new Date(sub.currentPeriodEnd);
      const nextEnd = new Date(nextStart);
      nextEnd.setMonth(nextEnd.getMonth() + 1);

      await tx.saasSubscription.update({
        where: { id: sub.id },
        data: {
          status: isPaid ? 'ACTIVE' : 'PAST_DUE',
          currentPeriodStart: nextStart,
          currentPeriodEnd: nextEnd,
        },
      });

      await tx.saasBillingPeriod.create({
        data: {
          subscriptionId: sub.id,
          organisationId: sub.organisationId,
          periodStart: nextStart,
          periodEnd: nextEnd,
          status: 'OPEN',
        },
      });

      return tx.saasInvoice.findUnique({
        where: { id: invoice.id },
        include: { lines: true },
      });
    });
  }

  /**
   * Retrieves invoices for an organisation.
   */
  async listInvoices(organisationId: string) {
    return this.prisma.saasInvoice.findMany({
      where: { organisationId },
      include: { lines: true },
      orderBy: { issuedAt: 'desc' },
    });
  }

  /**
   * Retrieves single invoice by ID.
   */
  async getInvoice(id: string, organisationId?: string) {
    const where: any = { id };
    if (organisationId) where.organisationId = organisationId;

    const inv = await this.prisma.saasInvoice.findFirst({
      where,
      include: { lines: true, subscription: { include: { plan: true } } },
    });

    if (!inv) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    return inv;
  }
}
