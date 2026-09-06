import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ReceptionStackParamList } from './types';
import { themeColors } from '../theme';
import { ReceptionHomeScreen } from '../features/reception/screens';

const Stack = createNativeStackNavigator<ReceptionStackParamList>();

export const ReceptionNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: themeColors.background },
      }}
    >
      <Stack.Screen name="ReceptionHome" component={ReceptionHomeScreen} />
    </Stack.Navigator>
  );
};
