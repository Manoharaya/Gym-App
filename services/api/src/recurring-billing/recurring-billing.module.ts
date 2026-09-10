/**
 * FitCore — Day 42: Recurring Billing & Collections Module
 */

import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { PaymentsModule } from '../payments/payments.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { CommunicationModule } from '../communication/communication.module';
import { RedisModule } from '../redis/redis.module';

// Controllers
import { RecurringBillingController } from './controllers/recurring-billing.controller';
import { MemberBillingController } from './controllers/member-billing.controller';

// Services
import { FailureClassifierService } from './services/failure-classifier.service';
import { RetryPolicyService } from './services/retry-policy.service';
import { BillingScheduleService } from './services/billing-schedule.service';
import { BillingCycleService } from './services/billing-cycle.service';
import { RecurringPaymentService } from './services/recurring-payment.service';
import { BillingCommunicationService } from './services/billing-communication.service';
import { DunningService } from './services/dunning.service';
import { CollectionQueueService } from './services/collection-queue.service';
import { RecurringMetricsService } from './services/recurring-metrics.service';

// Jobs
import { DueBillingJob } from './jobs/due-billing.job';
import { PaymentRetryJob } from './jobs/payment-retry.job';
import { DunningStepJob } from './jobs/dunning-step.job';
import { OverdueInvoiceJob } from './jobs/overdue-invoice.job';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    PaymentsModule,
    MembershipsModule,
    forwardRef(() => CommunicationModule),
    RedisModule,
  ],
  controllers: [RecurringBillingController, MemberBillingController],
  providers: [
    FailureClassifierService,
    RetryPolicyService,
    BillingScheduleService,
    BillingCycleService,
    RecurringPaymentService,
    BillingCommunicationService,
    DunningService,
    CollectionQueueService,
    RecurringMetricsService,
    DueBillingJob,
    PaymentRetryJob,
    DunningStepJob,
    OverdueInvoiceJob,
  ],
  exports: [
    FailureClassifierService,
    RetryPolicyService,
    BillingScheduleService,
    BillingCycleService,
    RecurringPaymentService,
    BillingCommunicationService,
    DunningService,
    CollectionQueueService,
    RecurringMetricsService,
    DueBillingJob,
    PaymentRetryJob,
    DunningStepJob,
    OverdueInvoiceJob,
  ],
})
export class RecurringBillingModule {}
