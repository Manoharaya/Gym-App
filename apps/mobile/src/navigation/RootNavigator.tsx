import React from 'react';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { MemberNavigator } from './MemberNavigator';
import { TrainerNavigator } from './TrainerNavigator';
import { ReceptionNavigator } from './ReceptionNavigator';
import { OutletManagerNavigator } from './OutletManagerNavigator';
import { FinanceNavigator } from './FinanceNavigator';
import { OrganisationOwnerNavigator } from './OrganisationOwnerNavigator';
import { OnboardingNavigator } from '../features/onboarding';
import { AppShell } from '../app/AppShell';

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['http://localhost:8081', 'fitcore://'],
  config: {
    screens: {
      VerificationShell: '',
      MemberFlow: {
        path: 'member',
        screens: {
          MemberHome: '',
          WorkoutSession: 'workout',
          ExerciseDetail: 'exercise',
          Bookings: 'bookings',
          Classes: 'classes',
          ClassDetails: 'class-details',
          Progress: 'progress',
          Nutrition: 'nutrition',
          DailyCheckIn: 'check-in',
          AICoach: 'ai-coach',
          Wearables: 'wearables',
          Notifications: 'notifications',
          MemberProfile: 'profile',
          Settings: 'settings',
          MembershipHome: 'membership',
          MembershipPlans: 'membership-plans',
          Billing: 'billing',
          Invoices: 'invoices',
          PaymentHistory: 'payments',
          PaymentMethods: 'payment-methods',
          AccessHome: 'access',
          QRCode: 'qr',
          AttendanceHistory: 'attendance',
          ClassCheckIn: 'class-checkin',
        },
      },
      TrainerFlow: 'trainer',
      ReceptionFlow: 'reception',
      OutletManagerFlow: 'manager',
      FinanceFlow: 'finance',
      OrganisationOwnerFlow: 'owner',
      OnboardingFlow: 'onboarding',
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
        },
      },
      App: 'app',
    },
  },
};

export const RootNavigator: React.FC = () => {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Day 1 Entry Shell is default entry experience for verification */}
        <Stack.Screen name="VerificationShell" component={AppShell} />
        <Stack.Screen name="MemberFlow" component={MemberNavigator} />
        <Stack.Screen name="TrainerFlow" component={TrainerNavigator} />
        <Stack.Screen name="ReceptionFlow" component={ReceptionNavigator} />
        <Stack.Screen name="OutletManagerFlow" component={OutletManagerNavigator} />
        <Stack.Screen name="FinanceFlow" component={FinanceNavigator} />
        <Stack.Screen name="OrganisationOwnerFlow" component={OrganisationOwnerNavigator} />
        <Stack.Screen name="OnboardingFlow">
          {() => <OnboardingNavigator onComplete={() => {}} />}
        </Stack.Screen>
        <Stack.Screen name="Auth" component={AuthNavigator} />
        <Stack.Screen name="App" component={AppNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

