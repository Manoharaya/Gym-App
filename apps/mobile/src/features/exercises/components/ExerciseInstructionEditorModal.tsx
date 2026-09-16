import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Modal } from '../../../components/primitives/Modal';
import { Badge } from '../../../components/primitives/Badge';
import { Button } from '../../../components/primitives/Button';
import { Icon } from '../../../components/primitives/Icon';
import { themeColors, spacing as sp, radius, typography } from '../../../theme';
import { ExerciseService } from '../services/exerciseService';
import { ExerciseStepPlayer } from './ExerciseStepPlayer';
import type {
  ExerciseInstruction,
  ExerciseInstructionStep,
  ExerciseMedia,
  InstructionStepType,
  InstructionMovementPhase,
  VisualCueCategory,
} from '@fitcore/types';

interface ExerciseInstructionEditorModalProps {
  visible: boolean;
  exerciseId: string;
  exerciseName: string;
  onClose: () => void;
  onSaved?: () => void;
}

const STEP_TYPES: InstructionStepType[] = [
  'PREPARATION',
  'START_POSITION',
  'EXECUTION',
  'HOLD',
  'RETURN',
  'BREATHING',
  'COMPLETION',
];

const MOVEMENT_PHASES: InstructionMovementPhase[] = [
  'SETUP',
  'START',
  'ECCENTRIC',
  'TRANSITION',
  'CONCENTRIC',
  'HOLD',
  'FINISH',
];

const VISUAL_CUE_CATEGORIES: VisualCueCategory[] = [
  'POSTURE',
  'ALIGNMENT',
  'BREATHING',
  'TEMPO',
  'RANGE_OF_MOTION',
  'SAFETY',
  'FOCUS',
];

export const ExerciseInstructionEditorModal: React.FC<ExerciseInstructionEditorModalProps> = ({
  visible,
  exerciseId,
  exerciseName,
  onClose,
  onSaved,
}) => {
  const [activeTab, setActiveTab] = useState<'steps' | 'overview' | 'preview'>('steps');
  const [instruction, setInstruction] = useState<ExerciseInstruction | null>(null);
  const [mediaList, setMediaList] = useState<ExerciseMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Step editor state
  const [editingStep, setEditingStep] = useState<Partial<ExerciseInstructionStep> | null>(null);
  const [isNewStep, setIsNewStep] = useState(false);

  // Overview form fields
  const [title, setTitle] = useState('');
  const [overview, setOverview] = useState('');
  const [preparationGuide, setPreparationGuide] = useState('');
  const [startingPosition, setStartingPosition] = useState('');
  const [breathingSummary, setBreathingSummary] = useState('');
  const [safetySummary, setSafetySummary] = useState('');

  const loadData = useCallback(async () => {
    if (!exerciseId) return;
    setLoading(true);
    try {
      const [instData, mediaData] = await Promise.all([
        ExerciseService.getExerciseInstructionGuide(exerciseId),
        ExerciseService.getExerciseMedia(exerciseId).catch(() => []),
      ]);
      setInstruction(instData);
      setMediaList(mediaData);

      if (instData) {
        setTitle(instData.title || `${exerciseName} Guide`);
        setOverview(instData.overview || '');
        setPreparationGuide(instData.preparationGuide || '');
        setStartingPosition(instData.startingPosition || '');
        setBreathingSummary(instData.breathingSummary || '');
        setSafetySummary(instData.safetySummary || '');
      }
    } catch (err) {
      console.warn('Failed to load instruction guide:', err);
    } finally {
      setLoading(false);
    }
  }, [exerciseId, exerciseName]);

  useEffect(() => {
    if (visible) {
      loadData();
      setEditingStep(null);
      setIsNewStep(false);
      setActiveTab('steps');
    }
  }, [visible, loadData]);

  const steps = instruction?.steps || [];

  const handleSaveOverview = async () => {
    setSaving(true);
    try {
      const updated = await ExerciseService.upsertExerciseInstruction(exerciseId, {
        title,
        overview,
        preparationGuide,
        startingPosition,
        breathingSummary,
        safetySummary,
      });
      setInstruction(updated);
      Alert.alert('Success', 'Instruction guide overview saved.');
      if (onSaved) onSaved();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save instruction overview.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (steps.length === 0) {
      Alert.alert('Cannot Publish', 'Add at least one instruction step before publishing.');
      return;
    }
    setSaving(true);
    try {
      const published = await ExerciseService.publishExerciseInstruction(exerciseId);
      setInstruction(published);
      Alert.alert('Published!', 'Exercise instructions are now live for all members.');
      if (onSaved) onSaved();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to publish instructions.');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveStep = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    const newSteps = [...steps];
    const temp = newSteps[index]!;
    newSteps[index] = newSteps[targetIndex]!;
    newSteps[targetIndex] = temp;

    const stepIds = newSteps.map((s) => s.id);
    try {
      const reordered = await ExerciseService.reorderInstructionSteps(exerciseId, stepIds);
      setInstruction((prev) => (prev ? { ...prev, steps: reordered } : prev));
      if (onSaved) onSaved();
    } catch (err: any) {
      Alert.alert('Reorder Failed', err?.response?.data?.message || 'Could not reorder steps.');
      loadData();
    }
  };

  const handleDeleteStep = (step: ExerciseInstructionStep) => {
    Alert.alert(
      'Delete Step',
      `Are you sure you want to delete Step ${step.stepNumber}: "${step.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ExerciseService.deleteInstructionStep(step.id);
              await loadData();
              if (onSaved) onSaved();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to delete step.');
            }
          },
        },
      ],
    );
  };

  const handleOpenNewStep = () => {
    setEditingStep({
      stepNumber: steps.length + 1,
      stepType: 'EXECUTION',
      title: '',
      description: '',
      detailedInstruction: '',
      movementPhase: 'CONCENTRIC',
      visualCue: '',
      visualCueCategory: 'ALIGNMENT',
      breathing: '',
      tempo: '',
      trainerTip: '',
      safetyNote: '',
    });
    setIsNewStep(true);
  };

  const handleEditStep = (step: ExerciseInstructionStep) => {
    setEditingStep({ ...step });
    setIsNewStep(false);
  };

  const handleSaveStep = async () => {
    if (!editingStep || !editingStep.title?.trim() || !editingStep.description?.trim()) {
      Alert.alert('Validation', 'Step Title and Description are required.');
      return;
    }

    setSaving(true);
    try {
      if (isNewStep) {
        await ExerciseService.createInstructionStep(exerciseId, editingStep);
      } else if (editingStep.id) {
        await ExerciseService.updateInstructionStep(editingStep.id, editingStep);
      }
      setEditingStep(null);
      setIsNewStep(false);
      await loadData();
      if (onSaved) onSaved();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save step.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} style={styles.modal}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Instruction Studio</Text>
              <Badge
                label={instruction?.status || 'DRAFT'}
                variant={instruction?.status === 'PUBLISHED' ? 'success' : 'neutral'}
              />
            </View>
            <Text style={styles.subtitle} numberOfLines={1}>{exerciseName}</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Icon name="close" size={18} color={themeColors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'steps' && styles.tabActive]}
            onPress={() => {
              setActiveTab('steps');
              setEditingStep(null);
            }}
          >
            <Text style={[styles.tabText, activeTab === 'steps' && styles.tabTextActive]}>
              Steps ({steps.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
            onPress={() => {
              setActiveTab('overview');
              setEditingStep(null);
            }}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
              Guide Setup
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'preview' && styles.tabActive]}
            onPress={() => {
              setActiveTab('preview');
              setEditingStep(null);
            }}
          >
            <Text style={[styles.tabText, activeTab === 'preview' && styles.tabTextActive]}>
              Member Preview
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={themeColors.primary} />
          </View>
        ) : editingStep ? (
          /* Step Editor Form */
          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.stepFormHeader}>
              <Text style={styles.formTitle}>
                {isNewStep ? `Add Step ${editingStep.stepNumber}` : `Edit Step ${editingStep.stepNumber}`}
              </Text>
              <TouchableOpacity onPress={() => setEditingStep(null)}>
                <Text style={styles.cancelLink}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Step Type */}
            <Text style={styles.inputLabel}>Step Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
              {STEP_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setEditingStep({ ...editingStep, stepType: type })}
                  style={[
                    styles.typePill,
                    editingStep.stepType === type && styles.typePillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.typePillText,
                      editingStep.stepType === type && styles.typePillTextActive,
                    ]}
                  >
                    {type.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Movement Phase */}
            <Text style={styles.inputLabel}>Movement Phase</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
              {MOVEMENT_PHASES.map((phase) => (
                <TouchableOpacity
                  key={phase}
                  onPress={() => setEditingStep({ ...editingStep, movementPhase: phase })}
                  style={[
                    styles.typePill,
                    editingStep.movementPhase === phase && styles.typePillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.typePillText,
                      editingStep.movementPhase === phase && styles.typePillTextActive,
                    ]}
                  >
                    {phase}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Title */}
            <Text style={styles.inputLabel}>Step Title *</Text>
            <TextInput
              style={styles.textInput}
              value={editingStep.title || ''}
              onChangeText={(t) => setEditingStep({ ...editingStep, title: t })}
              placeholder="e.g. Set Grip & Retract Scapula"
              placeholderTextColor={themeColors.textMuted}
            />

            {/* Concise Description */}
            <Text style={styles.inputLabel}>Direction / Description *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={editingStep.description || ''}
              onChangeText={(t) => setEditingStep({ ...editingStep, description: t })}
              placeholder="Concise instruction for member execution..."
              placeholderTextColor={themeColors.textMuted}
              multiline
              numberOfLines={3}
            />

            {/* Visual Focus Cue & Category */}
            <Text style={styles.inputLabel}>Visual Focus Cue</Text>
            <TextInput
              style={styles.textInput}
              value={editingStep.visualCue || ''}
              onChangeText={(t) => setEditingStep({ ...editingStep, visualCue: t })}
              placeholder="e.g. Knees tracked in line with second toes"
              placeholderTextColor={themeColors.textMuted}
            />

            <Text style={styles.inputLabel}>Cue Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
              {VISUAL_CUE_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setEditingStep({ ...editingStep, visualCueCategory: cat })}
                  style={[
                    styles.typePill,
                    editingStep.visualCueCategory === cat && styles.typePillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.typePillText,
                      editingStep.visualCueCategory === cat && styles.typePillTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Cadence, Tempo & Breathing */}
            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Breathing</Text>
                <TextInput
                  style={styles.textInput}
                  value={editingStep.breathing || ''}
                  onChangeText={(t) => setEditingStep({ ...editingStep, breathing: t })}
                  placeholder="Inhale / Exhale"
                  placeholderTextColor={themeColors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Tempo</Text>
                <TextInput
                  style={styles.textInput}
                  value={editingStep.tempo || ''}
                  onChangeText={(t) => setEditingStep({ ...editingStep, tempo: t })}
                  placeholder="3-1-1-0"
                  placeholderTextColor={themeColors.textMuted}
                />
              </View>
            </View>

            {/* Media Asset Attachment */}
            <Text style={styles.inputLabel}>Attach Visual Media</Text>
            {mediaList.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
                <TouchableOpacity
                  onPress={() => setEditingStep({ ...editingStep, mediaId: undefined, mediaUrl: undefined })}
                  style={[
                    styles.mediaThumbCard,
                    !editingStep.mediaId && styles.mediaThumbCardActive,
                  ]}
                >
                  <Text style={styles.mediaThumbNone}>None</Text>
                </TouchableOpacity>

                {mediaList.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setEditingStep({ ...editingStep, mediaId: m.id, mediaUrl: m.signedUrl || m.url })}
                    style={[
                      styles.mediaThumbCard,
                      editingStep.mediaId === m.id && styles.mediaThumbCardActive,
                    ]}
                  >
                    {m.signedUrl || m.url ? (
                      <Image source={{ uri: (m.signedUrl || m.url)! }} style={styles.mediaThumbImg} />
                    ) : (
                      <Icon name="activity" size={16} color={themeColors.textMuted} />
                    )}
                    <Text style={styles.mediaThumbText} numberOfLines={1}>{m.mediaType}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.helperText}>No media uploaded for this exercise yet.</Text>
            )}

            {/* Video Clip Offsets */}
            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Clip Start (sec)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={editingStep.videoStartTimeSeconds != null ? String(editingStep.videoStartTimeSeconds) : ''}
                  onChangeText={(t) =>
                    setEditingStep({
                      ...editingStep,
                      videoStartTimeSeconds: t.trim() ? parseFloat(t) : undefined,
                    })
                  }
                  placeholder="0"
                  placeholderTextColor={themeColors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Clip End (sec)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={editingStep.videoEndTimeSeconds != null ? String(editingStep.videoEndTimeSeconds) : ''}
                  onChangeText={(t) =>
                    setEditingStep({
                      ...editingStep,
                      videoEndTimeSeconds: t.trim() ? parseFloat(t) : undefined,
                    })
                  }
                  placeholder="5"
                  placeholderTextColor={themeColors.textMuted}
                />
              </View>
            </View>

            {/* Detailed Biomechanics Walkthrough */}
            <Text style={styles.inputLabel}>Detailed Biomechanics (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={editingStep.detailedInstruction || ''}
              onChangeText={(t) => setEditingStep({ ...editingStep, detailedInstruction: t })}
              placeholder="In-depth anatomical and movement explanation..."
              placeholderTextColor={themeColors.textMuted}
              multiline
              numberOfLines={3}
            />

            {/* Trainer Tip */}
            <Text style={styles.inputLabel}>Coach Pro-Tip</Text>
            <TextInput
              style={styles.textInput}
              value={editingStep.trainerTip || ''}
              onChangeText={(t) => setEditingStep({ ...editingStep, trainerTip: t })}
              placeholder="Audio cue or pro recommendation..."
              placeholderTextColor={themeColors.textMuted}
            />

            {/* Safety Note */}
            <Text style={styles.inputLabel}>Safety Note</Text>
            <TextInput
              style={styles.textInput}
              value={editingStep.safetyNote || ''}
              onChangeText={(t) => setEditingStep({ ...editingStep, safetyNote: t })}
              placeholder="Contraindication or injury prevention..."
              placeholderTextColor={themeColors.textMuted}
            />

            <Button
              title={saving ? 'Saving Step...' : 'Save Instruction Step'}
              onPress={handleSaveStep}
              disabled={saving}
              style={{ marginTop: sp.md, marginBottom: sp.xl }}
            />
          </ScrollView>
        ) : activeTab === 'steps' ? (
          /* Steps Sequence List */
          <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.actionHeader}>
              <Text style={styles.sectionTitle}>Sequence Workflow</Text>
              <TouchableOpacity style={styles.addBtn} onPress={handleOpenNewStep}>
                <Icon name="plus" size={14} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Add Step</Text>
              </TouchableOpacity>
            </View>

            {steps.length === 0 ? (
              <View style={styles.emptyBox}>
                <Icon name="dumbbell" size={36} color={themeColors.textMuted} />
                <Text style={styles.emptyLabel}>No steps created yet</Text>
                <Text style={styles.emptyDesc}>
                  Break down this movement into clear, sequential coaching checkpoints.
                </Text>
              </View>
            ) : (
              steps.map((step, idx) => (
                <View key={step.id} style={styles.stepRowCard}>
                  {/* Step Index & Order Controls */}
                  <View style={styles.orderCol}>
                    <TouchableOpacity
                      disabled={idx === 0}
                      onPress={() => handleMoveStep(idx, 'up')}
                      style={[styles.arrowBtn, idx === 0 && styles.arrowBtnDisabled]}
                    >
                      <Icon name="chevron-left" size={12} color={idx === 0 ? themeColors.textMuted : themeColors.textPrimary} style={{ transform: [{ rotate: '90deg' }] }} />
                    </TouchableOpacity>
                    <View style={styles.stepNumBubble}>
                      <Text style={styles.stepNumText}>{step.stepNumber}</Text>
                    </View>
                    <TouchableOpacity
                      disabled={idx === steps.length - 1}
                      onPress={() => handleMoveStep(idx, 'down')}
                      style={[styles.arrowBtn, idx === steps.length - 1 && styles.arrowBtnDisabled]}
                    >
                      <Icon name="chevron-left" size={12} color={idx === steps.length - 1 ? themeColors.textMuted : themeColors.textPrimary} style={{ transform: [{ rotate: '-90deg' }] }} />
                    </TouchableOpacity>
                  </View>

                  {/* Step Info */}
                  <View style={styles.stepInfoCol}>
                    <View style={styles.stepBadgeRow}>
                      {step.stepType ? (
                        <Badge
                          label={step.stepType.replace('_', ' ')}
                          variant="neutral"
                        />
                      ) : null}
                      {step.movementPhase ? (
                        <Badge
                          label={step.movementPhase}
                          variant="accent"
                        />
                      ) : null}
                      {step.visualCue ? (
                        <Badge
                          label={`Cue: ${step.visualCueCategory || 'VISUAL'}`}
                          variant="success"
                        />
                      ) : null}
                    </View>
                    <Text style={styles.stepItemTitle}>{step.title}</Text>
                    <Text style={styles.stepItemDesc} numberOfLines={2}>{step.description}</Text>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.stepActionCol}>
                    <TouchableOpacity
                      style={styles.editStepBtn}
                      onPress={() => handleEditStep(step)}
                    >
                      <Text style={styles.editStepBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteStepBtn}
                      onPress={() => handleDeleteStep(step)}
                    >
                      <Icon name="close" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            {/* Bottom Actions */}
            <View style={styles.footerActions}>
              <Button
                title={saving ? 'Publishing...' : 'Publish Guide to Members'}
                onPress={handlePublish}
                disabled={saving || steps.length === 0}
                variant="primary"
              />
            </View>
          </ScrollView>
        ) : activeTab === 'overview' ? (
          /* Overview / Guide Setup Form */
          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Guide Title</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Barbell Squat Master Class"
              placeholderTextColor={themeColors.textMuted}
            />

            <Text style={styles.inputLabel}>Overview & Purpose</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={overview}
              onChangeText={setOverview}
              placeholder="Executive overview of this exercise movement..."
              placeholderTextColor={themeColors.textMuted}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Preparation Guide</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={preparationGuide}
              onChangeText={setPreparationGuide}
              placeholder="Equipment, warm-up, and safety station setup..."
              placeholderTextColor={themeColors.textMuted}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Starting Position</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={startingPosition}
              onChangeText={setStartingPosition}
              placeholder="Stance, hand placement, core bracing..."
              placeholderTextColor={themeColors.textMuted}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Breathing Cadence</Text>
            <TextInput
              style={styles.textInput}
              value={breathingSummary}
              onChangeText={setBreathingSummary}
              placeholder="e.g. Valsalva maneuver, inhale on descent..."
              placeholderTextColor={themeColors.textMuted}
            />

            <Text style={styles.inputLabel}>Safety & Contraindication Summary</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={safetySummary}
              onChangeText={setSafetySummary}
              placeholder="Crucial safety guidelines..."
              placeholderTextColor={themeColors.textMuted}
              multiline
              numberOfLines={3}
            />

            <Button
              title={saving ? 'Saving...' : 'Save Guide Details'}
              onPress={handleSaveOverview}
              disabled={saving}
              style={{ marginTop: sp.md, marginBottom: sp.xl }}
            />
          </ScrollView>
        ) : (
          /* Member Preview */
          <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.previewBanner}>
              <Icon name="activity" size={16} color={themeColors.accent} />
              <Text style={styles.previewBannerText}>Live Member Interactive Learning Preview</Text>
            </View>
            <ExerciseStepPlayer
              steps={steps}
              exerciseName={exerciseName}
              onComplete={() => Alert.alert('Preview Complete', 'Step player loop finished.')}
            />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    maxHeight: '90%',
    padding: sp.md,
    backgroundColor: themeColors.surface,
  },
  container: {
    maxHeight: 640,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: sp.sm,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
  },
  title: {
    ...typography.titleLarge,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.labelSmall,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: sp.xs,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: themeColors.surfaceElevated,
    borderRadius: radius.md,
    padding: 3,
    marginVertical: sp.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabActive: {
    backgroundColor: themeColors.surface,
  },
  tabText: {
    ...typography.labelSmall,
    color: themeColors.textMuted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  centerLoading: {
    padding: sp.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listScroll: {
    maxHeight: 480,
  },
  formScroll: {
    maxHeight: 480,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp.sm,
  },
  sectionTitle: {
    ...typography.titleSmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.primary,
    paddingHorizontal: sp.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    gap: 4,
  },
  addBtnText: {
    ...typography.labelSmall,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyBox: {
    padding: sp.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginVertical: sp.md,
  },
  emptyLabel: {
    ...typography.titleMedium,
    color: themeColors.textPrimary,
    marginTop: sp.sm,
    fontWeight: '600',
  },
  emptyDesc: {
    ...typography.bodySmall,
    color: themeColors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  stepRowCard: {
    flexDirection: 'row',
    backgroundColor: themeColors.surfaceElevated,
    borderRadius: radius.md,
    padding: sp.sm,
    marginBottom: sp.sm,
    borderWidth: 1,
    borderColor: themeColors.border,
    alignItems: 'center',
  },
  orderCol: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: sp.sm,
    width: 28,
  },
  arrowBtn: {
    padding: 2,
  },
  arrowBtnDisabled: {
    opacity: 0.2,
  },
  stepNumBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: themeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  stepNumText: {
    ...typography.labelSmall,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  stepInfoCol: {
    flex: 1,
  },
  stepBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  stepItemTitle: {
    ...typography.bodyMedium,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  stepItemDesc: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  stepActionCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: sp.xs,
    marginLeft: sp.xs,
  },
  editStepBtn: {
    backgroundColor: themeColors.surface,
    paddingHorizontal: sp.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  editStepBtnText: {
    ...typography.labelSmall,
    color: themeColors.textPrimary,
    fontSize: 11,
  },
  deleteStepBtn: {
    padding: 4,
  },
  footerActions: {
    marginTop: sp.md,
    marginBottom: sp.lg,
  },
  stepFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp.sm,
    paddingBottom: sp.xs,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  formTitle: {
    ...typography.titleMedium,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  cancelLink: {
    ...typography.labelMedium,
    color: themeColors.textMuted,
  },
  inputLabel: {
    ...typography.labelSmall,
    color: themeColors.textSecondary,
    fontWeight: '700',
    marginTop: sp.sm,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: themeColors.surfaceElevated,
    borderRadius: radius.sm,
    paddingHorizontal: sp.sm,
    paddingVertical: 8,
    color: themeColors.textPrimary,
    borderWidth: 1,
    borderColor: themeColors.border,
    fontSize: 14,
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  pillScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  typePill: {
    paddingHorizontal: sp.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: themeColors.surfaceElevated,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginRight: 6,
  },
  typePillActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  typePillText: {
    ...typography.labelSmall,
    color: themeColors.textSecondary,
  },
  typePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: sp.sm,
  },
  mediaThumbCard: {
    width: 60,
    height: 60,
    borderRadius: radius.sm,
    backgroundColor: themeColors.surfaceElevated,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mediaThumbCardActive: {
    borderColor: themeColors.primary,
    borderWidth: 2,
  },
  mediaThumbImg: {
    width: '100%',
    height: '100%',
  },
  mediaThumbNone: {
    ...typography.labelSmall,
    color: themeColors.textMuted,
  },
  mediaThumbText: {
    position: 'absolute',
    bottom: 2,
    fontSize: 8,
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 2,
  },
  helperText: {
    ...typography.bodySmall,
    color: themeColors.textMuted,
    fontStyle: 'italic',
  },
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderRadius: radius.sm,
    padding: sp.sm,
    gap: sp.xs,
    marginBottom: sp.sm,
  },
  previewBannerText: {
    ...typography.labelSmall,
    color: themeColors.accent,
    fontWeight: '700',
  },
});
