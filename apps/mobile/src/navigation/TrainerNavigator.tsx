import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { TrainerStackParamList } from './types';
import { themeColors } from '../theme';
import { TrainerHomeScreen } from '../features/trainer/screens';

const Stack = createNativeStackNavigator<TrainerStackParamList>();

export const TrainerNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: themeColors.background },
      }}
    >
      <Stack.Screen name="TrainerHome" component={TrainerHomeScreen} />
    </Stack.Navigator>
  );
};
