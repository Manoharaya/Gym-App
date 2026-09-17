import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';

import { Card, Icon, Badge } from '../../../components/primitives';
import { themeColors, typography, radius, spacing } from '../../../theme';
import type { PersonalizedExerciseItem } from '../services/exerciseService';

interface ContinueLearningCardProps {
  item: PersonalizedExerciseItem;
  onPress: (item: PersonalizedExerciseItem) => void;
}

export const ContinueLearningCard: React.FC<ContinueLearningCardProps> = ({
  item,
  onPress,
}) => {
  const primaryMedia = item.media?.find((m: any) => m.isPrimary) || item.media?.[0];
  const thumbnailUrl = primaryMedia?.thumbnailUrl || primaryMedia?.url;

  const totalSteps = item.learningProgress?.totalSteps || 5;
  const completedSteps = item.learningProgress?.completedSteps || 0;
  const currentStep = item.learningProgress?.lastStepNumber || (completedSteps > 0 ? completedSteps : 1);
  const progressRatio = Math.min(1, Math.max(0.1, completedSteps / totalSteps));
  const progressPercent = Math.round(progressRatio * 100);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onPress(item)}
      style={styles.container}
    >
      <Card style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.thumbnailBox}>
            {thumbnailUrl ? (
              <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} resizeMode="cover" />
            ) : (
              <View style={styles.placeholderIconHalo}>
                <Icon name="dumbbell" size={20} color={themeColors.primary} />
              </View>
            )}
          </View>

          <View style={styles.contentBox}>
            <View style={styles.badgeRow}>
              <Badge label="IN PROGRESS" variant="primary" />
              <Text style={styles.stepCounterText}>
                Step {currentStep} of {totalSteps}
              </Text>
            </View>

            <Text style={styles.titleText} numberOfLines={1}>
              {item.name}
            </Text>

            <Text style={styles.subtitleText} numberOfLines={1}>
              {item.primaryMuscleGroup || 'Technique Guide'} • {item.difficulty || 'Intermediate'}
            </Text>
          </View>
        </View>

        {/* Learning Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
          <View style={styles.progressFooter}>
            <Text style={styles.progressLabel}>
              {progressPercent}% Mastered
            </Text>
            <View style={styles.actionChip}>
              <Text style={styles.actionChipText}>Continue</Text>
              <Icon name="chevron-right" size={12} color={themeColors.primary} />
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: spacing.sm,
    width: 290,
  },
  card: {
    padding: spacing.md,
    backgroundColor: themeColors.cardBackground || '#1A1C20',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: radius.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  thumbnailBox: {
    width: 58,
    height: 58,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: '#121417',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderIconHalo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentBox: {
    flex: 1,
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stepCounterText: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  titleText: {
    ...typography.subtitle,
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitleText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 12,
  },
  progressContainer: {
    marginTop: spacing.xs,
  },
  progressBarBackground: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: themeColors.primary,
    borderRadius: 3,
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  actionChipText: {
    ...typography.caption,
    color: themeColors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
});
