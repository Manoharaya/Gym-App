import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Icon, Badge } from '../../../components/primitives';
import { themeColors, typography, radius, spacing } from '../../../theme';
import type { CurriculumSummary } from '../services/exerciseService';

interface CurriculumCardProps {
  curriculum: CurriculumSummary;
  onPress: (curriculum: CurriculumSummary) => void;
}

export const CurriculumCard: React.FC<CurriculumCardProps> = ({ curriculum, onPress }) => {
  const percentComplete = curriculum.percentComplete || 0;
  const isCompleted = percentComplete >= 100;
  const categoryLabel = curriculum.category?.replace(/_/g, ' ') || 'FUNDAMENTALS';
  const difficultyLabel = curriculum.difficulty || 'ALL LEVELS';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onPress(curriculum)}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={`Curriculum: ${curriculum.title}`}
    >
      <Card style={[styles.card, isCompleted && styles.cardCompleted]}>
        <View style={styles.topRow}>
          <View style={styles.badgeCluster}>
            <Badge
              label={categoryLabel}
              variant={isCompleted ? 'success' : 'primary'}
            />
            <Badge label={difficultyLabel} variant="neutral" />
          </View>
          <View style={styles.pathBadge}>
            <Icon name="award" size={13} color={themeColors.textSecondary} />
            <Text style={styles.pathBadgeText}>
              {curriculum.pathCount} {curriculum.pathCount === 1 ? 'Path' : 'Paths'}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {curriculum.title}
          </Text>
          {curriculum.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {curriculum.description}
            </Text>
          ) : null}
        </View>

        {/* Progress & Stats Row */}
        <View style={styles.footerRow}>
          <View style={styles.statsCluster}>
            <Icon name="award" size={14} color={themeColors.textSecondary} />
            <Text style={styles.lessonCountText}>
              {curriculum.lessonCount} {curriculum.lessonCount === 1 ? 'lesson' : 'lessons'}
            </Text>
            {curriculum.completedLessons !== undefined && curriculum.completedLessons > 0 && (
              <Text style={styles.completedCountText}>
                • {curriculum.completedLessons} completed
              </Text>
            )}
          </View>

          <View style={styles.actionPrompt}>
            <Text style={[styles.actionText, isCompleted && styles.actionTextCompleted]}>
              {isCompleted ? 'Review' : percentComplete > 0 ? `${percentComplete}%` : 'Start'}
            </Text>
            <Icon
              name={isCompleted ? 'check-circle' : 'chevron-right'}
              size={14}
              color={isCompleted ? themeColors.success : themeColors.primary}
            />
          </View>
        </View>

        {/* Mini progress bar if in progress */}
        {percentComplete > 0 && percentComplete < 100 && (
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${percentComplete}%` }]} />
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: themeColors.surface,
  },
  cardCompleted: {
    borderColor: 'rgba(74, 222, 128, 0.3)',
    backgroundColor: 'rgba(74, 222, 128, 0.03)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  badgeCluster: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    flex: 1,
  },
  pathBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  pathBadgeText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  body: {
    marginVertical: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: themeColors.textPrimary,
    fontWeight: '700',
    marginBottom: 4,
  },
  description: {
    ...typography.bodySecondary,
    color: themeColors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  statsCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lessonCountText: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  completedCountText: {
    ...typography.caption,
    color: themeColors.textTertiary,
  },
  actionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    ...typography.caption,
    color: themeColors.primary,
    fontWeight: '700',
  },
  actionTextCompleted: {
    color: themeColors.success,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.full,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: themeColors.primary,
    borderRadius: radius.full,
  },
});
