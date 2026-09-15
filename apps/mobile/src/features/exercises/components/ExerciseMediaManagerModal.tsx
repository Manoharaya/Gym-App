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
import { Card } from '../../../components/primitives/Card';
import { Button } from '../../../components/primitives/Button';
import { themeColors, spacing as sp, radius, typography } from '../../../theme';
import { ExerciseService } from '../services/exerciseService';
import type { ExerciseMedia, ExerciseMediaType, ExerciseMediaPurpose } from '@fitcore/types';

const colors = {
  ...themeColors,
  primary: themeColors.primary,
  accent: themeColors.accent,
  textTertiary: themeColors.textMuted,
  surfaceHighlight: themeColors.surfaceElevated,
  danger: '#EF4444',
  border: themeColors.inputBorder,
  surface: themeColors.cardBackground,
};

interface ExerciseMediaManagerModalProps {
  visible: boolean;
  exerciseId: string;
  exerciseName: string;
  onClose: () => void;
  onMediaChanged?: () => void;
}

const MEDIA_TYPE_OPTIONS: ExerciseMediaType[] = [
  'IMAGE',
  'VIDEO',
  'ANIMATION',
  'MODEL_3D',
  'AUDIO',
  'CAPTION',
];

const PURPOSE_OPTIONS: { label: string; value: ExerciseMediaPurpose }[] = [
  { label: 'Primary Demonstration', value: 'PRIMARY_DEMONSTRATION' },
  { label: 'Secondary Demonstration', value: 'SECONDARY_DEMONSTRATION' },
  { label: 'Thumbnail / Card Poster', value: 'THUMBNAIL' },
  { label: 'Instruction Step Image', value: 'STEP_IMAGE' },
  { label: 'Instruction Step Video', value: 'STEP_VIDEO' },
  { label: 'Movement Phase Video', value: 'MOVEMENT_PHASE' },
  { label: 'Common Mistake Clip', value: 'COMMON_MISTAKE' },
  { label: 'Safety Precaution', value: 'SAFETY' },
  { label: 'Equipment Setup', value: 'EQUIPMENT' },
  { label: 'Anatomy / Muscle Focus', value: 'ANATOMY' },
  { label: '3D Interactive Mesh', value: '3D_MODEL' },
  { label: 'Audio Coaching Guidance', value: 'AUDIO_GUIDANCE' },
  { label: 'Closed Captions / Subtitles', value: 'CAPTION' },
];

export const ExerciseMediaManagerModal: React.FC<ExerciseMediaManagerModalProps> = ({
  visible,
  exerciseId,
  exerciseName,
  onClose,
  onMediaChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [mediaList, setMediaList] = useState<ExerciseMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State for attaching new media asset
  const [selectedType, setSelectedType] = useState<ExerciseMediaType>('IMAGE');
  const [selectedPurpose, setSelectedPurpose] = useState<ExerciseMediaPurpose>('PRIMARY_DEMONSTRATION');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [altText, setAltText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [sortOrder, setSortOrder] = useState('0');

  const fetchMedia = useCallback(async () => {
    if (!exerciseId) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const items = await ExerciseService.getExerciseMedia(exerciseId);
      setMediaList(items || []);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Failed to load media assets');
    } finally {
      setLoading(false);
    }
  }, [exerciseId]);

  useEffect(() => {
    if (visible) {
      fetchMedia();
    }
  }, [visible, fetchMedia]);

  const handleAttachMedia = async () => {
    if (!mediaUrl.trim()) {
      setErrorMessage('Media asset URL or storage key is required');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: Partial<ExerciseMedia> = {
        mediaType: selectedType,
        purpose: selectedPurpose,
        storageKey: mediaUrl.trim(),
        mimeType: selectedType === 'VIDEO' ? 'video/mp4' : selectedType === 'MODEL_3D' ? 'model/gltf-binary' : 'image/jpeg',
        url: mediaUrl.trim(),
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        altText: altText.trim() || undefined,
        isPrimary,
        sortOrder: parseInt(sortOrder, 10) || 0,
        status: 'READY',
        isPublished: true,
      };

      await ExerciseService.attachMedia(exerciseId, payload);
      // Reset form
      setTitle('');
      setDescription('');
      setAltText('');
      setMediaUrl('');
      setThumbnailUrl('');
      setIsPrimary(false);
      setSortOrder('0');
      setActiveTab('list');

      await fetchMedia();
      onMediaChanged?.();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Failed to attach media asset');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetPrimary = async (media: ExerciseMedia) => {
    try {
      await ExerciseService.updateMedia(media.id, {
        isPrimary: true,
        purpose: media.purpose,
      });
      await fetchMedia();
      onMediaChanged?.();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to set as primary asset');
    }
  };

  const handleTogglePublish = async (media: ExerciseMedia) => {
    try {
      if (media.isPublished) {
        await ExerciseService.archiveMedia(media.id);
      } else {
        await ExerciseService.publishMedia(media.id);
      }
      await fetchMedia();
      onMediaChanged?.();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to change publication status');
    }
  };

  const handleDelete = (mediaId: string) => {
    Alert.alert(
      'Delete Media Asset',
      'Are you sure you want to permanently delete this media asset? This also cleans up underlying storage.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ExerciseService.deleteMedia(mediaId);
              await fetchMedia();
              onMediaChanged?.();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to delete asset');
            }
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} onClose={onClose} style={styles.modalContent}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Manage Media</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {exerciseName}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'list' && styles.tabActive]}
            onPress={() => setActiveTab('list')}
          >
            <Text style={[styles.tabText, activeTab === 'list' && styles.tabTextActive]}>
              Assets ({mediaList.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'add' && styles.tabActive]}
            onPress={() => setActiveTab('add')}
          >
            <Text style={[styles.tabText, activeTab === 'add' && styles.tabTextActive]}>
              + Attach Media
            </Text>
          </TouchableOpacity>
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Tab 1: Media List */}
        {activeTab === 'list' && (
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Loading assets...</Text>
              </View>
            ) : mediaList.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>No Media Assets Attached</Text>
                <Text style={styles.emptySubtitle}>
                  Add photos, demonstration videos, or 3D animations to enhance this exercise.
                </Text>
                <Button
                  title="+ Attach First Asset"
                  onPress={() => setActiveTab('add')}
                  style={styles.emptyAddBtn}
                />
              </View>
            ) : (
              mediaList.map((media) => {
                const previewSource = media.thumbnailUrl || media.signedUrl || media.url;
                const isImage = media.mediaType === 'IMAGE' || media.mediaType === 'THUMBNAIL';

                return (
                  <Card key={media.id} style={styles.mediaItemCard}>
                    <View style={styles.mediaItemRow}>
                      {/* Asset Preview Thumbnail */}
                      <View style={styles.previewContainer}>
                        {isImage && previewSource ? (
                          <Image
                            source={{ uri: previewSource }}
                            style={styles.previewImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.placeholderBox}>
                            <Text style={styles.placeholderIcon}>
                              {media.mediaType === 'VIDEO' ? '▶' : media.mediaType === 'MODEL_3D' ? '3D' : '📁'}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Metadata info */}
                      <View style={styles.itemInfo}>
                        <View style={styles.itemBadgeRow}>
                          <Badge label={media.mediaType} variant="accent" />
                          {media.isPrimary ? (
                            <Badge label="PRIMARY" variant="primary" />
                          ) : null}
                          <Badge
                            label={media.isPublished ? 'PUBLISHED' : 'ARCHIVED'}
                            variant={media.isPublished ? 'success' : 'neutral'}
                          />
                        </View>

                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {media.title || `${media.purpose}`}
                        </Text>
                        <Text style={styles.itemPurpose} numberOfLines={1}>
                          {media.purpose?.replace(/_/g, ' ')}
                        </Text>
                        {media.altText ? (
                          <Text style={styles.itemAltText} numberOfLines={1}>
                            Alt: "{media.altText}"
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Action buttons */}
                    <View style={styles.actionRow}>
                      {!media.isPrimary ? (
                        <TouchableOpacity
                          style={styles.actionPill}
                          onPress={() => handleSetPrimary(media)}
                        >
                          <Text style={styles.actionPillText}>★ Make Primary</Text>
                        </TouchableOpacity>
                      ) : null}

                      <TouchableOpacity
                        style={styles.actionPill}
                        onPress={() => handleTogglePublish(media)}
                      >
                        <Text style={styles.actionPillText}>
                          {media.isPublished ? 'Archive' : 'Publish'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionPill, styles.actionDeletePill]}
                        onPress={() => handleDelete(media.id)}
                      >
                        <Text style={styles.actionDeleteText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                );
              })
            )}
          </ScrollView>
        )}

        {/* Tab 2: Attach Media Form */}
        {activeTab === 'add' && (
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Media Type Selector */}
            <Text style={styles.fieldLabel}>Media Type</Text>
            <View style={styles.chipsRow}>
              {MEDIA_TYPE_OPTIONS.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, selectedType === type && styles.chipActive]}
                  onPress={() => setSelectedType(type)}
                >
                  <Text style={[styles.chipText, selectedType === type && styles.chipTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Purpose Selector */}
            <Text style={styles.fieldLabel}>Asset Purpose</Text>
            <View style={styles.chipsRow}>
              {PURPOSE_OPTIONS.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={[styles.chip, selectedPurpose === p.value && styles.chipActive]}
                  onPress={() => setSelectedPurpose(p.value)}
                >
                  <Text style={[styles.chipText, selectedPurpose === p.value && styles.chipTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* URL / Key */}
            <Text style={styles.fieldLabel}>Media URL or Storage Key *</Text>
            <TextInput
              style={styles.input}
              placeholder="https://... or fitbeat/exercises/.../photo.jpg"
              placeholderTextColor={colors.textTertiary}
              value={mediaUrl}
              onChangeText={setMediaUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Thumbnail URL */}
            <Text style={styles.fieldLabel}>Thumbnail / Poster URL (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="https://... poster image for video/3D"
              placeholderTextColor={colors.textTertiary}
              value={thumbnailUrl}
              onChangeText={setThumbnailUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Title */}
            <Text style={styles.fieldLabel}>Asset Title (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Side Profile Demonstration"
              placeholderTextColor={colors.textTertiary}
              value={title}
              onChangeText={setTitle}
            />

            {/* Accessibility Alt Text */}
            <Text style={styles.fieldLabel}>Accessibility Alt Text (Recommended)</Text>
            <TextInput
              style={styles.input}
              placeholder="Screen-reader description of the athlete/movement"
              placeholderTextColor={colors.textTertiary}
              value={altText}
              onChangeText={setAltText}
            />

            {/* Description */}
            <Text style={styles.fieldLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional contextual details, biomechanic checkpoints..."
              placeholderTextColor={colors.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            {/* Primary Toggle */}
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setIsPrimary(!isPrimary)}
            >
              <View style={[styles.checkbox, isPrimary && styles.checkboxChecked]}>
                {isPrimary ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleTitle}>Set as Primary Visual</Text>
                <Text style={styles.toggleSubtitle}>
                  Replaces any existing primary asset for this purpose
                </Text>
              </View>
            </TouchableOpacity>

            {/* Submit Button */}
            <Button
              title={submitting ? 'Attaching Asset...' : 'Save & Attach Media'}
              onPress={handleAttachMedia}
              disabled={submitting}
              style={styles.submitBtn}
            />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    maxHeight: '85%',
    padding: sp.md,
    backgroundColor: colors.surface,
  },
  container: {
    maxHeight: 600,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: sp.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.accent,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    marginTop: sp.sm,
    marginBottom: sp.sm,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radius.md,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: sp.xs + 2,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabActive: {
    backgroundColor: colors.surface,
  },
  tabText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: sp.sm,
    borderRadius: radius.sm,
    marginBottom: sp.sm,
  },
  errorText: {
    color: colors.danger,
    ...typography.caption,
  },
  scrollArea: {
    maxHeight: 460,
  },
  centerBox: {
    padding: sp.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: sp.xs,
  },
  emptyBox: {
    padding: sp.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typography.body,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: sp.xs,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: sp.md,
  },
  emptyAddBtn: {
    minWidth: 160,
  },
  mediaItemCard: {
    marginBottom: sp.sm,
    padding: sp.sm,
    backgroundColor: colors.surfaceHighlight,
  },
  mediaItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewContainer: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    marginRight: sp.sm,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  placeholderBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 20,
    color: colors.textTertiary,
    fontWeight: 'bold',
  },
  itemInfo: {
    flex: 1,
  },
  itemBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  itemTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  itemPurpose: {
    ...typography.caption,
    color: colors.accent,
    textTransform: 'uppercase',
    fontSize: 10,
  },
  itemAltText: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: sp.xs,
    marginTop: sp.xs + 2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: sp.xs,
  },
  actionPill: {
    paddingHorizontal: sp.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  actionPillText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  actionDeletePill: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  actionDeleteText: {
    ...typography.caption,
    color: colors.danger,
    fontSize: 11,
    fontWeight: '600',
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: sp.xs + 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: sp.xs,
  },
  chip: {
    paddingHorizontal: sp.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHighlight,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  chipTextActive: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radius.sm,
    paddingHorizontal: sp.sm,
    paddingVertical: sp.xs + 2,
    color: colors.textPrimary,
    ...typography.body,
    fontSize: 13,
    marginBottom: sp.xs,
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: sp.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: sp.sm,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleTitle: {
    ...typography.caption,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  toggleSubtitle: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 10,
  },
  submitBtn: {
    marginTop: sp.sm,
    marginBottom: sp.lg,
  },
});
