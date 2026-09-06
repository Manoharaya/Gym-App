import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppStackParamList>;
  VerificationShell: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  TenantSelection: undefined;
};

export type MemberStackParamList = {
  MemberHome: undefined;
  WorkoutSession: { workoutId?: string } | undefined;
  ExerciseDetail: { exerciseId: string; exerciseName?: string };
  Bookings: undefined;
  Classes: undefined;
  ClassDetails: { sessionId: string };
  BookingConfirmation: { booking?: any; waitlist?: any; isWaitlisted?: boolean };
  BookingDetail: { bookingId: string };
  WaitlistStatus: { waitlistId?: string; sessionId?: string };
  MyBookings: undefined;
  Progress: undefined;
  Nutrition: undefined;
  DailyCheckIn: undefined;
  AICoach: undefined;
  Wearables: undefined;
  Notifications: undefined;
  MemberProfile: undefined;
  Settings: undefined;
  MembershipHome: undefined;
  MembershipDetails: { membershipId: string };
  MembershipHistory: undefined;
  MembershipPlans: undefined;
  Billing: undefined;
  Invoices: undefined;
  InvoiceDetails: { invoiceId: string };
  PaymentHistory: undefined;
  PaymentDetails: { transactionId: string };
  PaymentMethods: undefined;
  AddPaymentMethod: undefined;
  AccessHome: undefined;
  QRCode: undefined;
  CheckIn: undefined;
  VisitHistory: undefined;
  AccessStatus: undefined;
  ClassCheckIn: { sessionId: string; bookingId?: string };
  AttendanceConfirmation: { attendanceRecord: any };
  AttendanceHistory: undefined;
};

export type TrainerStackParamList = {
  TrainerHome: undefined;
  ClientList: undefined;
  ClientDetail: { clientId: string };
  Schedule: undefined;
  ProgramBuilder: undefined;
};

export type ReceptionStackParamList = {
  ReceptionHome: undefined;
  CheckInScanner: undefined;
  MemberLookup: undefined;
  ClassRoster: { classId: string };
  POSRetail: undefined;
};

export type OutletManagerStackParamList = {
  ManagerHome: undefined;
  FacilityOperations: undefined;
  StaffRoster: undefined;
  AccessControl: undefined;
  OutletReports: undefined;
};

export type FinanceStackParamList = {
  FinanceHome: undefined;
  Invoices: undefined;
  PaymentRuns: undefined;
  XeroSync: undefined;
  FinancialReports: undefined;
};

export type OrganisationOwnerStackParamList = {
  OwnerHome: undefined;
  OutletsOverview: undefined;
  RevenueAnalytics: undefined;
  ExecutiveReports: undefined;
  OrganisationSettings: undefined;
};

export type AppStackParamList = {
  MemberFlow: NavigatorScreenParams<MemberStackParamList>;
  TrainerFlow: NavigatorScreenParams<TrainerStackParamList>;
  ReceptionFlow: NavigatorScreenParams<ReceptionStackParamList>;
  OutletManagerFlow: NavigatorScreenParams<OutletManagerStackParamList>;
  FinanceFlow: NavigatorScreenParams<FinanceStackParamList>;
  OrganisationOwnerFlow: NavigatorScreenParams<OrganisationOwnerStackParamList>;
  VerificationShell: undefined;
};
