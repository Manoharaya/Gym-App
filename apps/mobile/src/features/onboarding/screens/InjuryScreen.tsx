import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { Input } from '../../../components/primitives/Input';
import { Button } from '../../../components/primitives/Button';
import { Card } from '../../../components/primitives/Card';
import { StepHeader } from '../components/StepHeader';
import { StepFooter } from '../components/StepFooter';
import { useOnboardingStore } from '../store/onboardingStore';
import { onboardingService } from '../services/onboardingService';
import type { InjuryItem } from '../types';
import { themeColors } from '../../../theme';

interface InjuryScreenProps {
  onNext: () => void;
  onBack: () => void;
}

export const InjuryScreen: React.FC<InjuryScreenProps> = ({ onNext, onBack }) => {
  const { injuries, addInjury, isSubmitting, setSubmitting } = useOnboardingStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [bodyArea, setBodyArea] = useState('LOWER_BACK');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'RECOVERING' | 'RESOLVED'>('ACTIVE');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const bodyAreas = [
    'SHOULDER',
    'KNEE',
    'LOWER_BACK',
    'ANKLE',
    'HIP',
    'WRIST',
    'NECK',
    'OTHER',
  ];

  useEffect(() => {
    let isMounted = true;
    onboardingService.getInjuries().then((data) => {
      if (isMounted && Array.isArray(data)) {
        data.forEach((inj) => addInjury(inj));
      }
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddInjury = async () => {
    if (!description.trim()) {
      setErrorMsg('Please enter a brief description of the injury.');
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);

    const newInj: InjuryItem = {
      bodyArea,
      description: description.trim(),
      status,
    };

    try {
      await onboardingService.createInjury(newInj);
      addInjury(newInj);
      setDescription('');
      setShowAddForm(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save injury.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <StepHeader
          title="Injury History"
          subtitle="Let us know about any joint or muscular issues so our trainers can provide safe alternatives."
        />

        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {injuries.length === 0 && !showAddForm && (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No injuries reported</Text>
            <Text style={styles.emptySubtitle}>
              If you are injury-free, you can continue directly to the next step.
            </Text>
          </Card>
        )}

        {injuries.map((inj, idx) => (
          <View key={idx} style={styles.injuryCard}>
            <View style={styles.injuryHeader}>
              <Text style={styles.injuryArea}>{inj.bodyArea.replace(/_/g, ' ')}</Text>
              <View
                style={[
                  styles.statusBadge,
                  inj.status === 'ACTIVE' && styles.statusActive,
                  inj.status === 'RECOVERING' && styles.statusRecovering,
                ]}
              >
                <Text style={styles.statusText}>{inj.status}</Text>
              </View>
            </View>
            <Text style={styles.injuryDesc}>{inj.description}</Text>
          </View>
        ))}

        {showAddForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Report an Injury</Text>

            <Text style={styles.fieldLabel}>Affected Area</Text>
            <View style={styles.chipRow}>
              {bodyAreas.map((area) => (
                <TouchableOpacity
                  key={area}
                  style={[
                    styles.chip,
                    bodyArea === area && styles.chipSelected,
                  ]}
                  onPress={() => setBodyArea(area)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      bodyArea === area && styles.chipTextSelected,
                    ]}
                  >
                    {area.replace(/_/g, ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Description *"
              placeholder="e.g. Mild rotator cuff strain from bench press"
              value={description}
              onChangeText={setDescription}
            />

            <Text style={styles.fieldLabel}>Current Status</Text>
            <View style={styles.statusRow}>
              {(['ACTIVE', 'RECOVERING', 'RESOLVED'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusOption, status === s && styles.statusOptionSelected]}
                  onPress={() => setStatus(s)}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      status === s && styles.statusOptionTextSelected,
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setShowAddForm(false)}
              />
              <Button
                title="Save Injury"
                variant="primary"
                onPress={handleAddInjury}
                loading={isSubmitting}
              />
            </View>
          </View>
        ) : (
          <Button
            title="+ Report an Injury"
            variant="outline"
            onPress={() => setShowAddForm(true)}
          />
        )}
      </ScrollView>

      <StepFooter
        onBack={onBack}
        onNext={onNext}
        nextLabel={injuries.length > 0 ? 'Continue' : 'No Injuries, Continue'}
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
  emptyCard: {
    backgroundColor: '#1A1A1A',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#A3A3A3',
    fontSize: 13,
    textAlign: 'center',
  },
  injuryCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  injuryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  injuryArea: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#333333',
  },
  statusActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  statusRecovering: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  injuryDesc: {
    color: '#D4D4D4',
    fontSize: 13,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#383838',
  },
  formTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  fieldLabel: {
    color: '#A3A3A3',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  chipSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: themeColors.primary,
  },
  chipText: {
    color: '#A3A3A3',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#262626',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  statusOptionSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: themeColors.primary,
  },
  statusOptionText: {
    color: '#A3A3A3',
    fontSize: 12,
    fontWeight: '600',
  },
  statusOptionTextSelected: {
    color: '#FFFFFF',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
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
