import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { TrainerStackParamList } from './types';
import { NavigationPlaceholderScreen } from './PlaceholderScreen';
import { themeColors } from '../theme';

const Stack = createNativeStackNavigator<TrainerStackParamList>();

export const TrainerNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: themeColors.cardBackground },
        headerTintColor: '#FFFFFF',
        contentStyle: { backgroundColor: themeColors.background },
      }}
    >
      <Stack.Screen name="TrainerHome" options={{ title: 'Trainer Hub' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Trainer Command Center"
            module="features/trainer"
            roleScope="TRAINER (ASSIGNED_CLIENTS)"
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="ClientList" options={{ title: 'Assigned Clients' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Clients Roster"
            module="features/trainer"
            roleScope="TRAINER (ASSIGNED_CLIENTS)"
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="ClientDetail" options={{ title: 'Client Profile' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Client Fitness Portfolio"
            module="features/trainer"
            roleScope="TRAINER (ASSIGNED_CLIENTS)"
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Schedule" options={{ title: 'Training Schedule' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="PT & Class Calendar"
            module="features/booking"
            roleScope="TRAINER (ASSIGNED_CLIENTS)"
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="ProgramBuilder" options={{ title: 'Program Builder' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Prescription & Programs"
            module="features/training"
            roleScope="TRAINER (ORGANISATION)"
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};
