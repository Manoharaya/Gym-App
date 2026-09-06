import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '../../components/primitives/Text';
import { OnboardingNavigator } from './OnboardingNavigator';
import { onboardingService } from './services/onboardingService';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export const OnboardingGuard: React.FC<OnboardingGuardProps> = ({ children }) => {
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkStatus = async () => {
    try {
      const profile = await onboardingService.getMemberProfile();
      setIsOnboardingCompleted(profile.onboardingStatus === 'COMPLETED');
    } catch {
      // Default to allowing onboarding if profile exists or incomplete
      setIsOnboardingCompleted(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Verifying member onboarding status...</Text>
      </View>
    );
  }

  if (isOnboardingCompleted) {
    return <>{children}</>;
  }

  return <OnboardingNavigator onComplete={() => setIsOnboardingCompleted(true)} />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#A3A3A3',
    marginTop: 14,
    fontSize: 14,
  },
});
