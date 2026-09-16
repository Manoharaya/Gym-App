import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Modal } from '../../../components/primitives/Modal';
import { Badge } from '../../../components/primitives/Badge';
import { Icon } from '../../../components/primitives/Icon';
import { themeColors, spacing as sp, radius, typography } from '../../../theme';
import { ExerciseService } from '../services/exerciseService';

interface ExerciseSubstituteModalProps {
  visible: boolean;
  exerciseId: string;
  exerciseName: string;
  onClose: () => void;
  onSelectSubstitute: (targetExerciseId: string, targetExerciseName: string) => void;
}

const EQUIPMENT_FILTERS = [
  { id: 'ALL', label: 'All Equipment' },
  { id: 'BODYWEIGHT', label: 'Bodyweight Only' },
  { id: 'DUMBBELL', label: 'Dumbbells' },
  { id: 'BARBELL', label: 'Barbell' },
  { id: 'RESISTANCE_BAND', label: 'Resistance Bands' },
  { id: 'CABLE', label: 'Cable Machine' },
];

export const ExerciseSubstituteModal: React.FC<ExerciseSubstituteModalProps> = ({
  visible,
  exerciseId,
  exerciseName,
  onClose,
  onSelectSubstitute,
}) => {
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [substitutes, setSubstitutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSubstitutes = useCallback(async () => {
    if (!exerciseId || !visible) return;
    setLoading(true);
    try {
      const equipmentParam = selectedFilter !== 'ALL' ? [selectedFilter] : undefined;
      const data = await ExerciseService.getExerciseSubstitutes(exerciseId, equipmentParam);
      setSubstitutes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to load substitutes:', err);
      setSubstitutes([]);
    } finally {
      setLoading(false);
    }
  }, [exerciseId, visible, selectedFilter]);

  useEffect(() => {
    fetchSubstitutes();
  }, [fetchSubstitutes]);

  return (
    <Modal visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <View style={styles.introHeader}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: sp[1] }}>
            <Text style={styles.modalHeading}>Exercise Substitutions</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={20} color={themeColors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.exerciseTitle}>{exerciseName}</Text>
          <Text style={styles.introSubtitle}>
            AI & biomechanically matched alternatives targeting the same primary movers and movement patterns.
          </Text>
        </View>

        {/* EQUIPMENT FILTER CHIPS */}
        <View style={styles.filtersWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScroll}
          >
            {EQUIPMENT_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterChip,
                  selectedFilter === filter.id && styles.filterChipActive,
                ]}
                onPress={() => setSelectedFilter(filter.id)}
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedFilter === filter.id && styles.filterTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* CANDIDATES LIST */}
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={themeColors.primary} />
            <Text style={styles.loadingText}>Searching biomechanical alternatives...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {substitutes.length === 0 ? (
              <View style={styles.emptyCard}>
                <Icon name="refresh" size={32} color={themeColors.textMuted} />
                <Text style={styles.emptyTitle}>No Matching Substitutes</Text>
                <Text style={styles.emptySubtitle}>
                  Try selecting "All Equipment" or add custom variations to expand candidates.
                </Text>
              </View>
            ) : (
              substitutes.map((sub, idx) => {
                const target = sub.exercise || sub;
                const isExplicitSubstitute = sub.relationshipType === 'EQUIPMENT_SUBSTITUTE';

                return (
                  <TouchableOpacity
                    key={target.id || idx}
                    activeOpacity={0.8}
                    style={styles.candidateCard}
                    onPress={() => onSelectSubstitute(target.id, target.name)}
                  >
                    <View style={styles.candidateHeader}>
                      <View style={styles.candidateTitleRow}>
                        <Text style={styles.candidateName}>{target.name}</Text>
                        {isExplicitSubstitute ? (
                          <Badge label="DIRECT SUBSTITUTE" variant="accent" />
                        ) : (
                          <Badge label={target.difficulty || 'INTERMEDIATE'} variant="primary" />
                        )}
                      </View>
                      <Icon name="chevron-right" size={18} color={themeColors.textMuted} />
                    </View>

                    <View style={styles.candidateMetaRow}>
                      {target.primaryMuscleGroup && (
                        <View style={styles.metaChip}>
                          <Icon name="activity" size={12} color={themeColors.accent} />
                          <Text style={styles.metaChipText}>{target.primaryMuscleGroup}</Text>
                        </View>
                      )}
                      {target.equipment && (
                        <View style={styles.metaChip}>
                          <Icon name="dumbbell" size={12} color={themeColors.textMuted} />
                          <Text style={styles.metaChipText}>{target.equipment}</Text>
                        </View>
                      )}
                      {target.movementPattern && (
                        <View style={styles.metaChip}>
                          <Icon name="refresh" size={12} color={themeColors.primary} />
                          <Text style={styles.metaChipText}>{target.movementPattern}</Text>
                        </View>
                      )}
                    </View>

                    {sub.notes ? (
                      <Text style={styles.candidateNotes}>{sub.notes}</Text>
                    ) : (
                      <Text style={styles.candidateNotes}>
                        Biomechanical match sharing identical joint actions and primary kinetic vectors.
                      </Text>
                    )}

                    <View style={styles.candidateFooter}>
                      <Text style={styles.viewDetailsText}>Tap to view exercise details →</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: sp[4],
    flex: 1,
  },
  introHeader: {
    marginBottom: sp[3],
  },
  modalHeading: {
    ...typography.subtitle1,
    color: themeColors.primary,
    fontWeight: '700',
  },
  exerciseTitle: {
    ...typography.subtitle1,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  introSubtitle: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  filtersWrapper: {
    marginBottom: sp[3],
  },
  filtersScroll: {
    gap: sp[2],
  },
  filterChip: {
    backgroundColor: themeColors.surfaceElevated,
    paddingHorizontal: sp[3],
    paddingVertical: sp[1.5],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  filterChipActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  filterText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  filterTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  centerLoading: {
    paddingVertical: sp[8],
    alignItems: 'center',
    gap: sp[2],
  },
  loadingText: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  listContent: {
    gap: sp[3],
    paddingBottom: sp[6],
  },
  emptyCard: {
    padding: sp[6],
    backgroundColor: themeColors.surfaceElevated,
    borderRadius: radius.md,
    alignItems: 'center',
    gap: sp[2],
  },
  emptyTitle: {
    ...typography.subtitle2,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  emptySubtitle: {
    ...typography.caption,
    color: themeColors.textMuted,
    textAlign: 'center',
  },
  candidateCard: {
    backgroundColor: themeColors.surfaceElevated,
    padding: sp[3.5],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: sp[2],
  },
  candidateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  candidateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp[2],
    flex: 1,
    flexWrap: 'wrap',
  },
  candidateName: {
    ...typography.subtitle2,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  candidateMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp[2],
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: themeColors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
  },
  metaChipText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  candidateNotes: {
    ...typography.caption,
    color: themeColors.textMuted,
    lineHeight: 15,
  },
  candidateFooter: {
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: themeColors.border + '50',
    paddingTop: 6,
  },
  viewDetailsText: {
    ...typography.caption,
    color: themeColors.primary,
    fontWeight: '600',
    fontSize: 11,
  },
});
