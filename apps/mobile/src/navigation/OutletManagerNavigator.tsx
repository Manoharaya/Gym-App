import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OutletManagerStackParamList } from './types';
import { NavigationPlaceholderScreen } from './PlaceholderScreen';
import { themeColors } from '../theme';

const Stack = createNativeStackNavigator<OutletManagerStackParamList>();

export const OutletManagerNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: themeColors.cardBackground },
        headerTintColor: '#FFFFFF',
        contentStyle: { backgroundColor: themeColors.background },
      }}
    >
      <Stack.Screen name="ManagerHome" options={{ title: 'Branch Operations' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Outlet Dashboard"
            module="features/dashboard"
            roleScope="OUTLET_MANAGER (OUTLET)"
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="FacilityOperations" options={{ title: 'Facility Status' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Doors & Equipment"
            module="features/access"
            roleScope="OUTLET_MANAGER (OUTLET)"
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="StaffRoster" options={{ title: 'Staff Roster' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Trainer & Front Desk Roster"
            module="features/trainer"
            roleScope="OUTLET_MANAGER (OUTLET)"
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="OutletReports" options={{ title: 'Branch Performance' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Attendance & Utilization"
            module="features/dashboard"
            roleScope="OUTLET_MANAGER (OUTLET)"
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};
