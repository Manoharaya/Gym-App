import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen, Card, Button, Badge } from '../../../components/primitives';
import { themeColors, spacing, radius } from '../../../theme';
import { TrainingPlanService } from '../services/trainingPlanService';
import { WorkoutService } from '../../training/services/workoutService';
import type { TrainingPlan, WorkoutTemplate } from '@fitcore/types';

export const TrainerProgrammingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const memberProfileId = route.params?.memberProfileId;
  const programId = route.params?.programId;
  const planIdParam = route.params?.planId;

  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // New Plan form state
  const [planName, setPlanName] = useState<string>('4-Week Strength Block');
  const [planObjective, setPlanObjective] = useState<string>('Progressive overload in primary compound lifts');
  const [durationWeeks, setDurationWeeks] = useState<number>(4);

  // Template generation state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri
  const [generating, setGenerating] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [tmplRes, plansRes] = await Promise.all([
        WorkoutService.getTemplates(),
        TrainingPlanService.getPlans({ memberProfileId, limit: 1 }),
      ]);

      setTemplates(tmplRes.items);
      if (tmplRes.items.length > 0 && tmplRes.items[0]) {
        setSelectedTemplateId(tmplRes.items[0].id);
      }

      if (planIdParam) {
        const p = await TrainingPlanService.getPlanById(planIdParam);
        setPlan(p);
      } else if (plansRes.items.length > 0 && plansRes.items[0]) {
        const p = await TrainingPlanService.getPlanById(plansRes.items[0].id);
        setPlan(p);
      }
    } catch (err) {
      console.error('Failed to load programming data', err);
    } finally {
      setLoading(false);
    }
  }, [memberProfileId, planIdParam]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreatePlan = async () => {
    if (!planName.trim()) {
      Alert.alert('Validation Error', 'Please enter a plan name');
      return;
    }

    try {
      setSaving(true);
      const newPlan = await TrainingPlanService.createPlan({
        name: planName,
        objective: planObjective,
        memberProfileId: memberProfileId || 'member_default',
        trainingProgramId: programId,
        durationWeeks,
        startDate: new Date().toISOString(),
      });

      setPlan(newPlan);
      Alert.alert('Success', `Training Plan '${newPlan.name}' created with ${newPlan.durationWeeks} weeks!`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create training plan');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateWorkouts = async () => {
    if (!plan) {
      Alert.alert('No Plan', 'Please create or select a training plan first');
      return;
    }
    if (!selectedTemplateId) {
      Alert.alert('Validation', 'Please select a template');
      return;
    }

    try {
      setGenerating(true);
      const res = await TrainingPlanService.generateWorkouts(plan.id, {
        workoutTemplateId: selectedTemplateId,
        dayNumbers: selectedDays,
        applyProgression: true,
      });

      Alert.alert(
        'Generation Complete',
        `Generated ${res.generatedCount} workouts across the training plan (${res.skippedCount} existing days skipped).`,
      );
      const updated = await TrainingPlanService.getPlanById(plan.id);
      setPlan(updated);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to generate workouts from template');
    } finally {
      setGenerating(false);
    }
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  if (loading) {
    return (
      <Screen style={styles.centerContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>Loading programming studio...</Text>
      </Screen>
    );
  }

  return (
    <Screen style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Trainer Programming Studio</Text>
          <Text style={styles.headerSubtitle}>
            Fast multi-week periodization, template generation, and exercise grouping
          </Text>
        </View>

        {/* Existing Plan Status */}
        {plan ? (
          <Card style={styles.activePlanCard}>
            <View style={styles.planBadgeRow}>
              <Badge label={plan.status} variant={plan.status === 'ACTIVE' ? 'success' : 'neutral'} />
              <Text style={styles.planWeeksTag}>{plan.durationWeeks} Weeks</Text>
            </View>
            <Text style={styles.activePlanTitle}>{plan.name}</Text>
            {plan.objective ? <Text style={styles.activePlanObjective}>{plan.objective}</Text> : null}

            {/* Quick Actions */}
            <View style={styles.planActionsRow}>
              {plan.status !== 'ACTIVE' ? (
                <Button
                  title="Activate Plan"
                  variant="primary"
                  onPress={async () => {
                    const activated = await TrainingPlanService.activatePlan(plan.id);
                    setPlan(activated);
                  }}
                />
              ) : (
                <Button
                  title="Pause Plan"
                  variant="outline"
                  onPress={async () => {
                    const paused = await TrainingPlanService.pausePlan(plan.id);
                    setPlan(paused);
                  }}
                />
              )}

              <Button
                title="View Calendar"
                variant="outline"
                onPress={() => navigation.navigate('TrainingCalendar', { planId: plan.id })}
              />
            </View>
          </Card>
        ) : (
          /* Create Plan Form */
          <Card style={styles.formCard}>
            <Text style={styles.cardTitle}>Create New Training Plan</Text>

            <Text style={styles.inputLabel}>Plan Name</Text>
            <TextInput
              style={styles.textInput}
              value={planName}
              onChangeText={setPlanName}
              placeholder="e.g. 8-Week Hypertrophy Phase"
              placeholderTextColor={themeColors.textMuted}
            />

            <Text style={styles.inputLabel}>Objective</Text>
            <TextInput
              style={styles.textInput}
              value={planObjective}
              onChangeText={setPlanObjective}
              placeholder="e.g. Maximize shoulder & chest hypertrophy"
              placeholderTextColor={themeColors.textMuted}
            />

            <Text style={styles.inputLabel}>Duration (Weeks)</Text>
            <View style={styles.durationRow}>
              {[4, 6, 8, 12].map((w) => (
                <TouchableOpacity
                  key={w}
                  style={[styles.durationPill, durationWeeks === w && styles.durationPillActive]}
                  onPress={() => setDurationWeeks(w)}
                >
                  <Text style={[styles.durationText, durationWeeks === w && styles.durationTextActive]}>
                    {w} Weeks
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title={saving ? 'Creating...' : 'Initialize Training Plan'}
              variant="primary"
              onPress={handleCreatePlan}
              disabled={saving}
              style={styles.createButton}
            />
          </Card>
        )}

        {/* Multi-Week Generation Section */}
        {plan ? (
          <Card style={styles.generationCard}>
            <Text style={styles.cardTitle}>Generate Workouts from Template</Text>
            <Text style={styles.cardSubtitle}>
              Idempotently populates future weeks with linear progression applied.
            </Text>

            <Text style={styles.inputLabel}>Choose Template</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll}>
              {templates.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.templatePill,
                    selectedTemplateId === t.id && styles.templatePillActive,
                  ]}
                  onPress={() => setSelectedTemplateId(t.id)}
                >
                  <Text style={[styles.templatePillName, selectedTemplateId === t.id && styles.templatePillNameActive]}>
                    {t.name}
                  </Text>
                  <Text style={styles.templatePillMeta}>{t.difficulty}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Training Days per Week</Text>
            <View style={styles.daysToggleRow}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, idx) => {
                const dayNum = idx + 1;
                const isSelected = selectedDays.includes(dayNum);
                return (
                  <TouchableOpacity
                    key={dayNum}
                    style={[styles.dayToggle, isSelected && styles.dayToggleActive]}
                    onPress={() => toggleDay(dayNum)}
                  >
                    <Text style={[styles.dayToggleText, isSelected && styles.dayToggleTextActive]}>
                      {dayName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button
              title={generating ? 'Generating Workouts...' : 'Generate Multi-Week Workouts'}
              variant="primary"
              onPress={handleGenerateWorkouts}
              disabled={generating}
              style={styles.generateButton}
            />
          </Card>
        ) : null}

        {/* Scheduled Workouts List for Preview */}
        {plan?.weeks && plan.weeks.length > 0 && plan.weeks[0]?.days ? (
          <View style={styles.scheduledSection}>
            <Text style={styles.sectionTitle}>Week 1 Schedule & Preview</Text>
            {plan.weeks[0].days.map((d) => (
              <Card key={d.id} style={styles.previewDayRow}>
                <View style={styles.previewDayInfo}>
                  <Text style={styles.previewDayNumber}>Day {d.dayNumber}</Text>
                  <Text style={styles.previewDayName}>{d.name || (d.restDay ? 'Rest Day' : 'Training')}</Text>
                </View>

                {d.workout ? (
                  <Button
                    title="Preview Experience"
                    variant="outline"
                    onPress={() => navigation.navigate('WorkoutPreview', { workoutId: d.workout!.id })}
                  />
                ) : d.restDay ? (
                  <Badge label="REST" variant="info" />
                ) : null}
              </Card>
            ))}
          </View>
        ) : null}
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
  scrollContent: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[12],
  },
  header: {
    marginBottom: spacing[2],
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: themeColors.textMuted,
    marginTop: 2,
  },
  activePlanCard: {
    padding: spacing[4],
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  planBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  planWeeksTag: {
    fontSize: 12,
    fontWeight: '700',
    color: themeColors.primary,
  },
  activePlanTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
  },
  activePlanObjective: {
    fontSize: 12,
    color: themeColors.textMuted,
    marginTop: 2,
  },
  planActionsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  formCard: {
    padding: spacing[4],
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: themeColors.textMuted,
    marginTop: 2,
    marginBottom: spacing[3],
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.textSecondary,
    marginTop: spacing[3],
    marginBottom: spacing[1],
  },
  textInput: {
    backgroundColor: themeColors.elevatedBackground,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    color: themeColors.textPrimary,
    fontSize: 14,
  },
  durationRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  durationPill: {
    flex: 1,
    paddingVertical: spacing[2],
    alignItems: 'center',
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  durationPillActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  durationTextActive: {
    color: '#000000',
  },
  createButton: {
    marginTop: spacing[4],
  },
  generationCard: {
    padding: spacing[4],
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  templateScroll: {
    flexDirection: 'row',
    marginBottom: spacing[2],
  },
  templatePill: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginRight: spacing[2],
  },
  templatePillActive: {
    borderColor: themeColors.primary,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
  },
  templatePillName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
  },
  templatePillNameActive: {
    color: themeColors.primary,
  },
  templatePillMeta: {
    fontSize: 10,
    color: themeColors.textMuted,
    marginTop: 2,
  },
  daysToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing[2],
  },
  dayToggle: {
    width: 42,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: themeColors.elevatedBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  dayToggleActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  dayToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  dayToggleTextActive: {
    color: '#000000',
  },
  generateButton: {
    marginTop: spacing[3],
  },
  scheduledSection: {
    marginTop: spacing[2],
    gap: spacing[2],
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: themeColors.textSecondary,
    marginBottom: spacing[1],
  },
  previewDayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[3],
    backgroundColor: themeColors.cardBackground,
  },
  previewDayInfo: {
    flex: 1,
  },
  previewDayNumber: {
    fontSize: 10,
    color: themeColors.textMuted,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  previewDayName: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
});
