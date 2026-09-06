import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AppStackParamList } from './types';
import { useTenant } from '../providers/TenantProvider';
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
 * based strictly on tenant role and permissions.
 * Staff navigation is completely isolated and never exposed to members.
 */
export const AppNavigator: React.FC = () => {
  const { role } = useTenant();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Day 1 Verification Shell route */}
      <Stack.Screen name="VerificationShell" component={AppShell} />

      {/* Role-scoped subnavigators */}
      {role === 'MEMBER' && (
        <Stack.Screen name="MemberFlow">
          {() => (
            <OnboardingGuard>
              <MemberNavigator />
            </OnboardingGuard>
          )}
        </Stack.Screen>
      )}

      {role === 'TRAINER' && <Stack.Screen name="TrainerFlow" component={TrainerNavigator} />}

      {role === 'RECEPTION' && <Stack.Screen name="ReceptionFlow" component={ReceptionNavigator} />}

      {role === 'OUTLET_MANAGER' && (
        <Stack.Screen name="OutletManagerFlow" component={OutletManagerNavigator} />
      )}

      {role === 'FINANCE' && <Stack.Screen name="FinanceFlow" component={FinanceNavigator} />}

      {role === 'ORGANISATION_OWNER' && (
        <Stack.Screen name="OrganisationOwnerFlow" component={OrganisationOwnerNavigator} />
      )}
    </Stack.Navigator>
  );
};
