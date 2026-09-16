import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Modal } from '../../../components/primitives/Modal';
import { Badge } from '../../../components/primitives/Badge';
import { Button } from '../../../components/primitives/Button';
import { Icon } from '../../../components/primitives/Icon';
import { themeColors, spacing as sp, radius, typography } from '../../../theme';
import { ExerciseService } from '../services/exerciseService';
import type { ExerciseEquipmentRelation } from '@fitcore/types';

interface ExerciseEquipmentModalProps {
  visible: boolean;
  exerciseId: string;
  exerciseName: string;
  equipmentRelations: ExerciseEquipmentRelation[];
  onClose: () => void;
  onSaved?: () => void;
  canEdit?: boolean;
}

const CATEGORIES = [
  'FREE_WEIGHTS',
  'MACHINES',
  'BENCHES_SUPPORTS',
  'BODYWEIGHT',
  'ACCESSORIES',
  'CABLE',
  'OTHER',
];

const REQUIREMENTS = ['REQUIRED', 'OPTIONAL', 'ALTERNATIVE', 'NONE'];

export const ExerciseEquipmentModal: React.FC<ExerciseEquipmentModalProps> = ({
  visible,
  exerciseId,
  exerciseName,
  equipmentRelations = [],
  onClose,
  onSaved,
  canEdit = false,
}) => {
  const [addingNew, setAddingNew] = useState(false);
  const [equipmentName, setEquipmentName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('FREE_WEIGHTS');
  const [selectedRequirement, setSelectedRequirement] = useState('REQUIRED');
  const [alternativesText, setAlternativesText] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setEquipmentName('');
    setSelectedCategory('FREE_WEIGHTS');
    setSelectedRequirement('REQUIRED');
    setAlternativesText('');
    setNotes('');
    setAddingNew(false);
  };

  const handleAddEquipment = async () => {
    if (!equipmentName.trim()) {
      Alert.alert('Validation Error', 'Equipment name is required');
      return;
    }

    setSaving(true);
    try {
      const alternatives = alternativesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await ExerciseService.addExerciseEquipmentRelation(exerciseId, {
        equipmentName: equipmentName.trim(),
        equipmentCategory: selectedCategory,
        requirementType: selectedRequirement,
        isOptional: selectedRequirement === 'OPTIONAL',
        alternatives: alternatives.length > 0 ? alternatives : undefined,
        notes: notes.trim() || undefined,
      });

      resetForm();
      if (onSaved) onSaved();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to add equipment');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (relationId: string, name: string) => {
    Alert.alert(
      'Remove Equipment',
      `Are you sure you want to remove '${name}' from this exercise?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await ExerciseService.removeExerciseEquipmentRelation(relationId);
              if (onSaved) onSaved();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete relation');
            }
          },
        },
      ],
    );
  };

  const getRequirementVariant = (type?: string) => {
    switch (type) {
      case 'REQUIRED':
        return 'primary';
      case 'OPTIONAL':
        return 'neutral';
      case 'ALTERNATIVE':
        return 'accent';
      default:
        return 'neutral';
    }
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.introHeader}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: sp[1] }}>
            <Text style={styles.modalHeading}>Equipment Requirements</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={20} color={themeColors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.exerciseTitle}>{exerciseName}</Text>
          <Text style={styles.introSubtitle}>
            Structured equipment specifications, availability contexts, and viable alternatives.
          </Text>
        </View>

        {/* EQUIPMENT LIST */}
        <View style={styles.listContainer}>
          {equipmentRelations.length === 0 ? (
            <View style={styles.emptyCard}>
              <Icon name="dumbbell" size={32} color={themeColors.textMuted} />
              <Text style={styles.emptyTitle}>No Equipment Mapped</Text>
              <Text style={styles.emptySubtitle}>
                This exercise may be pure bodyweight or equipment has not yet been itemized.
              </Text>
            </View>
          ) : (
            equipmentRelations.map((eq) => {
              const alternatives = Array.isArray(eq.alternatives)
                ? (eq.alternatives as string[])
                : [];
              const contexts = Array.isArray(eq.availabilityContexts)
                ? (eq.availabilityContexts as string[])
                : [];

              return (
                <View key={eq.id || eq.equipmentName} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemTitleRow}>
                      <Text style={styles.itemName}>{eq.equipmentName}</Text>
                      <Badge
                        label={eq.requirementType || 'REQUIRED'}
                        variant={getRequirementVariant(eq.requirementType)}
                      />
                    </View>
                    {canEdit && eq.id && (
                      <TouchableOpacity
                        onPress={() => handleRemove(eq.id, eq.equipmentName)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Icon name="close" size={16} color={themeColors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.metaRow}>
                    {eq.equipmentCategory && (
                      <View style={styles.metaBadge}>
                        <Icon name="award" size={12} color={themeColors.textMuted} />
                        <Text style={styles.metaText}>{eq.equipmentCategory.replace(/_/g, ' ')}</Text>
                      </View>
                    )}
                    {contexts.length > 0 && (
                      <View style={styles.metaBadge}>
                        <Icon name="map-pin" size={12} color={themeColors.primary} />
                        <Text style={styles.metaText}>{contexts.join(', ')}</Text>
                      </View>
                    )}
                  </View>

                  {alternatives.length > 0 && (
                    <View style={styles.alternativesBox}>
                      <Text style={styles.alternativesLabel}>Alternatives:</Text>
                      <View style={styles.altChipsRow}>
                        {alternatives.map((alt, idx) => (
                          <View key={idx} style={styles.altChip}>
                            <Text style={styles.altChipText}>{alt}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {eq.notes && <Text style={styles.itemNotes}>{eq.notes}</Text>}
                </View>
              );
            })
          )}
        </View>

        {/* ADD NEW EQUIPMENT ACCORDION */}
        {canEdit && !addingNew && (
          <Button
            title="+ Add Required / Optional Equipment"
            variant="secondary"
            onPress={() => setAddingNew(true)}
            style={styles.addButton}
          />
        )}

        {canEdit && addingNew && (
          <View style={styles.addFormCard}>
            <Text style={styles.formTitle}>Add Equipment Requirement</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Equipment Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Olympic Barbell, Dumbbells, Pull-Up Bar"
                placeholderTextColor={themeColors.textMuted}
                value={equipmentName}
                onChangeText={setEquipmentName}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.selectorChip, selectedCategory === cat && styles.selectorChipActive]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={[styles.selectorText, selectedCategory === cat && styles.selectorTextActive]}>
                      {cat.replace(/_/g, ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Requirement Type</Text>
              <View style={styles.requirementsRow}>
                {REQUIREMENTS.map((req) => (
                  <TouchableOpacity
                    key={req}
                    style={[styles.reqChip, selectedRequirement === req && styles.reqChipActive]}
                    onPress={() => setSelectedRequirement(req)}
                  >
                    <Text style={[styles.reqText, selectedRequirement === req && styles.reqTextActive]}>
                      {req}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Viable Alternatives (comma-separated)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Dumbbells, Resistance Bands"
                placeholderTextColor={themeColors.textMuted}
                value={alternativesText}
                onChangeText={setAlternativesText}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Notes / Specifics (Optional)</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                multiline
                placeholder="Specific grip diameter, bench incline, or rack setup instructions"
                placeholderTextColor={themeColors.textMuted}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <View style={styles.formActions}>
              <Button title="Cancel" variant="ghost" onPress={resetForm} style={{ flex: 1 }} />
              <Button
                title={saving ? 'Adding...' : 'Add Equipment'}
                variant="primary"
                onPress={handleAddEquipment}
                loading={saving}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: sp[4],
    gap: sp[4],
  },
  introHeader: {
    marginBottom: sp[1],
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
  },
  listContainer: {
    gap: sp[3],
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
  itemCard: {
    backgroundColor: themeColors.surfaceElevated,
    padding: sp[3.5],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: sp[2],
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp[2],
    flex: 1,
  },
  itemName: {
    ...typography.subtitle2,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp[3],
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontSize: 12,
  },
  alternativesBox: {
    backgroundColor: themeColors.background,
    padding: sp[2],
    borderRadius: radius.sm,
    gap: 4,
  },
  alternativesLabel: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '600',
    fontSize: 11,
  },
  altChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  altChip: {
    backgroundColor: themeColors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  altChipText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
  },
  itemNotes: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontStyle: 'italic',
    fontSize: 12,
  },
  addButton: {
    marginTop: sp[2],
  },
  addFormCard: {
    backgroundColor: themeColors.surfaceElevated,
    padding: sp[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.primary + '50',
    gap: sp[3],
    marginTop: sp[2],
  },
  formTitle: {
    ...typography.subtitle2,
    color: themeColors.primary,
    fontWeight: '700',
  },
  field: {
    gap: 4,
  },
  label: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  input: {
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: radius.sm,
    paddingHorizontal: sp[3],
    paddingVertical: sp[2],
    color: themeColors.textPrimary,
    fontSize: 13,
  },
  chipsScroll: {
    gap: sp[1.5],
  },
  selectorChip: {
    backgroundColor: themeColors.background,
    paddingHorizontal: sp[2.5],
    paddingVertical: sp[1.5],
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  selectorChipActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  selectorText: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  selectorTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  requirementsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp[1.5],
  },
  reqChip: {
    flex: 1,
    minWidth: 70,
    backgroundColor: themeColors.background,
    paddingVertical: sp[1.5],
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: themeColors.border,
    alignItems: 'center',
  },
  reqChipActive: {
    backgroundColor: themeColors.accent,
    borderColor: themeColors.accent,
  },
  reqText: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  reqTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  formActions: {
    flexDirection: 'row',
    gap: sp[2],
    marginTop: sp[2],
  },
});
