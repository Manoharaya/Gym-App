import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
};

export type RelationshipTab = 'progressions' | 'regressions' | 'variations' | 'substitutes';

export interface ExerciseRelationshipSectionProps {
  categorizedVariations?: {
    progressions?: any[];
    regressions?: any[];
    variations?: any[];
    substitutes?: any[];
  };
  relatedExercises?: any[];
  onSelectExercise: (exerciseId: string, exerciseName: string) => void;
}

export const ExerciseRelationshipSection: React.FC<ExerciseRelationshipSectionProps> = ({
  categorizedVariations,
  relatedExercises = [],
  onSelectExercise,
}) => {
  const [activeTab, setActiveTab] = useState<RelationshipTab>('progressions');

  const progressions = categorizedVariations?.progressions || [];
  const regressions = categorizedVariations?.regressions || [];
  const variations = categorizedVariations?.variations || [];
  const substitutes = categorizedVariations?.substitutes || [];

  const totalVariations =
    progressions.length + regressions.length + variations.length + substitutes.length;

  const getListForTab = (): any[] => {
    switch (activeTab) {
      case 'progressions':
        return progressions;
      case 'regressions':
        return regressions;
      case 'variations':
        return variations;
      case 'substitutes':
        return substitutes;
      default:
        return [];
    }
  };

  const currentList = getListForTab();

  const getDifficultyVariant = (diff?: string): 'neutral' | 'primary' | 'accent' => {
    switch (diff?.toUpperCase()) {
      case 'BEGINNER':
        return 'neutral';
      case 'INTERMEDIATE':
        return 'primary';
      case 'ADVANCED':
      case 'EXPERT':
        return 'accent';
      default:
        return 'neutral';
    }
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionOverline}>Movement Progressions & Alternatives</Text>
          <Text style={styles.sectionTitle}>Exercise Relationships</Text>
        </View>
        <Badge label={`${totalVariations} Options`} variant="neutral" />
      </View>

      {/* Segmented Tab Controls */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'progressions' && styles.tabButtonActive]}
          onPress={() => setActiveTab('progressions')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'progressions' && styles.tabButtonTextActive]}>
            Progress ({progressions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'regressions' && styles.tabButtonActive]}
          onPress={() => setActiveTab('regressions')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'regressions' && styles.tabButtonTextActive]}>
            Regress ({regressions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'variations' && styles.tabButtonActive]}
          onPress={() => setActiveTab('variations')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'variations' && styles.tabButtonTextActive]}>
            Variations ({variations.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'substitutes' && styles.tabButtonActive]}
          onPress={() => setActiveTab('substitutes')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'substitutes' && styles.tabButtonTextActive]}>
            Swaps ({substitutes.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content Cards */}
      {currentList.length === 0 ? (
        <View style={styles.emptyCard}>
          <Icon name="refresh" size={24} color={themeColors.textMuted} />
          <Text style={styles.emptyTitle}>
            No {activeTab} mapped for this exercise yet
          </Text>
          <Text style={styles.emptySubtitle}>
            Trainers can map progressions, regressions, or equipment substitutes in the builder.
          </Text>
        </View>
      ) : (
        <View style={styles.cardsList}>
          {currentList.map((item, idx) => {
            const ex = item.exercise || item;
            const targetId = item.exerciseId || ex.id;
            const targetName = item.name || ex.name || 'Exercise';
            const mediaUrl =
              ex.media?.[0]?.url ||
              ex.media?.[0]?.thumbnailUrl ||
              ex.thumbnailUrl ||
              null;

            return (
              <TouchableOpacity
                key={item.id || `var-${idx}`}
                style={styles.exerciseCard}
                onPress={() => onSelectExercise(targetId, targetName)}
                activeOpacity={0.75}
              >
                {/* Media Thumbnail or Icon */}
                <View style={styles.thumbWrapper}>
                  {mediaUrl ? (
                    <Image source={{ uri: mediaUrl }} style={styles.thumbImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.thumbFallback}>
                      <Icon name="dumbbell" size={18} color={themeColors.primary} />
                    </View>
                  )}
                </View>

                {/* Info Column */}
                <View style={styles.infoCol}>
                  <Text style={styles.exerciseCardTitle} numberOfLines={1}>
                    {targetName}
                  </Text>

                  <View style={styles.badgeRow}>
                    {ex.difficulty && (
                      <Badge
                        label={ex.difficulty}
                        variant={getDifficultyVariant(ex.difficulty)}
                      />
                    )}
                    {ex.primaryMuscleGroup && (
                      <Badge
                        label={ex.primaryMuscleGroup.replace(/_/g, ' ')}
                        variant="neutral"
                      />
                    )}
                  </View>

                  {item.notes ? (
                    <Text style={styles.notesText} numberOfLines={2}>
                      💡 {item.notes}
                    </Text>
                  ) : null}
                </View>

                {/* Right Arrow */}
                <View style={styles.arrowIcon}>
                  <Icon name="chevron-right" size={18} color={themeColors.textMuted} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Biomechanical Related Exercises Carousel */}
      {relatedExercises && relatedExercises.length > 0 && (
        <View style={styles.relatedSection}>
          <View style={styles.relatedHeader}>
            <Icon name="sparkles" size={16} color={themeColors.primary} />
            <Text style={styles.relatedTitle}>Related Movements</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.relatedScroll}
          >
            {relatedExercises.map((rel) => {
              const relMedia = rel.media?.[0]?.url || rel.thumbnailUrl;
              return (
                <TouchableOpacity
                  key={rel.id}
                  style={styles.relatedCard}
                  onPress={() => onSelectExercise(rel.id, rel.name)}
                  activeOpacity={0.8}
                >
                  <View style={styles.relatedThumb}>
                    {relMedia ? (
                      <Image source={{ uri: relMedia }} style={styles.relatedImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.relatedThumbFallback}>
                        <Icon name="activity" size={20} color={themeColors.accent} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.relatedCardName} numberOfLines={2}>
                    {rel.name}
                  </Text>
                  <Text style={styles.relatedCardMeta}>
                    {rel.movementPattern || rel.primaryMuscleGroup}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: sp.md,
    marginBottom: sp.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp.md,
  },
  sectionOverline: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 18,
    color: themeColors.textPrimary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: themeColors.surfaceElevated,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: sp.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  tabButtonActive: {
    backgroundColor: themeColors.surface,
  },
  tabButtonText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: themeColors.textMuted,
  },
  tabButtonTextActive: {
    color: themeColors.primary,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: themeColors.surface,
    padding: sp.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  emptyTitle: {
    ...typography.body,
    fontWeight: '600',
    color: themeColors.textSecondary,
    marginTop: sp.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  cardsList: {
    gap: sp.sm,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.surface,
    padding: sp.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  thumbWrapper: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: themeColors.surfaceElevated,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
    marginLeft: sp.sm,
    justifyContent: 'center',
  },
  exerciseCardTitle: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
    fontSize: 14,
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  notesText: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textSecondary,
  },
  arrowIcon: {
    paddingLeft: sp.xs,
  },
  relatedSection: {
    marginTop: sp.lg,
    paddingTop: sp.md,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  relatedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: sp.sm,
  },
  relatedTitle: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: themeColors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  relatedScroll: {
    gap: sp.sm,
    paddingVertical: 4,
  },
  relatedCard: {
    width: 120,
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    padding: sp.xs,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  relatedThumb: {
    width: '100%',
    height: 70,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: themeColors.surfaceElevated,
    marginBottom: 6,
  },
  relatedImage: {
    width: '100%',
    height: '100%',
  },
  relatedThumbFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  relatedCardName: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.textPrimary,
    fontSize: 11,
    lineHeight: 14,
  },
  relatedCardMeta: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.textMuted,
    marginTop: 2,
  },
});
