import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import { Card, Icon, Button } from '../../../components/primitives';
import { themeColors, typography, radius, spacing } from '../../../theme';
import type {
  KnowledgeCheckAttemptResult,
  KnowledgeCheckPlayerDto,
} from '../services/exerciseService';

interface KnowledgeCheckResultCardProps {
  result: KnowledgeCheckAttemptResult;
  check: KnowledgeCheckPlayerDto;
  onReviewAnswers: () => void;
  onRetakeCheck: () => void;
  onContinue: () => void;
  onOpenRecommendedExercise?: (exerciseId: string) => void;
}

export const KnowledgeCheckResultCard: React.FC<KnowledgeCheckResultCardProps> = ({
  result,
  check,
  onReviewAnswers,
  onRetakeCheck,
  onContinue,
  onOpenRecommendedExercise,
}) => {
  const passed = result.passed;
  const scorePercent = Math.round(result.score);
  const timeFormatted = result.timeSpentSeconds
    ? `${Math.floor(result.timeSpentSeconds / 60)}m ${result.timeSpentSeconds % 60}s`
    : null;

  return (
    <Card style={[styles.container, passed ? styles.cardPassed : styles.cardFailed]}>
      {/* Result Hero Header */}
      <View style={styles.heroSection}>
        <View style={[styles.iconCircle, passed ? styles.iconCirclePassed : styles.iconCircleFailed]}>
          <Icon
            name={passed ? 'trophy' : 'refresh'}
            size={36}
            color={passed ? themeColors.primary : themeColors.accent}
          />
        </View>

        <Text style={styles.statusTitle}>
          {passed ? 'Assessment Passed! 🎉' : 'Needs More Practice'}
        </Text>

        <Text style={styles.statusDescription}>
          {passed
            ? 'Excellent work! You have demonstrated strong biomechanical and technique understanding.'
            : `You scored ${scorePercent}%. A score of ${result.passingScore}% is required to master this concept.`}
        </Text>
      </View>

      {/* Score and Stats Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>SCORE</Text>
          <Text style={[styles.metricValue, { color: passed ? themeColors.success : themeColors.danger }]}>
            {scorePercent}%
          </Text>
          <Text style={styles.metricSub}>Pass: {result.passingScore}%</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>CORRECT</Text>
          <Text style={styles.metricValue}>
            {result.correctCount} / {result.questionCount}
          </Text>
          <Text style={styles.metricSub}>Questions</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>ATTEMPT</Text>
          <Text style={styles.metricValue}>#{result.attemptNumber}</Text>
          <Text style={styles.metricSub}>
            {check.attemptLimit ? `Max ${check.attemptLimit}` : 'Unlimited'}
          </Text>
        </View>

        {timeFormatted && (
          <>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>TIME</Text>
              <Text style={styles.metricValue}>{timeFormatted}</Text>
              <Text style={styles.metricSub}>Spent</Text>
            </View>
          </>
        )}
      </View>

      {/* Lesson Unlocking Status */}
      {check.isRequiredForLesson && (
        <View style={[styles.gateNotice, passed ? styles.gateNoticePassed : styles.gateNoticeLocked]}>
          <Icon
            name={passed ? 'check-circle' : 'lock'}
            size={16}
            color={passed ? themeColors.success : themeColors.accent}
          />
          <Text style={styles.gateNoticeText}>
            {passed
              ? 'Lesson requirement satisfied: Guided lesson marked as complete!'
              : 'This assessment is required before completing this lesson.'}
          </Text>
        </View>
      )}

      {/* Targeted Review Recommendations */}
      {result.reviewRecommendations && result.reviewRecommendations.length > 0 && (
        <View style={styles.recommendationsSection}>
          <View style={styles.recHeader}>
            <Icon name="sparkles" size={15} color={themeColors.primary} />
            <Text style={styles.recTitle}>RECOMMENDED TOPICS TO REVIEW</Text>
          </View>
          {result.reviewRecommendations.map((rec, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={rec.exerciseId ? 0.7 : 1}
              disabled={!rec.exerciseId || !onOpenRecommendedExercise}
              onPress={() => rec.exerciseId && onOpenRecommendedExercise && onOpenRecommendedExercise(rec.exerciseId)}
              style={styles.recCard}
            >
              <View style={styles.recContent}>
                {rec.exerciseName && (
                  <Text style={styles.recExerciseName}>{rec.exerciseName}</Text>
                )}
                <Text style={styles.recReason}>{rec.reason}</Text>
              </View>
              {rec.exerciseId && onOpenRecommendedExercise && (
                <Icon name="chevron-right" size={14} color={themeColors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <Button
          title="Review Answers & Explanations"
          variant="outline"
          size="md"
          onPress={onReviewAnswers}
          style={styles.reviewBtn}
        />

        {!passed && (
          <Button
            title="Retake Knowledge Check"
            variant="primary"
            size="lg"
            onPress={onRetakeCheck}
            style={styles.retakeBtn}
          />
        )}

        <Button
          title={passed ? 'Continue Learning' : 'Return to Lesson'}
          variant={passed ? 'primary' : 'secondary'}
          size="lg"
          onPress={onContinue}
          style={styles.continueBtn}
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginVertical: spacing.md,
  },
  cardPassed: {
    borderColor: 'rgba(52, 199, 89, 0.3)',
    backgroundColor: 'rgba(52, 199, 89, 0.04)',
  },
  cardFailed: {
    borderColor: 'rgba(255, 159, 10, 0.3)',
    backgroundColor: 'rgba(255, 159, 10, 0.04)',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconCirclePassed: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
  },
  iconCircleFailed: {
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
  },
  statusTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
    color: themeColors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  statusDescription: {
    fontSize: typography.fontSize.sm,
    color: themeColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: themeColors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: typography.fontSize.md,
    fontWeight: '800',
    color: themeColors.textPrimary,
  },
  metricSub: {
    fontSize: 9,
    color: themeColors.textSecondary,
    marginTop: 1,
  },
  gateNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  gateNoticePassed: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  gateNoticeLocked: {
    backgroundColor: 'rgba(255, 159, 10, 0.1)',
  },
  gateNoticeText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    color: themeColors.textPrimary,
    fontWeight: '500',
  },
  recommendationsSection: {
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  recTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.primary,
    letterSpacing: 1,
  },
  recCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  recContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  recExerciseName: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  recReason: {
    fontSize: typography.fontSize.xs,
    color: themeColors.textSecondary,
    marginTop: 1,
  },
  actionButtonsContainer: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  reviewBtn: {
    marginBottom: spacing.xs,
  },
  retakeBtn: {
    marginBottom: spacing.xs,
  },
  continueBtn: {},
});
