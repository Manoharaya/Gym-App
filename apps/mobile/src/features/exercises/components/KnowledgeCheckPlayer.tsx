import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';

import { Icon, Button, Badge } from '../../../components/primitives';
import { themeColors, typography, radius, spacing } from '../../../theme';
import type {
  KnowledgeCheckPlayerDto,
  KnowledgeQuestionPlayer,
} from '../services/exerciseService';

interface KnowledgeCheckPlayerProps {
  check: KnowledgeCheckPlayerDto;
  onAnswerSubmit: (payload: {
    questionId: string;
    selectedAnswerIds?: string[];
    orderedItemIds?: string[];
    matchingPairs?: Record<string, string>;
    hintsUsed?: boolean;
  }) => Promise<{
    isCorrect: boolean;
    feedback?: string;
    explanation?: string;
    correctAnswers?: any;
  }>;
  onCompleteCheck: () => Promise<void>;
  onExit: () => void;
}

export const KnowledgeCheckPlayer: React.FC<KnowledgeCheckPlayerProps> = ({
  check,
  onAnswerSubmit,
  onCompleteCheck,
  onExit,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [hintVisible, setHintVisible] = useState(false);
  const [hintsUsedForQuestion, setHintsUsedForQuestion] = useState(false);

  // User input states for current question
  const [selectedAnswerIds, setSelectedAnswerIds] = useState<string[]>([]);
  const [orderedItemIds, setOrderedItemIds] = useState<string[]>([]);
  const [matchingPairs, setMatchingPairs] = useState<Record<string, string>>({});

  // Feedback state for current question
  const [submitting, setSubmitting] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState<{
    isCorrect: boolean;
    feedback?: string;
    explanation?: string;
    correctAnswers?: any;
  } | null>(null);

  const questions = check.questions;
  const currentQuestion: KnowledgeQuestionPlayer | undefined = questions[currentIdx];

  // Initialize question state whenever currentIdx changes
  useEffect(() => {
    setHintVisible(false);
    setHintsUsedForQuestion(false);
    setSelectedAnswerIds([]);
    setIsAnswered(false);
    setFeedbackResult(null);

    if (currentQuestion) {
      if (currentQuestion.questionType === 'ORDERING') {
        setOrderedItemIds(currentQuestion.answers.map((a) => a.id));
      } else {
        setOrderedItemIds([]);
      }
      setMatchingPairs({});
    }
  }, [currentIdx, currentQuestion]);

  if (!currentQuestion) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.emptyText}>Loading assessment...</Text>
      </View>
    );
  }

  const isLastQuestion = currentIdx === questions.length - 1;

  // Question Interaction Handlers
  const handleSelectAnswer = (answerId: string) => {
    if (isAnswered) return;

    if (currentQuestion.questionType === 'MULTI_SELECT') {
      setSelectedAnswerIds((prev) =>
        prev.includes(answerId)
          ? prev.filter((id) => id !== answerId)
          : [...prev, answerId],
      );
    } else {
      // Single select: MULTIPLE_CHOICE, TRUE_FALSE, IMAGE_CHOICE
      setSelectedAnswerIds([answerId]);
    }
  };

  const handleMoveOrder = (index: number, direction: 'up' | 'down') => {
    if (isAnswered) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= orderedItemIds.length) return;

    const newOrder = [...orderedItemIds];
    const temp = newOrder[index];
    const targetItem = newOrder[targetIdx];
    if (temp !== undefined && targetItem !== undefined) {
      newOrder[index] = targetItem;
      newOrder[targetIdx] = temp;
      setOrderedItemIds(newOrder);
    }
  };

  const handleSelectMatchingTarget = (termId: string, targetValue: string) => {
    if (isAnswered) return;
    setMatchingPairs((prev) => ({
      ...prev,
      [termId]: targetValue,
    }));
  };

  const handleShowHint = () => {
    setHintVisible(true);
    setHintsUsedForQuestion(true);
  };

  const canSubmit = (): boolean => {
    if (isAnswered) return true;
    if (currentQuestion.questionType === 'ORDERING') {
      return orderedItemIds.length > 0;
    }
    if (currentQuestion.questionType === 'MATCHING') {
      return Object.keys(matchingPairs).length === currentQuestion.answers.length;
    }
    return selectedAnswerIds.length > 0;
  };

  const handleSubmit = async () => {
    if (isAnswered) {
      // Advance to next question or complete assessment
      if (isLastQuestion) {
        setSubmitting(true);
        try {
          await onCompleteCheck();
        } finally {
          setSubmitting(false);
        }
      } else {
        setCurrentIdx((prev) => prev + 1);
      }
      return;
    }

    try {
      setSubmitting(true);
      const res = await onAnswerSubmit({
        questionId: currentQuestion.id,
        selectedAnswerIds:
          currentQuestion.questionType !== 'ORDERING' &&
          currentQuestion.questionType !== 'MATCHING'
            ? selectedAnswerIds
            : undefined,
        orderedItemIds:
          currentQuestion.questionType === 'ORDERING' ? orderedItemIds : undefined,
        matchingPairs:
          currentQuestion.questionType === 'MATCHING' ? matchingPairs : undefined,
        hintsUsed: hintsUsedForQuestion,
      });

      setFeedbackResult(res);
      setIsAnswered(true);
    } catch (err) {
      console.warn('Failed to submit question answer:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header & Progress Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onExit} style={styles.exitBtn}>
          <Icon name="close" size={20} color={themeColors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              { width: `${((currentIdx + 1) / questions.length) * 100}%` },
            ]}
          />
        </View>

        <Text style={styles.counterText}>
          {currentIdx + 1}/{questions.length}
        </Text>
      </View>

      <ScrollView
        style={styles.contentScrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Question Metadata & Tags */}
        <View style={styles.metaRow}>
          <Badge
            label={currentQuestion.questionType.replace(/_/g, ' ')}
            variant="primary"
          />
          {currentQuestion.difficulty && (
            <Badge label={currentQuestion.difficulty} variant="neutral" />
          )}
          {currentQuestion.hint && !hintVisible && !isAnswered && (
            <TouchableOpacity
              onPress={handleShowHint}
              style={styles.hintToggleBtn}
              activeOpacity={0.7}
            >
              <Icon name="alert-circle" size={13} color={themeColors.accent} />
              <Text style={styles.hintToggleText}>Show Hint</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Authored Hint Callout */}
        {hintVisible && currentQuestion.hint && (
          <View style={styles.hintBox}>
            <View style={styles.hintHeader}>
              <Icon name="alert-circle" size={14} color={themeColors.accent} />
              <Text style={styles.hintTitle}>COACHING HINT</Text>
            </View>
            <Text style={styles.hintText}>{currentQuestion.hint}</Text>
          </View>
        )}

        {/* Question Prompt */}
        <Text style={styles.questionText}>{currentQuestion.questionText}</Text>

        {/* Optional Media */}
        {currentQuestion.mediaUrl && (
          <View style={styles.mediaCard}>
            <Image
              source={{ uri: currentQuestion.mediaUrl }}
              style={styles.mediaImage}
              resizeMode="cover"
            />
            {currentQuestion.mediaAltText && (
              <Text style={styles.mediaCaption}>{currentQuestion.mediaAltText}</Text>
            )}
          </View>
        )}

        {/* ======================================================= */}
        {/* INTERACTIVE QUESTION TYPE RENDERERS */}
        {/* ======================================================= */}

        {/* 1. MULTIPLE CHOICE & MULTI SELECT */}
        {(currentQuestion.questionType === 'MULTIPLE_CHOICE' ||
          currentQuestion.questionType === 'MULTI_SELECT') && (
          <View style={styles.optionsList}>
            {currentQuestion.answers.map((ans) => {
              const isSelected = selectedAnswerIds.includes(ans.id);
              return (
                <TouchableOpacity
                  key={ans.id}
                  activeOpacity={0.7}
                  disabled={isAnswered}
                  onPress={() => handleSelectAnswer(ans.id)}
                  style={[
                    styles.answerCard,
                    isSelected && styles.answerCardSelected,
                    isAnswered && styles.answerCardDisabled,
                  ]}
                >
                  <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                    {isSelected && (
                      <View
                        style={
                          currentQuestion.questionType === 'MULTI_SELECT'
                            ? styles.multiSelectInner
                            : styles.radioInner
                        }
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.answerText,
                      isSelected && styles.answerTextSelected,
                    ]}
                  >
                    {ans.answerText}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* 2. TRUE / FALSE */}
        {currentQuestion.questionType === 'TRUE_FALSE' && (
          <View style={styles.trueFalseContainer}>
            {currentQuestion.answers.map((ans) => {
              const isSelected = selectedAnswerIds.includes(ans.id);
              const isTrue = ans.answerText.toLowerCase().includes('true');

              return (
                <TouchableOpacity
                  key={ans.id}
                  activeOpacity={0.7}
                  disabled={isAnswered}
                  onPress={() => handleSelectAnswer(ans.id)}
                  style={[
                    styles.tfButton,
                    isSelected && (isTrue ? styles.tfButtonTrueSelected : styles.tfButtonFalseSelected),
                    isAnswered && styles.answerCardDisabled,
                  ]}
                >
                  <Icon
                    name={isTrue ? 'check' : 'close'}
                    size={24}
                    color={isSelected ? '#FFF' : themeColors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.tfButtonText,
                      isSelected && styles.tfButtonTextSelected,
                    ]}
                  >
                    {ans.answerText}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* 3. IMAGE CHOICE */}
        {currentQuestion.questionType === 'IMAGE_CHOICE' && (
          <View style={styles.imageGrid}>
            {currentQuestion.answers.map((ans) => {
              const isSelected = selectedAnswerIds.includes(ans.id);
              return (
                <TouchableOpacity
                  key={ans.id}
                  activeOpacity={0.7}
                  disabled={isAnswered}
                  onPress={() => handleSelectAnswer(ans.id)}
                  style={[
                    styles.imageChoiceCard,
                    isSelected && styles.imageChoiceCardSelected,
                    isAnswered && styles.answerCardDisabled,
                  ]}
                >
                  {ans.mediaUrl ? (
                    <Image
                      source={{ uri: ans.mediaUrl }}
                      style={styles.imageChoiceImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.imageChoicePlaceholder}>
                      <Icon name="sparkles" size={24} color={themeColors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.imageChoiceLabelBox}>
                    <Text
                      style={[
                        styles.imageChoiceText,
                        isSelected && styles.imageChoiceTextSelected,
                      ]}
                      numberOfLines={2}
                    >
                      {ans.answerText}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* 4. ORDERING (Movement sequence steps) */}
        {currentQuestion.questionType === 'ORDERING' && (
          <View style={styles.orderingContainer}>
            <Text style={styles.orderingHint}>
              Use arrows to order steps from first to last:
            </Text>
            {orderedItemIds.map((itemId, idx) => {
              const item = currentQuestion.answers.find((a) => a.id === itemId);
              if (!item) return null;

              return (
                <View key={itemId} style={styles.orderingRow}>
                  <View style={styles.orderIndexBadge}>
                    <Text style={styles.orderIndexText}>{idx + 1}</Text>
                  </View>

                  <Text style={styles.orderingText} numberOfLines={2}>
                    {item.answerText}
                  </Text>

                  {!isAnswered && (
                    <View style={styles.orderingButtons}>
                      <TouchableOpacity
                        disabled={idx === 0}
                        onPress={() => handleMoveOrder(idx, 'up')}
                        style={[styles.arrowBtn, idx === 0 && styles.arrowBtnDisabled]}
                      >
                        <Text style={styles.arrowText}>▲</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={idx === orderedItemIds.length - 1}
                        onPress={() => handleMoveOrder(idx, 'down')}
                        style={[
                          styles.arrowBtn,
                          idx === orderedItemIds.length - 1 && styles.arrowBtnDisabled,
                        ]}
                      >
                        <Text style={styles.arrowText}>▼</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* 5. MATCHING (Exercise term to target description) */}
        {currentQuestion.questionType === 'MATCHING' && (
          <View style={styles.matchingContainer}>
            <Text style={styles.orderingHint}>
              Select the matching definition or target for each item:
            </Text>
            {currentQuestion.answers.map((ans) => {
              const currentMatch = matchingPairs[ans.id];
              return (
                <View key={ans.id} style={styles.matchingRow}>
                  <Text style={styles.matchingTerm}>{ans.answerText}</Text>
                  <View style={styles.matchingTargetsRow}>
                    {(currentQuestion.matchingTargets || []).map((target) => {
                      const isChosen = currentMatch === target;
                      return (
                        <TouchableOpacity
                          key={target}
                          activeOpacity={0.7}
                          disabled={isAnswered}
                          onPress={() => handleSelectMatchingTarget(ans.id, target)}
                          style={[
                            styles.targetPill,
                            isChosen && styles.targetPillSelected,
                            isAnswered && styles.answerCardDisabled,
                          ]}
                        >
                          <Text
                            style={[
                              styles.targetPillText,
                              isChosen && styles.targetPillTextSelected,
                            ]}
                          >
                            {target}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ======================================================= */}
        {/* POST-SUBMISSION INSTANT FEEDBACK BANNER */}
        {/* ======================================================= */}
        {isAnswered && feedbackResult && (
          <View
            style={[
              styles.feedbackBanner,
              feedbackResult.isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect,
            ]}
          >
            <View style={styles.feedbackHeader}>
              <Icon
                name={feedbackResult.isCorrect ? 'check-circle' : 'alert-circle'}
                size={18}
                color={feedbackResult.isCorrect ? themeColors.success : themeColors.danger}
              />
              <Text
                style={[
                  styles.feedbackTitle,
                  { color: feedbackResult.isCorrect ? themeColors.success : themeColors.danger },
                ]}
              >
                {feedbackResult.isCorrect ? 'Correct!' : 'Incorrect'}
              </Text>
            </View>

            {feedbackResult.feedback && (
              <Text style={styles.feedbackBody}>{feedbackResult.feedback}</Text>
            )}

            {feedbackResult.explanation && (
              <View style={styles.pedagogicalBox}>
                <Text style={styles.pedagogicalHeading}>COACH NOTE</Text>
                <Text style={styles.pedagogicalText}>
                  {feedbackResult.explanation}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <View style={styles.bottomBar}>
        <Button
          title={
            isAnswered
              ? isLastQuestion
                ? 'Finish Assessment'
                : 'Next Question'
              : 'Check Answer'
          }
          variant={isAnswered ? 'primary' : canSubmit() ? 'primary' : 'outline'}
          size="lg"
          loading={submitting}
          disabled={!canSubmit() || submitting}
          onPress={handleSubmit}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: spacing.sm,
    color: themeColors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  exitBtn: {
    padding: spacing.xs,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: themeColors.primary,
    borderRadius: 3,
  },
  counterText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: themeColors.textSecondary,
    minWidth: 32,
    textAlign: 'right',
  },
  contentScrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  hintToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  hintToggleText: {
    fontSize: 11,
    color: themeColors.accent,
    fontWeight: '700',
  },
  hintBox: {
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    borderRadius: radius.md,
    padding: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: themeColors.accent,
    marginBottom: spacing.md,
  },
  hintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  hintTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: themeColors.accent,
    letterSpacing: 1,
  },
  hintText: {
    fontSize: typography.fontSize.xs,
    color: themeColors.textPrimary,
    lineHeight: 18,
  },
  questionText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: themeColors.textPrimary,
    lineHeight: 26,
    marginBottom: spacing.md,
  },
  mediaCard: {
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  mediaImage: {
    width: '100%',
    height: 180,
  },
  mediaCaption: {
    padding: spacing.xs,
    fontSize: 11,
    color: themeColors.textSecondary,
    textAlign: 'center',
  },
  optionsList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  answerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: spacing.sm,
  },
  answerCardSelected: {
    borderColor: themeColors.primary,
    backgroundColor: 'rgba(230, 57, 70, 0.08)',
  },
  answerCardDisabled: {
    opacity: 0.85,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: {
    borderColor: themeColors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: themeColors.primary,
  },
  multiSelectInner: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: themeColors.primary,
  },
  answerText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: themeColors.textPrimary,
    lineHeight: 20,
  },
  answerTextSelected: {
    fontWeight: '700',
    color: themeColors.primary,
  },
  trueFalseContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  tfButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: themeColors.surface,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: spacing.xs,
  },
  tfButtonTrueSelected: {
    borderColor: themeColors.success,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  tfButtonFalseSelected: {
    borderColor: themeColors.danger,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  tfButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '700',
    color: themeColors.textSecondary,
  },
  tfButtonTextSelected: {
    color: themeColors.textPrimary,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  imageChoiceCard: {
    width: '48%',
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: themeColors.surface,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  imageChoiceCardSelected: {
    borderColor: themeColors.primary,
  },
  imageChoiceImg: {
    width: '100%',
    height: 110,
  },
  imageChoicePlaceholder: {
    width: '100%',
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  imageChoiceLabelBox: {
    padding: spacing.xs,
  },
  imageChoiceText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: themeColors.textPrimary,
    textAlign: 'center',
  },
  imageChoiceTextSelected: {
    color: themeColors.primary,
  },
  orderingContainer: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  orderingHint: {
    fontSize: typography.fontSize.xs,
    color: themeColors.textSecondary,
    marginBottom: spacing.xs,
  },
  orderingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: spacing.sm,
  },
  orderIndexBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderIndexText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  orderingText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    color: themeColors.textPrimary,
    fontWeight: '500',
  },
  orderingButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  arrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowBtnDisabled: {
    opacity: 0.25,
  },
  arrowText: {
    fontSize: 12,
    color: themeColors.textPrimary,
  },
  matchingContainer: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  matchingRow: {
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  matchingTerm: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginBottom: spacing.xs,
  },
  matchingTargetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  targetPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  targetPillSelected: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  targetPillText: {
    fontSize: 11,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  targetPillTextSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
  feedbackBanner: {
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  feedbackCorrect: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  feedbackIncorrect: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  feedbackTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '800',
  },
  feedbackBody: {
    fontSize: typography.fontSize.xs,
    color: themeColors.textPrimary,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  pedagogicalBox: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  pedagogicalHeading: {
    fontSize: 9,
    fontWeight: '800',
    color: themeColors.textSecondary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  pedagogicalText: {
    fontSize: 11,
    color: themeColors.textSecondary,
    lineHeight: 16,
  },
  bottomBar: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: themeColors.surface,
  },
});
