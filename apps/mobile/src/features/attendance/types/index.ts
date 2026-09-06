export type AttendanceStatus =
  | 'EXPECTED'
  | 'CHECKED_IN'
  | 'LATE'
  | 'LEFT_EARLY'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'CANCELLED'
  | 'EXCUSED'
  | 'WALK_IN';

export type ClassCheckInMethod =
  | 'STAFF'
  | 'MEMBER_SELF_SERVICE'
  | 'QR'
  | 'ACCESS_EVENT'
  | 'KIOSK'
  | 'MANUAL'
  | 'SYSTEM';

export type TrainerAttendanceStatus =
  | 'PENDING'
  | 'CHECKED_IN'
  | 'SUBSTITUTE'
  | 'COMPLETED'
  | 'NO_SHOW';

export interface AttendanceRecord {
  id: string;
  organisationId: string;
  outletId: string;
  classSessionId: string;
  memberProfileId: string;
  bookingId?: string | null;
  status: AttendanceStatus;
  checkInMethod: ClassCheckInMethod;
  checkOutMethod?: ClassCheckInMethod | null;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  lateMinutes?: number;
  durationMinutes?: number | null;
  markedByUserId?: string | null;
  isOverride: boolean;
  overrideReason?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  classSession?: {
    id: string;
    startsAt: string;
    endsAt: string;
    status: string;
    classType: {
      id: string;
      name: string;
      category?: string;
    };
    outlet: {
      id: string;
      name: string;
      code?: string;
    };
    trainer?: {
      id: string;
      firstName: string;
      lastName: string;
    };
    resource?: {
      id: string;
      name: string;
      type: string;
    };
  };
  memberProfile?: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
    };
  };
}

export interface RosterItem {
  memberProfileId: string;
  bookingId?: string | null;
  attendanceId?: string | null;
  memberName: string;
  email: string;
  phone?: string;
  status: string;
  isWalkIn: boolean;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  lateMinutes: number;
  durationMinutes?: number | null;
  checkInMethod?: string | null;
  isOverride: boolean;
  overrideReason?: string | null;
  notes?: string | null;
}

export interface RosterSummary {
  capacity: number;
  confirmedBookingsCount: number;
  waitlistCount: number;
  walkInsCount: number;
  totalOccupied: number;
  spotsRemaining: number;
  bookedUtilisation: number;
  actualUtilisation: number;
  checkedInCount: number;
  noShowCount: number;
}

export interface SessionRosterResponse {
  session: any;
  summary: RosterSummary;
  roster: RosterItem[];
  waitlist: any[];
  walkIns: any[];
}
