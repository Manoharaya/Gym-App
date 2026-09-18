import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { themeColors, typography, radius, spacing } from '../../../theme';
import { Icon } from '../../../components/primitives';

interface GuidedPracticeSummaryCardProps {
  exerciseName: string;
  phasesReviewedCount: number;
  totalPhasesCount: number;
  checklistCompletedCount: number;
  totalChecklistCount: number;
  quizScore?: number | null;
  summaryMessage?: string;
  suggestedReviewTopics?: string[];
  onPracticeAgain: () => void;
  onDone: () => void;
}

export const GuidedPracticeSummaryCard: React.FC<GuidedPracticeSummaryCardProps> = ({
  exerciseName,
  phasesReviewedCount,
  totalPhasesCount,
  checklistCompletedCount,
  totalChecklistCount,
  quizScore,
  summaryMessage = 'Structured phase rehearsal completed successfully. Movement patterns and posture discipline reinforced.',
  suggestedReviewTopics = ['Starting Position', 'Breathing Rhythm', 'Core Stability'],
  onPracticeAgain,
  onDone,
}) => {
  return (
    <View style={styles.container}>
      {/* 1. Celebration Header */}
      <View style={styles.header}>
        <View style={styles.trophyCircle}>
          <Icon name="sparkles" size={28} color="#FFFFFF" />
        </View>
        <Text style={styles.title}>Practice Session Complete!</Text>
        <Text style={styles.exerciseNameText}>{exerciseName}</Text>
        <Text style={styles.subtitle}>
          Deliberate technique practice logged into your educational mastery journey.
        </Text>
      </View>

      {/* 2. Rehearsal Statistics */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>
            {phasesReviewedCount}/{totalPhasesCount}
          </Text>
          <Text style={styles.statLabel}>Phases Rehearsed</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statNumber}>
            {checklistCompletedCount}/{totalChecklistCount}
          </Text>
          <Text style={styles.statLabel}>Checkpoints Verified</Text>
        </View>

        {quizScore !== undefined && quizScore !== null && (
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{quizScore}%</Text>
            <Text style={styles.statLabel}>Knowledge Score</Text>
          </View>
        )}
      </View>

      {/* 3. Educational Feedback Assessment */}
      <View style={styles.feedbackSection}>
        <View style={styles.feedbackHeaderRow}>
          <Icon name="activity" size={16} color={themeColors.primary} />
          <Text style={styles.feedbackHeaderTitle}>Educational Form Assessment</Text>
        </View>
        <Text style={styles.feedbackSummaryText}>{summaryMessage}</Text>

        {suggestedReviewTopics.length > 0 && (
          <View style={styles.focusTopicsBox}>
            <Text style={styles.focusTopicsTitle}>Recommended Focus Areas</Text>
            <View style={styles.topicsPillsRow}>
              {suggestedReviewTopics.map((topic, index) => (
                <View key={index} style={styles.topicPill}>
                  <Icon name="check-circle" size={12} color={themeColors.primary} />
                  <Text style={styles.topicPillText}>{topic}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.nonDiagnosticDisclaimer}>
          <Icon name="shield" size={14} color={themeColors.textTertiary} />
          <Text style={styles.disclaimerText}>
            Form assessment is purely educational guidance based on self-reflection and checklist completion.
          </Text>
        </View>
      </View>

      {/* 4. Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={onDone}
          accessibilityRole="button"
          accessibilityLabel="Return to Exercise Detail"
        >
          <Text style={styles.doneButtonText}>Finish & Return to Exercise</Text>
          <Icon name="chevron-right" size={18} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={onPracticeAgain}
          accessibilityRole="button"
          accessibilityLabel="Practice Again"
        >
          <Icon name="dumbbell" size={16} color={themeColors.primary} />
          <Text style={styles.retryButtonText}>Rehearse Again</Text>
        </TouchableOpacity>
      </View>
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
    alignItems: 'center',
    gap: spacing.xs,
  },
  trophyCircle: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: themeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    ...typography.title,
    fontWeight: '800',
    color: themeColors.textPrimary,
    textAlign: 'center',
  },
  exerciseNameText: {
    ...typography.subtitle,
    color: themeColors.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: 2,
  },
  statNumber: {
    ...typography.title,
    fontWeight: '800',
    color: themeColors.textPrimary,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.textSecondary,
    textAlign: 'center',
  },
  feedbackSection: {
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: spacing.sm,
  },
  feedbackHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  feedbackHeaderTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.primary,
    letterSpacing: 0.5,
  },
  feedbackSummaryText: {
    ...typography.body,
    color: themeColors.textPrimary,
    lineHeight: 20,
  },
  focusTopicsBox: {
    gap: spacing.xs,
    marginTop: 4,
  },
  focusTopicsTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.textSecondary,
  },
  topicsPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  topicPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.25)',
  },
  topicPillText: {
    ...typography.caption,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  nonDiagnosticDisclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
  },
  disclaimerText: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.textTertiary,
    flex: 1,
    lineHeight: 14,
  },
  actionButtonsContainer: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  doneButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: spacing.xs,
  },
  retryButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: themeColors.primary,
  },
});
