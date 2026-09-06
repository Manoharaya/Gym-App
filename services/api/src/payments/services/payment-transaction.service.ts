import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { PaymentProviderFactory } from '../providers/payment-provider.factory';
import { InvoiceService } from './invoice.service';
import { IdempotencyService } from './idempotency.service';
import { PaymentMethodType, PaymentStatus } from '@fitcore/types';

export interface ProcessPaymentInput {
  organisationId: string;
  memberProfileId: string;
  invoiceId?: string;
  amountMinor: number;
  currency: string;
  paymentMethodId?: string;
  providerPaymentMethodId?: string;
  paymentMethodType?: PaymentMethodType;
  provider?: string;
  description?: string;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}

export interface ProcessManualPaymentInput {
  organisationId: string;
  memberProfileId: string;
  invoiceId: string;
  amountMinor: number;
  currency: string;
  paymentMethodType: PaymentMethodType;
  notes?: string;
  actorId: string;
}

@Injectable()
export class PaymentTransactionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly providerFactory: PaymentProviderFactory,
    private readonly invoiceService: InvoiceService,
    private readonly idempotencyService: IdempotencyService
  ) {}

  async processPayment(input: ProcessPaymentInput, actorId: string) {
    // 1. Idempotency Check
    if (input.idempotencyKey) {
      const existing = await this.idempotencyService.check(
        input.organisationId,
        input.idempotencyKey
      );
      if (existing.isIdempotent) {
        return {
          ...existing.responseBody,
          _isIdempotentReplay: true,
        };
      }
    }

    // 2. Validate Member Profile in Organisation
    const member = await this.prisma.memberProfile.findFirst({
      where: { id: input.memberProfileId, organisationId: input.organisationId },
    });
    if (!member) {
      throw new NotFoundException('Member profile not found in organisation');
    }

    // 3. Validate Invoice if linked
    let invoice: any = null;
    if (input.invoiceId) {
      invoice = await this.invoiceService.getInvoiceById(
        input.organisationId,
        input.invoiceId
      );
      if (invoice.status === 'PAID') {
        throw new BadRequestException('Invoice is already fully paid');
      }
      if (invoice.status === 'VOID') {
        throw new BadRequestException('Cannot pay a voided invoice');
      }
      if (input.amountMinor > invoice.amountDueMinor) {
        throw new BadRequestException(
          `Payment amount (${input.amountMinor}) exceeds remaining invoice balance (${invoice.amountDueMinor})`
        );
      }
    }

    // 4. Resolve Payment Method Token if paymentMethodId provided
    let providerToken = input.providerPaymentMethodId;
    let resolvedMethodType: PaymentMethodType = input.paymentMethodType || 'CARD';

    if (input.paymentMethodId) {
      const pm = await this.prisma.paymentMethod.findFirst({
        where: {
          id: input.paymentMethodId,
          organisationId: input.organisationId,
          memberProfileId: input.memberProfileId,
          status: 'ACTIVE',
        },
      });
      if (!pm) {
        throw new NotFoundException('Payment method not found or inactive');
      }
      providerToken = pm.providerPaymentMethodId;
      resolvedMethodType = pm.type as PaymentMethodType;
    }

    const providerName = input.provider || 'MOCK';
    const provider = this.providerFactory.getProvider(providerName);

    // 5. Execute Charge via Provider Abstraction
    const chargeResult = await provider.charge({
      organisationId: input.organisationId,
      memberProfileId: input.memberProfileId,
      amountMinor: input.amountMinor,
      currency: input.currency.toUpperCase(),
      paymentMethodId: input.paymentMethodId,
      providerPaymentMethodId: providerToken,
      paymentMethodType: resolvedMethodType,
      idempotencyKey: input.idempotencyKey,
      description: input.description,
      metadata: input.metadata,
    });

    // 6. Persist Transaction Record
    const txStatus: PaymentStatus =
      chargeResult.status === 'SUCCEEDED'
        ? 'SUCCEEDED'
        : chargeResult.status === 'REQUIRES_ACTION'
        ? 'REQUIRES_ACTION'
        : 'FAILED';

    const transaction = await this.prisma.$transaction(async (tx) => {
      const createdTx = await tx.paymentTransaction.create({
        data: {
          organisationId: input.organisationId,
          memberProfileId: input.memberProfileId,
          invoiceId: input.invoiceId,
          paymentMethodId: input.paymentMethodId,
          amountMinor: input.amountMinor,
          currency: input.currency.toUpperCase(),
          status: txStatus,
          provider: provider.providerName,
          providerTransactionId: chargeResult.providerTransactionId,
          paymentMethodType: resolvedMethodType,
          description: input.description,
          failureCode: chargeResult.failureCode,
          failureMessage: chargeResult.failureMessage,
          processedAt: txStatus === 'SUCCEEDED' ? new Date() : undefined,
          metadata: {
            ...input.metadata,
            receiptUrl: chargeResult.receiptUrl,
            rawResponse: chargeResult.rawResponse,
          },
        },
      });

      // If succeeded and invoice linked, apply payment to invoice
      if (txStatus === 'SUCCEEDED' && input.invoiceId) {
        await this.invoiceService.applyPayment(input.invoiceId, input.amountMinor, tx);
      }

      return createdTx;
    });

    // 7. Audit Log
    await this.audit.log({
      action: txStatus === 'SUCCEEDED' ? 'PAYMENT_SUCCEEDED' : 'PAYMENT_FAILED',
      resource: 'payment_transaction',
      resourceId: transaction.id,
      organisationId: input.organisationId,
      userId: actorId,
      metadata: {
        amountMinor: transaction.amountMinor,
        currency: transaction.currency,
        status: transaction.status,
        provider: transaction.provider,
        invoiceId: transaction.invoiceId,
      },
    });

    // 8. Record Idempotency Response
    if (input.idempotencyKey) {
      await this.idempotencyService.record(
        input.organisationId,
        input.idempotencyKey,
        'PAYMENT',
        200,
        transaction
      );
    }

    return transaction;
  }

  async processManualPayment(input: ProcessManualPaymentInput) {
    const invoice = await this.invoiceService.getInvoiceById(
      input.organisationId,
      input.invoiceId
    );

    if (invoice.status === 'PAID') {
      throw new BadRequestException('Invoice is already fully paid');
    }
    if (invoice.status === 'VOID') {
      throw new BadRequestException('Cannot pay a voided invoice');
    }
    if (input.amountMinor > invoice.amountDueMinor) {
      throw new BadRequestException(
        `Payment amount (${input.amountMinor}) exceeds remaining invoice balance (${invoice.amountDueMinor})`
      );
    }

    const provider = this.providerFactory.getProvider('MANUAL');
    const chargeResult = await provider.charge({
      organisationId: input.organisationId,
      memberProfileId: input.memberProfileId,
      amountMinor: input.amountMinor,
      currency: input.currency.toUpperCase(),
      paymentMethodType: input.paymentMethodType,
      description: input.notes || `Manual payment for invoice ${invoice.invoiceNumber}`,
    });

    const transaction = await this.prisma.$transaction(async (tx) => {
      const createdTx = await tx.paymentTransaction.create({
        data: {
          organisationId: input.organisationId,
          memberProfileId: input.memberProfileId,
          invoiceId: input.invoiceId,
          amountMinor: input.amountMinor,
          currency: input.currency.toUpperCase(),
          status: 'SUCCEEDED',
          provider: 'MANUAL',
          providerTransactionId: chargeResult.providerTransactionId,
          paymentMethodType: input.paymentMethodType,
          description: input.notes,
          processedAt: new Date(),
          metadata: {
            notes: input.notes,
            recordedByUserId: input.actorId,
            receiptUrl: chargeResult.receiptUrl,
          },
        },
      });

      await this.invoiceService.applyPayment(input.invoiceId, input.amountMinor, tx);

      return createdTx;
    });

    await this.audit.log({
      action: 'MANUAL_PAYMENT_RECORDED',
      resource: 'payment_transaction',
      resourceId: transaction.id,
      organisationId: input.organisationId,
      userId: input.actorId,
      metadata: {
        amountMinor: transaction.amountMinor,
        currency: transaction.currency,
        type: input.paymentMethodType,
        invoiceNumber: invoice.invoiceNumber,
      },
    });

    return transaction;
  }

  async listTransactions(
    organisationId: string,
    filter?: { memberProfileId?: string; status?: string; skip?: number; take?: number }
  ) {
    const where: any = { organisationId };
    if (filter?.memberProfileId) {
      where.memberProfileId = filter.memberProfileId;
    }
    if (filter?.status) {
      where.status = filter.status;
    }

    return this.prisma.paymentTransaction.findMany({
      where,
      include: {
        invoice: true,
        refunds: true,
        paymentMethod: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: filter?.skip || 0,
      take: filter?.take || 50,
    });
  }

  async getTransactionById(
    organisationId: string,
    id: string,
    memberProfileId?: string
  ) {
    const where: any = { id, organisationId };
    if (memberProfileId) {
      where.memberProfileId = memberProfileId;
    }

    const tx = await this.prisma.paymentTransaction.findFirst({
      where,
      include: {
        invoice: { include: { lineItems: true } },
        refunds: true,
        paymentMethod: true,
      },
    });

    if (!tx) {
      throw new NotFoundException(`Payment transaction with ID ${id} not found`);
    }

    return tx;
  }
}
