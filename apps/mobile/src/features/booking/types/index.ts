import type {
  ClassCategory,
  ClassSessionStatus,
  BookingStatus,
  WaitlistStatus,
  ResourceType,
  BookingDenialReason,
  ClassType,
  ClassTemplate,
  BookingPolicy,
  Resource,
  ClassSession,
  Booking,
  WaitlistEntry,
  TrainerAvailability,
  RecurringSchedule,
  BookingEligibilityResult,
} from '@fitcore/types';

export type {
  ClassCategory,
  ClassSessionStatus,
  BookingStatus,
  WaitlistStatus,
  ResourceType,
  BookingDenialReason,
  ClassType,
  ClassTemplate,
  BookingPolicy,
  Resource,
  ClassSession,
  Booking,
  WaitlistEntry,
  TrainerAvailability,
  RecurringSchedule,
  BookingEligibilityResult,
};

export interface BookingState {
  selectedDate: string;
  selectedOutletId: string | null;
  selectedCategory: string | null;
  activeBookings: Booking[];
  waitlists: WaitlistEntry[];
  isLoading: boolean;
  error: string | null;
}
