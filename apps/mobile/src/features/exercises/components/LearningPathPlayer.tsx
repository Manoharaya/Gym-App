import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

import { Card, Icon, Badge, Button } from '../../../components/primitives';
import { themeColors, typography, radius, spacing } from '../../../theme';
import type {
  LearningPathLessonDetail,
  KnowledgeCheckSummary,
} from '../services/exerciseService';
import { LessonContentBlockView } from './LessonContentBlockView';

interface LearningPathPlayerProps {
  lesson: LearningPathLessonDetail;
  knowledgeCheck?: KnowledgeCheckSummary | null;
  isSubmitting?: boolean;
  onCompleteAndNext: (notes?: string) => void;
  onPreviousLesson?: () => void;
  onNextLesson?: () => void;
  onOpenExerciseDetail?: (exerciseId: string) => void;
  onOpenKnowledgeCheck?: (checkId: string) => void;
  onGlossaryPress?: (termSlug: string) => void;
  onMovementPatternPress?: (pattern: string) => void;
}

export const LearningPathPlayer: React.FC<LearningPathPlayerProps> = ({
  lesson,
  knowledgeCheck,
  isSubmitting = false,
  onCompleteAndNext,
  onPreviousLesson,
  onNextLesson,
  onOpenExerciseDetail,
  onOpenKnowledgeCheck,
  onGlossaryPress,
  onMovementPatternPress,
}) => {
  const lessonTypeLabel = lesson.lessonType.replace(/_/g, ' ');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Breadcrumb & Position Bar */}
      <View style={styles.topBar}>
        <View style={styles.positionCluster}>
          <Badge label={`LESSON ${lesson.position.current} OF ${lesson.position.total}`} variant="primary" />
          <Badge label={lessonTypeLabel} variant="neutral" />
        </View>

        {lesson.isCompleted ? (
          <View style={styles.completedBadge}>
            <Icon name="check-circle" size={14} color={themeColors.success} />
            <Text style={styles.completedBadgeText}>Completed</Text>
          </View>
        ) : (
          <View style={styles.estimateBadge}>
            <Icon name="clock" size={13} color={themeColors.textSecondary} />
            <Text style={styles.estimateText}>{lesson.estimatedMinutes} min</Text>
          </View>
        )}
      </View>

      {/* Section and Title */}
      {lesson.section && (
        <Text style={styles.sectionHeader}>{lesson.section.title.toUpperCase()}</Text>
      )}

      <Text style={styles.lessonTitle}>{lesson.title}</Text>

      {lesson.description ? (
        <Text style={styles.lessonDescription}>{lesson.description}</Text>
      ) : null}

      {/* Primary Learning Objective Box */}
      {lesson.learningObjective && (
        <Card style={styles.objectiveCard}>
          <View style={styles.objectiveHeader}>
            <Icon name="bolt" size={16} color={themeColors.primary} />
            <Text style={styles.objectiveTitle}>LEARNING OBJECTIVE</Text>
          </View>
          <Text style={styles.objectiveText}>{lesson.learningObjective}</Text>
        </Card>
      )}

      {/* Associated Exercise Link Card */}
      {lesson.exercise && (
        <Card style={styles.exerciseCard}>
          <View style={styles.exerciseCardHeader}>
            <View style={styles.exerciseIconHalo}>
              <Icon name="dumbbell" size={18} color={themeColors.accent} />
            </View>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseCardPre}>PRACTICE MOVEMENT</Text>
              <Text style={styles.exerciseCardName}>{lesson.exercise.name}</Text>
              <Text style={styles.exerciseCardMeta}>
                {lesson.exercise.primaryMuscleGroup} • {lesson.exercise.equipment} • {lesson.exercise.difficulty}
              </Text>
            </View>
          </View>

          {onOpenExerciseDetail && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onOpenExerciseDetail(lesson.exercise!.id)}
              style={styles.openDetailButton}
            >
              <Text style={styles.openDetailText}>View Visual Movement Breakdown</Text>
              <Icon name="chevron-right" size={13} color={themeColors.primary} />
            </TouchableOpacity>
          )}
        </Card>
      )}

      {/* Modular Content Blocks or Legacy Content Breakdown */}
      {lesson.contentBlocks && lesson.contentBlocks.length > 0 ? (
        <View style={styles.contentSection}>
          <Text style={styles.sectionHeading}>Lesson Content & Visuals</Text>
          {lesson.contentBlocks.map((block, idx) => (
            <LessonContentBlockView
              key={block.id || idx}
              block={block}
              onGlossaryPress={onGlossaryPress}
              onExercisePress={onOpenExerciseDetail}
              onMovementPatternPress={onMovementPatternPress}
            />
          ))}
        </View>
      ) : lesson.content ? (
        <View style={styles.contentSection}>
          <Text style={styles.sectionHeading}>Coaching Guidance</Text>
          <Text style={styles.bodyContent}>{lesson.content}</Text>
        </View>
      ) : null}

      {/* Key Takeaways */}
      {lesson.keyTakeaways && lesson.keyTakeaways.length > 0 && (
        <View style={styles.takeawaysSection}>
          <Text style={styles.sectionHeading}>Key Takeaways & Form Cues</Text>
          {lesson.keyTakeaways.map((point, idx) => (
            <View key={idx} style={styles.takeawayRow}>
              <View style={styles.checkCircle}>
                <Icon name="check" size={12} color={themeColors.success} />
              </View>
              <Text style={styles.takeawayText}>{point}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Knowledge Check Assessment Card */}
      {knowledgeCheck && (
        <Card style={styles.knowledgeCheckCard}>
          <View style={styles.knowledgeCheckHeader}>
            <View
              style={[
                styles.knowledgeCheckIconBox,
                knowledgeCheck.isPassed && styles.knowledgeCheckIconBoxPassed,
              ]}
            >
              <Icon
                name={knowledgeCheck.isPassed ? 'check-circle' : 'alert-circle'}
                size={22}
                color={knowledgeCheck.isPassed ? themeColors.success : themeColors.primary}
              />
            </View>
            <View style={styles.knowledgeCheckInfo}>
              <View style={styles.knowledgeCheckBadgeRow}>
                <Badge
                  label={
                    knowledgeCheck.isPassed
                      ? 'PASSED'
                      : knowledgeCheck.isRequiredForLesson
                      ? 'REQUIRED CHECK'
                      : 'KNOWLEDGE CHECK'
                  }
                  variant={
                    knowledgeCheck.isPassed
                      ? 'success'
                      : knowledgeCheck.isRequiredForLesson
                      ? 'danger'
                      : 'primary'
                  }
                />
                {knowledgeCheck.bestScore !== null && knowledgeCheck.bestScore !== undefined && (
                  <Badge label={`Score: ${Math.round(knowledgeCheck.bestScore)}%`} variant="neutral" />
                )}
              </View>
              <Text style={styles.knowledgeCheckTitle}>{knowledgeCheck.title}</Text>
              <Text style={styles.knowledgeCheckMeta}>
                {knowledgeCheck.questionCount} Questions • Passing: {knowledgeCheck.passingScore}%
              </Text>
            </View>
          </View>

          {onOpenKnowledgeCheck && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onOpenKnowledgeCheck(knowledgeCheck.id)}
              style={[
                styles.knowledgeCheckBtn,
                knowledgeCheck.isPassed && styles.knowledgeCheckBtnPassed,
              ]}
            >
              <Text
                style={[
                  styles.knowledgeCheckBtnText,
                  knowledgeCheck.isPassed && styles.knowledgeCheckBtnTextPassed,
                ]}
              >
                {knowledgeCheck.isPassed
                  ? 'Review or Retake Assessment'
                  : 'Start Knowledge Check'}
              </Text>
              <Icon
                name="chevron-right"
                size={14}
                color={knowledgeCheck.isPassed ? themeColors.textPrimary : '#FFF'}
              />
            </TouchableOpacity>
          )}
        </Card>
      )}

      {/* Bottom Floating Navigation & Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.prevNextRow}>
          <TouchableOpacity
            disabled={!lesson.previousLessonId}
            onPress={onPreviousLesson}
            style={[styles.navButton, !lesson.previousLessonId && styles.navButtonDisabled]}
          >
            <Icon
              name="chevron-left"
              size={16}
              color={lesson.previousLessonId ? themeColors.textPrimary : 'rgba(255,255,255,0.2)'}
            />
            <Text
              style={[
                styles.navButtonText,
                !lesson.previousLessonId && styles.navButtonTextDisabled,
              ]}
            >
              Previous
            </Text>
          </TouchableOpacity>

          {lesson.nextLessonId && (
            <TouchableOpacity
              onPress={onNextLesson}
              style={styles.navButton}
            >
              <Text style={styles.navButtonText}>Skip to Next</Text>
              <Icon name="chevron-right" size={16} color={themeColors.textPrimary} />
            </TouchableOpacity>
          )}
        </View>

        <Button
          title={
            lesson.isCompleted
              ? lesson.nextLessonId
                ? 'Completed (Continue Next)'
                : 'Completed Path!'
              : lesson.nextLessonId
              ? 'Complete & Next Lesson'
              : 'Complete Learning Path'
          }
          variant={lesson.isCompleted ? 'outline' : 'primary'}
          size="lg"
          loading={isSubmitting}
          disabled={isSubmitting}
          onPress={() => onCompleteAndNext()}
          style={styles.completeBtn}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  positionCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  completedBadgeText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: themeColors.success,
  },
  estimateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  estimateText: {
    ...typography.caption,
    fontSize: 12,
    color: themeColors.textSecondary,
  },
  sectionHeader: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: themeColors.primary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  lessonTitle: {
    ...typography.title,
    fontSize: 22,
    fontWeight: '800',
    color: themeColors.textPrimary,
    marginBottom: spacing.xs,
  },
  lessonDescription: {
    ...typography.body,
    fontSize: 14,
    color: themeColors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  objectiveCard: {
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: themeColors.primary,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.sm,
  },
  objectiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  objectiveTitle: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    color: themeColors.primary,
    letterSpacing: 0.8,
  },
  objectiveText: {
    ...typography.body,
    fontSize: 14,
    color: themeColors.textPrimary,
    lineHeight: 20,
    fontWeight: '500',
  },
  exerciseCard: {
    backgroundColor: themeColors.cardBackground,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginBottom: spacing.md,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  exerciseIconHalo: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseCardPre: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.accent,
    letterSpacing: 0.8,
  },
  exerciseCardName: {
    ...typography.subtitle,
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  exerciseCardMeta: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textSecondary,
  },
  openDetailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 8,
    borderRadius: radius.sm,
    gap: 6,
  },
  openDetailText: {
    ...typography.caption,
    color: themeColors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  contentSection: {
    marginBottom: spacing.lg,
  },
  sectionHeading: {
    ...typography.subtitle,
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginBottom: spacing.sm,
  },
  bodyContent: {
    ...typography.body,
    fontSize: 14,
    color: themeColors.textSecondary,
    lineHeight: 22,
  },
  takeawaysSection: {
    marginBottom: spacing.xl,
  },
  takeawayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  takeawayText: {
    ...typography.body,
    fontSize: 13,
    color: themeColors.textPrimary,
    flex: 1,
    lineHeight: 19,
  },
  actionBar: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    paddingTop: spacing.md,
  },
  prevNextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 4,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    ...typography.caption,
    fontSize: 13,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: themeColors.textSecondary,
  },
  completeBtn: {
    width: '100%',
  },
  knowledgeCheckCard: {
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  knowledgeCheckHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  knowledgeCheckIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  knowledgeCheckIconBoxPassed: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  knowledgeCheckInfo: {
    flex: 1,
  },
  knowledgeCheckBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  knowledgeCheckTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginBottom: 2,
  },
  knowledgeCheckMeta: {
    fontSize: 11,
    color: themeColors.textSecondary,
  },
  knowledgeCheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  knowledgeCheckBtnPassed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  knowledgeCheckBtnText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: '#FFF',
  },
  knowledgeCheckBtnTextPassed: {
    color: themeColors.textPrimary,
  },
});
