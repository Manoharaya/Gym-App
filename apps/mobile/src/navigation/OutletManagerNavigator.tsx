import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OutletManagerStackParamList } from './types';
import { themeColors } from '../theme';
import { OutletManagerHomeScreen } from '../features/dashboard/screens';

const Stack = createNativeStackNavigator<OutletManagerStackParamList>();

export const OutletManagerNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: themeColors.background },
      }}
    >
      <Stack.Screen name="ManagerHome" component={OutletManagerHomeScreen} />
    </Stack.Navigator>
  );
};
