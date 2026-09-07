import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { ExerciseService } from '../services/exerciseService';
import type { Exercise, MuscleGroup } from '@fitcore/types';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
  xl: spacing[8],
  xxl: spacing[12],
};

const colors = {
  ...themeColors,
  primary: themeColors.primary,
  accent: themeColors.accent,
  textTertiary: themeColors.textMuted,
  surfaceHighlight: themeColors.surfaceElevated,
};

const MUSCLE_FILTERS: (MuscleGroup | 'ALL')[] = [
  'ALL',
  'CHEST',
  'BACK',
  'QUADRICEPS',
  'HAMSTRINGS',
  'GLUTES',
  'SHOULDERS',
  'CORE',
  'FULL_BODY',
];

export const ExerciseLibraryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'ALL'>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const fetchExercises = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ExerciseService.getExercises({
        search: search.trim() || undefined,
        muscleGroup: selectedMuscle === 'ALL' ? undefined : selectedMuscle,
      });
      setExercises(res.items || []);
    } catch (err) {
      console.warn('Failed to load exercises:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedMuscle]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchExercises();
    }, 250);
    return () => clearTimeout(timeout);
  }, [fetchExercises]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExercises();
  };

  const renderExerciseItem = ({ item }: { item: Exercise }) => {
    const isSystem = item.ownershipType === 'SYSTEM';

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('ExerciseDetail', {
            exerciseId: item.id,
            exerciseName: item.name,
          })
        }
      >
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.exerciseName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.equipmentText}>{item.equipment || 'EQUIPMENT'}</Text>
            </View>
            <Badge
              label={isSystem ? 'SYSTEM' : 'CUSTOM'}
              variant={isSystem ? 'neutral' : 'primary'}
            />
          </View>

          <View style={styles.badgeRow}>
            <Badge label={item.primaryMuscleGroup} variant="accent" />
            <Badge label={item.difficulty} variant="neutral" />
            {item.movementPattern ? (
              <Badge label={item.movementPattern} variant="neutral" />
            ) : null}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Exercise Library</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises, cues, muscles..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Muscle Filter Pills */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {MUSCLE_FILTERS.map((filter) => {
            const isSelected = selectedMuscle === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterPill, isSelected && styles.filterPillActive]}
                onPress={() => setSelectedMuscle(filter)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isSelected && styles.filterPillTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Exercise List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading exercise library...</Text>
        </View>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          renderItem={renderExerciseItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="dumbbell" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>No Exercises Found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search or muscle group filter.
              </Text>
            </View>
          }
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp.lg,
    paddingVertical: sp.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHighlight,
    marginHorizontal: sp.lg,
    paddingHorizontal: sp.md,
    borderRadius: radius.md,
    height: 46,
  },
  searchInput: {
    flex: 1,
    marginLeft: sp.sm,
    color: colors.textPrimary,
    ...typography.body,
  },
  filterWrapper: {
    marginVertical: sp.md,
  },
  filterScroll: {
    paddingHorizontal: sp.lg,
    gap: sp.xs,
  },
  filterPill: {
    paddingHorizontal: sp.md,
    paddingVertical: sp.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHighlight,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
  },
  filterPillText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: sp.lg,
    paddingBottom: sp.xxl,
    gap: sp.md,
  },
  card: {
    padding: sp.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: sp.sm,
  },
  titleContainer: {
    flex: 1,
    marginRight: sp.sm,
  },
  exerciseName: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  equipmentText: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.xs,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: sp.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: sp.xxl * 2,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: sp.md,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: sp.xs,
    textAlign: 'center',
  },
});
