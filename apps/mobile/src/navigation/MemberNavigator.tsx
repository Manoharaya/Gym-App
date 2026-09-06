import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MemberStackParamList } from './types';
import { NavigationPlaceholderScreen } from './PlaceholderScreen';
import { themeColors } from '../theme';

const Stack = createNativeStackNavigator<MemberStackParamList>();

export const MemberNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: themeColors.cardBackground },
        headerTintColor: '#FFFFFF',
        contentStyle: { backgroundColor: themeColors.background },
      }}
    >
      <Stack.Screen name="MemberHome" options={{ title: 'Member Dashboard' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Member Experience"
            module="features/dashboard"
            roleScope="MEMBER (SELF)"
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="WorkoutSession" options={{ title: 'Active Workout' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Workout Tracker"
            module="features/training"
            roleScope="MEMBER (SELF)"
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Bookings" options={{ title: 'Classes & PT' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Booking Schedule"
            module="features/booking"
            roleScope="MEMBER (SELF)"
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Progress" options={{ title: 'Metrics & Progress' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Progress Analytics"
            module="features/progress"
            roleScope="MEMBER (SELF)"
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="AICoach" options={{ title: 'FitCore AI Coach' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="AI Coaching Chat"
            module="features/ai-coach"
            roleScope="MEMBER (SELF)"
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="MemberProfile" options={{ title: 'My Profile' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Member Profile & Membership"
            module="features/profile"
            roleScope="MEMBER (SELF)"
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};
