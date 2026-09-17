import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Icon, Badge, Card, Button } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import {
  ExerciseService,
  ExerciseDimensionDetail,
} from '../services/exerciseService';
import {
  ExerciseCard,
  CrossDiscoveryFilterBar,
} from '../components';
import type { Exercise } from '@fitcore/types';

interface RouteParams {
  dimension: 'category' | 'muscle' | 'equipment' | 'movement' | 'goal' | 'difficulty';
  value: string;
  initialTitle?: string;
}

export const ExerciseDimensionDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { dimension, value, initialTitle } = (route.params || {}) as RouteParams;

  const [detail, setDetail] = useState<ExerciseDimensionDetail | null>(null);
  const [exercises, setExercises] = useState<(Exercise & { isFavorite?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cross-discovery filters state
  const [selectedRole, setSelectedRole] = useState<'ALL' | 'PRIMARY' | 'SECONDARY'>('ALL');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('');
  const [selectedMovement, setSelectedMovement] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');

  const loadDimensionDetail = useCallback(async () => {
    try {
      setError(null);
      const data = await ExerciseService.getDiscoveryDimensionDetail(dimension, value);
      setDetail(data);

      // Query actual exercises matching dimension + active cross filters
      await queryFilteredExercises(data, selectedRole, selectedEquipment, selectedMovement, selectedDifficulty);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dimension details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dimension, value]);

  const queryFilteredExercises = async (
    dimensionDetail: ExerciseDimensionDetail,
    role: 'ALL' | 'PRIMARY' | 'SECONDARY',
    equip: string,
    mov: string,
    diff: string
  ) => {
    try {
      const queryOptions: any = {
        limit: 30,
      };

      // Set base dimension parameter
      if (dimension === 'muscle') {
        if (role === 'PRIMARY') {
          queryOptions.primaryMuscle = dimensionDetail.value;
        } else if (role === 'SECONDARY') {
          queryOptions.secondaryMuscle = dimensionDetail.value;
        } else {
          queryOptions.muscle = dimensionDetail.value;
        }
      } else if (dimension === 'equipment') {
        if (dimensionDetail.isNoEquipment) {
          queryOptions.noEquipment = true;
        } else {
          queryOptions.equipmentType = dimensionDetail.value;
        }
      } else if (dimension === 'movement') {
        queryOptions.movementPattern = dimensionDetail.value;
      } else if (dimension === 'category') {
        queryOptions.exerciseCategory = dimensionDetail.value;
      } else if (dimension === 'difficulty') {
        queryOptions.difficulty = dimensionDetail.value;
      } else if (dimension === 'goal') {
        queryOptions.trainingGoal = dimensionDetail.value;
      }

      // Add cross-discovery drilldown filters
      if (equip) {
        if (equip === 'NO_EQUIPMENT' || equip === 'BODYWEIGHT') {
          queryOptions.noEquipment = true;
        } else {
          queryOptions.availableEquipment = [equip];
        }
      }
      if (mov) {
        queryOptions.movementPattern = mov;
      }
      if (diff) {
        queryOptions.difficulty = diff;
      }

      const res = await ExerciseService.getExercises(queryOptions);
      setExercises(res.items);
    } catch (err: any) {
      console.warn('Error querying filtered exercises for dimension:', err);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadDimensionDetail();
  }, [loadDimensionDetail]);

  const handleApplyFilter = (
    newRole: 'ALL' | 'PRIMARY' | 'SECONDARY',
    newEquip: string,
    newMov: string,
    newDiff: string
  ) => {
    if (!detail) return;
    queryFilteredExercises(detail, newRole, newEquip, newMov, newDiff);
  };

  const handleRoleChange = (role: 'ALL' | 'PRIMARY' | 'SECONDARY') => {
    setSelectedRole(role);
    handleApplyFilter(role, selectedEquipment, selectedMovement, selectedDifficulty);
  };

  const handleEquipmentFilter = (equip: string) => {
    setSelectedEquipment(equip);
    handleApplyFilter(selectedRole, equip, selectedMovement, selectedDifficulty);
  };

  const handleMovementFilter = (mov: string) => {
    setSelectedMovement(mov);
    handleApplyFilter(selectedRole, selectedEquipment, mov, selectedDifficulty);
  };

  const handleDifficultyFilter = (diff: string) => {
    setSelectedDifficulty(diff);
    handleApplyFilter(selectedRole, selectedEquipment, selectedMovement, diff);
  };

  const handleResetFilters = () => {
    setSelectedEquipment('');
    setSelectedMovement('');
    setSelectedDifficulty('');
    if (detail) {
      queryFilteredExercises(detail, selectedRole, '', '', '');
    }
  };

  const handleToggleFavorite = async (exerciseId: string) => {
    try {
      const res = await ExerciseService.toggleFavorite(exerciseId);
      setExercises((prev) =>
        prev.map((ex) => (ex.id === exerciseId ? { ...ex, isFavorite: res.isFavorite } : ex))
      );
    } catch (err: any) {
      console.warn('Favorite toggle error:', err);
    }
  };

  const handleOpenExercise = (exercise: Exercise) => {
    navigation.navigate('ExerciseDetail', { exerciseId: exercise.id });
  };

  const getDimensionPluralName = () => {
    switch (dimension) {
      case 'muscle':
        return 'Muscles';
      case 'equipment':
        return 'Equipment';
      case 'movement':
        return 'Movements';
      case 'category':
        return 'Categories';
      case 'goal':
        return 'Training Goals';
      case 'difficulty':
        return 'Difficulty Levels';
      default:
        return 'Explore';
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Breadcrumbs */}
      <View style={styles.breadcrumbRow}>
        <TouchableOpacity
          accessibilityRole="link"
          accessibilityLabel="Back to Exercise Library"
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.breadcrumbLink}>Exercise Library</Text>
        </TouchableOpacity>
        <Text style={styles.breadcrumbSeparator}>›</Text>
        <Text style={styles.breadcrumbLink}>{getDimensionPluralName()}</Text>
        <Text style={styles.breadcrumbSeparator}>›</Text>
        <Text style={styles.breadcrumbCurrent} numberOfLines={1}>
          {detail?.title || initialTitle || value}
        </Text>
      </View>

      {/* Hero Title & Meta */}
      <View style={styles.titleRow}>
        <Text style={styles.heroTitle}>{detail?.title || initialTitle || value}</Text>
        {detail && (
          <Badge
            label={`${detail.exerciseCount} exercises`}
            variant="primary"
          />
        )}
      </View>

      {/* Subtitle / Taxonomy attributes */}
      <View style={styles.metaRow}>
        {detail?.region && (
          <Badge
            label={`${detail.region === 'ANTERIOR' ? 'Front (Anterior)' : 'Back (Posterior)'}`}
            variant="neutral"
          />
        )}
        {detail?.group && (
          <Badge
            label={detail.group.replace('_', ' ')}
            variant="neutral"
          />
        )}
        {detail?.isNoEquipment && (
          <Badge
            label="Zero Equipment Required"
            variant="success"
          />
        )}
      </View>

      {/* Informative Educational Description */}
      {detail?.description ? (
        <Text style={styles.descriptionText}>{detail.description}</Text>
      ) : null}

      {/* Target Muscle Role Tabs (for Muscles) */}
      {dimension === 'muscle' && detail?.roles && (
        <View style={styles.rolesTabsRow}>
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityLabel={`All exercises, count: ${detail.exerciseCount}`}
            accessibilityState={{ selected: selectedRole === 'ALL' }}
            onPress={() => handleRoleChange('ALL')}
            style={[styles.roleTab, selectedRole === 'ALL' && styles.roleTabActive]}
          >
            <Text style={[styles.roleTabText, selectedRole === 'ALL' && styles.roleTabTextActive]}>
              All ({detail.exerciseCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityLabel={`Primary target exercises, count: ${detail.roles.primaryCount}`}
            accessibilityState={{ selected: selectedRole === 'PRIMARY' }}
            onPress={() => handleRoleChange('PRIMARY')}
            style={[styles.roleTab, selectedRole === 'PRIMARY' && styles.roleTabActive]}
          >
            <Text style={[styles.roleTabText, selectedRole === 'PRIMARY' && styles.roleTabTextActive]}>
              Primary Target ({detail.roles.primaryCount})
            </Text>
          </TouchableOpacity>

          {detail.roles.secondaryCount > 0 && (
            <TouchableOpacity
              accessibilityRole="tab"
              accessibilityLabel={`Secondary target exercises, count: ${detail.roles.secondaryCount}`}
              accessibilityState={{ selected: selectedRole === 'SECONDARY' }}
              onPress={() => handleRoleChange('SECONDARY')}
              style={[styles.roleTab, selectedRole === 'SECONDARY' && styles.roleTabActive]}
            >
              <Text style={[styles.roleTabText, selectedRole === 'SECONDARY' && styles.roleTabTextActive]}>
                Secondary ({detail.roles.secondaryCount})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Cross-Discovery Filter Bar */}
      {detail && (
        <CrossDiscoveryFilterBar
          relatedEquipment={detail.relatedEquipment}
          relatedMovements={detail.relatedMovements}
          relatedMuscles={detail.relatedMuscles}
          difficultyDistribution={detail.difficultyDistribution}
          selectedEquipment={selectedEquipment}
          selectedMovement={selectedMovement}
          selectedDifficulty={selectedDifficulty}
          onSelectEquipment={handleEquipmentFilter}
          onSelectMovement={handleMovementFilter}
          onSelectDifficulty={handleDifficultyFilter}
          onResetFilters={handleResetFilters}
        />
      )}

      {/* Results Header */}
      <View style={styles.resultsHeaderRow}>
        <Text style={styles.resultsCountText}>
          Showing {exercises.length} {exercises.length === 1 ? 'movement' : 'movements'}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top App Bar Navigation */}
      <View style={styles.topAppBar}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Icon name="chevron-left" size={24} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {detail?.title || initialTitle || value}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Loading exercises for {value}...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={40} color={themeColors.danger} />
          <Text style={styles.errorTitle}>Discovery Error</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <Button
            title="Try Again"
            variant="outline"
            onPress={loadDimensionDetail}
            style={{ marginTop: spacing.md }}
          />
        </View>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <ExerciseCard
                exercise={item}
                onPress={handleOpenExercise}
                onToggleFavorite={handleToggleFavorite}
              />
            </View>
          )}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <Icon name="dumbbell" size={36} color={themeColors.textSecondary} />
              <Text style={styles.emptyTitle}>No Matching Exercises Found</Text>
              <Text style={styles.emptyText}>
                No exercises match the selected cross-discovery filter criteria. Try clearing filters or selecting another option.
              </Text>
              {(selectedEquipment || selectedMovement || selectedDifficulty) && (
                <Button
                  title="Clear Active Filters"
                  variant="primary"
                  size="sm"
                  onPress={handleResetFilters}
                  style={{ marginTop: spacing.sm }}
                />
              )}
            </Card>
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadDimensionDetail();
              }}
              tintColor={themeColors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  topAppBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    backgroundColor: themeColors.surface,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    ...typography.subtitle1,
    fontWeight: '700',
    color: themeColors.textPrimary,
    maxWidth: '70%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body2,
    color: themeColors.textSecondary,
    marginTop: spacing.sm,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
    marginTop: spacing.sm,
  },
  errorSubtitle: {
    ...typography.body2,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  headerContainer: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    backgroundColor: themeColors.surface,
    marginBottom: spacing.md,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: spacing.sm,
  },
  breadcrumbLink: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  breadcrumbSeparator: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  breadcrumbCurrent: {
    ...typography.caption,
    color: themeColors.primary,
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  heroTitle: {
    ...typography.h2,
    fontWeight: '800',
    color: themeColors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  descriptionText: {
    ...typography.body2,
    color: themeColors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  rolesTabsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: themeColors.cardBackground,
    padding: 3,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginBottom: spacing.md,
  },
  roleTab: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  roleTabActive: {
    backgroundColor: themeColors.primary,
  },
  roleTabText: {
    ...typography.caption,
    fontWeight: '600',
    color: themeColors.textSecondary,
  },
  roleTabTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  resultsHeaderRow: {
    marginTop: spacing.sm,
  },
  resultsCountText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  cardWrapper: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyCard: {
    margin: spacing.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.surface,
  },
  emptyTitle: {
    ...typography.subtitle1,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginTop: spacing.sm,
  },
  emptyText: {
    ...typography.body2,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
