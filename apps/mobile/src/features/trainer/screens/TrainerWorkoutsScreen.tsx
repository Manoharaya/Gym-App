import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { TrainerStackParamList } from '../../../navigation/types';
import { Screen, Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { WorkoutService } from '../../training/services/workoutService';
import type { Workout, WorkoutStatus } from '@fitcore/types';

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

type RouteProps = RouteProp<TrainerStackParamList, 'TrainerWorkouts'>;

const STATUS_FILTERS: (WorkoutStatus | 'ALL')[] = ['ALL', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'];

export const TrainerWorkoutsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProps>();
  const memberProfileId = route.params?.memberProfileId;

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<WorkoutStatus | 'ALL'>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const fetchWorkouts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await WorkoutService.getWorkouts({
        memberProfileId,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      setWorkouts(res.items || []);
    } catch (err) {
      console.warn('Failed to load workouts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [memberProfileId, statusFilter]);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWorkouts();
  };

  const renderWorkoutItem = ({ item }: { item: Workout }) => {
    const exerciseCount = item.exercises?.length || 0;
    const formattedDate = item.scheduledDate
      ? new Date(item.scheduledDate).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      : 'Unscheduled';

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('WorkoutSession', {
            workoutId: item.id,
          })
        }
      >
        <Card style={styles.workoutCard}>
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.workoutTitle}>{item.title}</Text>
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
            <Badge
              label={item.status}
              variant={
                item.status === 'COMPLETED'
                  ? 'success'
                  : item.status === 'IN_PROGRESS'
                  ? 'accent'
                  : 'neutral'
              }
            />
          </View>

          <View style={styles.footerRow}>
            <View style={styles.metaItem}>
              <Icon name="dumbbell" size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>{exerciseCount} Exercises</Text>
            </View>
            {item.estimatedDurationMinutes ? (
              <View style={styles.metaItem}>
                <Icon name="clock" size={14} color={colors.textSecondary} />
                <Text style={styles.metaText}>{item.estimatedDurationMinutes} mins</Text>
              </View>
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
        <Text style={styles.headerTitle}>Client Workouts</Text>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('CreateWorkout', {
              memberProfileId,
            })
          }
          style={styles.addButton}
        >
          <Icon name="plus" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => {
          const isSelected = statusFilter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, isSelected && styles.filterTabActive]}
              onPress={() => setStatusFilter(f)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  isSelected && styles.filterTabTextActive,
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Workouts List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading assigned workouts...</Text>
        </View>
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item) => item.id}
          renderItem={renderWorkoutItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="calendar" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>No Workouts Programmed</Text>
              <Text style={styles.emptySubtitle}>
                Tap the '+' icon at top right to assign a workout to this client.
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: sp.lg,
    gap: sp.xs,
    marginVertical: sp.sm,
  },
  filterTab: {
    paddingHorizontal: sp.md,
    paddingVertical: sp.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHighlight,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: sp.lg,
    paddingBottom: sp.xxl,
    gap: sp.md,
  },
  workoutCard: {
    padding: sp.md,
    gap: sp.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    marginRight: sp.sm,
  },
  workoutTitle: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dateText: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    gap: sp.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: sp.xs + 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.caption,
    color: colors.textSecondary,
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
