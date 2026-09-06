import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { MembershipsModule } from '../memberships/memberships.module';

import { InvoicesController } from './controllers/invoices.controller';
import { PaymentsController } from './controllers/payments.controller';
import { WebhooksController } from './controllers/webhooks.controller';

import { BillingCalculationService } from './services/billing-calculation.service';
import { MockPaymentProvider } from './providers/mock-payment.provider';
import { ManualPaymentProvider } from './providers/manual-payment.provider';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { IdempotencyService } from './services/idempotency.service';
import { PaymentMembershipBridge } from './services/payment-membership.bridge';
import { PaymentWebhookService } from './services/payment-webhook.service';
import { PaymentMethodService } from './services/payment-method.service';
import { InvoiceService } from './services/invoice.service';
import { PaymentTransactionService } from './services/payment-transaction.service';
import { RefundService } from './services/refund.service';
import { DiscountService } from './services/discount.service';

@Module({
  imports: [DatabaseModule, AuditModule, MembershipsModule],
  controllers: [InvoicesController, PaymentsController, WebhooksController],
  providers: [
    BillingCalculationService,
    MockPaymentProvider,
    ManualPaymentProvider,
    PaymentProviderFactory,
    IdempotencyService,
    PaymentMembershipBridge,
    PaymentWebhookService,
    PaymentMethodService,
    InvoiceService,
    PaymentTransactionService,
    RefundService,
    DiscountService,
  ],
  exports: [
    BillingCalculationService,
    MockPaymentProvider,
    ManualPaymentProvider,
    PaymentProviderFactory,
    IdempotencyService,
    PaymentMembershipBridge,
    PaymentWebhookService,
    PaymentMethodService,
    InvoiceService,
    PaymentTransactionService,
    RefundService,
    DiscountService,
  ],
})
export class PaymentsModule {}
