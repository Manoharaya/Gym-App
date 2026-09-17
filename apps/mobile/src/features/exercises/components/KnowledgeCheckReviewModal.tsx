import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import { Icon, Badge } from '../../../components/primitives';
import { themeColors, typography, radius, spacing } from '../../../theme';
import type { KnowledgeAttemptReview } from '../services/exerciseService';

interface KnowledgeCheckReviewModalProps {
  visible: boolean;
  onClose: () => void;
  review: KnowledgeAttemptReview | null;
  loading?: boolean;
}

export const KnowledgeCheckReviewModal: React.FC<KnowledgeCheckReviewModalProps> = ({
  visible,
  onClose,
  review,
  loading = false,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerSubtitle}>QUESTION REVIEW</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {review?.checkTitle || 'Knowledge Assessment'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="close" size={22} color={themeColors.textPrimary} />
          </TouchableOpacity>
        </View>

        {loading || !review ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
            <Text style={styles.loadingText}>Loading review details...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Score Summary Banner */}
            <View style={[styles.scoreBanner, review.passed ? styles.bannerPassed : styles.bannerFailed]}>
              <View style={styles.scoreRow}>
                <View style={[styles.scoreIconContainer, review.passed ? styles.iconPassed : styles.iconFailed]}>
                  <Icon
                    name={review.passed ? 'check-circle' : 'alert-circle'}
                    size={24}
                    color={review.passed ? themeColors.success : themeColors.danger}
                  />
                </View>
                <View style={styles.scoreTextGroup}>
                  <Text style={styles.scoreTitle}>
                    {review.passed ? 'Assessment Passed' : 'Needs Review'}
                  </Text>
                  <Text style={styles.scoreSubtitle}>
                    Final Score: {Math.round(review.score)}% (Passing: {review.passingScore}%)
                  </Text>
                </View>
              </View>
            </View>

            {/* Questions Breakdown */}
            <Text style={styles.sectionHeader}>Question Breakdown ({review.questions.length})</Text>

            {review.questions.map((q, index) => {
              const isCorrect = q.userIsCorrect;
              const typeLabel = q.questionType.replace(/_/g, ' ');

              return (
                <View
                  key={q.questionId || index}
                  style={[
                    styles.questionCard,
                    isCorrect ? styles.questionCardCorrect : styles.questionCardIncorrect,
                  ]}
                >
                  <View style={styles.questionHeader}>
                    <View style={styles.questionBadgeRow}>
                      <Badge
                        label={`Q${index + 1}`}
                        variant={isCorrect ? 'success' : 'danger'}
                      />
                      <Badge label={typeLabel} variant="neutral" />
                    </View>
                    <View style={styles.statusIndicator}>
                      <Icon
                        name={isCorrect ? 'check' : 'close'}
                        size={14}
                        color={isCorrect ? themeColors.success : themeColors.danger}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          { color: isCorrect ? themeColors.success : themeColors.danger },
                        ]}
                      >
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.questionText}>{q.questionText}</Text>

                  {/* Member Answer */}
                  <View style={styles.answerBlock}>
                    <Text style={styles.answerLabel}>YOUR RESPONSE:</Text>
                    <Text
                      style={[
                        styles.answerValue,
                        { color: isCorrect ? themeColors.success : themeColors.danger },
                      ]}
                    >
                      {formatAnswer(q.userAnswers, q.questionType)}
                    </Text>
                  </View>

                  {/* Correct Answer if incorrect */}
                  {!isCorrect && q.correctAnswers && (
                    <View style={styles.correctAnswerBlock}>
                      <Text style={styles.correctAnswerLabel}>CORRECT ANSWER:</Text>
                      <Text style={styles.correctAnswerValue}>
                        {formatAnswer(q.correctAnswers, q.questionType)}
                      </Text>
                    </View>
                  )}

                  {/* Pedagogical Explanation */}
                  {q.explanation ? (
                    <View style={styles.explanationBox}>
                      <View style={styles.explanationHeader}>
                        <Icon name="alert-circle" size={14} color={themeColors.primary} />
                        <Text style={styles.explanationTitle}>Explanation & Rationale</Text>
                      </View>
                      <Text style={styles.explanationText}>{q.explanation}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

function formatAnswer(answers: any, _type?: string): string {
  if (!answers) return 'No answer provided';
  if (Array.isArray(answers)) {
    if (answers.length === 0) return 'None';
    return answers
      .map((item, idx) => (typeof item === 'string' ? item : item.text || item.id || `Item ${idx + 1}`))
      .join(', ');
  }
  if (typeof answers === 'object') {
    return Object.entries(answers)
      .map(([k, v]) => `${k} → ${v}`)
      .join('\n');
  }
  return String(answers);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: themeColors.surface,
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.primary,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  closeButton: {
    padding: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    color: themeColors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  scoreBanner: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  bannerPassed: {
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
    borderColor: 'rgba(52, 199, 89, 0.25)',
  },
  bannerFailed: {
    backgroundColor: 'rgba(255, 69, 58, 0.08)',
    borderColor: 'rgba(255, 69, 58, 0.25)',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconPassed: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
  },
  iconFailed: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
  },
  scoreTextGroup: {
    flex: 1,
  },
  scoreTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  scoreSubtitle: {
    fontSize: typography.fontSize.xs,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: themeColors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  questionCard: {
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  questionCardCorrect: {
    borderColor: 'rgba(52, 199, 89, 0.2)',
  },
  questionCardIncorrect: {
    borderColor: 'rgba(255, 69, 58, 0.2)',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  questionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
  },
  questionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: themeColors.textPrimary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  answerBlock: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  answerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.textSecondary,
    marginBottom: 2,
  },
  answerValue: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  correctAnswerBlock: {
    backgroundColor: 'rgba(52, 199, 89, 0.05)',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  correctAnswerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.success,
    marginBottom: 2,
  },
  correctAnswerValue: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: themeColors.success,
  },
  explanationBox: {
    marginTop: spacing.xs,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    borderRadius: radius.sm,
    padding: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: themeColors.primary,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  explanationTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: themeColors.primary,
  },
  explanationText: {
    fontSize: typography.fontSize.xs,
    color: themeColors.textSecondary,
    lineHeight: 18,
  },
});
