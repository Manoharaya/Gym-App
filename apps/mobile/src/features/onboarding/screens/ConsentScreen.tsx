import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { StepHeader } from '../components/StepHeader';
import { StepFooter } from '../components/StepFooter';
import { useOnboardingStore } from '../store/onboardingStore';
import { onboardingService } from '../services/onboardingService';
import { themeColors } from '../../../theme';

interface ConsentScreenProps {
  onNext: () => void;
  onBack: () => void;
}

export const ConsentScreen: React.FC<ConsentScreenProps> = ({ onNext, onBack }) => {
  const { consents, setConsents, updateConsentStatus, isSubmitting } =
    useOnboardingStore();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadConsents = async () => {
      try {
        const data = await onboardingService.getConsents();
        if (isMounted && Array.isArray(data)) {
          setConsents(data);
        }
      } catch {
        setErrorMsg('Unable to load compliance consents from server.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadConsents();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleConsent = async (
    consentTypeId: string,
    consentVersionId?: string,
    newStatus: 'CONSENTED' | 'DECLINED' = 'CONSENTED'
  ) => {
    if (!consentVersionId) return;

    try {
      await onboardingService.recordConsent(consentTypeId, consentVersionId, newStatus);
      updateConsentStatus(consentTypeId, newStatus);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update consent.');
    }
  };

  const handleContinue = async () => {
    // Check that all mandatory consents have status === 'CONSENTED'
    const pendingMandatory = consents.filter(
      (c) => c.isMandatory && c.currentStatus !== 'CONSENTED'
    );

    if (pendingMandatory.length > 0) {
      setErrorMsg('You must accept all mandatory agreements to proceed.');
      return;
    }

    setErrorMsg(null);
    onNext();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading compliance agreements...</Text>
      </View>
    );
  }

  const mandatoryConsents = consents.filter((c) => c.isMandatory);
  const optionalConsents = consents.filter((c) => !c.isMandatory);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <StepHeader
          title="Compliance & Consent"
          subtitle="Please review our terms of service, privacy policies, and health data processing authorizations."
        />

        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Mandatory Club Agreements</Text>
        {mandatoryConsents.map((c) => {
          const isAccepted = c.currentStatus === 'CONSENTED';
          return (
            <View key={c.consentTypeId} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{c.name}</Text>
                <View style={styles.mandatoryBadge}>
                  <Text style={styles.mandatoryText}>Required</Text>
                </View>
              </View>

              <Text style={styles.cardDescription}>{c.description}</Text>
              {c.activeVersion && (
                <View style={styles.contentSnippet}>
                  <Text style={styles.snippetText}>{c.activeVersion.content}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.checkboxRow, isAccepted && styles.checkboxRowAccepted]}
                onPress={() =>
                  handleToggleConsent(
                    c.consentTypeId,
                    c.activeVersion?.id,
                    isAccepted ? 'DECLINED' : 'CONSENTED'
                  )
                }
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, isAccepted && styles.checkboxChecked]}>
                  {isAccepted && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>
                  {isAccepted ? 'I have read and agree' : 'I agree to the terms above'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {optionalConsents.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Optional Consents</Text>
            {optionalConsents.map((c) => {
              const isAccepted = c.currentStatus === 'CONSENTED';
              return (
                <View key={c.consentTypeId} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{c.name}</Text>
                    <View style={styles.optionalBadge}>
                      <Text style={styles.optionalText}>Optional</Text>
                    </View>
                  </View>

                  <Text style={styles.cardDescription}>{c.description}</Text>

                  <TouchableOpacity
                    style={[styles.checkboxRow, isAccepted && styles.checkboxRowAccepted]}
                    onPress={() =>
                      handleToggleConsent(
                        c.consentTypeId,
                        c.activeVersion?.id,
                        isAccepted ? 'DECLINED' : 'CONSENTED'
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <View style={[styles.checkbox, isAccepted && styles.checkboxChecked]}>
                      {isAccepted && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.checkboxLabel}>
                      {isAccepted ? 'Consent Granted' : 'Opt-in to this feature'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      <StepFooter
        onBack={onBack}
        onNext={handleContinue}
        nextLabel="Continue"
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
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  mandatoryBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  mandatoryText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  optionalBadge: {
    backgroundColor: 'rgba(156, 163, 175, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  optionalText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardDescription: {
    color: '#A3A3A3',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  contentSnippet: {
    backgroundColor: '#141414',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  snippetText: {
    color: '#D4D4D4',
    fontSize: 12,
    lineHeight: 17,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#262626',
  },
  checkboxRowAccepted: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#737373',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: themeColors.primary,
    backgroundColor: themeColors.primary,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  checkboxLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
