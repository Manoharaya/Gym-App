import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import { Icon } from '../../../components/primitives';
import { themeColors, typography, radius, spacing } from '../../../theme';
import type {
  MemberExercisePreference,
  UpdateExercisePreferencesPayload,
} from '../services/exerciseService';

interface PersonalizationSettingsModalProps {
  visible: boolean;
  preferences: MemberExercisePreference | null;
  onClose: () => void;
  onSave: (payload: UpdateExercisePreferencesPayload) => Promise<void>;
  onReset: () => Promise<void>;
}

const FITNESS_GOAL_OPTIONS = [
  { id: 'BUILD_MUSCLE', label: 'Build Muscle' },
  { id: 'INCREASE_STRENGTH', label: 'Increase Strength' },
  { id: 'WEIGHT_LOSS', label: 'Weight Loss' },
  { id: 'ENDURANCE', label: 'Endurance' },
  { id: 'MOBILITY', label: 'Mobility & Flexibility' },
  { id: 'GENERAL_FITNESS', label: 'General Fitness' },
];

const DIFFICULTY_OPTIONS = [
  { id: 'BEGINNER', label: 'Beginner' },
  { id: 'INTERMEDIATE', label: 'Intermediate' },
  { id: 'ADVANCED', label: 'Advanced' },
  { id: 'EXPERT', label: 'Expert' },
];

const EQUIPMENT_OPTIONS = [
  { id: 'BODYWEIGHT', label: 'Bodyweight' },
  { id: 'DUMBBELL', label: 'Dumbbells' },
  { id: 'BARBELL', label: 'Barbell' },
  { id: 'KETTLEBELL', label: 'Kettlebell' },
  { id: 'CABLE', label: 'Cable Machine' },
  { id: 'MACHINE', label: 'Gym Machines' },
  { id: 'RESISTANCE_BAND', label: 'Bands' },
];

const CATEGORY_OPTIONS = [
  { id: 'STRENGTH', label: 'Strength' },
  { id: 'CARDIO', label: 'Cardio' },
  { id: 'MOBILITY', label: 'Mobility' },
  { id: 'FUNCTIONAL', label: 'Functional' },
];

export const PersonalizationSettingsModal: React.FC<PersonalizationSettingsModalProps> = ({
  visible,
  preferences,
  onClose,
  onSave,
  onReset,
}) => {
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('INTERMEDIATE');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (preferences) {
      setSelectedGoals(preferences.fitnessGoals || ['STRENGTH']);
      setSelectedDifficulty(preferences.preferredDifficulty || 'INTERMEDIATE');
      setSelectedEquipment(preferences.availableEquipment || ['BODYWEIGHT', 'DUMBBELL']);
      setSelectedCategories(preferences.preferredCategories || ['STRENGTH']);
    }
  }, [preferences, visible]);

  const toggleItem = (list: string[], item: string, setter: (val: string[]) => void) => {
    if (list.includes(item)) {
      if (list.length > 1) {
        setter(list.filter((x) => x !== item));
      }
    } else {
      setter([...list, item]);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        fitnessGoals: selectedGoals,
        preferredDifficulty: selectedDifficulty,
        availableEquipment: selectedEquipment,
        preferredCategories: selectedCategories,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await onReset();
      onClose();
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleBox}>
              <View style={styles.iconHalo}>
                <Icon name="sparkles" size={18} color={themeColors.primary} />
              </View>
              <View>
                <Text style={styles.modalTitle}>Personalize Discovery</Text>
                <Text style={styles.modalSubtitle}>
                  Tailor exercises to your goals and equipment
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={18} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* 1. Fitness Goals */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fitness Goals</Text>
              <Text style={styles.sectionHint}>Select the primary outcomes you want to achieve</Text>
              <View style={styles.chipRow}>
                {FITNESS_GOAL_OPTIONS.map((goal) => {
                  const active = selectedGoals.includes(goal.id);
                  return (
                    <TouchableOpacity
                      key={goal.id}
                      onPress={() => toggleItem(selectedGoals, goal.id, setSelectedGoals)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      {active && <Icon name="check" size={12} color="#FFFFFF" />}
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {goal.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 2. Preferred Difficulty */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Experience Level</Text>
              <Text style={styles.sectionHint}>Your current comfort with exercise mechanics</Text>
              <View style={styles.chipRow}>
                {DIFFICULTY_OPTIONS.map((diff) => {
                  const active = selectedDifficulty === diff.id;
                  return (
                    <TouchableOpacity
                      key={diff.id}
                      onPress={() => setSelectedDifficulty(diff.id)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      {active && <Icon name="check" size={12} color="#FFFFFF" />}
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {diff.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 3. Available Equipment */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Available Equipment</Text>
              <Text style={styles.sectionHint}>Only recommend exercises matching gear you have access to</Text>
              <View style={styles.chipRow}>
                {EQUIPMENT_OPTIONS.map((eq) => {
                  const active = selectedEquipment.includes(eq.id);
                  return (
                    <TouchableOpacity
                      key={eq.id}
                      onPress={() => toggleItem(selectedEquipment, eq.id, setSelectedEquipment)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      {active && <Icon name="check" size={12} color="#FFFFFF" />}
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {eq.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 4. Preferred Categories */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Training Categories</Text>
              <Text style={styles.sectionHint}>Styles of movement you enjoy the most</Text>
              <View style={styles.chipRow}>
                {CATEGORY_OPTIONS.map((cat) => {
                  const active = selectedCategories.includes(cat.id);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => toggleItem(selectedCategories, cat.id, setSelectedCategories)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      {active && <Icon name="check" size={12} color="#FFFFFF" />}
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              onPress={handleReset}
              disabled={isResetting || isSaving}
              style={styles.resetButton}
            >
              {isResetting ? (
                <ActivityIndicator size="small" color={themeColors.textSecondary} />
              ) : (
                <>
                  <Icon name="refresh" size={14} color={themeColors.textSecondary} />
                  <Text style={styles.resetButtonText}>Reset Defaults</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving || isResetting}
              style={styles.saveButton}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Preferences</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: themeColors.cardBackground || '#1A1C20',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '85%',
    paddingBottom: spacing.xl,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderTopWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  iconHalo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    ...typography.title,
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  modalSubtitle: {
    ...typography.caption,
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: spacing.xs,
  },
  scrollArea: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 15,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginBottom: 2,
  },
  sectionHint: {
    ...typography.caption,
    fontSize: 12,
    color: themeColors.textMuted,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chipActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  chipText: {
    ...typography.caption,
    fontSize: 13,
    color: themeColors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: spacing.md,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  resetButtonText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: themeColors.textSecondary,
  },
  saveButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: themeColors.primary,
  },
  saveButtonText: {
    ...typography.button,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
