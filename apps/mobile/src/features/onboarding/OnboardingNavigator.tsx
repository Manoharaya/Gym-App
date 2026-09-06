import React, { useEffect } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { ProgressIndicator } from './components/ProgressIndicator';
import {
  WelcomeScreen,
  ProfileScreen,
  ParqScreen,
  HealthScreeningScreen,
  InjuryScreen,
  ConsentScreen,
  DocumentUploadScreen,
  SignatureScreen,
  ReviewScreen,
  CompleteScreen,
} from './screens';
import { useOnboardingStore } from './store/onboardingStore';
import { onboardingService } from './services/onboardingService';

interface OnboardingNavigatorProps {
  onComplete: () => void;
}

const STEP_TITLES = [
  'Welcome',
  'Profile',
  'Physical Readiness',
  'Health Baseline',
  'Injury History',
  'Consent & Waivers',
  'Medical Documents',
  'Digital Signature',
  'Final Review',
  'Complete',
];

export const OnboardingNavigator: React.FC<OnboardingNavigatorProps> = ({ onComplete }) => {
  const { currentStepIndex, setStepIndex, nextStep, prevStep } = useOnboardingStore();

  useEffect(() => {
    // Attempt to resume from backend onboarding state
    onboardingService.getOnboardingProgress().then((data) => {
      if (data) {
        const stepMap: Record<string, number> = {
          PROFILE: 1,
          PARQ: 2,
          HEALTH_SCREENING: 3,
          INJURIES: 4,
          CONSENTS: 5,
          DOCUMENTS: 6,
          SIGNATURE: 7,
          REVIEW: 8,
          COMPLETE: 9,
        };
        const targetIndex = stepMap[data.currentStep];
        if (targetIndex !== undefined && targetIndex > 0) {
          setStepIndex(targetIndex);
        }
      }
    }).catch(() => {});
  }, [setStepIndex]);

  const renderCurrentScreen = () => {
    switch (currentStepIndex) {
      case 0:
        return <WelcomeScreen onNext={nextStep} />;
      case 1:
        return <ProfileScreen onNext={nextStep} onBack={prevStep} />;
      case 2:
        return <ParqScreen onNext={nextStep} onBack={prevStep} />;
      case 3:
        return <HealthScreeningScreen onNext={nextStep} onBack={prevStep} />;
      case 4:
        return <InjuryScreen onNext={nextStep} onBack={prevStep} />;
      case 5:
        return <ConsentScreen onNext={nextStep} onBack={prevStep} />;
      case 6:
        return <DocumentUploadScreen onNext={nextStep} onBack={prevStep} />;
      case 7:
        return <SignatureScreen onNext={nextStep} onBack={prevStep} />;
      case 8:
        return <ReviewScreen onNext={nextStep} onBack={prevStep} />;
      case 9:
        return <CompleteScreen onFinish={onComplete} />;
      default:
        return <WelcomeScreen onNext={nextStep} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {currentStepIndex > 0 && currentStepIndex < 9 && (
        <ProgressIndicator
          currentStep={currentStepIndex}
          totalSteps={8}
          title={STEP_TITLES[currentStepIndex]}
        />
      )}
      <View style={styles.screenWrapper}>{renderCurrentScreen()}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  screenWrapper: {
    flex: 1,
  },
});
