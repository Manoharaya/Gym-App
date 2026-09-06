import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { Button } from '../../../components/primitives/Button';
import { Card } from '../../../components/primitives/Card';
import { StepHeader } from '../components/StepHeader';
import { useOnboardingStore } from '../store/onboardingStore';
import { onboardingService } from '../services/onboardingService';
import { themeColors } from '../../../theme';

interface WelcomeScreenProps {
  onNext: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNext }) => {
  const { setSubmitting, isSubmitting } = useOnboardingStore();

  const handleStart = async () => {
    setSubmitting(true);
    try {
      await onboardingService.startOnboarding();
      onNext();
    } catch {
      onNext();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StepHeader
        badge="FitCore Onboarding"
        title="Welcome to Second Wind Athletic Club"
        subtitle="Before you hit the training floor, we need to complete your profile, safety screening, and club agreements."
      />

      <Card style={styles.infoCard}>
        <Text style={styles.cardTitle}>What you will complete:</Text>

        <View style={styles.itemRow}>
          <Text style={styles.itemNumber}>1</Text>
          <View style={styles.itemTextWrap}>
            <Text style={styles.itemTitle}>Profile & Emergency Contacts</Text>
            <Text style={styles.itemDesc}>Basic personal details and emergency contacts for club safety.</Text>
          </View>
        </View>

        <View style={styles.itemRow}>
          <Text style={styles.itemNumber}>2</Text>
          <View style={styles.itemTextWrap}>
            <Text style={styles.itemTitle}>Physical Activity Readiness (PAR-Q+)</Text>
            <Text style={styles.itemDesc}>Standard 7-question health readiness check to ensure training safety.</Text>
          </View>
        </View>

        <View style={styles.itemRow}>
          <Text style={styles.itemNumber}>3</Text>
          <View style={styles.itemTextWrap}>
            <Text style={styles.itemTitle}>Injury & Health Screening</Text>
            <Text style={styles.itemDesc}>Log any active or historical injuries so our trainers can modify exercises.</Text>
          </View>
        </View>

        <View style={styles.itemRow}>
          <Text style={styles.itemNumber}>4</Text>
          <View style={styles.itemTextWrap}>
            <Text style={styles.itemTitle}>Compliance, Consent & Signature</Text>
            <Text style={styles.itemDesc}>Review terms, privacy, health data consent, and electronic declaration.</Text>
          </View>
        </View>
      </Card>

      <View style={styles.timeNotice}>
        <Text style={styles.timeText}>⏱️ Estimated time: 3–5 minutes</Text>
      </View>

      <Button
        title="Begin Onboarding"
        variant="primary"
        size="lg"
        onPress={handleStart}
        loading={isSubmitting}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: '#1E1E1E',
    padding: 18,
    borderRadius: 12,
    marginBottom: 20,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  itemNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: themeColors.primary,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 13,
    fontWeight: '700',
    marginRight: 12,
    marginTop: 2,
  },
  itemTextWrap: {
    flex: 1,
  },
  itemTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemDesc: {
    color: '#A3A3A3',
    fontSize: 13,
    lineHeight: 18,
  },
  timeNotice: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timeText: {
    color: '#737373',
    fontSize: 13,
    fontWeight: '500',
  },
});
