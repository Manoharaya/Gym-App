import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MemberStackParamList } from '../../../navigation/types';
import { Screen, Button, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { dailyCheckInService } from '../services/dailyCheckInService';
import type {
  EnergyLevel,
  SleepQuality,
  SorenessLevel,
  StressLevel,
  MotivationLevel,
} from '@fitcore/types';

type NavigationProp = NativeStackNavigationProp<MemberStackParamList>;

interface LevelOption<T> {
  label: string;
  value: T;
  icon?: string;
  subtext?: string;
}

const ENERGY_OPTIONS: LevelOption<EnergyLevel>[] = [
  { label: 'Very Low', value: 'VERY_LOW', subtext: 'Exhausted' },
  { label: 'Low', value: 'LOW', subtext: 'Sluggish' },
  { label: 'Moderate', value: 'MODERATE', subtext: 'Steady' },
  { label: 'Good', value: 'GOOD', subtext: 'Energetic' },
  { label: 'Very Good', value: 'VERY_GOOD', subtext: 'Peak drive' },
];

const SLEEP_OPTIONS: LevelOption<SleepQuality>[] = [
  { label: 'Very Poor', value: 'VERY_POOR', subtext: '< 5h / Broken' },
  { label: 'Poor', value: 'POOR', subtext: 'Restless' },
  { label: 'Fair', value: 'FAIR', subtext: 'Okay' },
  { label: 'Good', value: 'GOOD', subtext: 'Restful 7-8h' },
  { label: 'Excellent', value: 'EXCELLENT', subtext: 'Deeply restored' },
];

const SORENESS_OPTIONS: LevelOption<SorenessLevel>[] = [
  { label: 'None', value: 'NONE', subtext: 'Fresh' },
  { label: 'Mild', value: 'MILD', subtext: 'Noticeable' },
  { label: 'Moderate', value: 'MODERATE', subtext: 'Tight / DOMS' },
  { label: 'High', value: 'HIGH', subtext: 'Stiff & tender' },
  { label: 'Very High', value: 'VERY_HIGH', subtext: 'Very sore' },
];

const STRESS_OPTIONS: LevelOption<StressLevel>[] = [
  { label: 'Very Low', value: 'VERY_LOW', subtext: 'Calm & clear' },
  { label: 'Low', value: 'LOW', subtext: 'Manageable' },
  { label: 'Moderate', value: 'MODERATE', subtext: 'Busy / tension' },
  { label: 'High', value: 'HIGH', subtext: 'Pressured' },
  { label: 'Very High', value: 'VERY_HIGH', subtext: 'Overwhelmed' },
];

const MOTIVATION_OPTIONS: LevelOption<MotivationLevel>[] = [
  { label: 'Very Low', value: 'VERY_LOW', subtext: 'Reluctant' },
  { label: 'Low', value: 'LOW', subtext: 'Dragging' },
  { label: 'Moderate', value: 'MODERATE', subtext: 'Neutral' },
  { label: 'High', value: 'HIGH', subtext: 'Ready to work' },
  { label: 'Very High', value: 'VERY_HIGH', subtext: 'Fired up' },
];

export const DailyCheckInQuestionScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [energy, setEnergy] = useState<EnergyLevel>('GOOD');
  const [sleep, setSleep] = useState<SleepQuality>('GOOD');
  const [sleepDurationMinutes, setSleepDurationMinutes] = useState(450); // 7.5h
  const [soreness, setSoreness] = useState<SorenessLevel>('MILD');
  const [stress, setStress] = useState<StressLevel>('LOW');
  const [motivation, setMotivation] = useState<MotivationLevel>('HIGH');
  const [yesterdayWorkoutCompleted, setYesterdayWorkoutCompleted] = useState<boolean>(true);
  const [notes, setNotes] = useState('');

  const totalSteps = 6;

  const handleNextOrSubmit = async () => {
    if (step < totalSteps) {
      setStep(step + 1);
      return;
    }

    // Submit form
    setSubmitting(true);
    try {
      const result = await dailyCheckInService.submitCheckIn({
        energyLevel: energy,
        wellbeingMood: 'GOOD',
        sleepQuality: sleep,
        sleepDurationMinutes,
        sorenessLevel: soreness,
        stressLevel: stress,
        motivationLevel: motivation,
        yesterdayWorkoutCompleted,
        notes: notes.trim() ? notes.trim() : undefined,
      });

      // Navigate to results
      (navigation as any).navigate('DailyCheckInResult', { checkInId: result.id });
    } catch (err: any) {
      Alert.alert(
        'Submission Error',
        err?.message || 'Unable to record check-in. Please try again.',
        [{ text: 'OK' }],
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderOptionButtons = <T extends string>(
    options: LevelOption<T>[],
    currentValue: T,
    onSelect: (val: T) => void,
  ) => {
    return (
      <View style={styles.optionList}>
        {options.map((opt) => {
          const isSelected = currentValue === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onSelect(opt.value)}
              style={[styles.optionCard, isSelected && styles.optionCardSelected]}
              activeOpacity={0.7}
            >
              <View style={styles.optionTextRow}>
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                  {opt.label}
                </Text>
                {opt.subtext ? (
                  <Text style={[styles.optionSubtext, isSelected && styles.optionSubtextSelected]}>
                    {opt.subtext}
                  </Text>
                ) : null}
              </View>
              <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                {isSelected ? <View style={styles.radioDot} /> : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      {/* Header with Progress Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (step > 1 ? setStep(step - 1) : navigation.goBack())}
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={22} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Step {step} of {totalSteps}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${Math.round((step / totalSteps) * 100)}%` },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.questionTitle}>How is your energy today?</Text>
            <Text style={styles.questionSubtitle}>
              Self-reported vitality to tailor your volume and pacing.
            </Text>
            {renderOptionButtons(ENERGY_OPTIONS, energy, setEnergy)}
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.questionTitle}>How restful was your sleep?</Text>
            <Text style={styles.questionSubtitle}>
              Restfulness is key for neuromuscular recovery.
            </Text>
            {renderOptionButtons(SLEEP_OPTIONS, sleep, setSleep)}

            <View style={styles.durationSection}>
              <Text style={styles.durationTitle}>Estimated Duration:</Text>
              <View style={styles.durationPillRow}>
                {[360, 420, 480, 540].map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    onPress={() => setSleepDurationMinutes(mins)}
                    style={[
                      styles.durationPill,
                      sleepDurationMinutes === mins && styles.durationPillSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.durationPillText,
                        sleepDurationMinutes === mins && styles.durationPillTextSelected,
                      ]}
                    >
                      {mins / 60} hrs
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.questionTitle}>How sore are your muscles?</Text>
            <Text style={styles.questionSubtitle}>
              Helps determine whether today calls for progressive load or active mobility.
            </Text>
            {renderOptionButtons(SORENESS_OPTIONS, soreness, setSoreness)}
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={styles.questionTitle}>How stressed do you feel?</Text>
            <Text style={styles.questionSubtitle}>
              Overall lifestyle and cognitive load impact systemic recovery.
            </Text>
            {renderOptionButtons(STRESS_OPTIONS, stress, setStress)}
          </View>
        )}

        {step === 5 && (
          <View style={styles.stepContainer}>
            <Text style={styles.questionTitle}>How motivated are you?</Text>
            <Text style={styles.questionSubtitle}>
              Your psychological readiness to execute today's session.
            </Text>
            {renderOptionButtons(MOTIVATION_OPTIONS, motivation, setMotivation)}
          </View>
        )}

        {step === 6 && (
          <View style={styles.stepContainer}>
            <Text style={styles.questionTitle}>Yesterday & Daily Notes</Text>
            <Text style={styles.questionSubtitle}>
              Context on your training adherence and physical state.
            </Text>

            <Text style={styles.subQuestionLabel}>Did you complete yesterday's planned workout?</Text>
            <View style={styles.binaryChoiceRow}>
              <TouchableOpacity
                onPress={() => setYesterdayWorkoutCompleted(true)}
                style={[
                  styles.binaryBtn,
                  yesterdayWorkoutCompleted === true && styles.binaryBtnSelected,
                ]}
              >
                <Icon
                  name="check"
                  size={18}
                  color={yesterdayWorkoutCompleted ? '#FFFFFF' : themeColors.textPrimary}
                />
                <Text
                  style={[
                    styles.binaryBtnText,
                    yesterdayWorkoutCompleted && styles.binaryBtnTextSelected,
                  ]}
                >
                  Yes, Completed
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setYesterdayWorkoutCompleted(false)}
                style={[
                  styles.binaryBtn,
                  yesterdayWorkoutCompleted === false && styles.binaryBtnSelected,
                ]}
              >
                <Icon
                  name="close"
                  size={18}
                  color={yesterdayWorkoutCompleted === false ? '#FFFFFF' : themeColors.textPrimary}
                />
                <Text
                  style={[
                    styles.binaryBtnText,
                    yesterdayWorkoutCompleted === false && styles.binaryBtnTextSelected,
                  ]}
                >
                  No, Missed/Rest
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.subQuestionLabel, { marginTop: spacing.lg }]}>
              Anything affecting today's session? (Optional)
            </Text>
            <TextInput
              style={styles.notesInput}
              placeholder="e.g. Tight lower back, travel fatigue, or extra rested..."
              placeholderTextColor={themeColors.textTertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={500}
              returnKeyType="done"
            />
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={styles.footer}>
        <Button
          title={
            submitting
              ? 'Analyzing Readiness...'
              : step === totalSteps
              ? 'Submit & Generate Daily Insight'
              : 'Continue'
          }
          onPress={handleNextOrSubmit}
          disabled={submitting}
          variant="accent"
          rightIcon={
            submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Icon name="chevron-right" size={18} color="#FFFFFF" />
            )
          }
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.bodySecondary,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: themeColors.surfaceHighlight,
    width: '100%',
  },
  progressBarFill: {
    height: 4,
    backgroundColor: themeColors.accent,
  },
  stepContainer: {
    gap: spacing.md,
  },
  questionTitle: {
    ...typography.h2,
    color: themeColors.textPrimary,
  },
  questionSubtitle: {
    ...typography.bodySecondary,
    color: themeColors.textSecondary,
    marginBottom: spacing.sm,
  },
  optionList: {
    gap: spacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: themeColors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: themeColors.border,
  },
  optionCardSelected: {
    borderColor: themeColors.accent,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  optionTextRow: {
    gap: 2,
  },
  optionLabel: {
    ...typography.body,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  optionLabelSelected: {
    color: themeColors.accent,
  },
  optionSubtext: {
    ...typography.caption,
    color: themeColors.textTertiary,
  },
  optionSubtextSelected: {
    color: themeColors.textSecondary,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: themeColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: themeColors.accent,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: themeColors.accent,
  },
  durationSection: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  durationTitle: {
    ...typography.bodySecondary,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  durationPillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  durationPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: themeColors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  durationPillSelected: {
    backgroundColor: themeColors.accent,
    borderColor: themeColors.accent,
  },
  durationPillText: {
    ...typography.caption,
    fontWeight: '600',
    color: themeColors.textSecondary,
  },
  durationPillTextSelected: {
    color: '#FFFFFF',
  },
  subQuestionLabel: {
    ...typography.bodySecondary,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  binaryChoiceRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  binaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  binaryBtnSelected: {
    backgroundColor: themeColors.accent,
    borderColor: themeColors.accent,
  },
  binaryBtnText: {
    ...typography.bodySecondary,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  binaryBtnTextSelected: {
    color: '#FFFFFF',
  },
  notesInput: {
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    padding: spacing.md,
    color: themeColors.textPrimary,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    backgroundColor: themeColors.background,
  },
});
