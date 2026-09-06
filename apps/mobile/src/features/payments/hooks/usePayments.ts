import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '../services/paymentService';
import type { ChargeRequestPayload, AddPaymentMethodPayload } from '../types';

export const PAYMENT_KEYS = {
  all: ['payments'] as const,
  invoices: () => [...PAYMENT_KEYS.all, 'invoices'] as const,
  invoiceDetails: (id: string) => [...PAYMENT_KEYS.all, 'invoices', id] as const,
  transactions: () => [...PAYMENT_KEYS.all, 'transactions'] as const,
  transactionDetails: (id: string) => [...PAYMENT_KEYS.all, 'transactions', id] as const,
  methods: () => [...PAYMENT_KEYS.all, 'methods'] as const,
};

export const useInvoices = () => {
  return useQuery({
    queryKey: PAYMENT_KEYS.invoices(),
    queryFn: () => paymentService.getMyInvoices(),
    staleTime: 1000 * 60 * 3, // 3 minutes
  });
};

export const useInvoiceDetails = (invoiceId: string) => {
  return useQuery({
    queryKey: PAYMENT_KEYS.invoiceDetails(invoiceId),
    queryFn: () => paymentService.getMyInvoiceById(invoiceId),
    enabled: Boolean(invoiceId),
  });
};

export const usePaymentHistory = () => {
  return useQuery({
    queryKey: PAYMENT_KEYS.transactions(),
    queryFn: () => paymentService.getMyPayments(),
    staleTime: 1000 * 60 * 3,
  });
};

export const usePaymentDetails = (transactionId: string) => {
  return useQuery({
    queryKey: PAYMENT_KEYS.transactionDetails(transactionId),
    queryFn: () => paymentService.getMyPaymentById(transactionId),
    enabled: Boolean(transactionId),
  });
};

export const usePaymentMethods = () => {
  return useQuery({
    queryKey: PAYMENT_KEYS.methods(),
    queryFn: () => paymentService.getPaymentMethods(),
    staleTime: 1000 * 60 * 5,
  });
};

export const useAddPaymentMethod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddPaymentMethodPayload) => paymentService.addPaymentMethod(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.methods() });
    },
  });
};

export const useSetDefaultPaymentMethod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => paymentService.setDefaultPaymentMethod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.methods() });
    },
  });
};

export const useRemovePaymentMethod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => paymentService.removePaymentMethod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.methods() });
    },
  });
};

export const useChargeInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ChargeRequestPayload) => paymentService.chargePayment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
    },
  });
};
