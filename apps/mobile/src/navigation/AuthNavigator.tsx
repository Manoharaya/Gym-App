import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from './types';
import { NavigationPlaceholderScreen } from './PlaceholderScreen';
import { themeColors } from '../theme';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: themeColors.cardBackground },
        headerTintColor: '#FFFFFF',
        contentStyle: { backgroundColor: themeColors.background },
      }}
    >
      <Stack.Screen name="Login" options={{ title: 'Sign In' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="FitCore Member & Staff Login"
            module="features/auth"
            roleScope="PUBLIC / PRE-AUTH"
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Register" options={{ title: 'Join Club' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Member Registration"
            module="features/auth"
            roleScope="PUBLIC / PRE-AUTH"
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="ForgotPassword" options={{ title: 'Reset Credentials' }}>
        {() => (
          <NavigationPlaceholderScreen
            title="Password Reset Recovery"
            module="features/auth"
            roleScope="PUBLIC / PRE-AUTH"
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};
