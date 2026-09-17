import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import { Card, Icon, Badge } from '../../../components/primitives';
import { themeColors, typography, radius, spacing } from '../../../theme';
import type { ExerciseCollectionSummary } from '../services/exerciseService';

interface CollectionCardProps {
  collection: ExerciseCollectionSummary;
  onPress: (collection: ExerciseCollectionSummary) => void;
}

export const CollectionCard: React.FC<CollectionCardProps> = ({
  collection,
  onPress,
}) => {
  const categoryLabel = collection.category?.replace(/_/g, ' ') || 'COLLECTION';
  const difficultyLabel = collection.difficulty?.replace(/_/g, ' ') || 'ALL LEVELS';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onPress(collection)}
      style={styles.container}
    >
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.badgeCluster}>
            <Badge
              label={categoryLabel}
              variant={collection.featured ? 'primary' : 'neutral'}
            />
            <Badge label={difficultyLabel} variant="neutral" />
            {collection.primaryMuscleGroup && (
              <Badge
                label={collection.primaryMuscleGroup.replace(/_/g, ' ')}
                variant="neutral"
              />
            )}
          </View>

          <View style={styles.countBadge}>
            <Icon name="activity" size={12} color={themeColors.accent} />
            <Text style={styles.countText}>{collection.exerciseCount} exercises</Text>
          </View>
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.title} numberOfLines={2}>
            {collection.title}
          </Text>
          {collection.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {collection.description}
            </Text>
          ) : null}
        </View>

        {/* Exercises Preview List */}
        {collection.previewExercises && collection.previewExercises.length > 0 && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewHeader}>INCLUDES MOVEMENTS:</Text>
            <View style={styles.previewList}>
              {collection.previewExercises.slice(0, 3).map((ex, idx) => (
                <View key={ex.id || idx} style={styles.previewPill}>
                  <Text style={styles.previewPillNumber}>{idx + 1}</Text>
                  <Text style={styles.previewPillText} numberOfLines={1}>
                    {ex.name}
                  </Text>
                </View>
              ))}
              {collection.exerciseCount > 3 && (
                <View style={styles.morePill}>
                  <Text style={styles.morePillText}>+{collection.exerciseCount - 3} more</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.footerRow}>
          <View style={styles.metaCol}>
            {collection.equipmentType ? (
              <Text style={styles.equipmentText}>
                Equip: {collection.equipmentType.replace(/_/g, ' ')}
              </Text>
            ) : (
              <Text style={styles.equipmentText}>Curated Program Routine</Text>
            )}
          </View>

          <View style={styles.ctaButton}>
            <Text style={styles.ctaText}>Explore Collection</Text>
            <Icon name="chevron-right" size={14} color={themeColors.primary} />
          </View>
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
  headerRow: {
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
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 3,
    borderRadius: radius.full,
    gap: 4,
  },
  countText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
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
  previewContainer: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  previewHeader: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  previewList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  previewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    maxWidth: '85%',
  },
  previewPillNumber: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.primary,
    marginRight: 4,
  },
  previewPillText: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textPrimary,
    flexShrink: 1,
  },
  morePill: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    justifyContent: 'center',
  },
  morePillText: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  metaCol: {
    flex: 1,
  },
  equipmentText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 12,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ctaText: {
    ...typography.caption,
    color: themeColors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
});
