import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { PaymentProviderFactory } from '../providers/payment-provider.factory';
import { MoneyUtil } from '../utils/money.util';

export interface CreateRefundInput {
  organisationId: string;
  paymentTransactionId: string;
  amountMinor: number;
  reason?: string;
  actorId: string;
}

@Injectable()
export class RefundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly providerFactory: PaymentProviderFactory
  ) {}

  async processRefund(input: CreateRefundInput) {
    if (input.amountMinor <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }

    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: {
        id: input.paymentTransactionId,
        organisationId: input.organisationId,
      },
      include: {
        refunds: true,
        invoice: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    if (transaction.status !== 'SUCCEEDED' && transaction.status !== 'PARTIALLY_REFUNDED') {
      throw new BadRequestException(
        `Cannot refund transaction with status ${transaction.status}. Only SUCCEEDED or PARTIALLY_REFUNDED can be refunded.`
      );
    }

    // Calculate total already successfully refunded
    const totalPreviouslyRefunded = transaction.refunds
      .filter((r) => r.status === 'SUCCEEDED')
      .reduce((sum, r) => sum + r.amountMinor, 0);

    const remainingRefundable = MoneyUtil.subtract(
      transaction.amountMinor,
      totalPreviouslyRefunded
    );

    if (input.amountMinor > remainingRefundable) {
      throw new BadRequestException(
        `Refund amount (${input.amountMinor}) exceeds remaining refundable balance (${remainingRefundable})`
      );
    }

    // Call provider refund
    const provider = this.providerFactory.getProvider(transaction.provider);
    const refundResult = await provider.refund({
      providerTransactionId: transaction.providerTransactionId || '',
      amountMinor: input.amountMinor,
      currency: transaction.currency,
      reason: input.reason,
    });

    const isSucceeded = refundResult.status === 'SUCCEEDED';
    const newTotalRefunded = isSucceeded
      ? totalPreviouslyRefunded + input.amountMinor
      : totalPreviouslyRefunded;

    const isFullRefund = newTotalRefunded >= transaction.amountMinor;

    return this.prisma.$transaction(async (tx) => {
      const refundRecord = await tx.paymentRefund.create({
        data: {
          organisationId: input.organisationId,
          paymentTransactionId: transaction.id,
          amountMinor: input.amountMinor,
          currency: transaction.currency,
          status: isSucceeded ? 'SUCCEEDED' : 'FAILED',
          reason: input.reason,
          providerRefundId: refundResult.providerRefundId,
          requestedById: input.actorId,
          processedAt: isSucceeded ? new Date() : undefined,
          metadata: refundResult.failureReason
            ? { failureReason: refundResult.failureReason }
            : {},
        },
      });

      if (isSucceeded) {
        const nextStatus = isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
        await tx.paymentTransaction.update({
          where: { id: transaction.id },
          data: { status: nextStatus },
        });

        if (transaction.invoiceId && transaction.invoice) {
          const inv = transaction.invoice;
          const updatedPaid = Math.max(0, inv.amountPaidMinor - input.amountMinor);
          const updatedDue = Math.min(inv.totalMinor, inv.amountDueMinor + input.amountMinor);
          const updatedStatus = updatedDue > 0 ? 'OPEN' : inv.status;

          await tx.invoice.update({
            where: { id: transaction.invoiceId },
            data: {
              amountPaidMinor: updatedPaid,
              amountDueMinor: updatedDue,
              status: updatedStatus,
            },
          });
        }
      }

      await this.audit.log({
        action: isSucceeded ? 'PAYMENT_REFUNDED' : 'PAYMENT_REFUND_FAILED',
        resource: 'payment_refund',
        resourceId: refundRecord.id,
        organisationId: input.organisationId,
        userId: input.actorId,
        metadata: {
          transactionId: transaction.id,
          amountMinor: input.amountMinor,
          currency: transaction.currency,
          isFullRefund,
          reason: input.reason,
        },
      });

      return refundRecord;
    });
  }

  async listRefunds(organisationId: string, transactionId?: string) {
    const where: any = { organisationId };
    if (transactionId) {
      where.paymentTransactionId = transactionId;
    }

    return this.prisma.paymentRefund.findMany({
      where,
      include: { paymentTransaction: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
