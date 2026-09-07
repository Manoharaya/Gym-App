import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { TrainerStackParamList } from '../../../navigation/types';
import { Screen, Card, Button, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { WorkoutService } from '../../training/services/workoutService';
import { ExerciseService } from '../../exercises/services/exerciseService';
import type { Exercise, WorkoutTemplate, ExerciseDifficulty } from '@fitcore/types';

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
  error: themeColors.danger,
};

type RouteProps = RouteProp<TrainerStackParamList, 'CreateWorkout'>;

export const CreateWorkoutScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProps>();
  const memberProfileId = route.params?.memberProfileId || 'member_alex_mercer';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('60');
  const [difficulty] = useState<ExerciseDifficulty>('INTERMEDIATE');
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<
    { exercise: Exercise; sets: number; reps: number; load: number }[]
  >([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      WorkoutService.getTemplates().catch(() => ({ items: [] })),
      ExerciseService.getExercises({ limit: 10 }).catch(() => ({ items: [] })),
    ]).then(([tmplRes, exRes]) => {
      setTemplates(tmplRes.items || []);
      setAvailableExercises(exRes.items || []);
    });
  }, []);

  const handleSelectTemplate = (template: WorkoutTemplate) => {
    setSelectedTemplateId(template.id);
    setName(template.name);
    setDescription(template.description || '');
    if (template.estimatedDurationMinutes) {
      setDuration(template.estimatedDurationMinutes.toString());
    }
  };

  const handleAddExercise = (exercise: Exercise) => {
    if (selectedExercises.some((e) => e.exercise.id === exercise.id)) {
      return;
    }
    setSelectedExercises((prev) => [
      ...prev,
      { exercise, sets: 3, reps: 10, load: 60 },
    ]);
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setSelectedExercises((prev) => prev.filter((e) => e.exercise.id !== exerciseId));
  };

  const handleAssignWorkout = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a workout title');
      return;
    }

    if (!selectedTemplateId && selectedExercises.length === 0) {
      Alert.alert('Validation Error', 'Please select a template or add at least one exercise');
      return;
    }

    try {
      setSaving(true);
      await WorkoutService.assignWorkout({
        memberProfileId,
        name: name.trim(),
        description: description.trim() || undefined,
        scheduledDate: new Date().toISOString(),
        estimatedDurationMinutes: parseInt(duration, 10) || 60,
        difficulty,
        templateId: selectedTemplateId || undefined,
        exercises: selectedTemplateId
          ? undefined
          : selectedExercises.map((item, idx) => ({
              exerciseId: item.exercise.id,
              sortOrder: idx,
              targetSets: item.sets,
              targetReps: item.reps,
              targetLoad: item.load,
              loadUnit: 'KG',
              restSeconds: 90,
            })),
      });

      Alert.alert('Success', 'Workout successfully assigned to client!');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to assign workout');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Program Workout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Templates Quick Pick */}
        {templates.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>LOAD FROM TEMPLATE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateScroll}>
              {templates.map((tmpl) => {
                const isSelected = selectedTemplateId === tmpl.id;
                return (
                  <TouchableOpacity
                    key={tmpl.id}
                    style={[styles.templateCard, isSelected && styles.templateCardActive]}
                    onPress={() => handleSelectTemplate(tmpl)}
                  >
                    <Text style={[styles.templateName, isSelected && styles.templateNameActive]}>
                      {tmpl.name}
                    </Text>
                    <Text style={styles.templateDifficulty}>{tmpl.difficulty}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* Workout Details Form */}
        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>WORKOUT DETAILS</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Workout Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Upper Body Strength A"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Coaching notes, goals, or instructions"
              placeholderTextColor={colors.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.rowFields}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Duration (mins)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={duration}
                onChangeText={setDuration}
              />
            </View>

            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Difficulty</Text>
              <View style={styles.difficultyBadge}>
                <Text style={styles.difficultyText}>{difficulty}</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Selected Exercises (if not template) */}
        {!selectedTemplateId ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EXERCISES PRESCRIBED</Text>

            {selectedExercises.map((item, index) => (
              <Card key={item.exercise.id} style={styles.exerciseRowCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseTitle}>
                    {index + 1}. {item.exercise.name}
                  </Text>
                  <TouchableOpacity onPress={() => handleRemoveExercise(item.exercise.id)}>
                    <Icon name="close" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>

                <View style={styles.prescriptionInputRow}>
                  <View style={styles.prescriptionInput}>
                    <Text style={styles.subLabel}>Sets</Text>
                    <TextInput
                      style={styles.numberInput}
                      keyboardType="numeric"
                      value={item.sets.toString()}
                      onChangeText={(val) => {
                        const updated = [...selectedExercises];
                        const el = updated[index];
                        if (el) {
                          el.sets = parseInt(val, 10) || 0;
                          setSelectedExercises(updated);
                        }
                      }}
                    />
                  </View>

                  <View style={styles.prescriptionInput}>
                    <Text style={styles.subLabel}>Reps</Text>
                    <TextInput
                      style={styles.numberInput}
                      keyboardType="numeric"
                      value={item.reps.toString()}
                      onChangeText={(val) => {
                        const updated = [...selectedExercises];
                        const el = updated[index];
                        if (el) {
                          el.reps = parseInt(val, 10) || 0;
                          setSelectedExercises(updated);
                        }
                      }}
                    />
                  </View>

                  <View style={styles.prescriptionInput}>
                    <Text style={styles.subLabel}>Load (kg)</Text>
                    <TextInput
                      style={styles.numberInput}
                      keyboardType="numeric"
                      value={item.load.toString()}
                      onChangeText={(val) => {
                        const updated = [...selectedExercises];
                        const el = updated[index];
                        if (el) {
                          el.load = parseInt(val, 10) || 0;
                          setSelectedExercises(updated);
                        }
                      }}
                    />
                  </View>
                </View>
              </Card>
            ))}

            {/* Quick Add from Catalog */}
            <Text style={[styles.sectionTitle, { marginTop: sp.md }]}>ADD EXERCISE FROM CATALOG</Text>
            <View style={styles.quickAddWrap}>
              {availableExercises.map((ex) => (
                <TouchableOpacity
                  key={ex.id}
                  style={styles.quickAddPill}
                  onPress={() => handleAddExercise(ex)}
                >
                  <Icon name="plus" size={14} color={colors.primary} />
                  <Text style={styles.quickAddText}>{ex.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        {/* Submit Button */}
        <Button
          title={saving ? 'Assigning...' : 'Assign Workout to Client'}
          variant="primary"
          onPress={handleAssignWorkout}
          loading={saving}
          style={styles.submitButton}
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
  container: {
    paddingHorizontal: sp.lg,
    paddingBottom: sp.xxl,
    gap: sp.lg,
  },
  section: {
    gap: sp.sm,
  },
  sectionTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 1,
  },
  templateScroll: {
    gap: sp.sm,
  },
  templateCard: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: sp.md,
    paddingVertical: sp.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  templateCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  templateName: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  templateNameActive: {
    color: colors.primary,
  },
  templateDifficulty: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  formCard: {
    padding: sp.md,
    gap: sp.md,
  },
  fieldGroup: {
    gap: sp.xs,
  },
  rowFields: {
    flexDirection: 'row',
    gap: sp.md,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  subLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.surfaceHighlight,
    color: colors.textPrimary,
    paddingHorizontal: sp.md,
    paddingVertical: sp.sm,
    borderRadius: radius.sm,
    ...typography.body,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  difficultyBadge: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: sp.md,
    paddingVertical: sp.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  difficultyText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
  },
  exerciseRowCard: {
    padding: sp.md,
    gap: sp.sm,
    marginBottom: sp.sm,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseTitle: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  prescriptionInputRow: {
    flexDirection: 'row',
    gap: sp.sm,
  },
  prescriptionInput: {
    flex: 1,
    gap: 2,
  },
  numberInput: {
    backgroundColor: colors.surfaceHighlight,
    color: colors.textPrimary,
    paddingVertical: sp.xs,
    borderRadius: radius.sm,
    textAlign: 'center',
    ...typography.body,
  },
  quickAddWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.xs,
  },
  quickAddPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: sp.sm,
    paddingVertical: sp.xs,
    borderRadius: radius.full,
  },
  quickAddText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  submitButton: {
    marginTop: sp.md,
  },
});
