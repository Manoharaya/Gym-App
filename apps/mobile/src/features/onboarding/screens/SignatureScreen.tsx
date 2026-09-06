import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { Input } from '../../../components/primitives/Input';
import { StepHeader } from '../components/StepHeader';
import { StepFooter } from '../components/StepFooter';
import { useOnboardingStore } from '../store/onboardingStore';
import { onboardingService } from '../services/onboardingService';
import { themeColors } from '../../../theme';

interface SignatureScreenProps {
  onNext: () => void;
  onBack: () => void;
}

export const SignatureScreen: React.FC<SignatureScreenProps> = ({ onNext, onBack }) => {
  const { signatureName, setSignatureName, isSubmitting, setSubmitting } = useOnboardingStore();
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmitSignature = async () => {
    if (!signatureName.trim()) {
      setErrorMsg('Please enter your full legal name.');
      return;
    }
    if (!agreedToTerms) {
      setErrorMsg('You must check the declaration agreement to proceed.');
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);

    try {
      await onboardingService.submitSignature(signatureName.trim());
      await onboardingService.updateCurrentStep('REVIEW');
      onNext();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to record digital declaration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <StepHeader
          title="Digital Declaration & Signature"
          subtitle="Please confirm the truthfulness of your responses and electronically sign your member onboarding agreement."
        />

        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <View style={styles.legalBox}>
          <Text style={styles.legalTitle}>Electronic Signature Declaration</Text>
          <Text style={styles.legalBody}>
            By signing below, I certify that all information provided in this profile, PAR-Q health questionnaire, and injury declaration is true, correct, and complete to the best of my knowledge.
            {'\n\n'}
            I understand that participating in athletic conditioning involves inherent physical risk, and I agree to notify FitCore coaches of any changes in my health status.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.checkboxRow, agreedToTerms && styles.checkboxRowActive]}
          onPress={() => setAgreedToTerms(!agreedToTerms)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
            {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            I confirm and accept this declaration under penalty of membership cancellation.
          </Text>
        </TouchableOpacity>

        <View style={styles.inputSection}>
          <Input
            label="Type Full Legal Name as Electronic Signature *"
            placeholder="e.g. Alexander Mercer"
            value={signatureName}
            onChangeText={setSignatureName}
          />
        </View>

        <View style={styles.evidenceNotice}>
          <Text style={styles.evidenceText}>
            🔒 Your electronic signature will be cryptographically hashed with timestamp, device telemetry, and stored as an immutable audit record.
          </Text>
        </View>
      </ScrollView>

      <StepFooter
        onBack={onBack}
        onNext={handleSubmitSignature}
        nextLabel="Confirm & Review"
        isSubmitting={isSubmitting}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 24,
  },
  legalBox: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  legalTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  legalBody: {
    color: '#D4D4D4',
    fontSize: 13,
    lineHeight: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#1A1A1A',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2B2B2B',
  },
  checkboxRowActive: {
    borderColor: themeColors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#737373',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: themeColors.primary,
    backgroundColor: themeColors.primary,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  checkboxLabel: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  inputSection: {
    marginBottom: 20,
  },
  evidenceNotice: {
    backgroundColor: '#141414',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    marginBottom: 20,
  },
  evidenceText: {
    color: '#737373',
    fontSize: 12,
    lineHeight: 16,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
  },
});
