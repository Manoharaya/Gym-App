import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, radius, spacing } from '../../../theme';
import type { Exercise } from '@fitcore/types';

interface ExerciseQuickPreviewModalProps {
  visible: boolean;
  exercise: (Exercise & { isFavorite?: boolean }) | null;
  onClose: () => void;
  onOpenFullDetail: (exercise: Exercise) => void;
  onToggleFavorite?: (exerciseId: string) => void;
}

export const ExerciseQuickPreviewModal: React.FC<ExerciseQuickPreviewModalProps> = ({
  visible,
  exercise,
  onClose,
  onOpenFullDetail,
  onToggleFavorite,
}) => {
  if (!exercise) return null;

  const primaryMedia =
    exercise.media?.find((m) => m.isPrimary) || exercise.media?.[0];
  const thumbnailUrl = primaryMedia?.thumbnailUrl || primaryMedia?.url;
  const hasVideo = exercise.media?.some((m) => m.mediaType === 'VIDEO');

  const formattedCategory = exercise.exerciseCategory
    ? exercise.exerciseCategory.charAt(0) + exercise.exerciseCategory.slice(1).toLowerCase().replace(/_/g, ' ')
    : exercise.exerciseType || 'Strength';

  const formattedEquipment = exercise.equipment
    ? exercise.equipment.charAt(0) + exercise.equipment.slice(1).toLowerCase().replace(/_/g, ' ')
    : 'No Equipment';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.container}>
          <View style={styles.card}>
            {/* Media Area */}
            <View style={styles.mediaWrap}>
              {thumbnailUrl ? (
                <Image source={{ uri: thumbnailUrl }} style={styles.mediaImage} resizeMode="cover" />
              ) : (
                <View style={styles.mediaPlaceholder}>
                  <Icon name="dumbbell" size={40} color={themeColors.primary} />
                </View>
              )}

              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Icon name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>

              {hasVideo && (
                <View style={styles.videoBadge}>
                  <Icon name="timer" size={12} color="#FFFFFF" />
                  <Text style={styles.videoText}>HD DEMO AVAILABLE</Text>
                </View>
              )}
            </View>

            <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
              {/* Category and Badges */}
              <View style={styles.badgeRow}>
                <Badge label={formattedCategory.toUpperCase()} variant="primary" />
                <Badge label={exercise.primaryMuscleGroup || 'TARGET'} variant="accent" />
                <Badge label={exercise.difficulty || 'INTERMEDIATE'} variant="neutral" />
              </View>

              {/* Title */}
              <Text style={styles.title}>{exercise.name}</Text>

              {/* Quick Specs Grid */}
              <View style={styles.specsGrid}>
                <View style={styles.specBox}>
                  <Text style={styles.specLabel}>EQUIPMENT</Text>
                  <Text style={styles.specVal}>{formattedEquipment}</Text>
                </View>

                <View style={styles.specBox}>
                  <Text style={styles.specLabel}>PATTERN</Text>
                  <Text style={styles.specVal}>{exercise.movementPattern || 'Standard'}</Text>
                </View>

                <View style={styles.specBox}>
                  <Text style={styles.specLabel}>MECHANICS</Text>
                  <Text style={styles.specVal}>{exercise.exerciseMechanics || 'Compound'}</Text>
                </View>
              </View>

              {/* Description */}
              {exercise.description ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>OVERVIEW</Text>
                  <Text style={styles.descriptionText}>{exercise.description}</Text>
                </View>
              ) : null}

              {/* Quick Coaching Highlight */}
              <View style={styles.highlightBox}>
                <Icon name="sparkles" size={16} color={themeColors.primary} />
                <Text style={styles.highlightText}>
                  Includes interactive phase breakdown, step-by-step coaching cues, and common mistakes in the full guide.
                </Text>
              </View>
            </ScrollView>

            {/* Actions Footer */}
            <View style={styles.footer}>
              {onToggleFavorite && (
                <TouchableOpacity
                  onPress={() => onToggleFavorite(exercise.id)}
                  style={[
                    styles.favAction,
                    exercise.isFavorite && styles.favActionActive,
                  ]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon
                    name="heart"
                    size={20}
                    color={exercise.isFavorite ? themeColors.danger : themeColors.textPrimary}
                  />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onOpenFullDetail(exercise);
                }}
                style={styles.fullGuideBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.fullGuideText}>Open Interactive Guide</Text>
                <Icon name="chevron-right" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    padding: spacing[4],
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  mediaWrap: {
    width: '100%',
    height: 190,
    backgroundColor: '#0C0E14',
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141822',
  },
  closeBtn: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadge: {
    position: 'absolute',
    bottom: spacing[3],
    left: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  videoText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  scrollBody: {
    padding: spacing[4],
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[2],
    flexWrap: 'wrap',
  },
  title: {
    ...typography.h3,
    fontSize: 20,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginBottom: spacing[3],
  },
  specsGrid: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  specBox: {
    flex: 1,
    backgroundColor: themeColors.surfaceElevated,
    padding: spacing[2],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  specLabel: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    color: themeColors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  specVal: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  section: {
    marginBottom: spacing[3],
  },
  sectionTitle: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  descriptionText: {
    ...typography.body,
    fontSize: 13,
    color: themeColors.textSecondary,
    lineHeight: 18,
  },
  highlightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.25)',
    padding: spacing[3],
    borderRadius: radius.md,
    marginBottom: spacing[2],
  },
  highlightText: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    backgroundColor: themeColors.cardBackground,
  },
  favAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: themeColors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  favActionActive: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderColor: 'rgba(255, 59, 48, 0.35)',
  },
  fullGuideBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: themeColors.primary,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
  },
  fullGuideText: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
