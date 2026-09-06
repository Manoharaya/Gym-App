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
  WorkoutSession: { workoutId: string };
  Bookings: undefined;
  Progress: undefined;
  AICoach: undefined;
  MemberProfile: undefined;
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
