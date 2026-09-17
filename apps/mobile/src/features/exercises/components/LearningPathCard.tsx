import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import { Card, Icon, Badge } from '../../../components/primitives';
import { themeColors, typography, radius, spacing } from '../../../theme';
import type { LearningPathSummary } from '../services/exerciseService';

interface LearningPathCardProps {
  path: LearningPathSummary;
  onPress: (path: LearningPathSummary) => void;
  onResumeLesson?: (pathId: string, lessonId: string) => void;
}

export const LearningPathCard: React.FC<LearningPathCardProps> = ({
  path,
  onPress,
  onResumeLesson,
}) => {
  const isCompleted = path.progress?.status === 'COMPLETED';
  const isInProgress = path.progress?.status === 'IN_PROGRESS';
  const percentComplete = path.progress?.percentComplete || 0;
  const completedLessons = path.progress?.completedLessons || 0;
  const totalLessons = path.lessonCount || path.progress?.totalLessons || 0;

  const categoryLabel = path.category?.replace(/_/g, ' ') || 'LEARNING PATH';
  const difficultyLabel = path.difficulty?.replace(/_/g, ' ') || 'BEGINNER';

  const handleResume = (e: any) => {
    e.stopPropagation();
    if (onResumeLesson && path.progress?.currentLessonId) {
      onResumeLesson(path.id, path.progress.currentLessonId);
    } else {
      onPress(path);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onPress(path)}
      style={styles.container}
    >
      <Card style={[styles.card, isCompleted && styles.cardCompleted]}>
        <View style={styles.topRow}>
          <View style={styles.badgeCluster}>
            <Badge
              label={categoryLabel}
              variant={isCompleted ? 'success' : path.featured ? 'primary' : 'neutral'}
            />
            <Badge label={difficultyLabel} variant="neutral" />
            {path.primaryGoal && (
              <Badge label={path.primaryGoal.replace(/_/g, ' ')} variant="neutral" />
            )}
          </View>

          <View style={styles.durationBadge}>
            <Icon name="clock" size={12} color={themeColors.textSecondary} />
            <Text style={styles.durationText}>{path.estimatedDurationMinutes}m</Text>
          </View>
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.title} numberOfLines={2}>
            {path.title}
          </Text>
          {path.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {path.description}
            </Text>
          ) : null}
        </View>

        {/* Progress Bar & Indicators */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.max(5, percentComplete)}%` },
                isCompleted && styles.progressBarFillCompleted,
              ]}
            />
          </View>

          <View style={styles.progressLabelsRow}>
            <View style={styles.statusIndicator}>
              {isCompleted ? (
                <>
                  <Icon name="check-circle" size={13} color={themeColors.success} />
                  <Text style={[styles.statusText, { color: themeColors.success }]}>
                    Path Completed
                  </Text>
                </>
              ) : isInProgress ? (
                <>
                  <Icon name="activity" size={13} color={themeColors.primary} />
                  <Text style={[styles.statusText, { color: themeColors.primary }]}>
                    {completedLessons} of {totalLessons} Lessons Done
                  </Text>
                </>
              ) : (
                <>
                  <Icon name="award" size={13} color={themeColors.textSecondary} />
                  <Text style={styles.statusText}>
                    {totalLessons} Guided Lessons
                  </Text>
                </>
              )}
            </View>

            <Text style={styles.percentText}>{percentComplete}%</Text>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.footerRow}>
          <View style={styles.exerciseCountMeta}>
            <Icon name="activity" size={13} color={themeColors.accent} />
            <Text style={styles.exerciseCountText}>
              {path.exerciseCount > 0 ? `${path.exerciseCount} exercises taught` : 'Theory & Technique'}
            </Text>
          </View>

          {isInProgress ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleResume}
              style={styles.resumeButton}
            >
              <Text style={styles.resumeButtonText}>Resume</Text>
              <Icon name="chevron-right" size={13} color="#FFFFFF" />
            </TouchableOpacity>
          ) : isCompleted ? (
            <View style={styles.completedButton}>
              <Text style={styles.completedButtonText}>Review Path</Text>
              <Icon name="chevron-right" size={13} color={themeColors.success} />
            </View>
          ) : (
            <View style={styles.startButton}>
              <Text style={styles.startButtonText}>Start Path</Text>
              <Icon name="chevron-right" size={13} color={themeColors.primary} />
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
    width: '100%',
  },
  card: {
    padding: spacing.md,
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  cardCompleted: {
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  badgeCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
    flex: 1,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    gap: 4,
  },
  durationText: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  titleSection: {
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.subtitle,
    fontSize: 17,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginBottom: 4,
  },
  description: {
    ...typography.body,
    fontSize: 13,
    color: themeColors.textSecondary,
    lineHeight: 18,
  },
  progressContainer: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: themeColors.primary,
    borderRadius: radius.full,
  },
  progressBarFillCompleted: {
    backgroundColor: themeColors.success,
  },
  progressLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: themeColors.textSecondary,
  },
  percentText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  exerciseCountMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exerciseCountText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 12,
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    gap: 4,
  },
  resumeButtonText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  completedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedButtonText: {
    ...typography.caption,
    color: themeColors.success,
    fontWeight: '700',
    fontSize: 12,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  startButtonText: {
    ...typography.caption,
    color: themeColors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
});
