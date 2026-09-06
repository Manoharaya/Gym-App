import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AppStackParamList } from './types';
import { MemberNavigator } from './MemberNavigator';
import { TrainerNavigator } from './TrainerNavigator';
import { ReceptionNavigator } from './ReceptionNavigator';
import { OutletManagerNavigator } from './OutletManagerNavigator';
import { FinanceNavigator } from './FinanceNavigator';
import { OrganisationOwnerNavigator } from './OrganisationOwnerNavigator';
import { OnboardingGuard } from '../features/onboarding';
import { AppShell } from '../app/AppShell';

const Stack = createNativeStackNavigator<AppStackParamList>();

/**
 * AppNavigator routes the authenticated user to the appropriate sub-navigator
 * with full support for role-based navigation and instant preview.
 */
export const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Day 1 Verification Shell route */}
      <Stack.Screen name="VerificationShell" component={AppShell} />

      {/* Role-scoped subnavigators */}
      <Stack.Screen name="MemberFlow">
        {() => (
          <OnboardingGuard>
            <MemberNavigator />
          </OnboardingGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="TrainerFlow" component={TrainerNavigator} />
      <Stack.Screen name="ReceptionFlow" component={ReceptionNavigator} />
      <Stack.Screen name="OutletManagerFlow" component={OutletManagerNavigator} />
      <Stack.Screen name="FinanceFlow" component={FinanceNavigator} />
      <Stack.Screen name="OrganisationOwnerFlow" component={OrganisationOwnerNavigator} />
    </Stack.Navigator>
  );
};
