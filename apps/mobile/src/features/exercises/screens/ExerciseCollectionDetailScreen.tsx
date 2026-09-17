import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { themeColors, typography, radius, spacing } from '../../../theme';
import { Card, Icon, Badge, Button } from '../../../components/primitives';
import {
  ExerciseService,
  ExerciseCollectionDetail,
} from '../services/exerciseService';
import type { MemberStackParamList } from '../../../navigation/types';

type RouteType = RouteProp<MemberStackParamList, 'ExerciseCollectionDetail'>;
type NavProp = NativeStackNavigationProp<MemberStackParamList>;

export const ExerciseCollectionDetailScreen: React.FC = () => {
  const route = useRoute<RouteType>();
  const navigation = useNavigation<NavProp>();
  const { collectionId } = route.params;

  const [collection, setCollection] = useState<ExerciseCollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCollection = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ExerciseService.getCollectionById(collectionId);
      setCollection(res);
    } catch (err) {
      console.warn('Failed to load collection detail:', err);
    } finally {
      setLoading(false);
    }
  }, [collectionId]);

  useEffect(() => {
    loadCollection();
  }, [loadCollection]);

  const handleOpenExercise = (exerciseId: string, exerciseName?: string) => {
    navigation.navigate('ExerciseDetail', {
      exerciseId,
      exerciseName,
    });
  };

  if (loading || !collection) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>Loading collection curriculum...</Text>
      </View>
    );
  }

  // Group items by section title if provided
  const itemsBySection: { sectionTitle: string; items: typeof collection.items }[] = [];
  let currentSection = '';
  let currentGroup: typeof collection.items = [];

  collection.items.forEach((item) => {
    const sec = item.sectionTitle || 'Curriculum Movements';
    if (sec !== currentSection) {
      if (currentGroup.length > 0) {
        itemsBySection.push({ sectionTitle: currentSection, items: currentGroup });
      }
      currentSection = sec;
      currentGroup = [item];
    } else {
      currentGroup.push(item);
    }
  });
  if (currentGroup.length > 0) {
    itemsBySection.push({ sectionTitle: currentSection, items: currentGroup });
  }

  return (
    <View style={styles.container}>
      {/* Top App Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerBarTitle} numberOfLines={1}>
          {collection.title}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Collection Hero Header */}
        <View style={styles.heroCard}>
          <View style={styles.badgeRow}>
            {collection.category && (
              <Badge
                label={collection.category.replace(/_/g, ' ')}
                variant="primary"
              />
            )}
            <Badge
              label={collection.difficulty.replace(/_/g, ' ')}
              variant="neutral"
            />
            {collection.primaryMuscleGroup && (
              <Badge
                label={collection.primaryMuscleGroup.replace(/_/g, ' ')}
                variant="neutral"
              />
            )}
          </View>

          <Text style={styles.heroTitle}>{collection.title}</Text>

          {collection.description ? (
            <Text style={styles.heroDescription}>{collection.description}</Text>
          ) : null}

          <View style={styles.metaStatRow}>
            <View style={styles.statBox}>
              <Icon name="activity" size={16} color={themeColors.primary} />
              <Text style={styles.statLabel}>{collection.exerciseCount} Exercises</Text>
            </View>
            {collection.equipmentType && (
              <View style={styles.statBox}>
                <Icon name="dumbbell" size={16} color={themeColors.accent} />
                <Text style={styles.statLabel}>{collection.equipmentType.replace(/_/g, ' ')}</Text>
              </View>
            )}
            <View style={styles.statBox}>
              <Icon name="award" size={16} color={themeColors.success} />
              <Text style={styles.statLabel}>Coaching Verified</Text>
            </View>
          </View>
        </View>

        {/* Exercises Curriculum List */}
        <View style={styles.curriculumSection}>
          <Text style={styles.curriculumHeading}>EXERCISE CURRICULUM</Text>

          {itemsBySection.map((group, gIdx) => (
            <View key={gIdx} style={styles.sectionGroup}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionDot} />
                <Text style={styles.sectionTitleText}>{group.sectionTitle.toUpperCase()}</Text>
              </View>

              {group.items.map((item, itIdx) => (
                <TouchableOpacity
                  key={item.id || itIdx}
                  activeOpacity={0.8}
                  onPress={() => handleOpenExercise(item.exerciseId, item.exercise.name)}
                  style={styles.itemCardContainer}
                >
                  <Card style={styles.itemCard}>
                    <View style={styles.itemTopRow}>
                      <View style={styles.itemOrderCircle}>
                        <Text style={styles.itemOrderNumber}>{item.sortOrder + 1}</Text>
                      </View>

                      <View style={styles.itemMainInfo}>
                        <Text style={styles.itemName} numberOfLines={2}>
                          {item.customTitle || item.exercise.name}
                        </Text>
                        <Text style={styles.itemMeta}>
                          {item.exercise.primaryMuscleGroup} • {item.exercise.equipment} • {item.exercise.difficulty}
                        </Text>
                      </View>

                      <Icon name="chevron-right" size={18} color={themeColors.textSecondary} />
                    </View>

                    {item.learningObjective ? (
                      <View style={styles.objectiveRow}>
                        <Icon name="bolt" size={12} color={themeColors.primary} />
                        <Text style={styles.objectiveText} numberOfLines={2}>
                          {item.learningObjective}
                        </Text>
                      </View>
                    ) : null}

                    {item.notes ? (
                      <View style={styles.notesRow}>
                        <Icon name="alert-circle" size={12} color={themeColors.textSecondary} />
                        <Text style={styles.notesText} numberOfLines={2}>
                          Tip: {item.notes}
                        </Text>
                      </View>
                    ) : null}
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      {collection.items.length > 0 && collection.items[0] && (
        <View style={styles.bottomBar}>
          <Button
            title={`Start Movement 1: ${collection.items[0].customTitle || collection.items[0].exercise.name}`}
            variant="primary"
            size="lg"
            onPress={() => {
              if (collection.items[0]) {
                handleOpenExercise(
                  collection.items[0].exerciseId,
                  collection.items[0].exercise.name,
                );
              }
            }}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: themeColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerBarTitle: {
    ...typography.subtitle,
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.textPrimary,
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + 40,
  },
  heroCard: {
    backgroundColor: themeColors.cardBackground,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginBottom: spacing.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  heroTitle: {
    ...typography.title,
    fontSize: 22,
    fontWeight: '800',
    color: themeColors.textPrimary,
    marginBottom: spacing.xs,
  },
  heroDescription: {
    ...typography.body,
    fontSize: 14,
    color: themeColors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  metaStatRow: {
    flexDirection: 'row',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: spacing.sm,
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 12,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  curriculumSection: {
    marginBottom: spacing.lg,
  },
  curriculumHeading: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    color: themeColors.textSecondary,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  sectionGroup: {
    marginBottom: spacing.lg,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.xs,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: themeColors.primary,
  },
  sectionTitleText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: themeColors.primary,
    letterSpacing: 0.6,
  },
  itemCardContainer: {
    marginVertical: 4,
  },
  itemCard: {
    backgroundColor: themeColors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemOrderCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  itemOrderNumber: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '800',
    color: themeColors.primary,
  },
  itemMainInfo: {
    flex: 1,
  },
  itemName: {
    ...typography.subtitle,
    fontSize: 15,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  itemMeta: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  objectiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 107, 0, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.sm,
    marginTop: spacing.xs + 2,
  },
  objectiveText: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textPrimary,
    flex: 1,
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  notesText: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textSecondary,
    flex: 1,
    fontStyle: 'italic',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: themeColors.surface,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.background,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.body,
    fontSize: 14,
    color: themeColors.textSecondary,
  },
});
