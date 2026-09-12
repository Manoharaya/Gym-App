export interface CreateCustomerRequest {
  organisationId: string;
  billingEmail: string;
  billingContactName?: string;
  currency: string;
  metadata?: Record<string, any>;
}

export interface CustomerResult {
  providerCustomerReference: string;
  status: string;
  rawResponse?: Record<string, any>;
}

export interface CreateSubscriptionRequest {
  providerCustomerReference: string;
  planCode: string;
  planVersion: number;
  baseAmountMinor: number;
  currency: string;
  billingInterval: string;
  trialDays?: number;
}

export interface SubscriptionResult {
  providerSubscriptionReference: string;
  status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  rawResponse?: Record<string, any>;
}

export interface InvoicePaymentRequest {
  providerCustomerReference: string;
  amountMinor: number;
  currency: string;
  invoiceNumber: string;
  description?: string;
}

export interface PaymentResult {
  providerPaymentReference: string;
  status: 'SUCCEEDED' | 'PENDING' | 'REQUIRES_ACTION' | 'FAILED';
  amountMinor: number;
  currency: string;
  failureMessage?: string;
  rawResponse?: Record<string, any>;
}

export interface SaasWebhookPayload {
  eventId: string;
  eventType: string;
  provider: string;
  resourceId?: string;
  data: Record<string, any>;
}

export interface ISaasBillingProvider {
  readonly providerName: string;

  createCustomer(request: CreateCustomerRequest): Promise<CustomerResult>;

  createSubscription(request: CreateSubscriptionRequest): Promise<SubscriptionResult>;

  cancelSubscription(providerSubscriptionReference: string, immediate: boolean): Promise<{ success: boolean; status: string }>;

  collectInvoicePayment(request: InvoicePaymentRequest): Promise<PaymentResult>;

  verifyWebhook(headers: Record<string, any>, rawBody: string | Buffer): Promise<{ isValid: boolean; event: SaasWebhookPayload | null; error?: string }>;
}
