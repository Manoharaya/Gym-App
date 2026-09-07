import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList> | undefined;
  App: NavigatorScreenParams<AppStackParamList> | undefined;
  VerificationShell: undefined;
  MemberFlow: NavigatorScreenParams<MemberStackParamList> | undefined;
  TrainerFlow: NavigatorScreenParams<TrainerStackParamList> | undefined;
  ReceptionFlow: NavigatorScreenParams<ReceptionStackParamList> | undefined;
  OutletManagerFlow: NavigatorScreenParams<OutletManagerStackParamList> | undefined;
  FinanceFlow: NavigatorScreenParams<FinanceStackParamList> | undefined;
  OrganisationOwnerFlow: NavigatorScreenParams<OrganisationOwnerStackParamList> | undefined;
  OnboardingFlow: undefined;
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
  NotificationDetail: { notificationId: string };
  NotificationPreferences: undefined;
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
  TrainerDirectory: undefined;
  TrainerProfile: { trainerId: string };
  MyTrainer: undefined;
  TrainingProgram: { programId?: string; memberProfileId?: string } | undefined;
  Goals: { memberProfileId?: string } | undefined;
  TrainerNotes: { memberProfileId?: string } | undefined;
  ExerciseLibrary: undefined;
  TrainingPlanOverview: { planId?: string } | undefined;
  TrainingCalendar: { planId?: string } | undefined;
  EngagementHome: undefined;
  Habits: undefined;
  HabitsScreen: undefined;
  Challenges: undefined;
  ChallengesScreen: undefined;
  Rewards: undefined;
  RewardsScreen: undefined;
};

export type TrainerStackParamList = {
  TrainerHome: undefined;
  TrainerDirectory: undefined;
  TrainerProfile: { trainerId?: string } | undefined;
  TrainerClients: { trainerId?: string } | undefined;
  TrainerClientDetail: { memberProfileId: string; clientName?: string; clientEmail?: string; assignmentId?: string };
  ClientList: undefined;
  ClientDetail: { clientId: string };
  Schedule: undefined;
  ProgramBuilder: undefined;
  TrainingProgram: { programId?: string; memberProfileId?: string } | undefined;
  Goals: { memberProfileId?: string } | undefined;
  TrainerNotes: { memberProfileId?: string } | undefined;
  ExerciseLibrary: undefined;
  ExerciseDetail: { exerciseId: string; exerciseName?: string };
  TrainerWorkouts: { memberProfileId?: string } | undefined;
  CreateWorkout: { memberProfileId?: string } | undefined;
  TrainerProgramming: { memberProfileId?: string; programId?: string; planId?: string } | undefined;
  WorkoutPreview: { workoutId: string };
  TrainingCalendar: { planId?: string; memberProfileId?: string } | undefined;
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
  StaffDirectory: undefined;
  StaffRoster: undefined;
  TrainerDirectory: undefined;
  TrainerProfile: { trainerId?: string } | undefined;
  TrainerClients: { trainerId?: string } | undefined;
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
  StaffDirectory: undefined;
  TrainerDirectory: undefined;
  TrainerProfile: { trainerId?: string } | undefined;
  TrainerClients: { trainerId?: string } | undefined;
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
