import { create } from 'zustand';

export type BookingTab = 'schedule' | 'my_bookings' | 'waitlist';

interface BookingStoreState {
  selectedDate: string;
  selectedOutletId: string | null;
  selectedCategory: string | null;
  activeTab: BookingTab;
  isLoading: boolean;
  error: string | null;

  setSelectedDate: (date: string) => void;
  setSelectedOutletId: (outletId: string | null) => void;
  setSelectedCategory: (category: string | null) => void;
  setActiveTab: (tab: BookingTab) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetFilters: () => void;
}

const getTodayString = (): string => new Date().toISOString().split('T')[0] ?? '';

export const useBookingStore = create<BookingStoreState>((set) => ({
  selectedDate: getTodayString(),
  selectedOutletId: null,
  selectedCategory: null,
  activeTab: 'schedule',
  isLoading: false,
  error: null,

  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setSelectedOutletId: (selectedOutletId) => set({ selectedOutletId }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  resetFilters: () =>
    set({
      selectedDate: getTodayString(),
      selectedCategory: null,
      error: null,
    }),
}));
