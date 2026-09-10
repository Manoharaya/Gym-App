/**
 * FitCore — Day 42: Recurring Payment Collection Orchestrator
 *
 * Coordinates recurring payment collection, enforces double-charge protection,
 * invokes Day 6 PaymentTransactionService, and triggers lifecycle/dunning state updates.
 */

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PaymentTransactionService } from '../../payments/services/payment-transaction.service';
import { PaymentMembershipBridge } from '../../payments/services/payment-membership.bridge';
import { BillingScheduleService } from './billing-schedule.service';
import { FailureClassifierService } from './failure-classifier.service';
import { RetryPolicyService } from './retry-policy.service';
import { DunningService } from './dunning.service';
import { AuditService } from '../../audit/audit.service';
import { RECURRING_BILLING_AUDIT } from '../domain/recurring-billing.constants';
import { PaymentAttemptDto } from '@fitcore/types';

@Injectable()
export class RecurringPaymentService {
  private readonly logger = new Logger(RecurringPaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentTransactionService: PaymentTransactionService,
    private readonly membershipBridge: PaymentMembershipBridge,
    private readonly scheduleService: BillingScheduleService,
    private readonly classifierService: FailureClassifierService,
    private readonly retryPolicyService: RetryPolicyService,
    @Inject(forwardRef(() => DunningService))
    private readonly dunningService: DunningService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Collects payment for a billing cycle.
   * Double-charge safe: rejects if already paid, uses deterministic attempt idempotency key.
   */
  async collectPaymentForCycle(
    cycleId: string,
    actorId: string = 'SYSTEM',
  ): Promise<PaymentAttemptDto> {
    // 1. Fetch BillingCycle and Invoice with lock/read
    const cycle = await this.prisma.billingCycle.findUnique({
      where: { id: cycleId },
      include: {
        billingSchedule: true,
        invoice: true,
        memberProfile: true,
      },
    });

    if (!cycle) {
      throw new NotFoundException(`Billing cycle '${cycleId}' not found`);
    }

    if (cycle.status === 'PAID') {
      throw new BadRequestException(`Billing cycle '${cycleId}' is already fully paid`);
    }

    if (!cycle.invoiceId || !cycle.invoice) {
      throw new BadRequestException(`Billing cycle '${cycleId}' has no associated invoice`);
    }

    const schedule = cycle.billingSchedule;

    // 2. Resolve default or schedule payment method
    let paymentMethodId = schedule.paymentMethodId;
    if (!paymentMethodId) {
      const defaultPm = await this.prisma.paymentMethod.findFirst({
        where: {
          organisationId: cycle.organisationId,
          memberProfileId: cycle.memberProfileId,
          status: 'ACTIVE',
          isDefault: true,
        },
      });
      paymentMethodId = defaultPm?.id || null;
    }

    // Determine attempt number
    const attemptCount = await this.prisma.paymentAttempt.count({
      where: { billingCycleId: cycle.id },
    });
    const attemptNumber = attemptCount + 1;

    // 3. Construct deterministic idempotency key
    const idempotencyKey = `rec_attempt_${cycle.id}_${attemptNumber}`;

    // 4. Create PaymentAttempt record in PROCESSING
    const attempt = await this.prisma.paymentAttempt.create({
      data: {
        organisationId: cycle.organisationId,
        billingCycleId: cycle.id,
        invoiceId: cycle.invoiceId,
        attemptNumber,
        status: 'PROCESSING',
      },
    });

    try {
      // 5. Invoke Day 6 PaymentTransactionService
      const tx = await this.paymentTransactionService.processPayment(
        {
          organisationId: cycle.organisationId,
          memberProfileId: cycle.memberProfileId,
          invoiceId: cycle.invoiceId,
          amountMinor: cycle.amountMinor,
          currency: cycle.currency,
          paymentMethodId: paymentMethodId || undefined,
          description: `Subscription payment for Cycle #${cycle.cycleNumber}`,
          idempotencyKey,
        },
        actorId,
      );

      // 6. Handle Payment Result
      if (tx.status === 'SUCCEEDED') {
        // Successful payment handling
        const updatedAttempt = await this.prisma.paymentAttempt.update({
          where: { id: attempt.id },
          data: {
            status: 'SUCCEEDED',
            paymentTransactionId: tx.id,
            providerReference: tx.providerTransactionId,
          },
        });

        // Update BillingCycle to PAID
        await this.prisma.billingCycle.update({
          where: { id: cycle.id },
          data: {
            status: 'PAID',
            processedAt: new Date(),
          },
        });

        // Advance BillingSchedule nextBillingDate and reset failureCount
        const nextDate = this.scheduleService.calculateNextBillingDate(
          schedule.nextBillingDate,
          schedule.billingInterval as any,
          schedule.intervalCount,
        );
        await this.prisma.billingSchedule.update({
          where: { id: schedule.id },
          data: {
            nextBillingDate: nextDate,
            failureCount: 0,
            status: 'ACTIVE',
          },
        });

        // Trigger Day 6 membership lifecycle bridge
        await this.membershipBridge.onInvoicePaid(cycle.invoiceId);

        // Resolve any active dunning case
        await this.dunningService.resolveDunningForCycle(
          cycle.id,
          'PAYMENT_RECOVERED',
          'Payment succeeded via automated recurring collection',
          actorId,
        );

        await this.audit.log({
          action: RECURRING_BILLING_AUDIT.PAYMENT_ATTEMPT_CREATED,
          resource: 'payment_attempt',
          resourceId: updatedAttempt.id,
          organisationId: cycle.organisationId,
          userId: actorId,
          metadata: {
            status: 'SUCCEEDED',
            cycleId: cycle.id,
            amountMinor: cycle.amountMinor,
          },
        });

        return this.mapAttemptToDto(updatedAttempt);
      } else {
        // Failed or Action Required handling
        return await this.handleFailedAttempt(
          attempt.id,
          cycle,
          attemptNumber,
          tx.status,
          tx.failureCode,
          tx.failureMessage,
          tx.id,
          tx.providerTransactionId,
          actorId,
        );
      }
    } catch (err: any) {
      this.logger.error(
        `Error collecting payment for cycle ${cycle.id}: ${err.message}`,
        err.stack,
      );
      return await this.handleFailedAttempt(
        attempt.id,
        cycle,
        attemptNumber,
        'FAILED',
        'PROVIDER_ERROR',
        err.message,
        null,
        null,
        actorId,
      );
    }
  }

  private async handleFailedAttempt(
    attemptId: string,
    cycle: any,
    attemptNumber: number,
    status: any,
    failureCode?: string | null,
    failureMessage?: string | null,
    transactionId?: string | null,
    providerRef?: string | null,
    actorId: string = 'SYSTEM',
  ): Promise<PaymentAttemptDto> {
    const classification = this.classifierService.classify(failureCode, failureMessage);

    // Calculate next retry if retryable
    let nextRetryAt: Date | null = null;
    if (classification.isRetryable) {
      const retryResult = await this.retryPolicyService.calculateNextRetryDate(
        cycle.organisationId,
        attemptNumber,
      );
      if (!retryResult.isExhausted) {
        nextRetryAt = retryResult.nextRetryAt;
      }
    }

    const attemptStatus = status === 'REQUIRES_ACTION' ? 'REQUIRES_ACTION' : 'FAILED';

    const updatedAttempt = await this.prisma.paymentAttempt.update({
      where: { id: attemptId },
      data: {
        status: attemptStatus,
        paymentTransactionId: transactionId,
        failureCode: failureCode || 'UNKNOWN',
        failureCategory: classification.category,
        providerReference: providerRef,
        nextRetryAt,
      },
    });

    // Update BillingCycle status
    await this.prisma.billingCycle.update({
      where: { id: cycle.id },
      data: { status: 'FAILED' },
    });

    // Increment BillingSchedule failureCount
    await this.prisma.billingSchedule.update({
      where: { id: cycle.billingScheduleId },
      data: {
        failureCount: { increment: 1 },
        status: 'PAST_DUE',
      },
    });

    // Initiate or advance dunning workflow
    await this.dunningService.handlePaymentFailure(
      cycle.id,
      cycle.invoiceId,
      cycle.memberProfileId,
      classification.category,
      failureCode || 'FAILED',
      classification.isRetryable,
      nextRetryAt,
      actorId,
    );

    await this.audit.log({
      action: RECURRING_BILLING_AUDIT.PAYMENT_ATTEMPT_CREATED,
      resource: 'payment_attempt',
      resourceId: updatedAttempt.id,
      organisationId: cycle.organisationId,
      userId: actorId,
      metadata: {
        status: attemptStatus,
        cycleId: cycle.id,
        failureCategory: classification.category,
        nextRetryAt,
      },
    });

    return this.mapAttemptToDto(updatedAttempt);
  }

  private mapAttemptToDto(attempt: any): PaymentAttemptDto {
    return {
      id: attempt.id,
      organisationId: attempt.organisationId,
      billingCycleId: attempt.billingCycleId,
      invoiceId: attempt.invoiceId,
      paymentTransactionId: attempt.paymentTransactionId,
      attemptNumber: attempt.attemptNumber,
      attemptedAt: attempt.attemptedAt.toISOString(),
      status: attempt.status as any,
      failureCode: attempt.failureCode,
      failureCategory: attempt.failureCategory as any,
      providerReference: attempt.providerReference,
      nextRetryAt: attempt.nextRetryAt?.toISOString() || null,
      metadata: attempt.metadata as Record<string, any> | null,
      createdAt: attempt.createdAt.toISOString(),
      updatedAt: attempt.updatedAt.toISOString(),
    };
  }
}
