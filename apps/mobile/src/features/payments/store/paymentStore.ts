import { create } from 'zustand';

interface PaymentsUIState {
  invoiceFilter: 'ALL' | 'OPEN' | 'PAID';
  selectedInvoiceId: string | null;
  selectedTransactionId: string | null;
  isProcessingPayment: boolean;

  setInvoiceFilter: (filter: 'ALL' | 'OPEN' | 'PAID') => void;
  setSelectedInvoiceId: (id: string | null) => void;
  setSelectedTransactionId: (id: string | null) => void;
  setIsProcessingPayment: (val: boolean) => void;
}

export const usePaymentStore = create<PaymentsUIState>((set) => ({
  invoiceFilter: 'ALL',
  selectedInvoiceId: null,
  selectedTransactionId: null,
  isProcessingPayment: false,

  setInvoiceFilter: (filter) => set({ invoiceFilter: filter }),
  setSelectedInvoiceId: (id) => set({ selectedInvoiceId: id }),
  setSelectedTransactionId: (id) => set({ selectedTransactionId: id }),
  setIsProcessingPayment: (val) => set({ isProcessingPayment: val }),
}));
