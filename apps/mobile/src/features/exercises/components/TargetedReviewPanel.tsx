import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Badge, Icon, Button } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import type { TargetedReviewResponse } from '../services/exerciseService';

interface TargetedReviewPanelProps {
  reviewData: TargetedReviewResponse;
  onClose?: () => void;
  onStartRehearsal?: () => void;
}

export const TargetedReviewPanel: React.FC<TargetedReviewPanelProps> = ({
  reviewData,
  onClose,
  onStartRehearsal,
}) => {
  const [checkedMistakes, setCheckedMistakes] = useState<Record<string, boolean>>({});

  const toggleMistake = (id: string) => {
    setCheckedMistakes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
      case 'SEVERE':
        return <Badge label="High Risk" variant="danger" />;
      case 'MODERATE':
        return <Badge label="Moderate" variant="warning" />;
      default:
        return <Badge label="Minor" variant="neutral" />;
    }
  };

  return (
    <Card style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconCircle}>
            <Icon name="bolt" size={20} color="#F59E0B" />
          </View>
          <View style={styles.titleTextContainer}>
            <Text style={styles.title}>Targeted Technique Review</Text>
            <Text style={styles.subtitle}>{reviewData.exerciseName}</Text>
          </View>
        </View>

        {onClose && (
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close targeted review"
          >
            <Icon name="close" size={18} color={themeColors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Review Prompt Banner */}
      <View style={styles.promptBanner}>
        <Text style={styles.promptText}>{reviewData.reviewPrompt}</Text>
      </View>

      {/* 1. Critical Phases to Review */}
      {reviewData.suggestedPhases.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Icon name="dumbbell" size={16} color={themeColors.primary} />
            <Text style={styles.sectionTitle}>Key Movement Phases</Text>
          </View>

          {reviewData.suggestedPhases.map((phase, idx) => (
            <View key={phase.id || idx} style={styles.phaseCard}>
              <View style={styles.phaseHeader}>
                <Badge
                  label={`Phase ${phase.orderIndex !== undefined ? phase.orderIndex + 1 : idx + 1}`}
                  variant="neutral"
                  style={styles.phaseIndexBadge}
                />
                <Text style={styles.phaseName}>{phase.name}</Text>
              </View>
              <Text style={styles.phaseCue}>{phase.cue}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 2. Common Mistakes to Avoid */}
      {reviewData.commonMistakesToAvoid.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Icon name="alert-circle" size={16} color="#EF4444" />
            <Text style={styles.sectionTitle}>Mistakes to Avoid & Corrections</Text>
          </View>

          {reviewData.commonMistakesToAvoid.map((mistake, idx) => {
            const isChecked = !!checkedMistakes[mistake.id];
            return (
              <TouchableOpacity
                key={mistake.id || idx}
                style={[styles.mistakeCard, isChecked && styles.mistakeCardChecked]}
                onPress={() => toggleMistake(mistake.id)}
                activeOpacity={0.8}
              >
                <View style={styles.mistakeTopRow}>
                  <View style={styles.checkboxAndName}>
                    <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                      {isChecked && <Icon name="check" size={12} color="#FFFFFF" />}
                    </View>
                    <Text
                      style={[styles.mistakeName, isChecked && styles.mistakeNameChecked]}
                      numberOfLines={1}
                    >
                      {mistake.name}
                    </Text>
                  </View>
                  {getSeverityBadge(mistake.severity)}
                </View>
                <View style={styles.correctionContainer}>
                  <Text style={styles.correctionLabel}>Cue:</Text>
                  <Text style={styles.correctionText}>{mistake.cue}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* 3. Breathing Guidance */}
      {reviewData.breathingGuidance ? (
        <View style={styles.breathingCard}>
          <View style={styles.breathingHeader}>
            <Icon name="heart" size={16} color="#38BDF8" />
            <Text style={styles.breathingTitle}>Breathing Cadence</Text>
          </View>
          <Text style={styles.breathingText}>{reviewData.breathingGuidance}</Text>
        </View>
      ) : null}

      {/* Actions */}
      <View style={styles.actionRow}>
        {onStartRehearsal && (
          <Button
            title="Practice Weak Points"
            variant="primary"
            onPress={onStartRehearsal}
            style={styles.actionButton}
          />
        )}
        {onClose && (
          <Button
            title="Done Reviewing"
            variant="secondary"
            onPress={onClose}
            style={styles.actionButton}
          />
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: '#334155',
    marginVertical: spacing[3],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleTextContainer: {
    flex: 1,
  },
  title: {
    ...typography.subtitle1,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
    color: '#94A3B8',
  },
  closeButton: {
    padding: spacing[1],
  },
  promptBanner: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#38BDF8',
    padding: spacing[3],
    borderRadius: radius.sm,
    marginBottom: spacing[4],
  },
  promptText: {
    ...typography.body2,
    color: '#E2E8F0',
    lineHeight: 19,
  },
  section: {
    marginBottom: spacing[4],
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  sectionTitle: {
    ...typography.subtitle2,
    color: '#F8FAFC',
    fontWeight: '600',
  },
  phaseCard: {
    backgroundColor: '#1E293B',
    borderRadius: radius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
    borderWidth: 1,
    borderColor: '#334155',
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  phaseIndexBadge: {
    borderColor: '#475569',
  },
  phaseName: {
    ...typography.body1,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  phaseCue: {
    ...typography.body2,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  mistakeCard: {
    backgroundColor: '#1E293B',
    borderRadius: radius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
    borderWidth: 1,
    borderColor: '#334155',
  },
  mistakeCardChecked: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderColor: '#22C55E',
  },
  mistakeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  checkboxAndName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#64748B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  mistakeName: {
    ...typography.body2,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
  },
  mistakeNameChecked: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  correctionContainer: {
    flexDirection: 'row',
    gap: spacing[1],
    paddingLeft: 28,
  },
  correctionLabel: {
    ...typography.caption,
    color: '#F59E0B',
    fontWeight: '700',
  },
  correctionText: {
    ...typography.body2,
    color: '#CBD5E1',
    flex: 1,
  },
  breathingCard: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: radius.md,
    padding: spacing[3],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  breathingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  breathingTitle: {
    ...typography.subtitle2,
    color: '#38BDF8',
    fontWeight: '600',
  },
  breathingText: {
    ...typography.body2,
    color: '#E2E8F0',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  actionButton: {
    flex: 1,
  },
});
