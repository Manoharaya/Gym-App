import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MemberStackParamList } from './types';
import { themeColors } from '../theme';

import { MemberHomeScreen } from '../features/dashboard';
import { WorkoutSessionScreen } from '../features/training';
import { ExerciseDetailScreen, ExerciseLibraryScreen } from '../features/exercises';
import { ProgressScreen } from '../features/progress';
import { NutritionScreen, NutritionCoachScreen } from '../features/nutrition';
import {
  DailyCheckInHomeScreen,
  DailyCheckInQuestionScreen,
  DailyCheckInResultScreen,
  DailyCheckInHistoryScreen,
  DailyCheckInDetailScreen,
} from '../features/check-ins';
import { AICoachScreen } from '../features/ai-coach';
import {
  WearablesScreen,
  WearablesHomeScreen,
  WearableProviderDetailScreen,
  WearableConnectionScreen,
  WearableDataScreen,
  WearableSyncStatusScreen,
  WearablePrivacyScreen,
  WearableIntelligenceScreen,
} from '../features/wearables';
import {
  NotificationsScreen,
  NotificationDetailScreen,
  NotificationPreferencesScreen,
} from '../features/notifications';
import { CommunicationPreferencesScreen } from '../features/communication';
import { ProfileScreen } from '../features/profile';
import { SettingsScreen } from '../features/settings';
import {
  EngagementHomeScreen,
  HabitsScreen,
  ChallengesScreen,
  RewardsScreen,
  MemberEngagementScreen,
} from '../features/engagement';

import {
  MembershipHomeScreen,
  MembershipDetailsScreen,
  MembershipHistoryScreen,
  MembershipPlansScreen,
} from '../features/membership';

import {
  BillingScreen,
  InvoicesScreen,
  InvoiceDetailsScreen,
  PaymentHistoryScreen,
  PaymentDetailsScreen,
  PaymentMethodsScreen,
  AddPaymentMethodScreen,
} from '../features/payments';

import {
  AccessHomeScreen,
  QRCodeScreen,
  CheckInScreen,
  VisitHistoryScreen,
  AccessStatusScreen,
} from '../features/access';

import {
  ClassesScreen,
  ClassDetailsScreen,
  BookingConfirmationScreen,
  MyBookingsScreen,
  BookingDetailScreen,
  WaitlistStatusScreen,
} from '../features/booking';

import {
  ClassCheckInScreen,
  AttendanceConfirmationScreen,
  AttendanceHistoryScreen,
} from '../features/attendance';

import {
  TrainerDirectoryScreen,
  TrainerProfileScreen,
} from '../features/trainer/screens';
import {
  MyTrainerScreen,
  TrainingProgramScreen,
  GoalsScreen,
  TrainerNotesScreen,
} from '../features/personal-training/screens';
import {
  TrainingPlanOverviewScreen,
  TrainingCalendarScreen,
} from '../features/training-plans';

const Stack = createNativeStackNavigator<MemberStackParamList>();

export const MemberNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: themeColors.background },
      }}
    >
      {/* Flagship Member Dashboard */}
      <Stack.Screen name="MemberHome" component={MemberHomeScreen} />

      {/* Workout & Training */}
      <Stack.Screen name="WorkoutSession" component={WorkoutSessionScreen} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
      <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} />

      {/* Class Booking & Scheduling */}
      <Stack.Screen name="Bookings" component={ClassesScreen} />
      <Stack.Screen name="Classes" component={ClassesScreen} />
      <Stack.Screen name="ClassDetails" component={ClassDetailsScreen} />
      <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
      <Stack.Screen name="WaitlistStatus" component={WaitlistStatusScreen} />
      <Stack.Screen name="MyBookings" component={MyBookingsScreen} />

      {/* Analytics, Nutrition & AI */}
      <Stack.Screen name="Progress" component={ProgressScreen} />
      <Stack.Screen name="Nutrition" component={NutritionScreen} />
      <Stack.Screen name="NutritionCoach" component={NutritionCoachScreen} />
      <Stack.Screen name="DailyCheckIn" component={DailyCheckInHomeScreen} />
      <Stack.Screen name="DailyCheckInHome" component={DailyCheckInHomeScreen} />
      <Stack.Screen name="DailyCheckInQuestion" component={DailyCheckInQuestionScreen} />
      <Stack.Screen name="DailyCheckInResult" component={DailyCheckInResultScreen} />
      <Stack.Screen name="DailyCheckInHistory" component={DailyCheckInHistoryScreen} />
      <Stack.Screen name="DailyCheckInDetail" component={DailyCheckInDetailScreen} />
      <Stack.Screen name="AICoach" component={AICoachScreen} />
      <Stack.Screen name="Wearables" component={WearablesScreen} />
      <Stack.Screen name="WearablesHome" component={WearablesHomeScreen} />
      <Stack.Screen name="WearableProviderDetail" component={WearableProviderDetailScreen} />
      <Stack.Screen name="WearableConnection" component={WearableConnectionScreen} />
      <Stack.Screen name="WearableData" component={WearableDataScreen} />
      <Stack.Screen name="WearableSyncStatus" component={WearableSyncStatusScreen} />
      <Stack.Screen name="WearablePrivacy" component={WearablePrivacyScreen} />
      <Stack.Screen name="WearableIntelligence" component={WearableIntelligenceScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="NotificationDetail" component={NotificationDetailScreen} />
      <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
      <Stack.Screen name="CommunicationPreferences" component={CommunicationPreferencesScreen} />

      {/* Profile & Settings */}
      <Stack.Screen name="MemberProfile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />

      {/* Membership & Contracts */}
      <Stack.Screen name="MembershipHome" component={MembershipHomeScreen} />
      <Stack.Screen name="MembershipDetails" component={MembershipDetailsScreen} />
      <Stack.Screen name="MembershipHistory" component={MembershipHistoryScreen} />
      <Stack.Screen name="MembershipPlans" component={MembershipPlansScreen} />

      {/* Billing & Payments */}
      <Stack.Screen name="Billing" component={BillingScreen} />
      <Stack.Screen name="Invoices" component={InvoicesScreen} />
      <Stack.Screen name="InvoiceDetails" component={InvoiceDetailsScreen} />
      <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
      <Stack.Screen name="PaymentDetails" component={PaymentDetailsScreen} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
      <Stack.Screen name="AddPaymentMethod" component={AddPaymentMethodScreen} />

      {/* Physical Door Access & QR */}
      <Stack.Screen name="AccessHome" component={AccessHomeScreen} />
      <Stack.Screen name="QRCode" component={QRCodeScreen} />
      <Stack.Screen name="CheckIn" component={CheckInScreen} />
      <Stack.Screen name="VisitHistory" component={VisitHistoryScreen} />
      <Stack.Screen name="AccessStatus" component={AccessStatusScreen} />

      {/* Class Attendance */}
      <Stack.Screen name="ClassCheckIn" component={ClassCheckInScreen} />
      <Stack.Screen name="AttendanceConfirmation" component={AttendanceConfirmationScreen} />
      <Stack.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} />

      {/* Trainers & Coaches */}
      <Stack.Screen name="TrainerDirectory" component={TrainerDirectoryScreen} />
      <Stack.Screen name="TrainerProfile" component={TrainerProfileScreen} />
      <Stack.Screen name="MyTrainer" component={MyTrainerScreen} />
      <Stack.Screen name="TrainingProgram" component={TrainingProgramScreen} />
      <Stack.Screen name="Goals" component={GoalsScreen} />
      <Stack.Screen name="TrainerNotes" component={TrainerNotesScreen} />

      {/* Day 14: Training Plans & Calendar */}
      <Stack.Screen name="TrainingPlanOverview" component={TrainingPlanOverviewScreen} />
      <Stack.Screen name="TrainingCalendar" component={TrainingCalendarScreen} />

      {/* Day 18 & 25: Engagement & Fitness Momentum */}
      <Stack.Screen name="EngagementHome" component={EngagementHomeScreen} />
      <Stack.Screen name="MemberEngagement" component={MemberEngagementScreen} />
      <Stack.Screen name="Habits" component={HabitsScreen} />
      <Stack.Screen name="HabitsScreen" component={HabitsScreen} />
      <Stack.Screen name="Challenges" component={ChallengesScreen} />
      <Stack.Screen name="ChallengesScreen" component={ChallengesScreen} />
      <Stack.Screen name="Rewards" component={RewardsScreen} />
      <Stack.Screen name="RewardsScreen" component={RewardsScreen} />
    </Stack.Navigator>
  );
};
