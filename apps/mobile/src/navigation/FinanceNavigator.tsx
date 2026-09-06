import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { FinanceStackParamList } from './types';
import { themeColors } from '../theme';
import { FinanceHomeScreen } from '../features/payments/screens';

const Stack = createNativeStackNavigator<FinanceStackParamList>();

export const FinanceNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: themeColors.background },
      }}
    >
      <Stack.Screen name="FinanceHome" component={FinanceHomeScreen} />
    </Stack.Navigator>
  );
};
