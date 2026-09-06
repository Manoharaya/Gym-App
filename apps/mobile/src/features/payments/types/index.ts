import {
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  PaymentTransaction,
  PaymentStatus,
  PaymentMethod,
  PaymentMethodType,
  PaymentRefund,
} from '@fitcore/types';

export type {
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  PaymentTransaction,
  PaymentStatus,
  PaymentMethod,
  PaymentMethodType,
  PaymentRefund,
};

export interface PaymentsState {
  invoices: Invoice[];
  currentInvoice: Invoice | null;
  transactions: PaymentTransaction[];
  currentTransaction: PaymentTransaction | null;
  paymentMethods: PaymentMethod[];
  isLoading: boolean;
  error: string | null;
}

export interface ChargeRequestPayload {
  invoiceId?: string;
  memberProfileId: string;
  amountMinor: number;
  currency: string;
  paymentMethodId?: string;
  providerPaymentMethodId?: string;
  paymentMethodType?: PaymentMethodType;
  idempotencyKey?: string;
}

export interface AddPaymentMethodPayload {
  memberProfileId: string;
  type: PaymentMethodType;
  provider: string;
  providerPaymentMethodId: string;
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault?: boolean;
}
