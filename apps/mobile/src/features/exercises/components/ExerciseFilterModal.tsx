import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Icon } from '../../../components/primitives';
import { themeColors, typography, radius, spacing } from '../../../theme';
import type { ExerciseFilterMetadata } from '../services/exerciseService';

export interface ExerciseFiltersState {
  category?: string;
  muscleGroup?: string;
  equipment?: string;
  difficulty?: string;
  movementPattern?: string;
  environment?: string;
  sortBy: 'RECOMMENDED' | 'ALPHABETICAL' | 'DIFFICULTY' | 'NEWEST';
  isFavorite?: boolean;
  noEquipment?: boolean;
}

interface ExerciseFilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: ExerciseFiltersState;
  onApplyFilters: (filters: ExerciseFiltersState) => void;
  onResetFilters: () => void;
  filterMetadata?: ExerciseFilterMetadata;
}

export const ExerciseFilterModal: React.FC<ExerciseFilterModalProps> = ({
  visible,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters,
  filterMetadata,
}) => {
  const [draft, setDraft] = useState<ExerciseFiltersState>(filters);

  useEffect(() => {
    setDraft(filters);
  }, [filters, visible]);

  const countActiveFilters = (): number => {
    let count = 0;
    if (draft.category) count++;
    if (draft.muscleGroup) count++;
    if (draft.equipment) count++;
    if (draft.difficulty) count++;
    if (draft.movementPattern) count++;
    if (draft.environment && draft.environment !== 'ALL') count++;
    if (draft.sortBy !== 'RECOMMENDED') count++;
    if (draft.isFavorite) count++;
    if (draft.noEquipment) count++;
    return count;
  };

  const handleApply = () => {
    onApplyFilters(draft);
    onClose();
  };

  const handleReset = () => {
    const empty: ExerciseFiltersState = {
      sortBy: 'RECOMMENDED',
      category: '',
      muscleGroup: '',
      equipment: '',
      difficulty: '',
      movementPattern: '',
      environment: '',
      isFavorite: false,
      noEquipment: false,
    };
    setDraft(empty);
    onResetFilters();
    onClose();
  };

  const sortOptions: Array<{ id: ExerciseFiltersState['sortBy']; label: string }> = [
    { id: 'RECOMMENDED', label: 'Recommended' },
    { id: 'ALPHABETICAL', label: 'Alphabetical (A–Z)' },
    { id: 'DIFFICULTY', label: 'Difficulty Level' },
    { id: 'NEWEST', label: 'Newest Added' },
  ];

  const difficultyList = filterMetadata?.difficulties?.length
    ? filterMetadata.difficulties
    : [
        { id: 'BEGINNER', name: 'Beginner' },
        { id: 'INTERMEDIATE', name: 'Intermediate' },
        { id: 'ADVANCED', name: 'Advanced' },
        { id: 'EXPERT', name: 'Expert' },
      ];

  const muscleList = filterMetadata?.muscleGroups?.length
    ? filterMetadata.muscleGroups
    : [
        { id: 'CHEST', name: 'Chest' },
        { id: 'BACK', name: 'Back' },
        { id: 'QUADRICEPS', name: 'Quadriceps' },
        { id: 'HAMSTRINGS', name: 'Hamstrings' },
        { id: 'GLUTES', name: 'Glutes' },
        { id: 'SHOULDERS', name: 'Shoulders' },
        { id: 'CORE', name: 'Core' },
      ];

  const equipmentList = filterMetadata?.equipment?.length
    ? filterMetadata.equipment
    : [
        { id: 'BARBELL', name: 'Barbell' },
        { id: 'DUMBBELL', name: 'Dumbbell' },
        { id: 'KETTLEBELL', name: 'Kettlebell' },
        { id: 'BODYWEIGHT', name: 'Bodyweight' },
        { id: 'CABLE', name: 'Cable' },
        { id: 'RESISTANCE_BAND', name: 'Bands' },
      ];

  const patternList = filterMetadata?.movementPatterns?.length
    ? filterMetadata.movementPatterns
    : [
        { id: 'SQUAT', name: 'Squat' },
        { id: 'HINGE', name: 'Hinge' },
        { id: 'PUSH', name: 'Push' },
        { id: 'PULL', name: 'Pull' },
        { id: 'LUNGE', name: 'Lunge' },
        { id: 'CARRY', name: 'Carry' },
      ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Filter & Sort</Text>
              {countActiveFilters() > 0 && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>{countActiveFilters()}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={20} color={themeColors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Quick Toggles */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>QUICK TOGGLES</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    draft.isFavorite && styles.toggleButtonActive,
                  ]}
                  onPress={() => setDraft((p) => ({ ...p, isFavorite: !p.isFavorite }))}
                >
                  <Icon
                    name="heart"
                    size={16}
                    color={draft.isFavorite ? themeColors.danger : themeColors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.toggleText,
                      draft.isFavorite && styles.toggleTextActive,
                    ]}
                  >
                    Favorites Only
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    draft.noEquipment && styles.toggleButtonActive,
                  ]}
                  onPress={() => setDraft((p) => ({ ...p, noEquipment: !p.noEquipment }))}
                >
                  <Icon
                    name="bolt"
                    size={16}
                    color={draft.noEquipment ? themeColors.primary : themeColors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.toggleText,
                      draft.noEquipment && styles.toggleTextActive,
                    ]}
                  >
                    No Equipment
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Sort Criteria */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SORT BY</Text>
              <View style={styles.chipGrid}>
                {sortOptions.map((opt) => {
                  const isSelected = draft.sortBy === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => setDraft((p) => ({ ...p, sortBy: opt.id }))}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Difficulty */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>DIFFICULTY LEVEL</Text>
              <View style={styles.chipGrid}>
                <TouchableOpacity
                  style={[styles.chip, !draft.difficulty && styles.chipActive]}
                  onPress={() => setDraft((p) => ({ ...p, difficulty: undefined }))}
                >
                  <Text style={[styles.chipText, !draft.difficulty && styles.chipTextActive]}>
                    Any Difficulty
                  </Text>
                </TouchableOpacity>
                {difficultyList.map((d: any) => {
                  const isSelected = draft.difficulty === d.id;
                  return (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => setDraft((p) => ({ ...p, difficulty: isSelected ? undefined : d.id }))}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {d.name} {d.count !== undefined ? `(${d.count})` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Target Muscle Group */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>TARGET MUSCLE GROUP</Text>
              <View style={styles.chipGrid}>
                <TouchableOpacity
                  style={[styles.chip, !draft.muscleGroup && styles.chipActive]}
                  onPress={() => setDraft((p) => ({ ...p, muscleGroup: undefined }))}
                >
                  <Text style={[styles.chipText, !draft.muscleGroup && styles.chipTextActive]}>
                    All Muscles
                  </Text>
                </TouchableOpacity>
                {muscleList.map((m: any) => {
                  const isSelected = draft.muscleGroup === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => setDraft((p) => ({ ...p, muscleGroup: isSelected ? undefined : m.id }))}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {m.name} {m.count !== undefined ? `(${m.count})` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Equipment Required */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>EQUIPMENT</Text>
              <View style={styles.chipGrid}>
                <TouchableOpacity
                  style={[styles.chip, !draft.equipment && styles.chipActive]}
                  onPress={() => setDraft((p) => ({ ...p, equipment: undefined }))}
                >
                  <Text style={[styles.chipText, !draft.equipment && styles.chipTextActive]}>
                    Any Equipment
                  </Text>
                </TouchableOpacity>
                {equipmentList.map((e: any) => {
                  const isSelected = draft.equipment === e.id;
                  return (
                    <TouchableOpacity
                      key={e.id}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => setDraft((p) => ({ ...p, equipment: isSelected ? undefined : e.id }))}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {e.name} {e.count !== undefined ? `(${e.count})` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Movement Pattern */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>MOVEMENT PATTERN</Text>
              <View style={styles.chipGrid}>
                <TouchableOpacity
                  style={[styles.chip, !draft.movementPattern && styles.chipActive]}
                  onPress={() => setDraft((p) => ({ ...p, movementPattern: undefined }))}
                >
                  <Text style={[styles.chipText, !draft.movementPattern && styles.chipTextActive]}>
                    All Patterns
                  </Text>
                </TouchableOpacity>
                {patternList.map((p: any) => {
                  const isSelected = draft.movementPattern === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => setDraft((prev) => ({ ...prev, movementPattern: isSelected ? undefined : p.id }))}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {p.name} {p.count !== undefined ? `(${p.count})` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
              <Text style={styles.resetButtonText}>Reset All</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleApply} style={styles.applyButton}>
              <Text style={styles.applyButtonText}>
                Show Exercises {countActiveFilters() > 0 ? `(${countActiveFilters()})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: themeColors.cardBackground,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  headerTitle: {
    ...typography.h3,
    fontSize: 18,
    color: themeColors.textPrimary,
  },
  activeBadge: {
    backgroundColor: themeColors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: themeColors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    paddingHorizontal: spacing[4],
  },
  section: {
    marginVertical: spacing[3],
  },
  sectionTitle: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: themeColors.textMuted,
    marginBottom: spacing[2],
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: themeColors.surfaceElevated,
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    borderColor: themeColors.primary,
  },
  toggleText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: themeColors.textSecondary,
  },
  toggleTextActive: {
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chip: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: themeColors.surfaceElevated,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: radius.full,
  },
  chipActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  chipText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    backgroundColor: themeColors.cardBackground,
  },
  resetButton: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surfaceElevated,
  },
  resetButtonText: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.textSecondary,
  },
  applyButton: {
    flex: 1,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    backgroundColor: themeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
