import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import {
  ExerciseService,
  AnnotationType,
  AnnotationCategory,
  AnnotationStatus,
  ExerciseMediaAnnotation,
} from '../services/exerciseService';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
  xl: spacing[8],
};

const ANNOTATION_TYPES: Array<{ id: AnnotationType; label: string; icon: any }> = [
  { id: 'POINT', label: 'Point Pin', icon: 'bolt' },
  { id: 'LINE', label: 'Guide Line', icon: 'activity' },
  { id: 'ARROW', label: 'Direction Arrow', icon: 'chevron-right' },
  { id: 'REGION', label: 'Region Box', icon: 'shield' },
  { id: 'TEXT_LABEL', label: 'Text Label', icon: 'check' },
  { id: 'HIGHLIGHT', label: 'Glow Highlight', icon: 'sparkles' },
];

const ANNOTATION_CATEGORIES: Array<{ id: AnnotationCategory; label: string; color: string }> = [
  { id: 'ALIGNMENT', label: 'Alignment', color: '#10B981' },
  { id: 'POSTURE', label: 'Posture', color: '#3B82F6' },
  { id: 'BREATHING', label: 'Breathing', color: '#F59E0B' },
  { id: 'RANGE_OF_MOTION', label: 'Range of Motion', color: '#8B5CF6' },
  { id: 'SAFETY', label: 'Safety Note', color: '#EF4444' },
  { id: 'COMMON_MISTAKE', label: 'Common Mistake', color: '#F97316' },
];

export interface ExerciseMediaAnnotationEditorModalProps {
  visible: boolean;
  mediaId: string;
  phaseId?: string | null;
  initialCoords?: { x: number; y: number } | null;
  annotationToEdit?: ExerciseMediaAnnotation | null;
  onClose: () => void;
  onSaved: (annotation: ExerciseMediaAnnotation) => void;
  onDeleted?: (annotationId: string) => void;
}

export const ExerciseMediaAnnotationEditorModal: React.FC<ExerciseMediaAnnotationEditorModalProps> = ({
  visible,
  mediaId,
  phaseId,
  initialCoords,
  annotationToEdit,
  onClose,
  onSaved,
  onDeleted,
}) => {
  const [type, setType] = useState<AnnotationType>('POINT');
  const [category, setCategory] = useState<AnnotationCategory>('ALIGNMENT');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<AnnotationStatus>('PUBLISHED');
  const [posX, setPosX] = useState(0.5);
  const [posY, setPosY] = useState(0.5);
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (annotationToEdit) {
      setType(annotationToEdit.type);
      setCategory(annotationToEdit.category);
      setLabel(annotationToEdit.label);
      setDescription(annotationToEdit.description || '');
      setStatus(annotationToEdit.status);
      setPosX(annotationToEdit.x);
      setPosY(annotationToEdit.y);
      setStartTime(annotationToEdit.startTime != null ? String(annotationToEdit.startTime) : '');
      setEndTime(annotationToEdit.endTime != null ? String(annotationToEdit.endTime) : '');
    } else {
      setType('POINT');
      setCategory('ALIGNMENT');
      setLabel('');
      setDescription('');
      setStatus('PUBLISHED');
      setPosX(initialCoords ? Math.min(1, Math.max(0, initialCoords.x)) : 0.5);
      setPosY(initialCoords ? Math.min(1, Math.max(0, initialCoords.y)) : 0.5);
      setStartTime('');
      setEndTime('');
    }
  }, [annotationToEdit, initialCoords, visible]);

  const handleSave = async () => {
    if (!label.trim()) {
      Alert.alert('Required Field', 'Please enter a title or label for this technique cue.');
      return;
    }

    const parsedStart = startTime.trim() ? parseFloat(startTime) : undefined;
    const parsedEnd = endTime.trim() ? parseFloat(endTime) : undefined;

    if (parsedStart !== undefined && parsedEnd !== undefined && parsedStart > parsedEnd) {
      Alert.alert('Invalid Timing', 'Start timestamp cannot exceed end timestamp.');
      return;
    }

    setSaving(true);
    try {
      if (annotationToEdit) {
        const updated = await ExerciseService.updateMediaAnnotation(mediaId, annotationToEdit.id, {
          type,
          category,
          label: label.trim(),
          description: description.trim() || null,
          x: posX,
          y: posY,
          startTime: parsedStart,
          endTime: parsedEnd,
          status,
          phaseId: phaseId || undefined,
        });
        onSaved(updated);
      } else {
        const created = await ExerciseService.createMediaAnnotation(mediaId, {
          type,
          category,
          label: label.trim(),
          description: description.trim() || undefined,
          x: posX,
          y: posY,
          startTime: parsedStart,
          endTime: parsedEnd,
          status,
          phaseId: phaseId || undefined,
        });
        onSaved(created);
      }
      onClose();
    } catch (err: any) {
      Alert.alert('Save Failed', err?.response?.data?.message || 'Could not save annotation.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!annotationToEdit) return;

    Alert.alert('Delete Annotation', 'Are you sure you want to remove this visual technique cue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await ExerciseService.deleteMediaAnnotation(mediaId, annotationToEdit.id);
            onDeleted?.(annotationToEdit.id);
            onClose();
          } catch (err: any) {
            Alert.alert('Delete Failed', err?.response?.data?.message || 'Could not delete.');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Icon name="bolt" size={20} color={themeColors.primary} />
              <Text style={styles.titleText}>
                {annotationToEdit ? 'Edit Visual Technique Cue' : 'Add Authored Visual Cue'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.scrollContent}>
            {/* Position Information */}
            <Card style={styles.coordCard}>
              <View style={styles.coordRow}>
                <Text style={styles.coordLabel}>Normalized Position:</Text>
                <Badge
                  label={`X: ${(posX * 100).toFixed(1)}% | Y: ${(posY * 100).toFixed(1)}%`}
                  variant="accent"
                />
              </View>
              <Text style={styles.coordHint}>
                Positioned responsively relative to video aspect ratio across all devices.
              </Text>
            </Card>

            {/* Cue Category */}
            <Text style={styles.sectionHeading}>CUE CATEGORY</Text>
            <View style={styles.pillGrid}>
              {ANNOTATION_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryPill,
                    category === cat.id && {
                      borderColor: cat.color,
                      backgroundColor: `${cat.color}20`,
                    },
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <View style={[styles.colorDot, { backgroundColor: cat.color }]} />
                  <Text
                    style={[
                      styles.pillText,
                      category === cat.id && { color: cat.color, fontWeight: '700' },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Annotation Visual Type */}
            <Text style={styles.sectionHeading}>VISUAL MARKER TYPE</Text>
            <View style={styles.pillGrid}>
              {ANNOTATION_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.categoryPill,
                    type === t.id && {
                      borderColor: themeColors.primary,
                      backgroundColor: `${themeColors.primary}20`,
                    },
                  ]}
                  onPress={() => setType(t.id)}
                >
                  <Icon
                    name={t.icon as any}
                    size={14}
                    color={type === t.id ? themeColors.primary : themeColors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.pillText,
                      type === t.id && { color: themeColors.primary, fontWeight: '700' },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Label Input */}
            <Text style={styles.sectionHeading}>CUE LABEL / CHECKPOINT TITLE *</Text>
            <TextInput
              style={styles.textInput}
              value={label}
              onChangeText={setLabel}
              placeholder="e.g. Knee Tracking Plane or Neutral Lumbar"
              placeholderTextColor={themeColors.textMuted}
            />

            {/* Description Input */}
            <Text style={styles.sectionHeading}>COACHING EXPLANATION</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Explain what the learner should observe or feel at this anatomical checkpoint..."
              placeholderTextColor={themeColors.textMuted}
              multiline
              numberOfLines={3}
            />

            {/* Video Timing Range */}
            <Text style={styles.sectionHeading}>DISPLAY TIMING (OPTIONAL)</Text>
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>Start Time (sec)</Text>
                <TextInput
                  style={styles.textInput}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="0.0"
                  placeholderTextColor={themeColors.textMuted}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>End Time (sec)</Text>
                <TextInput
                  style={styles.textInput}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="3.5"
                  placeholderTextColor={themeColors.textMuted}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Status */}
            <Text style={styles.sectionHeading}>STATUS</Text>
            <View style={styles.statusRow}>
              {(['PUBLISHED', 'DRAFT'] as AnnotationStatus[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.statusBtn,
                    status === s && styles.statusBtnActive,
                  ]}
                  onPress={() => setStatus(s)}
                >
                  <Text
                    style={[
                      styles.statusBtnText,
                      status === s && styles.statusBtnTextActive,
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footerRow}>
            {annotationToEdit && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDelete}
                disabled={deleting || saving}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <>
                    <Icon name="close" size={16} color="#EF4444" />
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={saving || deleting}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={saving || deleting}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <>
                  <Icon name="check" size={16} color="#000000" />
                  <Text style={styles.saveBtnText}>Save Cue</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: themeColors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '90%',
    paddingBottom: sp.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: sp.lg,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
  },
  titleText: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  closeBtn: {
    padding: sp.xs,
  },
  bodyScroll: {
    paddingHorizontal: sp.lg,
  },
  scrollContent: {
    paddingVertical: sp.md,
    gap: sp.md,
  },
  coordCard: {
    padding: sp.md,
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  coordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coordLabel: {
    ...typography.bodySm,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  coordHint: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginTop: sp.xs,
  },
  sectionHeading: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: sp.xs,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.sm,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
    paddingHorizontal: sp.md,
    paddingVertical: sp.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.background,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillText: {
    ...typography.bodySm,
    color: themeColors.textSecondary,
  },
  textInput: {
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: radius.md,
    paddingHorizontal: sp.md,
    paddingVertical: sp.sm,
    color: themeColors.textPrimary,
    ...typography.body,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  timeRow: {
    flexDirection: 'row',
    gap: sp.md,
  },
  timeField: {
    flex: 1,
  },
  timeLabel: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginBottom: sp.xs,
  },
  statusRow: {
    flexDirection: 'row',
    gap: sp.sm,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: sp.sm,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  statusBtnActive: {
    borderColor: themeColors.primary,
    backgroundColor: `${themeColors.primary}20`,
  },
  statusBtnText: {
    ...typography.bodySm,
    color: themeColors.textSecondary,
  },
  statusBtnTextActive: {
    color: themeColors.primary,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    paddingHorizontal: sp.lg,
    paddingTop: sp.md,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
    paddingHorizontal: sp.md,
    paddingVertical: sp.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  deleteBtnText: {
    ...typography.bodySm,
    color: '#EF4444',
    fontWeight: '600',
  },
  cancelBtn: {
    paddingHorizontal: sp.md,
    paddingVertical: sp.sm,
  },
  cancelBtnText: {
    ...typography.bodySm,
    color: themeColors.textSecondary,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.xs,
    backgroundColor: themeColors.primary,
    paddingVertical: sp.md,
    borderRadius: radius.md,
  },
  saveBtnText: {
    ...typography.bodySm,
    color: '#000000',
    fontWeight: '700',
  },
});
