import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { StepHeader } from '../components/StepHeader';
import { StepFooter } from '../components/StepFooter';
import { Card } from '../../../components/primitives/Card';
import { useOnboardingStore } from '../store/onboardingStore';
import { onboardingService } from '../services/onboardingService';
import type { OnboardingProgressData } from '../types';
import { themeColors } from '../../../theme';

interface ReviewScreenProps {
  onNext: () => void;
  onBack: () => void;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({ onNext, onBack }) => {
  const { isSubmitting, setSubmitting } = useOnboardingStore();
  const [progress, setProgress] = useState<OnboardingProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchProgress = async () => {
    try {
      const data = await onboardingService.getOnboardingProgress();
      setProgress(data);
    } catch {
      setErrorMsg('Unable to retrieve onboarding progress.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  const handleFinalize = async () => {
    setErrorMsg(null);
    setSubmitting(true);

    try {
      await onboardingService.completeOnboarding();
      onNext();
    } catch (err: any) {
      setErrorMsg(
        err?.message || 'Cannot finalize onboarding. Please ensure all required steps are complete.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Validating completion requirements...</Text>
      </View>
    );
  }

  const allComplete = progress?.progress.percentage === 100;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <StepHeader
          title="Onboarding Summary"
          subtitle="Review all onboarding sections below. Once finalized, your membership profile will become active."
        />

        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <View style={styles.progressSummary}>
          <Text style={styles.progressTitle}>Overall Readiness</Text>
          <Text style={styles.progressPercent}>{progress?.progress.percentage ?? 0}%</Text>
        </View>

        <Card style={styles.checklistCard}>
          <Text style={styles.checklistTitle}>Completion Checklist</Text>

          {progress?.steps.map((step) => {
            const isDone = step.status === 'COMPLETED';
            return (
              <View key={step.key} style={styles.stepRow}>
                <View style={[styles.statusIcon, isDone && styles.statusIconDone]}>
                  <Text style={styles.statusIconText}>{isDone ? '✓' : '!'}</Text>
                </View>
                <View style={styles.stepInfo}>
                  <Text style={styles.stepName}>{step.title}</Text>
                  <Text style={[styles.stepState, isDone ? styles.stateDone : styles.statePending]}>
                    {isDone ? 'Completed' : 'Pending Action'}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card>
      </ScrollView>

      <StepFooter
        onBack={onBack}
        onNext={handleFinalize}
        nextLabel="Submit & Complete"
        isSubmitting={isSubmitting}
        canProceed={allComplete}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#A3A3A3',
    marginTop: 12,
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 24,
  },
  progressSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  progressTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  progressPercent: {
    color: themeColors.primary,
    fontSize: 20,
    fontWeight: '900',
  },
  checklistCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
  },
  checklistTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2B2B2B',
  },
  statusIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statusIconDone: {
    backgroundColor: '#22C55E',
  },
  statusIconText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  stepInfo: {
    flex: 1,
  },
  stepName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  stepState: {
    fontSize: 12,
    marginTop: 2,
  },
  stateDone: {
    color: '#22C55E',
  },
  statePending: {
    color: '#EF4444',
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
