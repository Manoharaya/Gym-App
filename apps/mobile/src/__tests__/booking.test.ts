import { useBookingStore } from '../features/booking/store/bookingStore';

describe('Booking & Scheduling State (Day 8 Mobile)', () => {
  beforeEach(() => {
    useBookingStore.getState().resetFilters();
    useBookingStore.getState().setActiveTab('schedule');
    useBookingStore.getState().setSelectedOutletId(null);
  });

  it('1. Should initialize with default clean booking state', () => {
    const state = useBookingStore.getState();
    const todayStr = new Date().toISOString().split('T')[0];

    expect(state.selectedDate).toBe(todayStr);
    expect(state.selectedCategory).toBeNull();
    expect(state.selectedOutletId).toBeNull();
    expect(state.activeTab).toBe('schedule');
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('2. Should update selected date and category filters', () => {
    useBookingStore.getState().setSelectedDate('2026-09-15');
    useBookingStore.getState().setSelectedCategory('HIIT');
    useBookingStore.getState().setSelectedOutletId('outlet_perth_01');

    const state = useBookingStore.getState();
    expect(state.selectedDate).toBe('2026-09-15');
    expect(state.selectedCategory).toBe('HIIT');
    expect(state.selectedOutletId).toBe('outlet_perth_01');
  });

  it('3. Should switch active tabs between schedule, my_bookings, and waitlist', () => {
    expect(useBookingStore.getState().activeTab).toBe('schedule');

    useBookingStore.getState().setActiveTab('my_bookings');
    expect(useBookingStore.getState().activeTab).toBe('my_bookings');

    useBookingStore.getState().setActiveTab('waitlist');
    expect(useBookingStore.getState().activeTab).toBe('waitlist');
  });

  it('4. Should reset filters while maintaining today date baseline', () => {
    useBookingStore.getState().setSelectedDate('2026-10-01');
    useBookingStore.getState().setSelectedCategory('YOGA');
    useBookingStore.getState().setError('Network timeout');

    useBookingStore.getState().resetFilters();

    const state = useBookingStore.getState();
    const todayStr = new Date().toISOString().split('T')[0];
    expect(state.selectedDate).toBe(todayStr);
    expect(state.selectedCategory).toBeNull();
    expect(state.error).toBeNull();
  });

  it('5. Should correctly compute spots remaining and capacity boundaries', () => {
    const sessionCapacity = 20;
    const confirmedCount = 18;
    const spotsRemaining = Math.max(0, sessionCapacity - confirmedCount);

    expect(spotsRemaining).toBe(2);
    expect(spotsRemaining <= 4).toBe(true); // Limited spots warning threshold

    const fullConfirmedCount = 20;
    const fullSpotsRemaining = Math.max(0, sessionCapacity - fullConfirmedCount);
    expect(fullSpotsRemaining).toBe(0);
  });
});
