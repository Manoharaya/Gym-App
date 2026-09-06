import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ReceptionStackParamList } from './types';
import { NavigationPlaceholderScreen } from './PlaceholderScreen';
import { themeColors } from '../theme';

const Stack = createNativeStackNavigator<ReceptionStackParamList>();

export const ReceptionNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: themeColors.cardBackground },
        headerTintColor: '#FFFFFF',
        contentStyle: { backgroundColor: themeColors.background },
      }}
    >
      <Stack.Screen name="ReceptionHome" options={{ title: 'Reception Desk' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Front Desk Overview"
            module="features/reception"
            roleScope="RECEPTION (OUTLET)"
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="CheckInScanner" options={{ title: 'Access & QR Check-in' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Member Entry Scanner"
            module="features/access"
            roleScope="RECEPTION (OUTLET)"
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="MemberLookup" options={{ title: 'Member Directory' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Member Search"
            module="features/reception"
            roleScope="RECEPTION (OUTLET)"
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="POSRetail" options={{ title: 'Retail POS' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Point of Sale"
            module="features/retail"
            roleScope="RECEPTION (OUTLET)"
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};
