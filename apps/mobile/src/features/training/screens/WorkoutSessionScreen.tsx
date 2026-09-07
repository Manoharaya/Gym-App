import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { MemberStackParamList } from '../../../navigation/types';
import { Screen, Card, Button, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { WorkoutService } from '../services/workoutService';
import { kgToLb } from '@fitcore/utils';
import type { Workout, WorkoutExercise } from '@fitcore/types';

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

type NavigationProp = NativeStackNavigationProp<MemberStackParamList, 'WorkoutSession'>;
type RouteProps = RouteProp<MemberStackParamList, 'WorkoutSession'>;

export const WorkoutSessionScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const workoutId = route.params?.workoutId;

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [unit, setUnit] = useState<'KG' | 'LB'>('KG');
  const [completing, setCompleting] = useState(false);

  // Active workout timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadWorkout = useCallback(async () => {
    if (!workoutId) return;
    try {
      setLoading(true);
      const data = await WorkoutService.getWorkoutById(workoutId);
      setWorkout(data);
    } catch (err) {
      console.warn('Failed to load workout session:', err);
    } finally {
      setLoading(false);
    }
  }, [workoutId]);

  useEffect(() => {
    loadWorkout();
  }, [loadWorkout]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleUnit = () => {
    setUnit((prev) => (prev === 'KG' ? 'LB' : 'KG'));
  };

  const handleLogSet = async (exercise: WorkoutExercise) => {
    const nextSetNumber = (exercise.sets?.length || 0) + 1;
    const defaultLoad = exercise.targetLoad || 60;
    const repsValue = exercise.targetReps || 10;
    const idempotencyKey = `set_${exercise.id}_${nextSetNumber}_${Date.now()}`;

    try {
      await WorkoutService.logSet(exercise.id, {
        setNumber: nextSetNumber,
        actualReps: repsValue,
        actualLoad: defaultLoad,
        loadUnit: 'KG',
        actualRpe: 8,
        isCompleted: true,
        idempotencyKey,
      });
      if (workoutId) {
        await loadWorkout();
      }
    } catch (err) {
      console.warn('Set logged offline or error:', err);
    }
  };

  const handleFinishWorkout = () => {
    Alert.alert('Complete Workout', 'Are you ready to submit your workout session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Finish',
        style: 'default',
        onPress: async () => {
          try {
            setCompleting(true);
            if (workoutId) {
              await WorkoutService.completeWorkout(workoutId, {
                rating: 5,
                memberNotes: 'Completed on mobile app',
              });
            }
            Alert.alert('Great Job!', 'Workout successfully completed and logged.');
            navigation.goBack();
          } catch (err) {
            console.warn('Failed to complete workout:', err);
            navigation.goBack();
          } finally {
            setCompleting(false);
          }
        },
      },
    ]);
  };

  const workoutTitle = workout?.title || 'Upper Body Strength Protocol';
  const exercisesList = workout?.exercises || [];

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.timerBadge}>
          <Icon name="clock" size={14} color={colors.primary} />
          <Text style={styles.timerText}>{formatTimer(secondsElapsed)}</Text>
        </View>

        <TouchableOpacity onPress={toggleUnit} style={styles.unitToggle}>
          <Text style={styles.unitToggleText}>{unit}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading workout...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* Title & Metadata */}
          <View style={styles.titleSection}>
            <Text style={styles.workoutTitle}>{workoutTitle}</Text>
            <View style={styles.badgeRow}>
              <Badge label={workout?.status || 'IN_PROGRESS'} variant="accent" />
              <Badge label={`${exercisesList.length} EXERCISES`} variant="neutral" />
            </View>
          </View>

          {/* Exercises List */}
          {exercisesList.map((exercise, exIndex) => {
            const exerciseName = exercise.exerciseNameSnapshot || exercise.exercise?.name || `Exercise ${exIndex + 1}`;
            const sets = exercise.sets || [];
            const targetSetsCount = exercise.targetSets || 3;

            return (
              <Card key={exercise.id || exIndex} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{exerciseName}</Text>
                    <Text style={styles.prescriptionText}>
                      Target: {targetSetsCount} sets × {exercise.targetReps || 10} reps @{' '}
                      {exercise.targetLoad ? `${exercise.targetLoad} kg` : 'RPE 8'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addSetButton}
                    onPress={() => handleLogSet(exercise)}
                  >
                    <Icon name="plus" size={16} color="#FFFFFF" />
                    <Text style={styles.addSetButtonText}>LOG SET</Text>
                  </TouchableOpacity>
                </View>

                {/* Completed Sets Table */}
                <View style={styles.setsTable}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableCol, styles.tableColIndex]}>SET</Text>
                    <Text style={[styles.tableCol, styles.tableColWeight]}>
                      WEIGHT ({unit})
                    </Text>
                    <Text style={[styles.tableCol, styles.tableColReps]}>REPS</Text>
                    <Text style={[styles.tableCol, styles.tableColStatus]}>STATUS</Text>
                  </View>

                  {sets.map((set, setIdx) => {
                    const weightKg = set.actualLoad ?? exercise.targetLoad ?? 60;
                    const displayWeight = unit === 'KG' ? weightKg : kgToLb(weightKg);

                    return (
                      <View key={set.id || setIdx} style={styles.setRow}>
                        <Text style={[styles.tableCol, styles.tableColIndex]}>
                          {set.setNumber}
                        </Text>
                        <Text style={[styles.tableCol, styles.tableColWeight]}>
                          {displayWeight}
                        </Text>
                        <Text style={[styles.tableCol, styles.tableColReps]}>
                          {set.actualReps ?? 10}
                        </Text>
                        <View style={[styles.tableCol, styles.tableColStatus]}>
                          <Icon name="check-circle" size={16} color={colors.success} />
                        </View>
                      </View>
                    );
                  })}

                  {sets.length === 0 ? (
                    <Text style={styles.noSetsText}>
                      No sets logged yet. Tap 'LOG SET' to record your performance.
                    </Text>
                  ) : null}
                </View>
              </Card>
            );
          })}

          {/* Complete Button */}
          <Button
            title={completing ? 'Finishing...' : 'Complete Workout'}
            variant="primary"
            onPress={handleFinishWorkout}
            loading={completing}
            style={styles.completeButton}
          />
        </ScrollView>
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
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: sp.md,
    paddingVertical: sp.xs,
    borderRadius: radius.full,
    gap: sp.xs,
  },
  timerText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  unitToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitToggleText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  container: {
    paddingHorizontal: sp.lg,
    paddingBottom: sp.xxl,
    gap: sp.lg,
  },
  titleSection: {
    gap: sp.xs,
  },
  workoutTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: sp.xs,
  },
  exerciseCard: {
    padding: sp.md,
    gap: sp.md,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseInfo: {
    flex: 1,
    marginRight: sp.sm,
  },
  exerciseName: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  prescriptionText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: sp.sm + 2,
    paddingVertical: sp.xs,
    borderRadius: radius.sm,
    gap: 4,
  },
  addSetButtonText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  setsTable: {
    gap: sp.xs,
    backgroundColor: colors.surfaceHighlight,
    padding: sp.sm,
    borderRadius: radius.sm,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: sp.xs,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sp.xs,
  },
  tableCol: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  tableColIndex: {
    width: 40,
    fontWeight: '700',
  },
  tableColWeight: {
    flex: 1,
    color: colors.textPrimary,
  },
  tableColReps: {
    flex: 1,
    color: colors.textPrimary,
  },
  tableColStatus: {
    width: 50,
    alignItems: 'center',
  },
  noSetsText: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: sp.sm,
  },
  completeButton: {
    marginTop: sp.md,
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
});
