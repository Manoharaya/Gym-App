/**
 * Day 32 — Mobile AI Receptionist Booking Tests
 */

import { ReceptionistService } from '../features/ai-receptionist/receptionistService';
import { apiClient } from '../services/api/apiClient';

jest.mock('../services/api/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

describe('Day 32: Mobile AI Receptionist Booking Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('searches class availability with filters', async () => {
    const mockAvailability = {
      totalFound: 1,
      sessions: [
        {
          sessionId: 'session_1',
          className: 'Morning HIIT',
          outletName: 'Downtown',
          startsAt: '2026-09-09T07:00:00.000Z',
          capacity: 20,
          confirmedBookingCount: 12,
          spotsRemaining: 8,
          waitlistCount: 0,
          status: 'AVAILABLE',
        },
      ],
    };

    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockAvailability });

    const res = await ReceptionistService.getAvailability({
      className: 'HIIT',
      timeRange: 'MORNING',
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      '/ai/receptionist/booking/availability?className=HIIT&timeRange=MORNING',
    );
    expect(res.totalFound).toBe(1);
    expect(res.sessions[0].spotsRemaining).toBe(8);
  });

  it('fetches member upcoming bookings', async () => {
    const mockBookings = [
      {
        id: 'booking_1',
        status: 'CONFIRMED',
        classSession: {
          name: 'Morning HIIT',
          startsAt: '2026-09-09T07:00:00.000Z',
        },
      },
    ];

    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockBookings });

    const res = await ReceptionistService.getMyBookings(true);
    expect(apiClient.get).toHaveBeenCalledWith(
      '/ai/receptionist/booking/my-bookings?upcomingOnly=true',
    );
    expect(res.length).toBe(1);
    expect(res[0].status).toBe('CONFIRMED');
  });

  it('fetches single booking details with policy', async () => {
    const mockDetails = {
      booking: { id: 'booking_1', status: 'CONFIRMED' },
      cancellationPolicy: { canCancel: true, policyWindowHours: 2 },
    };

    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockDetails });

    const res = await ReceptionistService.getBookingDetails('booking_1');
    expect(apiClient.get).toHaveBeenCalledWith('/ai/receptionist/booking/bookings/booking_1');
    expect(res.cancellationPolicy.canCancel).toBe(true);
  });

  it('creates two-step confirmation state token', async () => {
    const mockConfirmation = {
      id: 'conf_state_1',
      confirmationToken: 'conf_token_123',
      action: 'CREATE_BOOKING',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 600000).toISOString(),
    };

    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockConfirmation });

    const res = await ReceptionistService.createBookingConfirmation({
      classSessionId: 'session_1',
      action: 'CREATE_BOOKING',
      conversationId: 'conv_1',
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/ai/receptionist/booking/confirmations/create',
      expect.objectContaining({ action: 'CREATE_BOOKING' }),
    );
    expect(res.confirmationToken).toBe('conf_token_123');
  });

  it('executes confirmed booking with token', async () => {
    const mockResult = {
      bookingId: 'booking_new',
      status: 'CONFIRMED',
      className: 'Morning HIIT',
    };

    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockResult });

    const res = await ReceptionistService.executeBookingConfirmation({
      confirmationToken: 'conf_token_123',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/ai/receptionist/booking/confirmations/execute', {
      confirmationToken: 'conf_token_123',
    });
    expect(res.status).toBe('CONFIRMED');
  });

  it('cancels booking using confirmation token', async () => {
    const mockCancelled = {
      bookingId: 'booking_1',
      status: 'CANCELLED',
      message: 'Your booking has been successfully cancelled.',
    };

    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockCancelled });

    const res = await ReceptionistService.cancelBooking({
      confirmationToken: 'cancel_token_123',
      reason: 'Schedule conflict',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/ai/receptionist/booking/cancel', {
      confirmationToken: 'cancel_token_123',
      reason: 'Schedule conflict',
    });
    expect(res.status).toBe('CANCELLED');
  });

  it('reschedules booking atomically using confirmation token', async () => {
    const mockRescheduled = {
      oldBookingId: 'booking_old',
      newBookingId: 'booking_new',
      status: 'CONFIRMED',
    };

    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockRescheduled });

    const res = await ReceptionistService.rescheduleBooking({
      confirmationToken: 'reschedule_token_123',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/ai/receptionist/booking/reschedule', {
      confirmationToken: 'reschedule_token_123',
    });
    expect(res.status).toBe('CONFIRMED');
  });

  it('joins session waitlist using confirmation token', async () => {
    const mockWaitlisted = {
      bookingId: 'booking_wl',
      status: 'WAITLISTED',
      waitlistPosition: 2,
    };

    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockWaitlisted });

    const res = await ReceptionistService.joinWaitlist({
      confirmationToken: 'wl_token_123',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/ai/receptionist/booking/waitlist', {
      confirmationToken: 'wl_token_123',
    });
    expect(res.status).toBe('WAITLISTED');
  });

  it('simulates zero-side-effect dry-run evaluation', async () => {
    const mockDryRun = {
      identityStatus: 'VERIFIED',
      availabilityStatus: 'AVAILABLE',
      eligibilityStatus: 'ELIGIBLE',
      confirmationRequired: true,
      proposedAction: 'CREATE_BOOKING',
      productionSideEffect: 'NONE',
      reasons: ['Member has active Unlimited Tier membership with group class entitlements.'],
    };

    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockDryRun });

    const res = await ReceptionistService.dryRunBooking({
      classSessionId: 'session_1',
      memberProfileId: 'member_1',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/ai/receptionist/booking/dry-run', {
      classSessionId: 'session_1',
      memberProfileId: 'member_1',
    });
    expect(res.productionSideEffect).toBe('NONE');
    expect(res.eligibilityStatus).toBe('ELIGIBLE');
  });

  it('fetches booking funnel telemetry metrics', async () => {
    const mockMetrics = {
      availabilitySearches: 150,
      bookingAttempts: 45,
      confirmedBookings: 42,
      cancellations: 4,
      reschedules: 2,
      waitlistJoins: 5,
      conversionFunnel: {
        conversations: 200,
        searches: 150,
        confirmations: 48,
        completedBookings: 42,
      },
    };

    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockMetrics });

    const res = await ReceptionistService.getBookingMetrics();
    expect(apiClient.get).toHaveBeenCalledWith('/ai/receptionist/booking/metrics');
    expect(res.confirmedBookings).toBe(42);
    expect(res.conversionFunnel.completedBookings).toBe(42);
  });
});
