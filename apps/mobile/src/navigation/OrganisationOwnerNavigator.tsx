import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OrganisationOwnerStackParamList } from './types';
import { themeColors } from '../theme';
import { OrganisationOwnerHomeScreen } from '../features/dashboard/screens';

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
    </Stack.Navigator>
  );
};
