import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, spacing as sp, radius, typography } from '../../../theme';
import { ExerciseService } from '../services/exerciseService';
import type { ExerciseMetadataCompleteness } from '@fitcore/types';

interface ExerciseCompletenessScoreCardProps {
  exerciseId: string;
  onRefreshTrigger?: number;
}

export const ExerciseCompletenessScoreCard: React.FC<ExerciseCompletenessScoreCardProps> = ({
  exerciseId,
  onRefreshTrigger,
}) => {
  const [completeness, setCompleteness] = useState<ExerciseMetadataCompleteness | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchScore = useCallback(async () => {
    if (!exerciseId) return;
    try {
      const data = await ExerciseService.getExerciseCompleteness(exerciseId);
      setCompleteness(data);
    } catch {
      // Graceful fallback if endpoint encounters missing context
    } finally {
      setLoading(false);
    }
  }, [exerciseId]);

  useEffect(() => {
    fetchScore();
  }, [fetchScore, onRefreshTrigger]);

  if (loading) {
    return (
      <Card style={styles.cardLoading}>
        <ActivityIndicator size="small" color={themeColors.primary} />
        <Text style={styles.loadingText}>Auditing metadata quality score...</Text>
      </Card>
    );
  }

  if (!completeness) {
    return null;
  }

  const score = completeness.overallPercentage;
  const isHighQuality = score >= 80;
  const isMidQuality = score >= 50 && score < 80;

  const scoreColor = isHighQuality
    ? themeColors.accent
    : isMidQuality
    ? themeColors.primary
    : themeColors.warning;

  const breakdown = completeness.scoreBreakdown || {
    primaryMuscle: false,
    equipment: false,
    movementPattern: false,
    exerciseCategory: false,
    exerciseMechanics: false,
    trainingGoals: false,
    instructions: false,
    media: false,
  };

  const auditItems = [
    { key: 'primaryMuscle', label: 'Primary Muscle', passed: breakdown.primaryMuscle },
    { key: 'equipment', label: 'Equipment', passed: breakdown.equipment },
    { key: 'movementPattern', label: 'Movement Pattern', passed: breakdown.movementPattern },
    { key: 'exerciseCategory', label: 'Exercise Category', passed: breakdown.exerciseCategory },
    { key: 'exerciseMechanics', label: 'Mechanics (Compound/Iso)', passed: breakdown.exerciseMechanics },
    { key: 'trainingGoals', label: 'Training Goals', passed: breakdown.trainingGoals },
    { key: 'instructions', label: 'Step Instructions', passed: breakdown.instructions },
    { key: 'media', label: 'Visual Media Assets', passed: breakdown.media },
  ];

  return (
    <Card style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setExpanded(!expanded)}
        style={styles.headerRow}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
            <Text style={[styles.scoreNumber, { color: scoreColor }]}>{score}%</Text>
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Metadata Quality Audit</Text>
              {completeness.isComplete ? (
                <Badge label="COMPLETE" variant="accent" />
              ) : (
                <Badge label={`${completeness.missingFields.length} PENDING`} variant="neutral" />
              )}
            </View>
            <Text style={styles.subtitle}>
              {completeness.isComplete
                ? 'Fully enriched biomechanical & instructional metadata'
                : `Tap to see checklist & missing dimensions`}
            </Text>
          </View>
        </View>

        <Icon
          name={expanded ? 'chevron-down' : 'chevron-right'}
          size={18}
          color={themeColors.textMuted}
        />
      </TouchableOpacity>

      {/* PROGRESS BAR */}
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${score}%`, backgroundColor: scoreColor }]} />
      </View>

      {/* EXPANDABLE BREAKDOWN CHECKLIST */}
      {expanded && (
        <View style={styles.breakdownContainer}>
          <Text style={styles.breakdownTitle}>8-POINT QUALITY CHECKLIST</Text>
          <View style={styles.checklistGrid}>
            {auditItems.map((item) => (
              <View key={item.key} style={styles.checklistItem}>
                <Icon
                  name={item.passed ? 'check-circle' : 'alert-circle'}
                  size={16}
                  color={item.passed ? themeColors.accent : themeColors.textMuted}
                />
                <Text
                  style={[
                    styles.checklistText,
                    item.passed ? styles.checklistTextPassed : styles.checklistTextPending,
                  ]}
                >
                  {item.label}
                </Text>
              </View>
            ))}
          </View>

          {completeness.missingFields.length > 0 && (
            <View style={styles.missingContainer}>
              <Text style={styles.missingTitle}>Recommended Actions:</Text>
              <View style={styles.missingChips}>
                {completeness.missingFields.map((field) => (
                  <View key={field} style={styles.missingChip}>
                    <Text style={styles.missingChipText}>+ Add {field}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: sp[3.5],
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginBottom: sp[4],
  },
  cardLoading: {
    padding: sp[3],
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp[3],
    marginBottom: sp[4],
  },
  loadingText: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp[3],
    flex: 1,
  },
  scoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    backgroundColor: themeColors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: {
    ...typography.subtitle2,
    fontWeight: '800',
    fontSize: 13,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp[2],
  },
  title: {
    ...typography.subtitle2,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginTop: 2,
    fontSize: 11,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: themeColors.surfaceElevated,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginTop: sp[3],
  },
  progressBarFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  breakdownContainer: {
    marginTop: sp[3.5],
    paddingTop: sp[3],
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    gap: sp[2.5],
  },
  breakdownTitle: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontSize: 10,
  },
  checklistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp[2],
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '48%',
  },
  checklistText: {
    ...typography.caption,
    fontSize: 12,
  },
  checklistTextPassed: {
    color: themeColors.textPrimary,
    fontWeight: '500',
  },
  checklistTextPending: {
    color: themeColors.textMuted,
  },
  missingContainer: {
    marginTop: sp[1],
    gap: 6,
  },
  missingTitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
    fontSize: 11,
  },
  missingChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  missingChip: {
    backgroundColor: themeColors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: themeColors.warning + '60',
  },
  missingChipText: {
    ...typography.caption,
    color: themeColors.warning,
    fontSize: 11,
    fontWeight: '600',
  },
});
