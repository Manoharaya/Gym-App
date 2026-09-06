import React from 'react';
import { render } from '@testing-library/react-native';
import { BookingDetailScreen } from '../features/booking/screens/BookingDetailScreen';
import { WaitlistStatusScreen } from '../features/booking/screens/WaitlistStatusScreen';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: { bookingId: 'booking_123', waitlistId: 'wl_456' },
  }),
}));

// Mock booking hooks
const mockCancelMutateAsync = jest.fn().mockResolvedValue({ id: 'booking_123', status: 'CANCELLED' });

jest.mock('../features/booking/hooks/useBooking', () => ({
  useMyBookings: () => ({
    data: [
      {
        id: 'booking_123',
        status: 'CONFIRMED',
        createdAt: '2026-09-07T08:00:00Z',
        isLateCancellation: false,
        classSession: {
          id: 'session_789',
          name: 'Apex HIIT Circuit',
          startsAt: '2026-09-08T09:00:00Z',
          endsAt: '2026-09-08T09:45:00Z',
          capacity: 16,
          isOverride: true,
          outlet: { name: 'Perth CBD Flagship', code: 'SW-PERTH-CBD' },
          classType: { name: 'HIIT Conditioning', category: 'HIIT' },
          trainer: { firstName: 'Sarah', lastName: 'Connor' },
          resource: { name: 'Studio Alpha', type: 'STUDIO' },
        },
      },
    ],
    isLoading: false,
  }),
  useMyWaitlists: () => ({
    data: [
      {
        id: 'wl_456',
        position: 1,
        status: 'PENDING',
        bookingId: 'booking_123',
        classSessionId: 'session_789',
        createdAt: '2026-09-07T08:30:00Z',
        offerExpiresAt: '2026-09-07T10:30:00Z',
        classSession: {
          id: 'session_789',
          name: 'Apex HIIT Circuit',
          startsAt: '2026-09-08T09:00:00Z',
          endsAt: '2026-09-08T09:45:00Z',
          capacity: 16,
          outlet: { name: 'Perth CBD Flagship' },
          trainer: { firstName: 'Sarah', lastName: 'Connor' },
        },
      },
    ],
    isLoading: false,
  }),
  useCancelBooking: () => ({
    mutateAsync: mockCancelMutateAsync,
    isPending: false,
  }),
}));

describe('Day 9 Advanced Booking Screens (Mobile Flow)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. Renders BookingDetailScreen with session, trainer, room, and pass information', () => {
    const { getByText } = render(<BookingDetailScreen />);

    expect(getByText('Apex HIIT Circuit')).toBeTruthy();
    expect(getByText('Studio Alpha')).toBeTruthy();
    expect(getByText('Perth CBD Flagship')).toBeTruthy();
    expect(getByText('CONFIRMED')).toBeTruthy();
    expect(getByText('Cancel Booking')).toBeTruthy();
  });

  it('2. Shows modified/override badge on BookingDetailScreen when isOverride is true', () => {
    const { getByText } = render(<BookingDetailScreen />);
    expect(getByText('SCHEDULE OVERRIDE')).toBeTruthy();
  });

  it('3. Renders WaitlistStatusScreen with real-time queue position and advice', () => {
    const { getByText } = render(<WaitlistStatusScreen />);

    expect(getByText('In Queue for Confirmation')).toBeTruthy();
    expect(getByText('HIGH PROBABILITY OF SPOT')).toBeTruthy();
    expect(getByText('Apex HIIT Circuit')).toBeTruthy();
    expect(getByText('HOW FITCORE WAITLIST WORKS')).toBeTruthy();
    expect(getByText('Leave Waitlist Queue')).toBeTruthy();
  });
});
