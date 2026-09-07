import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OutletManagerStackParamList } from './types';
import { themeColors } from '../theme';
import { OutletManagerHomeScreen } from '../features/dashboard/screens';
import { StaffDirectoryScreen } from '../features/staff/screens/StaffDirectoryScreen';
import {
  TrainerDirectoryScreen,
  TrainerProfileScreen,
  TrainerClientsScreen,
} from '../features/trainer/screens';

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
      <Stack.Screen name="StaffDirectory" component={StaffDirectoryScreen} />
      <Stack.Screen name="TrainerDirectory" component={TrainerDirectoryScreen} />
      <Stack.Screen name="TrainerProfile" component={TrainerProfileScreen} />
      <Stack.Screen name="TrainerClients" component={TrainerClientsScreen} />
    </Stack.Navigator>
  );
};
