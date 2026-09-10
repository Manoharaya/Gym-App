/**
 * FitCore — Day 43: Accounting Normalizer Service
 *
 * Normalizes FitCore authoritative financial and customer entities into
 * provider-neutral payloads while strictly enforcing health data privacy.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ExternalCustomerInput,
  ExternalInvoiceInput,
  ExternalPaymentInput,
  ExternalRefundInput,
} from '../domain/accounting-provider.interface';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AccountingNormalizerService {
  private readonly logger = new Logger(AccountingNormalizerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normalizes member profile into an external customer contact.
   * STRICT PRIVACY GUARD: Excludes PAR-Q, injuries, medical clearances,
   * wearable stats, private notes, and AI conversations.
   */
  async normalizeCustomer(
    organisationId: string,
    memberProfileId: string,
  ): Promise<ExternalCustomerInput> {
    const profile = await this.prisma.memberProfile.findUnique({
      where: { id: memberProfileId },
      include: {
        user: true,
        memberOutlets: {
          include: { outlet: true },
          take: 1,
        },
      },
    });

    if (!profile) {
      throw new Error(`MemberProfile '${memberProfileId}' not found`);
    }

    const user = profile.user;
    const outlet = profile.memberOutlets?.[0]?.outlet;

    // Sanitized billing address from member profile or home outlet
    const address = {
      street: outlet?.address || '1 Main St',
      city: outlet?.city || 'Sydney',
      state: outlet?.state || 'NSW',
      postalCode: outlet?.postalCode || '2000',
      country: outlet?.country || 'Australia',
    };

    return {
      fitcoreMemberId: profile.id,
      firstName: user.firstName || 'Member',
      lastName: user.lastName || profile.id.substring(0, 6),
      email: user.email,
      phone: user.phone || undefined,
      address,
    };
  }

  /**
   * Normalizes a FitCore invoice into external invoice input,
   * resolving revenue account codes and tax codes from mappings.
   */
  async normalizeInvoice(
    organisationId: string,
    invoiceId: string,
    externalCustomerId: string,
  ): Promise<ExternalInvoiceInput> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        lineItems: true,
        memberMembership: true,
      },
    });

    if (!invoice) {
      throw new Error(`Invoice '${invoiceId}' not found`);
    }

    // Retrieve active mappings for organisation
    const mappings = await this.prisma.accountingMapping.findMany({
      where: { organisationId, status: 'ACTIVE' },
    });

    const taxMappings = await this.prisma.accountingTaxMapping.findMany({
      where: { organisationId, status: 'ACTIVE' },
    });

    const defaultRevenueAcc =
      mappings.find((m) => m.mappingType === 'REVENUE_ACCOUNT' || m.mappingType === 'MEMBERSHIP_REVENUE_ACCOUNT')
        ?.externalReference || '200';

    const defaultTaxId = taxMappings[0]?.externalTaxIdentifier || 'OUTPUT';

    const lineItems = invoice.lineItems.map((li) => {
      // Find category specific mapping if applicable
      const categoryMapping = mappings.find(
        (m) => m.fitcoreReference === 'MEMBERSHIP_PAYMENT' || m.fitcoreReference === 'CLASS',
      );

      return {
        description: li.description || 'Gym Membership Services',
        quantity: li.quantity || 1,
        unitAmountMinor: li.unitAmountMinor,
        totalMinor: li.totalMinor,
        accountCode: categoryMapping?.externalReference || defaultRevenueAcc,
        taxIdentifier: defaultTaxId,
      };
    });

    return {
      fitcoreInvoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      externalCustomerId,
      currency: invoice.currency,
      issueDate: invoice.issuedAt,
      dueDate: invoice.dueDate,
      subtotalMinor: invoice.subtotalMinor,
      taxMinor: invoice.taxMinor,
      totalMinor: invoice.totalMinor,
      lineItems: lineItems.length > 0 ? lineItems : [
        {
          description: invoice.description || 'Fitness Membership Fee',
          quantity: 1,
          unitAmountMinor: invoice.totalMinor,
          totalMinor: invoice.totalMinor,
          accountCode: defaultRevenueAcc,
          taxIdentifier: defaultTaxId,
        },
      ],
    };
  }

  /**
   * Normalizes a FitCore payment transaction into external payment input.
   */
  async normalizePayment(
    organisationId: string,
    paymentTransactionId: string,
    externalInvoiceId: string,
    externalCustomerId: string,
  ): Promise<ExternalPaymentInput> {
    const tx = await this.prisma.paymentTransaction.findUnique({
      where: { id: paymentTransactionId },
    });

    if (!tx) {
      throw new Error(`PaymentTransaction '${paymentTransactionId}' not found`);
    }

    const clearingMapping = await this.prisma.accountingMapping.findFirst({
      where: {
        organisationId,
        mappingType: 'PAYMENT_ACCOUNT',
        status: 'ACTIVE',
      },
    });

    return {
      fitcorePaymentId: tx.id,
      externalInvoiceId,
      externalCustomerId,
      amountMinor: tx.amountMinor,
      currency: tx.currency,
      paidAt: tx.processedAt || tx.createdAt,
      paymentMethodType: tx.paymentMethodType,
      clearingAccountCode: clearingMapping?.externalReference || '090',
      reference: tx.providerTransactionId,
    };
  }

  /**
   * Normalizes a FitCore refund into external refund input.
   */
  async normalizeRefund(
    organisationId: string,
    refundId: string,
    externalInvoiceId: string,
    externalCustomerId: string,
  ): Promise<ExternalRefundInput> {
    const ref = await this.prisma.paymentRefund.findUnique({
      where: { id: refundId },
    });

    if (!ref) {
      throw new Error(`PaymentRefund '${refundId}' not found`);
    }

    const refundMapping = await this.prisma.accountingMapping.findFirst({
      where: {
        organisationId,
        mappingType: 'REFUND_ACCOUNT',
        status: 'ACTIVE',
      },
    });

    return {
      fitcoreRefundId: ref.id,
      fitcorePaymentId: ref.paymentTransactionId,
      externalInvoiceId,
      externalCustomerId,
      amountMinor: ref.amountMinor,
      currency: ref.currency,
      refundedAt: ref.processedAt || ref.createdAt,
      reason: ref.reason || 'Customer refund',
      refundAccountCode: refundMapping?.externalReference || '200',
    };
  }
}
