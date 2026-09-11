/**
 * FitCore — Day 48: Integration Normalized Domain Events
 */

import { IntegrationNormalizedEventType } from '@fitcore/types';

export interface IntegrationNormalizedEvent<T = any> {
  eventId: string;
  provider: string;
  connectionId?: string;
  organisationId?: string;
  outletId?: string;
  eventType: IntegrationNormalizedEventType;
  payload: T;
  rawPayload?: any;
  timestamp: Date;
  version: string;
  idempotencyKey: string;
}

export interface PaymentSucceededPayload {
  paymentId: string;
  amountMinor: number;
  currency: string;
  customerId?: string;
  paymentMethodType?: string;
  receiptUrl?: string;
  externalTransactionId: string;
}

export interface InvoicePaidPayload {
  invoiceId: string;
  externalInvoiceId: string;
  amountMinor: number;
  currency: string;
  paidAt: Date;
}

export interface MessageDeliveredPayload {
  messageId: string;
  externalMessageId: string;
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH';
  deliveredAt: Date;
  recipient: string;
}

export interface AccessDeviceEventPayload {
  deviceId: string;
  externalDeviceId: string;
  eventType: 'ENTRY_GRANTED' | 'ENTRY_DENIED' | 'DEVICE_OFFLINE' | 'DEVICE_ONLINE';
  timestamp: Date;
  memberId?: string;
}
