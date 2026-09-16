import React, { useState, useEffect, useCallback } from 'react';
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
import { Modal } from '../../../components/primitives/Modal';
import { Button } from '../../../components/primitives/Button';
import { Icon } from '../../../components/primitives/Icon';
import { themeColors, spacing as sp, radius, typography } from '../../../theme';
import { ExerciseService } from '../services/exerciseService';
import type {
  ExerciseMovementPhase,
  MovementPhaseType,
  BodyPositionType,
  BodyOrientationType,
  RangeOfMotionType,
  BreathingPatternType,
  JointAlignmentGuidance,
} from '@fitcore/types';

interface ExerciseMovementBuilderModalProps {
  visible: boolean;
  exerciseId: string;
  exerciseName: string;
  onClose: () => void;
  onSaved?: () => void;
  initialPhase?: ExerciseMovementPhase | null;
}

const MOVEMENT_PHASE_TYPES: MovementPhaseType[] = [
  'SETUP',
  'START_POSITION',
  'ECCENTRIC',
  'TRANSITION_BOTTOM',
  'ISOMETRIC_HOLD',
  'CONCENTRIC',
  'TRANSITION_TOP',
  'LOCKOUT_FINISH',
  'RESET_RETURN',
];

const BODY_POSITIONS: BodyPositionType[] = [
  'STANDING',
  'SQUATTING',
  'HINGED',
  'SUPINE',
  'PRONE',
  'KNEELING',
  'HANGING',
  'SEATED',
  'PLANK',
  'QUADRUPED',
  'INVERTED',
  'OTHER',
];

const BODY_ORIENTATIONS: BodyOrientationType[] = [
  'UPRIGHT',
  'HORIZONTAL',
  'INCLINED',
  'DECLINED',
  'SIDEWAYS',
];

const ROM_TYPES: RangeOfMotionType[] = [
  'FULL',
  'PARTIAL',
  'DEEP',
  'PARALLEL',
  'TERMINAL',
  'ISOMETRIC',
];

const BREATHING_PATTERNS: BreathingPatternType[] = [
  'INHALE_DESCENT',
  'EXHALE_EFFORT',
  'HOLD_VALSALVA',
  'CONTINUOUS_RHYTHMIC',
  'EXHALE_RECOVERY',
];

const COMMON_JOINTS = [
  'ANKLES',
  'KNEES',
  'HIPS',
  'LUMBAR_SPINE',
  'THORACIC_SPINE',
  'SCAPULAE',
  'SHOULDERS',
  'ELBOWS',
  'WRISTS',
  'CORE_PELVIS',
];

export const ExerciseMovementBuilderModal: React.FC<ExerciseMovementBuilderModalProps> = ({
  visible,
  exerciseId,
  exerciseName,
  onClose,
  onSaved,
  initialPhase,
}) => {
  const [phases, setPhases] = useState<ExerciseMovementPhase[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<ExerciseMovementPhase | null>(null);

  // Form states
  const [phaseName, setPhaseName] = useState('DESCENT');
  const [phaseType, setPhaseType] = useState<MovementPhaseType>('ECCENTRIC');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cueText, setCueText] = useState('');
  const [bodyPosition, setBodyPosition] = useState<BodyPositionType>('STANDING');
  const [bodyOrientation, setBodyOrientation] = useState<BodyOrientationType>('UPRIGHT');
  const [rangeOfMotionType, setRangeOfMotionType] = useState<RangeOfMotionType>('FULL');
  const [rangeOfMotionNotes, setRangeOfMotionNotes] = useState('');
  const [breathingPattern, setBreathingPattern] = useState<BreathingPatternType>('INHALE_DESCENT');
  const [breathingNotes, setBreathingNotes] = useState('');
  const [tempoSeconds, setTempoSeconds] = useState('3.0');
  const [holdDurationSeconds, setHoldDurationSeconds] = useState('0');
  const [safetyNotes, setSafetyNotes] = useState('');
  const [videoStartSeconds, setVideoStartSeconds] = useState('');
  const [videoEndSeconds, setVideoEndSeconds] = useState('');

  // Checkpoints & Joint alignments
  const [checkpointInput, setCheckpointInput] = useState('');
  const [checkpoints, setCheckpoints] = useState<string[]>([]);

  const [jointAlignments, setJointAlignments] = useState<JointAlignmentGuidance[]>([]);
  const [newJoint, setNewJoint] = useState('KNEES');
  const [newAlignment, setNewAlignment] = useState('');
  const [newJointCue, setNewJointCue] = useState('');

  const loadPhases = useCallback(async () => {
    if (!exerciseId) return;
    setLoading(true);
    try {
      const data = await ExerciseService.getExerciseMovementPhases(exerciseId);
      setPhases(data || []);
    } catch (err: any) {
      console.warn('Failed to load movement phases:', err.message);
    } finally {
      setLoading(false);
    }
  }, [exerciseId]);

  useEffect(() => {
    if (visible) {
      loadPhases();
    }
  }, [visible, loadPhases]);

  useEffect(() => {
    if (initialPhase) {
      populateForm(initialPhase);
    } else {
      resetForm();
    }
  }, [initialPhase]);

  const populateForm = (phase: ExerciseMovementPhase) => {
    setSelectedPhase(phase);
    setPhaseName(phase.phaseName || '');
    setPhaseType((phase.phaseType as MovementPhaseType) || 'ECCENTRIC');
    setTitle(phase.title || '');
    setDescription(phase.description || '');
    setCueText(phase.cueText || '');
    setBodyPosition((phase.bodyPosition as BodyPositionType) || 'STANDING');
    setBodyOrientation((phase.bodyOrientation as BodyOrientationType) || 'UPRIGHT');
    setRangeOfMotionType((phase.rangeOfMotionType as RangeOfMotionType) || 'FULL');
    setRangeOfMotionNotes(phase.rangeOfMotionNotes || '');
    setBreathingPattern((phase.breathingPattern as BreathingPatternType) || 'INHALE_DESCENT');
    setBreathingNotes(phase.breathingNotes || '');
    setTempoSeconds(phase.tempoSeconds != null ? String(phase.tempoSeconds) : '');
    setHoldDurationSeconds(phase.holdDurationSeconds != null ? String(phase.holdDurationSeconds) : '');
    setSafetyNotes(phase.safetyNotes || '');
    setVideoStartSeconds(
      phase.videoStartTimeSeconds != null ? String(phase.videoStartTimeSeconds) : '',
    );
    setVideoEndSeconds(
      phase.videoEndTimeSeconds != null ? String(phase.videoEndTimeSeconds) : '',
    );
    setCheckpoints(Array.isArray(phase.keyCheckpoints) ? (phase.keyCheckpoints as string[]) : []);
    setJointAlignments(
      Array.isArray(phase.jointAlignments) ? (phase.jointAlignments as JointAlignmentGuidance[]) : [],
    );
  };

  const resetForm = () => {
    setSelectedPhase(null);
    setPhaseName('');
    setPhaseType('ECCENTRIC');
    setTitle('');
    setDescription('');
    setCueText('');
    setBodyPosition('STANDING');
    setBodyOrientation('UPRIGHT');
    setRangeOfMotionType('FULL');
    setRangeOfMotionNotes('');
    setBreathingPattern('INHALE_DESCENT');
    setBreathingNotes('');
    setTempoSeconds('3.0');
    setHoldDurationSeconds('0');
    setSafetyNotes('');
    setVideoStartSeconds('');
    setVideoEndSeconds('');
    setCheckpoints([]);
    setJointAlignments([]);
    setCheckpointInput('');
    setNewAlignment('');
    setNewJointCue('');
  };

  const handleAddCheckpoint = () => {
    if (!checkpointInput.trim()) return;
    setCheckpoints((prev) => [...prev, checkpointInput.trim()]);
    setCheckpointInput('');
  };

  const handleRemoveCheckpoint = (index: number) => {
    setCheckpoints((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddJointAlignment = () => {
    if (!newAlignment.trim()) return;
    setJointAlignments((prev) => [
      ...prev,
      {
        joint: newJoint,
        alignment: newAlignment.trim(),
        status: 'OPTIMAL',
        cue: newJointCue.trim() || undefined,
      },
    ]);
    setNewAlignment('');
    setNewJointCue('');
  };

  const handleRemoveJointAlignment = (index: number) => {
    setJointAlignments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!phaseName.trim()) {
      Alert.alert('Validation Error', 'Phase name is required (e.g. SETUP, DESCENT, ASCENT).');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<ExerciseMovementPhase> = {
        phaseName: phaseName.trim(),
        phaseType,
        title: title.trim() || null,
        description: description.trim() || null,
        cueText: cueText.trim() || null,
        bodyPosition,
        bodyOrientation,
        rangeOfMotionType,
        rangeOfMotionNotes: rangeOfMotionNotes.trim() || null,
        breathingPattern,
        breathingNotes: breathingNotes.trim() || null,
        tempoSeconds: tempoSeconds ? parseFloat(tempoSeconds) : null,
        holdDurationSeconds: holdDurationSeconds ? parseFloat(holdDurationSeconds) : null,
        keyCheckpoints: checkpoints,
        jointAlignments,
        safetyNotes: safetyNotes.trim() || null,
        videoStartTimeSeconds: videoStartSeconds ? parseFloat(videoStartSeconds) : null,
        videoEndTimeSeconds: videoEndSeconds ? parseFloat(videoEndSeconds) : null,
      };

      if (selectedPhase) {
        await ExerciseService.updateMovementPhase(exerciseId, selectedPhase.id, payload);
        Alert.alert('Success', `Movement phase '${phaseName}' updated.`);
      } else {
        await ExerciseService.createMovementPhase(exerciseId, payload);
        Alert.alert('Success', `Movement phase '${phaseName}' created.`);
      }

      await loadPhases();
      resetForm();
      if (onSaved) onSaved();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to save phase.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (phaseId: string) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to remove this movement phase from the exercise lifecycle?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await ExerciseService.deleteMovementPhase(exerciseId, phaseId);
              if (selectedPhase?.id === phaseId) resetForm();
              await loadPhases();
              if (onSaved) onSaved();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || err.message);
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <View style={styles.modalHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.modalTitle}>Movement Phase Studio</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            Architecture for <Text style={styles.accentText}>{exerciseName}</Text>
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Icon name="close" size={18} color={themeColors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>

        {loading ? (
          <ActivityIndicator size="large" color={themeColors.primary} style={{ marginVertical: sp[4] }} />
        ) : (
          <>
            {/* Existing Phases Selector */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>LIFECYCLE PHASES ({phases.length})</Text>
                <TouchableOpacity onPress={resetForm} style={styles.addNewButton}>
                  <Icon name="plus" size={12} color={themeColors.primary} />
                  <Text style={styles.addNewButtonText}>New Phase</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.phasePillScroll}>
                {phases.map((p, idx) => {
                  const isCurrent = selectedPhase?.id === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.phasePill, isCurrent && styles.phasePillActive]}
                      onPress={() => populateForm(p)}
                    >
                      <Text style={[styles.phasePillIndex, isCurrent && styles.phasePillIndexActive]}>
                        {idx + 1}
                      </Text>
                      <Text style={[styles.phasePillText, isCurrent && styles.phasePillTextActive]}>
                        {p.phaseName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Form Title */}
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {selectedPhase ? `Editing Phase: ${selectedPhase.phaseName}` : 'Add New Movement Phase'}
              </Text>
              {selectedPhase && (
                <TouchableOpacity
                  onPress={() => handleDelete(selectedPhase.id)}
                  style={styles.deleteButton}
                >
                  <Icon name="close" size={14} color="#EF4444" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Phase Name & Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PHASE NAME *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. DESCENT, SETUP, BOTTOM, ASCENT"
                placeholderTextColor={themeColors.textMuted}
                value={phaseName}
                onChangeText={setPhaseName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PHASE TYPE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}>
                {MOVEMENT_PHASE_TYPES.map((pt) => (
                  <TouchableOpacity
                    key={pt}
                    style={[styles.tagPill, phaseType === pt && styles.tagPillActive]}
                    onPress={() => setPhaseType(pt)}
                  >
                    <Text style={[styles.tagPillText, phaseType === pt && styles.tagPillTextActive]}>
                      {pt.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Title & Real-time Cue */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>TITLE</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Eccentric Lowering Phase"
                placeholderTextColor={themeColors.textMuted}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>REAL-TIME COACHING CUE</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Push hips back, spread the knees, control descent"
                placeholderTextColor={themeColors.textMuted}
                value={cueText}
                onChangeText={setCueText}
              />
            </View>

            {/* Position & Alignment Selectors */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>BODY POSITION</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}>
                {BODY_POSITIONS.map((bp) => (
                  <TouchableOpacity
                    key={bp}
                    style={[styles.tagPill, bodyPosition === bp && styles.tagPillActive]}
                    onPress={() => setBodyPosition(bp)}
                  >
                    <Text style={[styles.tagPillText, bodyPosition === bp && styles.tagPillTextActive]}>
                      {bp}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>BODY ORIENTATION</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}>
                {BODY_ORIENTATIONS.map((bo) => (
                  <TouchableOpacity
                    key={bo}
                    style={[styles.tagPill, bodyOrientation === bo && styles.tagPillActive]}
                    onPress={() => setBodyOrientation(bo)}
                  >
                    <Text style={[styles.tagPillText, bodyOrientation === bo && styles.tagPillTextActive]}>
                      {bo}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>RANGE OF MOTION</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}>
                {ROM_TYPES.map((rom) => (
                  <TouchableOpacity
                    key={rom}
                    style={[styles.tagPill, rangeOfMotionType === rom && styles.tagPillActive]}
                    onPress={() => setRangeOfMotionType(rom)}
                  >
                    <Text style={[styles.tagPillText, rangeOfMotionType === rom && styles.tagPillTextActive]}>
                      {rom}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Breathing Pattern */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>BREATHING PATTERN</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}>
                {BREATHING_PATTERNS.map((bp) => (
                  <TouchableOpacity
                    key={bp}
                    style={[styles.tagPill, breathingPattern === bp && styles.tagPillActive]}
                    onPress={() => setBreathingPattern(bp)}
                  >
                    <Text style={[styles.tagPillText, breathingPattern === bp && styles.tagPillTextActive]}>
                      {bp.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Tempo & Hold Durations */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>PHASE TEMPO (SEC)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="3.0"
                  placeholderTextColor={themeColors.textMuted}
                  value={tempoSeconds}
                  onChangeText={setTempoSeconds}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>HOLD DURATION (SEC)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="0"
                  placeholderTextColor={themeColors.textMuted}
                  value={holdDurationSeconds}
                  onChangeText={setHoldDurationSeconds}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Video Sub-Second Loop Offsets */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>LOOP START (SEC)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 1.2"
                  placeholderTextColor={themeColors.textMuted}
                  value={videoStartSeconds}
                  onChangeText={setVideoStartSeconds}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>LOOP END (SEC)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 4.5"
                  placeholderTextColor={themeColors.textMuted}
                  value={videoEndSeconds}
                  onChangeText={setVideoEndSeconds}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Joint Alignment Matrix Builder */}
            <View style={styles.builderSection}>
              <Text style={styles.sectionLabel}>JOINT ALIGNMENTS MATRIX</Text>
              {jointAlignments.map((ja, idx) => (
                <View key={idx} style={styles.builderItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.builderItemTitle}>
                      {ja.joint}: <Text style={{ color: themeColors.textPrimary }}>{ja.alignment}</Text>
                    </Text>
                    {ja.cue && <Text style={styles.builderItemSub}>Cue: "{ja.cue}"</Text>}
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveJointAlignment(idx)}>
                    <Icon name="close" size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.addJointRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.miniTagScroll}>
                  {COMMON_JOINTS.map((j) => (
                    <TouchableOpacity
                      key={j}
                      style={[styles.miniTag, newJoint === j && styles.miniTagActive]}
                      onPress={() => setNewJoint(j)}
                    >
                      <Text style={[styles.miniTagText, newJoint === j && styles.miniTagTextActive]}>
                        {j}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TextInput
                  style={[styles.textInput, { marginTop: sp[2] }]}
                  placeholder="Alignment guidance (e.g. Track inline with 2nd toe)"
                  placeholderTextColor={themeColors.textMuted}
                  value={newAlignment}
                  onChangeText={setNewAlignment}
                />
                <TextInput
                  style={[styles.textInput, { marginTop: sp[2] }]}
                  placeholder="Coaching cue (optional, e.g. Spread the floor)"
                  placeholderTextColor={themeColors.textMuted}
                  value={newJointCue}
                  onChangeText={setNewJointCue}
                />
                <Button
                  title="Add Joint Alignment"
                  variant="outline"
                  onPress={handleAddJointAlignment}
                  style={{ marginTop: sp[2] }}
                />
              </View>
            </View>

            {/* Checkpoints Builder */}
            <View style={styles.builderSection}>
              <Text style={styles.sectionLabel}>KEY CHECKPOINTS</Text>
              {checkpoints.map((cp, idx) => (
                <View key={idx} style={styles.builderItem}>
                  <Text style={[styles.builderItemTitle, { flex: 1 }]}>• {cp}</Text>
                  <TouchableOpacity onPress={() => handleRemoveCheckpoint(idx)}>
                    <Icon name="close" size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
              <View style={styles.addCheckpointRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  placeholder="e.g. Chest upright throughout descent"
                  placeholderTextColor={themeColors.textMuted}
                  value={checkpointInput}
                  onChangeText={setCheckpointInput}
                />
                <TouchableOpacity style={styles.addInlineBtn} onPress={handleAddCheckpoint}>
                  <Icon name="plus" size={16} color="#000000" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={onClose}
                style={{ flex: 1, marginRight: sp[2] }}
              />
              <Button
                title={saving ? 'Saving...' : selectedPhase ? 'Update Phase' : 'Add Phase'}
                variant="primary"
                onPress={handleSave}
                disabled={saving}
                style={{ flex: 1 }}
              />
            </View>
          </>
        )}
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: sp[2],
  },
  modalTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  closeBtn: {
    padding: sp[1],
  },
  modalBody: {
    padding: sp[4],
  },
  subtitle: {
    ...typography.bodySm,
    color: themeColors.textMuted,
    marginBottom: sp[4],
  },
  accentText: {
    color: themeColors.primary,
    fontWeight: '700',
  },
  section: {
    marginBottom: sp[4],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp[2],
  },
  sectionLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addNewButtonText: {
    ...typography.caption,
    color: themeColors.primary,
    fontWeight: '600',
  },
  phasePillScroll: {
    flexDirection: 'row',
  },
  phasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.surfaceElevated,
    paddingVertical: sp[2],
    paddingHorizontal: sp[3],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginRight: sp[2],
    gap: 6,
  },
  phasePillActive: {
    borderColor: themeColors.primary,
    backgroundColor: themeColors.surface,
  },
  phasePillIndex: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '700',
  },
  phasePillIndexActive: {
    color: themeColors.primary,
  },
  phasePillText: {
    ...typography.bodySm,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  phasePillTextActive: {
    color: themeColors.textPrimary,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: sp[3],
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    marginBottom: sp[3],
  },
  formTitle: {
    ...typography.h4,
    color: themeColors.textPrimary,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteButtonText: {
    ...typography.caption,
    color: '#EF4444',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: sp[3],
  },
  inputLabel: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '700',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: themeColors.surfaceElevated,
    borderRadius: radius.sm,
    paddingHorizontal: sp[3],
    paddingVertical: sp[2],
    color: themeColors.textPrimary,
    ...typography.bodySm,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  tagScroll: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  tagPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: themeColors.surfaceElevated,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginRight: 6,
  },
  tagPillActive: {
    borderColor: themeColors.primary,
    backgroundColor: themeColors.primary,
  },
  tagPillText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  tagPillTextActive: {
    color: '#000000',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: sp[3],
  },
  builderSection: {
    marginTop: sp[3],
    marginBottom: sp[4],
    backgroundColor: themeColors.surfaceElevated,
    padding: sp[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  builderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: themeColors.surface,
    padding: sp[2],
    borderRadius: radius.sm,
    marginTop: sp[2],
  },
  builderItemTitle: {
    ...typography.bodySm,
    color: themeColors.textSecondary,
  },
  builderItemSub: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontStyle: 'italic',
  },
  addJointRow: {
    marginTop: sp[3],
  },
  miniTagScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  miniTag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginRight: 4,
  },
  miniTagActive: {
    borderColor: themeColors.primary,
    backgroundColor: themeColors.primary,
  },
  miniTagText: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.textMuted,
  },
  miniTagTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  addCheckpointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp[2],
    marginTop: sp[2],
  },
  addInlineBtn: {
    backgroundColor: themeColors.primary,
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: sp[4],
    marginBottom: sp[8],
  },
});
