import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { FinanceStackParamList } from './types';
import { NavigationPlaceholderScreen } from './PlaceholderScreen';
import { themeColors } from '../theme';

const Stack = createNativeStackNavigator<FinanceStackParamList>();

export const FinanceNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: themeColors.cardBackground },
        headerTintColor: '#FFFFFF',
        contentStyle: { backgroundColor: themeColors.background },
      }}
    >
      <Stack.Screen name="FinanceHome" options={{ title: 'Finance Center' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Revenue & Billing"
            module="features/payments"
            roleScope="FINANCE (ORGANISATION)"
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Invoices" options={{ title: 'Invoices & Arrears' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Invoicing Ledger"
            module="features/payments"
            roleScope="FINANCE (ORGANISATION)"
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="XeroSync" options={{ title: 'Xero Accounting' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Xero Synchronization"
            module="features/payments"
            roleScope="FINANCE (ORGANISATION)"
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};
