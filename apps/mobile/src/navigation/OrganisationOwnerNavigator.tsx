import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OrganisationOwnerStackParamList } from './types';
import { NavigationPlaceholderScreen } from './PlaceholderScreen';
import { themeColors } from '../theme';

const Stack = createNativeStackNavigator<OrganisationOwnerStackParamList>();

export const OrganisationOwnerNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: themeColors.cardBackground },
        headerTintColor: '#FFFFFF',
        contentStyle: { backgroundColor: themeColors.background },
      }}
    >
      <Stack.Screen name="OwnerHome" options={{ title: 'Executive Overview' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Multi-Branch Performance"
            module="features/dashboard"
            roleScope="ORGANISATION_OWNER (ORGANISATION)"
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="OutletsOverview" options={{ title: 'Outlets' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Branch Network Management"
            module="features/dashboard"
            roleScope="ORGANISATION_OWNER (ORGANISATION)"
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="OrganisationSettings" options={{ title: 'Organisation Settings' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Brand & Multi-tenant Config"
            module="features/settings"
            roleScope="ORGANISATION_OWNER (ORGANISATION)"
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};
