import { apiClient } from '../../../services/api/apiClient';
import type {
  Invoice,
  PaymentTransaction,
  PaymentMethod,
  ChargeRequestPayload,
  AddPaymentMethodPayload,
} from '../types';

export const paymentService = {
  /**
   * Fetches the member's invoice history.
   */
  async getMyInvoices(): Promise<Invoice[]> {
    const res = await apiClient.get<Invoice[]>('/members/me/invoices');
    const data = res.data as any;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  },

  /**
   * Fetches specific invoice details with line items and transactions.
   */
  async getMyInvoiceById(id: string): Promise<Invoice> {
    const res = await apiClient.get<Invoice>(`/members/me/invoices/${id}`);
    const data = res.data as any;
    return (data?.data || data) as Invoice;
  },

  /**
   * Fetches payment transaction history for member.
   */
  async getMyPayments(): Promise<PaymentTransaction[]> {
    const res = await apiClient.get<PaymentTransaction[]>('/members/me/payments');
    const data = res.data as any;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  },

  /**
   * Fetches a specific payment transaction receipt.
   */
  async getMyPaymentById(id: string): Promise<PaymentTransaction> {
    const res = await apiClient.get<PaymentTransaction>(`/members/me/payments/${id}`);
    const data = res.data as any;
    return (data?.data || data) as PaymentTransaction;
  },

  /**
   * Fetches saved tokenized payment methods for member.
   */
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const res = await apiClient.get<PaymentMethod[]>('/payment-methods');
    const data = res.data as any;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  },

  /**
   * Saves a tokenized payment method (Zero PAN/CVV).
   */
  async addPaymentMethod(payload: AddPaymentMethodPayload): Promise<PaymentMethod> {
    const res = await apiClient.post<PaymentMethod>('/payment-methods', payload);
    const data = res.data as any;
    return (data?.data || data) as PaymentMethod;
  },

  /**
   * Sets default payment method.
   */
  async setDefaultPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
    const res = await apiClient.patch<PaymentMethod>(`/payment-methods/${paymentMethodId}/default`, {});
    const data = res.data as any;
    return (data?.data || data) as PaymentMethod;
  },

  /**
   * Removes a saved payment method.
   */
  async removePaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
    const res = await apiClient.delete<PaymentMethod>(`/payment-methods/${paymentMethodId}`);
    const data = res.data as any;
    return (data?.data || data) as PaymentMethod;
  },

  /**
   * Processes a charge against an invoice.
   */
  async chargePayment(payload: ChargeRequestPayload): Promise<PaymentTransaction> {
    const headers: Record<string, string> = {};
    if (payload.idempotencyKey) {
      headers['idempotency-key'] = payload.idempotencyKey;
    }

    const res = await apiClient.post<PaymentTransaction>('/payments/charge', payload, {
      headers,
    });
    const data = res.data as any;
    return (data?.data || data) as PaymentTransaction;
  },
};
