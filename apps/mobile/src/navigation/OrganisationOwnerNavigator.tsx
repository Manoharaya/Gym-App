import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OrganisationOwnerStackParamList } from './types';
import { themeColors } from '../theme';
import { OrganisationOwnerHomeScreen } from '../features/dashboard/screens';
import { StaffDirectoryScreen } from '../features/staff/screens/StaffDirectoryScreen';
import {
  TrainerDirectoryScreen,
  TrainerProfileScreen,
  TrainerClientsScreen,
} from '../features/trainer/screens';

const Stack = createNativeStackNavigator<OrganisationOwnerStackParamList>();

export const OrganisationOwnerNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: themeColors.background },
      }}
    >
      <Stack.Screen name="OwnerHome" component={OrganisationOwnerHomeScreen} />
      <Stack.Screen name="StaffDirectory" component={StaffDirectoryScreen} />
      <Stack.Screen name="TrainerDirectory" component={TrainerDirectoryScreen} />
      <Stack.Screen name="TrainerProfile" component={TrainerProfileScreen} />
      <Stack.Screen name="TrainerClients" component={TrainerClientsScreen} />
    </Stack.Navigator>
  );
};
