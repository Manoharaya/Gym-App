import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';

import { Badge, Card, Icon } from '../../../components/primitives';
import { themeColors, typography, radius, spacing } from '../../../theme';
import type { Exercise } from '@fitcore/types';
import { ContentMasteryBadge } from './ContentMasteryBadge';

interface ExerciseCardProps {
  exercise: Exercise & {
    isFavorite?: boolean;
    lastViewedAt?: string;
    reasonText?: string;
    masteryStatus?: string;
    completionPercent?: number;
  };
  onPress: (exercise: Exercise) => void;
  onQuickPreview?: (exercise: Exercise) => void;
  onToggleFavorite?: (exerciseId: string) => void;
  isCompact?: boolean;
  reasonBadge?: string;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  onPress,
  onQuickPreview,
  onToggleFavorite,
  isCompact = false,
  reasonBadge,
}) => {
  const primaryMedia =
    exercise.media?.find((m) => m.isPrimary) || exercise.media?.[0];
  const thumbnailUrl = primaryMedia?.thumbnailUrl || primaryMedia?.url;
  const hasVideo = exercise.media?.some((m) => m.mediaType === 'VIDEO');

  const getDifficultyVariant = (diff?: string) => {
    switch (diff?.toUpperCase()) {
      case 'BEGINNER':
        return 'success';
      case 'INTERMEDIATE':
        return 'primary';
      case 'ADVANCED':
      case 'EXPERT':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const getCategoryIcon = (category?: string): 'dumbbell' | 'flame' | 'activity' | 'bolt' => {
    switch (category?.toUpperCase()) {
      case 'CARDIO':
      case 'HIIT':
        return 'flame';
      case 'MOBILITY':
      case 'RECOVERY':
        return 'activity';
      case 'FUNCTIONAL':
        return 'bolt';
      default:
        return 'dumbbell';
    }
  };

  const formattedCategory = exercise.exerciseCategory
    ? exercise.exerciseCategory.charAt(0) + exercise.exerciseCategory.slice(1).toLowerCase().replace(/_/g, ' ')
    : exercise.exerciseType || 'Strength';

  const formattedEquipment = exercise.equipment
    ? exercise.equipment.charAt(0) + exercise.equipment.slice(1).toLowerCase().replace(/_/g, ' ')
    : 'No Equipment';

  if (isCompact) {
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => onPress(exercise)}
        style={styles.compactContainer}
      >
        <Card style={styles.compactCard}>
          <View style={styles.compactMediaBox}>
            {thumbnailUrl ? (
              <Image source={{ uri: thumbnailUrl }} style={styles.compactImage} resizeMode="cover" />
            ) : (
              <View style={styles.placeholderBox}>
                <Icon name={getCategoryIcon(exercise.exerciseCategory || undefined)} size={22} color={themeColors.primary} />
              </View>
            )}
            {hasVideo && (
              <View style={styles.compactVideoBadge}>
                <Icon name="bolt" size={10} color="#FFFFFF" />
              </View>
            )}
          </View>
          <View style={styles.compactContent}>
            <Text style={styles.compactTitle} numberOfLines={1}>
              {exercise.name}
            </Text>
            <Text style={styles.compactSubtitle} numberOfLines={1}>
              {formattedCategory} • {exercise.primaryMuscleGroup || 'General'}
            </Text>
          </View>
          {onToggleFavorite && (
            <TouchableOpacity
              onPress={() => onToggleFavorite(exercise.id)}
              style={styles.compactFavButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon
                name="heart"
                size={16}
                color={exercise.isFavorite ? themeColors.danger : themeColors.textMuted}
              />
            </TouchableOpacity>
          )}
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <Card style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(exercise)}
        style={styles.mediaContainer}
      >
        {thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={styles.gradientHeroPlaceholder}>
            <View style={styles.placeholderIconHalo}>
              <Icon name={getCategoryIcon(exercise.exerciseCategory || undefined)} size={36} color={themeColors.primary} />
            </View>
            <Text style={styles.placeholderBrand}>FITBEAT VISUAL</Text>
          </View>
        )}

        {/* Media Overlay Badges */}
        <View style={styles.mediaHeaderRow}>
          <View style={styles.badgeGroup}>
            <Badge
              label={exercise.primaryMuscleGroup || 'FULL BODY'}
              variant="accent"
            />
            <Badge
              label={exercise.difficulty || 'INTERMEDIATE'}
              variant={getDifficultyVariant(exercise.difficulty || undefined)}
            />
            {exercise.masteryStatus && (
              <ContentMasteryBadge
                status={exercise.masteryStatus}
                completionPercent={exercise.completionPercent}
                size="sm"
              />
            )}
          </View>

          {onToggleFavorite && (
            <TouchableOpacity
              onPress={() => onToggleFavorite(exercise.id)}
              style={[
                styles.favoriteButton,
                exercise.isFavorite && styles.favoriteButtonActive,
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon
                name="heart"
                size={18}
                color={exercise.isFavorite ? themeColors.danger : themeColors.textPrimary}
              />
            </TouchableOpacity>
          )}
        </View>

        {hasVideo && (
          <View style={styles.videoIndicator}>
            <Icon name="timer" size={12} color="#FFFFFF" />
            <Text style={styles.videoIndicatorText}>VIDEO DEMO</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.body}>
        {(reasonBadge || exercise.reasonText) && (
          <View style={styles.reasonBadgeRow}>
            <Icon name="sparkles" size={11} color={themeColors.primary} />
            <Text style={styles.reasonBadgeText} numberOfLines={1}>
              {reasonBadge || exercise.reasonText}
            </Text>
          </View>
        )}

        <View style={styles.titleRow}>
          <Text style={styles.exerciseName} numberOfLines={2}>
            {exercise.name}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Icon name={getCategoryIcon(exercise.exerciseCategory || undefined)} size={13} color={themeColors.primary} />
            <Text style={styles.metaText}>{formattedCategory}</Text>
          </View>
          <Text style={styles.metaDivider}>•</Text>
          <View style={styles.metaItem}>
            <Icon name="dumbbell" size={13} color={themeColors.textSecondary} />
            <Text style={styles.metaText}>{formattedEquipment}</Text>
          </View>
          {exercise.movementPattern ? (
            <>
              <Text style={styles.metaDivider}>•</Text>
              <View style={styles.metaItem}>
                <Text style={styles.metaTextPattern}>{exercise.movementPattern}</Text>
              </View>
            </>
          ) : null}
        </View>

        {exercise.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {exercise.description}
          </Text>
        ) : null}

        <View style={styles.footerRow}>
          {onQuickPreview && (
            <TouchableOpacity
              onPress={() => onQuickPreview(exercise)}
              style={styles.quickPreviewButton}
              activeOpacity={0.7}
            >
              <Icon name="sparkles" size={14} color={themeColors.textPrimary} />
              <Text style={styles.quickPreviewText}>Quick Preview</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => onPress(exercise)}
            style={styles.learnButton}
            activeOpacity={0.8}
          >
            <Text style={styles.learnButtonText}>Learn Movement</Text>
            <Icon name="chevron-right" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 0,
    marginBottom: spacing[4],
    overflow: 'hidden',
    backgroundColor: themeColors.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  mediaContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
    backgroundColor: '#0F1218',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  gradientHeroPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121620',
  },
  placeholderIconHalo: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.25)',
  },
  placeholderBrand: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.textMuted,
    letterSpacing: 2,
    marginTop: spacing[2],
  },
  mediaHeaderRow: {
    position: 'absolute',
    top: spacing[3],
    left: spacing[3],
    right: spacing[3],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeGroup: {
    flexDirection: 'row',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  favoriteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 18, 24, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  favoriteButtonActive: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    borderColor: 'rgba(255, 59, 48, 0.4)',
  },
  videoIndicator: {
    position: 'absolute',
    bottom: spacing[3],
    left: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  videoIndicatorText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  body: {
    padding: spacing[4],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  exerciseName: {
    ...typography.h3,
    fontSize: 18,
    color: themeColors.textPrimary,
    fontWeight: '700',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 12,
  },
  metaTextPattern: {
    ...typography.caption,
    color: themeColors.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  metaDivider: {
    color: themeColors.textMuted,
    fontSize: 10,
  },
  description: {
    ...typography.body,
    fontSize: 13,
    color: themeColors.textMuted,
    lineHeight: 18,
    marginBottom: spacing[4],
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    marginTop: spacing[1],
  },
  quickPreviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    backgroundColor: themeColors.cardBackground,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  quickPreviewText: {
    ...typography.caption,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  learnButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2] + 2,
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    backgroundColor: themeColors.primary,
  },
  learnButtonText: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Compact Styles
  compactContainer: {
    width: 220,
    marginRight: spacing[3],
  },
  compactCard: {
    padding: spacing[3],
    backgroundColor: themeColors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  compactMediaBox: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: '#0F1218',
    position: 'relative',
  },
  compactImage: {
    width: '100%',
    height: '100%',
  },
  placeholderBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161B26',
  },
  compactVideoBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    ...typography.body,
    fontWeight: '600',
    fontSize: 13,
    color: themeColors.textPrimary,
  },
  compactSubtitle: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textMuted,
    marginTop: 2,
  },
  compactFavButton: {
    padding: spacing[1],
  },
  reasonBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  reasonBadgeText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: themeColors.primary,
  },
});
