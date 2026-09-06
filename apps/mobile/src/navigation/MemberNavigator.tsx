import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MemberStackParamList } from './types';
import { NavigationPlaceholderScreen } from './PlaceholderScreen';
import { themeColors } from '../theme';
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
} from '../features/booking';

const Stack = createNativeStackNavigator<MemberStackParamList>();

export const MemberNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: themeColors.cardBackground },
        headerTintColor: '#FFFFFF',
        contentStyle: { backgroundColor: themeColors.background },
      }}
    >
      <Stack.Screen name="MemberHome" options={{ title: 'Member Dashboard' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Member Experience"
            module="features/dashboard"
            roleScope="MEMBER (SELF)"
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="WorkoutSession" options={{ title: 'Active Workout' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Workout Tracker"
            module="features/training"
            roleScope="MEMBER (SELF)"
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Bookings"
        component={ClassesScreen}
        options={{ title: 'Class Schedule' }}
      />
      <Stack.Screen
        name="ClassDetails"
        component={ClassDetailsScreen}
        options={{ title: 'Class Details' }}
      />
      <Stack.Screen
        name="BookingConfirmation"
        component={BookingConfirmationScreen}
        options={{ title: 'Confirmation', headerBackVisible: false }}
      />
      <Stack.Screen
        name="MyBookings"
        component={MyBookingsScreen}
        options={{ title: 'My Bookings & Waitlist' }}
      />
      <Stack.Screen name="Progress" options={{ title: 'Metrics & Progress' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Progress Analytics"
            module="features/progress"
            roleScope="MEMBER (SELF)"
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="AICoach" options={{ title: 'FitCore AI Coach' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="AI Coaching Chat"
            module="features/ai-coach"
            roleScope="MEMBER (SELF)"
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="MemberProfile" options={{ title: 'My Profile' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Member Profile & Membership"
            module="features/profile"
            roleScope="MEMBER (SELF)"
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="MembershipHome"
        component={MembershipHomeScreen}
        options={{ title: 'Membership & Access' }}
      />
      <Stack.Screen
        name="MembershipDetails"
        component={MembershipDetailsScreen}
        options={{ title: 'Contract Details' }}
      />
      <Stack.Screen
        name="MembershipHistory"
        component={MembershipHistoryScreen}
        options={{ title: 'Membership History' }}
      />
      <Stack.Screen
        name="MembershipPlans"
        component={MembershipPlansScreen}
        options={{ title: 'Available Plans' }}
      />
      <Stack.Screen
        name="Billing"
        component={BillingScreen}
        options={{ title: 'Billing & Payments' }}
      />
      <Stack.Screen
        name="Invoices"
        component={InvoicesScreen}
        options={{ title: 'Invoices' }}
      />
      <Stack.Screen
        name="InvoiceDetails"
        component={InvoiceDetailsScreen}
        options={{ title: 'Invoice Details' }}
      />
      <Stack.Screen
        name="PaymentHistory"
        component={PaymentHistoryScreen}
        options={{ title: 'Payment Receipts' }}
      />
      <Stack.Screen
        name="PaymentDetails"
        component={PaymentDetailsScreen}
        options={{ title: 'Receipt Details' }}
      />
      <Stack.Screen
        name="PaymentMethods"
        component={PaymentMethodsScreen}
        options={{ title: 'Payment Methods' }}
      />
      <Stack.Screen
        name="AddPaymentMethod"
        component={AddPaymentMethodScreen}
        options={{ title: 'Add Card' }}
      />
      <Stack.Screen
        name="AccessHome"
        component={AccessHomeScreen}
        options={{ title: 'Physical Access' }}
      />
      <Stack.Screen
        name="QRCode"
        component={QRCodeScreen}
        options={{ title: 'Digital Pass' }}
      />
      <Stack.Screen
        name="CheckIn"
        component={CheckInScreen}
        options={{ title: 'Check In' }}
      />
      <Stack.Screen
        name="VisitHistory"
        component={VisitHistoryScreen}
        options={{ title: 'Visit History' }}
      />
      <Stack.Screen
        name="AccessStatus"
        component={AccessStatusScreen}
        options={{ title: 'Access Diagnostics' }}
      />
    </Stack.Navigator>
  );
};
