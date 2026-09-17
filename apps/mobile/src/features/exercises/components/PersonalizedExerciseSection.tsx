import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';

import { Card, Icon, Badge } from '../../../components/primitives';
import { themeColors, typography, radius, spacing } from '../../../theme';
import type { PersonalizedExerciseItem } from '../services/exerciseService';

interface PersonalizedExerciseSectionProps {
  title: string;
  subtitle?: string;
  badge?: string;
  iconName?:
    | 'sparkles'
    | 'bolt'
    | 'heart'
    | 'dumbbell'
    | 'flame'
    | 'activity'
    | 'timer'
    | 'clock';
  items: PersonalizedExerciseItem[];
  onPressItem: (item: PersonalizedExerciseItem) => void;
  onToggleFavorite?: (id: string) => void;
  onSeeAll?: () => void;
}

export const PersonalizedExerciseSection: React.FC<PersonalizedExerciseSectionProps> = ({
  title,
  subtitle,
  badge,
  iconName = 'sparkles',
  items,
  onPressItem,
  onToggleFavorite,
  onSeeAll,
}) => {
  if (!items || items.length === 0) {
    return null;
  }

  const renderItem = ({ item }: { item: PersonalizedExerciseItem }) => {
    const primaryMedia = item.media?.find((m: any) => m.isPrimary) || item.media?.[0];
    const thumbnailUrl = primaryMedia?.thumbnailUrl || primaryMedia?.url;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPressItem(item)}
        style={styles.cardContainer}
      >
        <Card style={styles.card}>
          <View style={styles.imageContainer}>
            {thumbnailUrl ? (
              <Image source={{ uri: thumbnailUrl }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={styles.placeholderBox}>
                <Icon name="dumbbell" size={26} color={themeColors.primary} />
              </View>
            )}

            {/* Top Overlay: Reason Badge and Favorite */}
            <View style={styles.overlayTop}>
              {item.reasonText ? (
                <View style={styles.reasonPill}>
                  <Icon name="sparkles" size={10} color={themeColors.primary} />
                  <Text style={styles.reasonText} numberOfLines={1}>
                    {item.reasonText}
                  </Text>
                </View>
              ) : (
                <View />
              )}

              {onToggleFavorite && (
                <TouchableOpacity
                  onPress={() => onToggleFavorite(item.id)}
                  style={[
                    styles.favButton,
                    item.isFavorite && styles.favButtonActive,
                  ]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon
                    name="heart"
                    size={14}
                    color={item.isFavorite ? themeColors.danger : '#FFFFFF'}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Bottom Overlay: Muscle + Difficulty */}
            <View style={styles.overlayBottom}>
              <Badge
                label={item.primaryMuscleGroup || 'EXERCISE'}
                variant="accent"
              />
              <Badge
                label={item.difficulty || 'INTERMEDIATE'}
                variant="neutral"
              />
            </View>
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.exerciseTitle} numberOfLines={1}>
              {item.name}
            </Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaText} numberOfLines={1}>
                {item.exerciseCategory || item.exerciseType || 'Strength'} • {item.equipment || 'No equipment'}
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.titleIconRow}>
            <View style={styles.iconHalo}>
              <Icon name={iconName} size={15} color={themeColors.primary} />
            </View>
            <Text style={styles.titleText}>{title}</Text>
            {badge && <Badge label={badge} variant="primary" />}
          </View>
          {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
        </View>

        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll} style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <Icon name="chevron-right" size={12} color={themeColors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        horizontal
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        decelerationRate="fast"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  titleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  iconHalo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    ...typography.subtitle,
    fontSize: 17,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  subtitleText: {
    ...typography.caption,
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingBottom: 2,
  },
  seeAllText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: themeColors.primary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  cardContainer: {
    width: 220,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
    backgroundColor: themeColors.cardBackground || '#1A1C20',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: radius.md,
  },
  imageContainer: {
    width: '100%',
    height: 125,
    backgroundColor: '#111316',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderBox: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  overlayTop: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reasonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    maxWidth: 155,
  },
  reasonText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: '#E0F2FE',
  },
  favButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  overlayBottom: {
    position: 'absolute',
    bottom: spacing.xs,
    left: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
    gap: 4,
  },
  cardBody: {
    padding: spacing.sm,
  },
  exerciseTitle: {
    ...typography.subtitle,
    fontSize: 14,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    ...typography.caption,
    fontSize: 12,
    color: themeColors.textMuted,
  },
});
