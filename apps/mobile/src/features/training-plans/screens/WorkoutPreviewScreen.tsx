import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Screen, Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, spacing, radius } from '../../../theme';
import { WorkoutService } from '../../training/services/workoutService';
import type { Workout, WorkoutExercise, WorkoutExerciseGroup } from '@fitcore/types';

export const WorkoutPreviewScreen: React.FC = () => {
  const route = useRoute<any>();
  const workoutId = route.params?.workoutId;

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadWorkout = useCallback(async () => {
    if (!workoutId) return;
    try {
      setLoading(true);
      const data = await WorkoutService.getWorkoutById(workoutId);
      setWorkout(data);
    } catch (err) {
      console.error('Failed to load workout for preview', err);
    } finally {
      setLoading(false);
    }
  }, [workoutId]);

  useEffect(() => {
    loadWorkout();
  }, [loadWorkout]);

  if (loading) {
    return (
      <Screen style={styles.centerContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>Loading member workout preview...</Text>
      </Screen>
    );
  }

  if (!workout) {
    return (
      <Screen style={styles.centerContainer}>
        <Text style={styles.emptyText}>Workout not found</Text>
      </Screen>
    );
  }

  const exercises = workout.exercises || [];
  const exerciseGroups = (workout as any).exerciseGroups || [];

  return (
    <Screen style={styles.container}>
      {/* Read-Only Notice Banner */}
      <View style={styles.readOnlyBanner}>
        <Icon name="activity" size={16} color="#000000" />
        <Text style={styles.readOnlyBannerText}>
          TRAINER PREVIEW MODE (Read-Only • Member Experience Simulation)
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Workout Meta Card */}
        <Card style={styles.metaCard}>
          <View style={styles.metaHeader}>
            <Badge label="PREVIEW ONLY" variant="neutral" />
            {workout.estimatedDurationMinutes ? (
              <Text style={styles.durationTag}>⏱️ {workout.estimatedDurationMinutes} mins</Text>
            ) : null}
          </View>

          <Text style={styles.workoutTitle}>{workout.title}</Text>
          {workout.description ? (
            <Text style={styles.workoutDescription}>{workout.description}</Text>
          ) : null}

          {workout.scheduledDate ? (
            <Text style={styles.scheduledDateText}>
              📅 Scheduled: {new Date(workout.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </Text>
          ) : null}
        </Card>

        {/* Exercise Groups (Supersets / Circuits) */}
        {exerciseGroups.length > 0 ? (
          <View style={styles.groupSection}>
            <Text style={styles.sectionHeaderTitle}>Exercise Groups & Circuits</Text>
            {exerciseGroups.map((grp: WorkoutExerciseGroup) => (
              <Card key={grp.id} style={styles.groupCard}>
                <View style={styles.groupHeaderRow}>
                  <Badge label={grp.type} variant="warning" />
                  <Text style={styles.groupRoundsText}>{grp.rounds} ROUNDS</Text>
                </View>

                <Text style={styles.groupName}>{grp.name}</Text>
                {grp.notes ? <Text style={styles.groupNotes}>{grp.notes}</Text> : null}

                <View style={styles.groupIntervalsRow}>
                  {grp.restBetweenExercises ? (
                    <Text style={styles.intervalText}>
                      ⏱️ {grp.restBetweenExercises}s rest between exercises
                    </Text>
                  ) : null}
                  {grp.restBetweenRounds ? (
                    <Text style={styles.intervalText}>
                      🔄 {grp.restBetweenRounds}s rest between rounds
                    </Text>
                  ) : null}
                </View>

                {/* Exercises inside this group */}
                <View style={styles.groupExercisesList}>
                  {grp.exercises?.map((ex: WorkoutExercise, idx: number) => (
                    <View key={ex.id} style={styles.groupExerciseItem}>
                      <View style={styles.exOrderBadge}>
                        <Text style={styles.exOrderText}>{idx + 1}</Text>
                      </View>
                      <View style={styles.exDetails}>
                        <Text style={styles.exName}>{ex.exerciseNameSnapshot}</Text>
                        <Text style={styles.exPrescription}>
                          {ex.targetSets || 3} sets × {ex.targetReps || 'reps'}{' '}
                          {ex.targetLoad ? `@ ${ex.targetLoad}kg` : ''}{' '}
                          {ex.targetRPE ? `(RPE ${ex.targetRPE})` : ''}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </Card>
            ))}
          </View>
        ) : null}

        {/* Standard Prescribed Exercises List */}
        <View style={styles.exercisesSection}>
          <Text style={styles.sectionHeaderTitle}>Prescribed Exercises ({exercises.length})</Text>
          {exercises.map((ex, index) => (
            <Card key={ex.id} style={styles.exerciseCard}>
              <View style={styles.exCardHeader}>
                <Text style={styles.exIndex}>#{index + 1}</Text>
                <View style={styles.exMainInfo}>
                  <Text style={styles.exName}>{ex.exerciseNameSnapshot}</Text>
                  <Text style={styles.sectionBadge}>
                    Section: {ex.sectionName || 'MAIN'}
                  </Text>
                </View>
                <Badge label={ex.prescriptionType} variant="neutral" />
              </View>

              {ex.coachingCueSnapshot ? (
                <View style={styles.cueBox}>
                  <Text style={styles.cueLabel}>Cues:</Text>
                  <Text style={styles.cueText}>{ex.coachingCueSnapshot}</Text>
                </View>
              ) : null}

              {/* Prescription targets */}
              <View style={styles.targetsRow}>
                <View style={styles.targetItem}>
                  <Text style={styles.targetLabel}>SETS</Text>
                  <Text style={styles.targetValue}>{ex.targetSets || 3}</Text>
                </View>
                <View style={styles.targetItem}>
                  <Text style={styles.targetLabel}>REPS</Text>
                  <Text style={styles.targetValue}>{ex.targetReps || 10}</Text>
                </View>
                {ex.targetLoad ? (
                  <View style={styles.targetItem}>
                    <Text style={styles.targetLabel}>LOAD</Text>
                    <Text style={styles.targetValue}>{ex.targetLoad} kg</Text>
                  </View>
                ) : null}
                <View style={styles.targetItem}>
                  <Text style={styles.targetLabel}>REST</Text>
                  <Text style={styles.targetValue}>{ex.restSeconds || 90}s</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeColors.background,
  },
  loadingText: {
    marginTop: spacing[3],
    color: themeColors.textMuted,
    fontSize: 14,
  },
  emptyText: {
    color: themeColors.textMuted,
    fontSize: 16,
  },
  readOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5A93C',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  readOnlyBannerText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[12],
  },
  metaCard: {
    padding: spacing[4],
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  metaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  durationTag: {
    fontSize: 12,
    color: themeColors.primary,
    fontWeight: '600',
  },
  workoutTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
  },
  workoutDescription: {
    fontSize: 12,
    color: themeColors.textMuted,
    marginTop: spacing[1],
  },
  scheduledDateText: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: spacing[3],
  },
  groupSection: {
    gap: spacing[3],
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: themeColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupCard: {
    padding: spacing[4],
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupRoundsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: themeColors.accent,
  },
  groupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    marginTop: spacing[2],
  },
  groupNotes: {
    fontSize: 12,
    color: themeColors.textMuted,
    marginTop: 2,
  },
  groupIntervalsRow: {
    marginVertical: spacing[2],
    gap: 2,
  },
  intervalText: {
    fontSize: 10,
    color: themeColors.textSecondary,
  },
  groupExercisesList: {
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    gap: spacing[2],
  },
  groupExerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[1],
  },
  exOrderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: themeColors.elevatedBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  exOrderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
  },
  exDetails: {
    flex: 1,
  },
  exName: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  exPrescription: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  exercisesSection: {
    gap: spacing[3],
  },
  exerciseCard: {
    padding: spacing[4],
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  exCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exIndex: {
    fontSize: 12,
    fontWeight: 'bold',
    color: themeColors.textMuted,
    marginRight: spacing[3],
  },
  exMainInfo: {
    flex: 1,
  },
  sectionBadge: {
    fontSize: 10,
    color: themeColors.textMuted,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  cueBox: {
    flexDirection: 'row',
    marginTop: spacing[2],
    padding: spacing[2],
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.sm,
    gap: spacing[1],
  },
  cueLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: themeColors.primary,
  },
  cueText: {
    fontSize: 10,
    color: themeColors.textSecondary,
    flex: 1,
  },
  targetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  targetItem: {
    alignItems: 'center',
  },
  targetLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: themeColors.textMuted,
  },
  targetValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    marginTop: 2,
  },
});
