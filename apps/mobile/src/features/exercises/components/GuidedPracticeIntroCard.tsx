import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { themeColors, typography, radius, spacing } from '../../../theme';
import { Icon, Badge } from '../../../components/primitives';

interface GuidedPracticeIntroCardProps {
  exerciseName: string;
  difficulty: string;
  movementPattern: string;
  primaryMuscle: string;
  phasesCount: number;
  estimatedMinutes: number;
  equipmentRequired: Array<{ id: string; name: string; isRequired: boolean }>;
  hasQuiz: boolean;
  onBegin: () => void;
}

export const GuidedPracticeIntroCard: React.FC<GuidedPracticeIntroCardProps> = ({
  exerciseName,
  difficulty,
  movementPattern,
  primaryMuscle,
  phasesCount,
  estimatedMinutes,
  equipmentRequired,
  hasQuiz,
  onBegin,
}) => {
  return (
    <View style={styles.container}>
      {/* Exercise Badge & Title */}
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <Badge label={difficulty} variant="neutral" />
          <Badge label={movementPattern} variant="primary" />
          <Badge label={primaryMuscle} variant="accent" />
        </View>
        <Text style={styles.title}>{exerciseName}</Text>
        <Text style={styles.subtitle}>
          Visual Movement Coach • Guided Technique Practice
        </Text>
      </View>

      {/* Meta Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Icon name="timer" size={16} color={themeColors.primary} />
          <Text style={styles.statText}>~{estimatedMinutes} mins</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Icon name="activity" size={16} color={themeColors.primary} />
          <Text style={styles.statText}>{phasesCount} Phases</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Icon name="dumbbell" size={16} color={themeColors.primary} />
          <Text style={styles.statText}>
            {equipmentRequired.length > 0 && equipmentRequired[0]?.name
              ? equipmentRequired[0].name
              : 'Bodyweight'}
          </Text>
        </View>
      </View>

      {/* Workflow Steps Preview */}
      <View style={styles.workflowContainer}>
        <Text style={styles.sectionHeader}>Practice Journey</Text>

        <View style={styles.workflowStep}>
          <View style={styles.stepNumberBadge}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Setup & Environment Check</Text>
            <Text style={styles.stepDescription}>
              Confirm stable space, equipment readiness, and initial body positioning.
            </Text>
          </View>
        </View>

        <View style={styles.workflowStep}>
          <View style={styles.stepNumberBadge}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Structured Phase Rehearsal</Text>
            <Text style={styles.stepDescription}>
              Break down the movement into {phasesCount} distinct phases with visual cues and technique checkpoints.
            </Text>
          </View>
        </View>

        <View style={styles.workflowStep}>
          <View style={styles.stepNumberBadge}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Self-Reflection & Checklist</Text>
            <Text style={styles.stepDescription}>
              Verify your form against coach expectations and identify key focus areas.
            </Text>
          </View>
        </View>

        {hasQuiz && (
          <View style={styles.workflowStep}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Knowledge Check & Feedback</Text>
              <Text style={styles.stepDescription}>
                Complete technique quiz and receive educational learning assessment.
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Pre-Camera Educational Notice */}
      <View style={styles.educationalNotice}>
        <Icon name="shield" size={18} color={themeColors.primary} />
        <View style={styles.noticeTextContainer}>
          <Text style={styles.noticeTitle}>Educational Rehearsal Mode</Text>
          <Text style={styles.noticeDescription}>
            Build muscle memory and movement discipline through deliberate practice without camera distraction.
          </Text>
        </View>
      </View>

      {/* CTA Button */}
      <TouchableOpacity
        style={styles.beginButton}
        onPress={onBegin}
        accessibilityRole="button"
        accessibilityLabel="Begin Guided Practice"
      >
        <Icon name="sparkles" size={18} color="#FFFFFF" />
        <Text style={styles.beginButtonText}>Begin Guided Practice</Text>
        <Icon name="chevron-right" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  title: {
    ...typography.title,
    color: themeColors.textPrimary,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: themeColors.border,
  },
  workflowContainer: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionHeader: {
    ...typography.subtitle,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginBottom: spacing.xs,
  },
  workflowStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    borderWidth: 1,
    borderColor: themeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    ...typography.caption,
    color: themeColors.primary,
    fontWeight: '800',
  },
  stepContent: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  stepDescription: {
    ...typography.caption,
    color: themeColors.textSecondary,
    lineHeight: 16,
  },
  educationalNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.25)',
  },
  noticeTextContainer: {
    flex: 1,
    gap: 2,
  },
  noticeTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.primary,
  },
  noticeDescription: {
    ...typography.caption,
    color: themeColors.textSecondary,
    lineHeight: 16,
  },
  beginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  beginButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
