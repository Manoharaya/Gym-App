import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MemberStackParamList } from '../../../navigation/types';
import { Screen, Card, Button, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';

type NavigationProp = NativeStackNavigationProp<MemberStackParamList, 'WorkoutSession'>;

interface WorkoutSet {
  setNumber: number;
  prevWeight: number;
  weight: number;
  reps: number;
  completed: boolean;
}

interface ExerciseItem {
  id: string;
  name: string;
  targetMuscle: string;
  sets: WorkoutSet[];
}

const INITIAL_EXERCISES: ExerciseItem[] = [
  {
    id: 'ex_bench',
    name: 'Barbell Bench Press',
    targetMuscle: 'Chest / Triceps',
    sets: [
      { setNumber: 1, prevWeight: 80, weight: 80, reps: 10, completed: true },
      { setNumber: 2, prevWeight: 82.5, weight: 82.5, reps: 8, completed: true },
      { setNumber: 3, prevWeight: 85, weight: 85, reps: 8, completed: false },
      { setNumber: 4, prevWeight: 85, weight: 85, reps: 6, completed: false },
    ],
  },
  {
    id: 'ex_incline',
    name: 'Incline Dumbbell Press',
    targetMuscle: 'Upper Chest',
    sets: [
      { setNumber: 1, prevWeight: 30, weight: 30, reps: 10, completed: false },
      { setNumber: 2, prevWeight: 30, weight: 30, reps: 10, completed: false },
      { setNumber: 3, prevWeight: 32, weight: 32, reps: 8, completed: false },
    ],
  },
  {
    id: 'ex_fly',
    name: 'Cable Chest Fly',
    targetMuscle: 'Chest Isolation',
    sets: [
      { setNumber: 1, prevWeight: 15, weight: 15, reps: 12, completed: false },
      { setNumber: 2, prevWeight: 15, weight: 15, reps: 12, completed: false },
      { setNumber: 3, prevWeight: 17.5, weight: 17.5, reps: 10, completed: false },
    ],
  },
];

export const WorkoutSessionScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [exercises, setExercises] = useState<ExerciseItem[]>(INITIAL_EXERCISES);
  const [secondsElapsed, setSecondsElapsed] = useState(1420); // ~23 mins
  const [restSeconds, setRestSeconds] = useState(0);

  // Active workout timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
      setRestSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleSet = (exerciseId: string, setIndex: number) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const newSets = [...ex.sets];
        const currentSet = newSets[setIndex];
        if (!currentSet) return ex;
        const isNowCompleted = !currentSet.completed;
        newSets[setIndex] = { ...currentSet, completed: isNowCompleted };
        if (isNowCompleted) {
          setRestSeconds(60); // Trigger 60s rest timer
        }
        return { ...ex, sets: newSets };
      }),
    );
  };

  const handleFinishWorkout = () => {
    Alert.alert(
      'Workout Completed! 🎉',
      `Great session, Alex!\n\nDuration: ${formatTimer(secondsElapsed)}\nVolume: 4,820 kg\nCalories: ~340 kcal\n\nSaved to your training log.`,
      [{ text: 'View Progress', onPress: () => navigation.navigate('Progress') }],
    );
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      {/* Sticky Header with Timer */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.workoutName}>Upper Body Hypertrophy</Text>
          <View style={styles.timerRow}>
            <View style={styles.liveDot} />
            <Text style={styles.timerText}>{formatTimer(secondsElapsed)}</Text>
          </View>
        </View>
        <Button
          title="Finish"
          onPress={handleFinishWorkout}
          variant="accent"
          size="sm"
          style={styles.finishHeaderBtn}
        />
      </View>

      {/* Optional Active Rest Timer Banner */}
      {restSeconds > 0 && (
        <View style={styles.restBanner}>
          <Icon name="timer" size={16} color={themeColors.accent} />
          <Text style={styles.restText}>Rest Timer: {restSeconds}s remaining</Text>
          <TouchableOpacity onPress={() => setRestSeconds(0)}>
            <Text style={styles.skipRestText}>Skip</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollList} showsVerticalScrollIndicator={false}>
        {exercises.map((exercise) => (
          <Card key={exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <View>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.targetMuscle}>{exercise.targetMuscle}</Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('ExerciseDetail', {
                    exerciseId: exercise.id,
                    exerciseName: exercise.name,
                  })
                }
                style={styles.formGuideButton}
              >
                <Icon name="sparkles" size={14} color={themeColors.aiPrimary} />
                <Text style={styles.formGuideText}>Form Guide</Text>
              </TouchableOpacity>
            </View>

            {/* Sets Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.columnLabel, { width: 44 }]}>SET</Text>
              <Text style={[styles.columnLabel, { flex: 1 }]}>PREVIOUS</Text>
              <Text style={[styles.columnLabel, { flex: 1 }]}>KG</Text>
              <Text style={[styles.columnLabel, { flex: 1 }]}>REPS</Text>
              <Text style={[styles.columnLabel, { width: 44, textAlign: 'center' }]}>DONE</Text>
            </View>

            {/* Set Rows */}
            {exercise.sets.map((set, idx) => (
              <View
                key={idx}
                style={[styles.setRow, set.completed && styles.setRowCompleted]}
              >
                <Text style={[styles.setText, { width: 44 }]}>{set.setNumber}</Text>
                <Text style={[styles.prevText, { flex: 1 }]}>{set.prevWeight} kg</Text>
                <Text style={[styles.valueText, { flex: 1 }]}>{set.weight}</Text>
                <Text style={[styles.valueText, { flex: 1 }]}>{set.reps}</Text>
                <TouchableOpacity
                  onPress={() => toggleSet(exercise.id, idx)}
                  style={[styles.checkBtn, set.completed && styles.checkBtnActive]}
                >
                  {set.completed && <Icon name="check" size={14} color="#FFFFFF" />}
                </TouchableOpacity>
              </View>
            ))}
          </Card>
        ))}

        <Button
          title="Complete Workout"
          onPress={handleFinishWorkout}
          variant="accent"
          size="lg"
          style={styles.completeBtn}
        />
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    backgroundColor: themeColors.surface,
  },
  backButton: {
    padding: spacing[1],
  },
  headerCenter: {
    alignItems: 'center',
  },
  workoutName: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: themeColors.success,
  },
  timerText: {
    ...typography.caption,
    color: themeColors.accent,
    fontWeight: '700',
  },
  finishHeaderBtn: {
    minHeight: 32,
    paddingHorizontal: spacing[3],
  },
  restBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: themeColors.accentLight,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  restText: {
    ...typography.caption,
    color: themeColors.accent,
    fontWeight: '600',
  },
  skipRestText: {
    ...typography.caption,
    color: themeColors.accent,
    fontWeight: '700',
  },
  scrollList: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[10],
  },
  exerciseCard: {
    padding: spacing[4],
    gap: spacing[3],
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  exerciseName: {
    ...typography.h3,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  targetMuscle: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  formGuideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.aiLight,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    gap: spacing[1],
  },
  formGuideText: {
    ...typography.caption,
    color: themeColors.aiPrimary,
    fontWeight: '600',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[1],
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  columnLabel: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '700',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: themeColors.surface,
  },
  setRowCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderRadius: radius.sm,
  },
  setText: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  prevText: {
    ...typography.bodySmall,
    color: themeColors.textMuted,
  },
  valueText: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  checkBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: themeColors.surfaceActive,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  checkBtnActive: {
    backgroundColor: themeColors.success,
    borderColor: themeColors.success,
  },
  completeBtn: {
    marginTop: spacing[2],
  },
});
