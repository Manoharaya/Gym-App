import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ClassCheckInScreen } from '../features/attendance/screens/ClassCheckInScreen';
import { AttendanceConfirmationScreen } from '../features/attendance/screens/AttendanceConfirmationScreen';
import { AttendanceHistoryScreen } from '../features/attendance/screens/AttendanceHistoryScreen';
import { ClassRosterScreen } from '../features/reception/screens/ClassRosterScreen';

// Mock navigation
const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockGoBack = jest.fn();

let mockRouteParams: any = { sessionId: 'sess_1', classId: 'sess_1' };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    replace: mockReplace,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

// Mock hooks
const mockCheckInMutate = jest.fn().mockResolvedValue({
  id: 'att_1',
  status: 'CHECKED_IN',
  checkedInAt: '2026-09-07T10:00:00Z',
  classSessionId: 'sess_1',
  memberProfileId: 'mem_1',
});

const mockCheckOutMutate = jest.fn().mockResolvedValue({
  id: 'att_1',
  status: 'COMPLETED',
  durationMinutes: 45,
});

jest.mock('../features/booking/hooks/useBooking', () => ({
  useClassSession: () => ({
    data: {
      id: 'sess_1',
      startsAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 mins from now -> check-in open
      endsAt: new Date(Date.now() + 55 * 60 * 1000).toISOString(),
      capacity: 20,
      classType: { name: 'HIIT Circuit', category: 'FUNCTIONAL' },
      outlet: { name: 'Sydney CBD' },
      trainer: { firstName: 'Marcus', lastName: 'Vance' },
      resource: { name: 'Studio A' },
    },
    isLoading: false,
  }),
}));

jest.mock('../features/attendance/hooks/useAttendance', () => ({
  useCheckInMutation: () => ({
    mutateAsync: mockCheckInMutate,
    isPending: false,
  }),
  useCheckOutMutation: () => ({
    mutateAsync: mockCheckOutMutate,
    isPending: false,
  }),
  useRecordWalkInMutation: () => ({
    mutateAsync: jest.fn().mockResolvedValue({ id: 'att_walkin' }),
    isPending: false,
  }),
  useCorrectAttendanceMutation: () => ({
    mutateAsync: jest.fn().mockResolvedValue({ id: 'att_corr' }),
    isPending: false,
  }),
  useSubstituteTrainerMutation: () => ({
    mutateAsync: jest.fn().mockResolvedValue({ id: 'sess_1' }),
    isPending: false,
  }),
  useProcessNoShowsMutation: () => ({
    mutateAsync: jest.fn().mockResolvedValue({ processedCount: 1, skippedCount: 0 }),
    isPending: false,
  }),
  useTrainerCheckInMutation: () => ({
    mutateAsync: jest.fn().mockResolvedValue({ id: 'sess_1' }),
    isPending: false,
  }),
  useTrainerCheckOutMutation: () => ({
    mutateAsync: jest.fn().mockResolvedValue({ id: 'sess_1' }),
    isPending: false,
  }),
  useMyAttendance: () => ({
    data: [
      {
        id: 'att_past_1',
        status: 'COMPLETED',
        checkInMethod: 'MEMBER_SELF_SERVICE',
        durationMinutes: 45,
        lateMinutes: 0,
        createdAt: '2026-09-06T10:00:00Z',
        classSession: {
          id: 'sess_past',
          startsAt: '2026-09-06T10:00:00Z',
          endsAt: '2026-09-06T10:45:00Z',
          classType: { name: 'Power Yoga' },
          outlet: { name: 'Sydney CBD' },
        },
      },
    ],
    isLoading: false,
    refetch: jest.fn(),
    isRefetching: false,
  }),
  useSessionRoster: () => ({
    data: {
      session: {
        id: 'sess_1',
        startsAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        endsAt: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
        capacity: 20,
        classType: { name: 'HIIT Circuit' },
        outlet: { name: 'Sydney CBD' },
        trainer: { firstName: 'Marcus', lastName: 'Vance' },
        trainerAttendanceStatus: 'CHECKED_IN',
        trainerCheckedInAt: '2026-09-07T09:50:00Z',
        resource: { name: 'Studio A' },
      },
      summary: {
        capacity: 20,
        confirmedBookingsCount: 15,
        waitlistCount: 2,
        walkInsCount: 1,
        totalOccupied: 16,
        spotsRemaining: 4,
        bookedUtilisation: 75,
        actualUtilisation: 60,
        checkedInCount: 12,
        noShowCount: 1,
      },
      roster: [
        {
          memberProfileId: 'mem_1',
          memberName: 'Alice Member',
          email: 'alice@example.com',
          status: 'RESERVED',
          isWalkIn: false,
          lateMinutes: 0,
          isOverride: false,
        },
        {
          memberProfileId: 'mem_2',
          memberName: 'Bob CheckedIn',
          email: 'bob@example.com',
          status: 'CHECKED_IN',
          isWalkIn: false,
          checkedInAt: '2026-09-07T09:55:00Z',
          lateMinutes: 0,
          isOverride: false,
          attendanceId: 'att_bob',
        },
        {
          memberProfileId: 'mem_3',
          memberName: 'Charlie WalkIn',
          email: 'charlie@example.com',
          status: 'CHECKED_IN',
          isWalkIn: true,
          checkedInAt: '2026-09-07T10:02:00Z',
          lateMinutes: 2,
          isOverride: true,
          overrideReason: 'Admitted by manager',
          attendanceId: 'att_charlie',
        },
      ],
      waitlist: [
        {
          bookingId: 'bk_wl_1',
          memberProfileId: 'mem_wl',
          memberName: 'David Waitlisted',
          email: 'david@example.com',
          waitlistPosition: 1,
        },
      ],
      walkIns: [],
    },
    isLoading: false,
    refetch: jest.fn(),
  }),
}));

describe('Day 10 - Attendance & Operations Mobile Flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders ClassCheckInScreen and triggers member self check-in', async () => {
    mockRouteParams = { sessionId: 'sess_1' };
    const { getByText, getByTestId } = render(<ClassCheckInScreen />);

    expect(getByText('Class Check-In')).toBeTruthy();
    expect(getByText('HIIT Circuit')).toBeTruthy();
    expect(getByText('Studio A')).toBeTruthy();
    expect(getByText(/Check-in is open! Class starts in/)).toBeTruthy();

    const checkInBtn = getByTestId('check-in-button');
    expect(checkInBtn).toBeTruthy();

    fireEvent.press(checkInBtn);
    expect(mockCheckInMutate).toHaveBeenCalledWith({
      sessionId: 'sess_1',
      payload: { method: 'MEMBER_SELF_SERVICE' },
    });
  });

  it('renders AttendanceConfirmationScreen with success pass details', () => {
    mockRouteParams = {
      attendanceRecord: {
        id: 'att_1',
        classSessionId: 'sess_1',
        status: 'CHECKED_IN',
        checkedInAt: '2026-09-07T10:00:00Z',
        durationMinutes: null,
        lateMinutes: 0,
        classSession: {
          classType: { name: 'HIIT Circuit' },
          resource: { name: 'Studio A' },
          trainer: { firstName: 'Marcus', lastName: 'Vance' },
        },
      },
    };

    const { getByText } = render(<AttendanceConfirmationScreen />);
    expect(getByText("You're Checked In!")).toBeTruthy();
    expect(getByText('HIIT Circuit')).toBeTruthy();
    expect(getByText('Studio A')).toBeTruthy();
  });

  it('renders AttendanceHistoryScreen with past attendance logs', () => {
    const { getByText } = render(<AttendanceHistoryScreen />);
    expect(getByText('Attendance History')).toBeTruthy();
    expect(getByText('Power Yoga')).toBeTruthy();
    expect(getByText('45 mins')).toBeTruthy();
  });

  it('renders ClassRosterScreen with live operational KPIs and roster actions', () => {
    mockRouteParams = { classId: 'sess_1' };
    const { getByText, getByTestId } = render(<ClassRosterScreen />);

    // Live KPIs
    expect(getByText('OCCUPANCY')).toBeTruthy();
    expect(getByText('16/20')).toBeTruthy();
    expect(getByText('75% Booked')).toBeTruthy();
    expect(getByText('CHECKED IN')).toBeTruthy();
    expect(getByText('12')).toBeTruthy();
    expect(getByText('WAITLIST')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();

    // Roster members
    expect(getByText('Alice Member')).toBeTruthy();
    expect(getByText('Bob CheckedIn')).toBeTruthy();
    expect(getByText('Charlie WalkIn')).toBeTruthy();
    expect(getByText('WALK-IN')).toBeTruthy();

    // Toolbar buttons
    expect(getByTestId('admit-walkin-button')).toBeTruthy();
    expect(getByTestId('process-noshows-button')).toBeTruthy();
  });
});
