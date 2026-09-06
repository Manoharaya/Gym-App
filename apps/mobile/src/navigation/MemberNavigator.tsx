import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MemberStackParamList } from './types';
import { themeColors } from '../theme';

import { MemberHomeScreen } from '../features/dashboard';
import { WorkoutSessionScreen } from '../features/training';
import { ExerciseDetailScreen } from '../features/exercises';
import { ProgressScreen } from '../features/progress';
import { NutritionScreen } from '../features/nutrition';
import { DailyCheckInScreen } from '../features/check-ins';
import { AICoachScreen } from '../features/ai-coach';
import { WearablesScreen } from '../features/wearables';
import { NotificationsScreen } from '../features/notifications';
import { ProfileScreen } from '../features/profile';
import { SettingsScreen } from '../features/settings';

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
      <Stack.Screen name="DailyCheckIn" component={DailyCheckInScreen} />
      <Stack.Screen name="AICoach" component={AICoachScreen} />
      <Stack.Screen name="Wearables" component={WearablesScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />

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
    </Stack.Navigator>
  );
};
