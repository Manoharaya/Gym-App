import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import type { ExerciseInstructionStep } from '@fitcore/types';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
  xl: spacing[8],
};

export interface ExerciseStepPlayerProps {
  steps: ExerciseInstructionStep[];
  exerciseName?: string;
  onComplete?: () => void;
}

export const ExerciseStepPlayer: React.FC<ExerciseStepPlayerProps> = ({
  steps = [],
  exerciseName = 'Exercise',
  onComplete,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showDetailed, setShowDetailed] = useState(false);

  if (!steps || steps.length === 0) {
    return (
      <Card style={styles.emptyCard}>
        <Icon name="activity" size={32} color={themeColors.textMuted} />
        <Text style={styles.emptyTitle}>No Step Instructions Available</Text>
        <Text style={styles.emptySubtitle}>
          Visual step-by-step instructions have not been authored for {exerciseName} yet.
        </Text>
      </Card>
    );
  }

  const currentStep = (steps[currentStepIndex] || steps[0])!;
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === steps.length - 1;

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
      setShowDetailed(false);
    }
  };

  const handleNext = () => {
    if (!isLast) {
      setCurrentStepIndex((prev) => prev + 1);
      setShowDetailed(false);
    } else if (onComplete) {
      onComplete();
    }
  };

  const mediaSourceUrl =
    currentStep.media?.signedUrl ||
    currentStep.media?.url ||
    currentStep.mediaUrl ||
    null;

  const formatSeconds = (sec?: number | null) => {
    if (sec == null) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <Card style={styles.container}>
      {/* Progress & Header */}
      <View style={styles.progressHeader}>
        <View style={styles.stepCounterRow}>
          <Badge
            label={`Step ${currentStepIndex + 1} of ${steps.length}`}
            variant="primary"
          />
          {currentStep.stepType ? (
            <Badge
              label={currentStep.stepType.replace('_', ' ')}
              variant="neutral"
            />
          ) : null}
          {currentStep.movementPhase ? (
            <Badge
              label={currentStep.movementPhase}
              variant="accent"
            />
          ) : null}
        </View>

        {/* Segmented step bar */}
        <View style={styles.progressBarRow}>
          {steps.map((_, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.7}
              onPress={() => {
                setCurrentStepIndex(idx);
                setShowDetailed(false);
              }}
              style={[
                styles.progressSegment,
                idx === currentStepIndex
                  ? styles.progressSegmentActive
                  : idx < currentStepIndex
                  ? styles.progressSegmentCompleted
                  : styles.progressSegmentInactive,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Visual Media Section */}
      <View style={styles.mediaContainer}>
        {mediaSourceUrl ? (
          <Image
            source={{ uri: mediaSourceUrl }}
            style={styles.stepImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.mediaPlaceholder}>
            <Icon name="dumbbell" size={44} color={themeColors.accent} />
            <Text style={styles.placeholderLabel}>
              {currentStep.movementPhase || currentStep.stepType || 'Step Movement'}
            </Text>
          </View>
        )}

        {/* Video Offset Timestamp Pill */}
        {(currentStep.videoStartTimeSeconds != null || currentStep.videoEndTimeSeconds != null) && (
          <View style={styles.clipPill}>
            <Icon name="timer" size={12} color="#FFFFFF" />
            <Text style={styles.clipPillText}>
              Clip: {formatSeconds(currentStep.videoStartTimeSeconds)} - {formatSeconds(currentStep.videoEndTimeSeconds)}
            </Text>
          </View>
        )}
      </View>

      {/* Step Content */}
      <View style={styles.contentSection}>
        <Text style={styles.stepTitle}>{currentStep.title}</Text>
        <Text style={styles.stepDescription}>{currentStep.description}</Text>

        {/* Detailed Instruction Dropdown */}
        {currentStep.detailedInstruction && (
          <TouchableOpacity
            style={styles.detailedToggle}
            activeOpacity={0.8}
            onPress={() => setShowDetailed((prev) => !prev)}
          >
            <Text style={styles.detailedToggleText}>
              {showDetailed ? 'Hide Biomechanics & Deep Dive' : 'View Biomechanics & Deep Dive'}
            </Text>
            <Icon
              name={showDetailed ? 'chevron-down' : 'chevron-right'}
              size={14}
              color={themeColors.primary}
            />
          </TouchableOpacity>
        )}

        {showDetailed && currentStep.detailedInstruction && (
          <View style={styles.detailedBox}>
            <Text style={styles.detailedText}>{currentStep.detailedInstruction}</Text>
          </View>
        )}

        {/* Visual Cue Card */}
        {currentStep.visualCue && (
          <View style={styles.visualCueCard}>
            <View style={styles.visualCueHeader}>
              <Icon name="sparkles" size={16} color={themeColors.accent} />
              <Text style={styles.visualCueHeaderTitle}>VISUAL FOCUS CUE</Text>
              {currentStep.visualCueCategory ? (
                <Badge
                  label={currentStep.visualCueCategory}
                  variant="accent"
                />
              ) : null}
            </View>
            <Text style={styles.visualCueBody}>"{currentStep.visualCue}"</Text>
          </View>
        )}

        {/* Rhythm & Cadence Metrics */}
        <View style={styles.metricsGrid}>
          {currentStep.breathing && (
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>BREATHING</Text>
              <Text style={styles.metricValue}>{currentStep.breathing}</Text>
            </View>
          )}

          {currentStep.tempo && (
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>TEMPO / CADENCE</Text>
              <Text style={styles.metricValue}>{currentStep.tempo}</Text>
            </View>
          )}

          {currentStep.bodyPosition && (
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>POSITION</Text>
              <Text style={styles.metricValue}>{currentStep.bodyPosition}</Text>
            </View>
          )}

          {currentStep.holdDurationSeconds ? (
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>HOLD DURATION</Text>
              <Text style={styles.metricValue}>{currentStep.holdDurationSeconds}s</Text>
            </View>
          ) : currentStep.durationSeconds ? (
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>DURATION</Text>
              <Text style={styles.metricValue}>{currentStep.durationSeconds}s</Text>
            </View>
          ) : null}
        </View>

        {/* Trainer Tip / Coaching Cue */}
        {(currentStep.trainerTip || currentStep.coachingCue) && (
          <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <Icon name="bolt" size={14} color="#3B82F6" />
              <Text style={styles.tipHeaderLabel}>COACH'S TIP</Text>
            </View>
            <Text style={styles.tipText}>
              {currentStep.trainerTip || currentStep.coachingCue}
            </Text>
          </View>
        )}

        {/* Safety Note */}
        {currentStep.safetyNote && (
          <View style={styles.safetyCard}>
            <View style={styles.safetyHeader}>
              <Icon name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.safetyHeaderLabel}>SAFETY CONSIDERATION</Text>
            </View>
            <Text style={styles.safetyText}>{currentStep.safetyNote}</Text>
          </View>
        )}
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.navBtn, styles.prevBtn, isFirst && styles.navBtnDisabled]}
          onPress={handlePrev}
          disabled={isFirst}
          activeOpacity={0.7}
        >
          <Icon
            name="chevron-left"
            size={18}
            color={isFirst ? themeColors.textMuted : themeColors.textPrimary}
          />
          <Text style={[styles.navBtnText, isFirst && styles.navBtnTextDisabled]}>
            Previous
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navBtn, styles.nextBtn]}
          onPress={handleNext}
          activeOpacity={0.7}
        >
          <Text style={styles.nextBtnText}>
            {isLast ? 'Finish Guide' : 'Next Step'}
          </Text>
          <Icon
            name={isLast ? 'check-circle' : 'chevron-right'}
            size={18}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: themeColors.surface,
    borderRadius: radius.lg,
    padding: sp.md,
    marginBottom: sp.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  emptyCard: {
    padding: sp.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.surface,
    borderColor: themeColors.border,
  },
  emptyTitle: {
    ...typography.titleMedium,
    color: themeColors.textPrimary,
    marginTop: sp.md,
    marginBottom: sp.xs,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    color: themeColors.textMuted,
    textAlign: 'center',
  },
  progressHeader: {
    marginBottom: sp.md,
  },
  stepCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
    marginBottom: sp.sm,
    flexWrap: 'wrap',
  },
  progressBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  progressSegmentActive: {
    backgroundColor: themeColors.primary,
    height: 6,
  },
  progressSegmentCompleted: {
    backgroundColor: themeColors.accent,
  },
  progressSegmentInactive: {
    backgroundColor: themeColors.border,
  },
  mediaContainer: {
    height: 190,
    backgroundColor: themeColors.surfaceElevated,
    borderRadius: radius.md,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: sp.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  stepImage: {
    width: '100%',
    height: '100%',
  },
  mediaPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderLabel: {
    ...typography.labelSmall,
    color: themeColors.textSecondary,
    marginTop: sp.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  clipPill: {
    position: 'absolute',
    bottom: sp.xs,
    right: sp.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    gap: 4,
  },
  clipPillText: {
    ...typography.labelSmall,
    color: '#FFFFFF',
    fontSize: 10,
  },
  contentSection: {
    marginBottom: sp.md,
  },
  stepTitle: {
    ...typography.titleMedium,
    color: themeColors.textPrimary,
    fontWeight: '700',
    marginBottom: sp.xs,
  },
  stepDescription: {
    ...typography.bodyMedium,
    color: themeColors.textSecondary,
    lineHeight: 22,
    marginBottom: sp.sm,
  },
  detailedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: sp.xs,
    marginBottom: sp.sm,
  },
  detailedToggleText: {
    ...typography.labelMedium,
    color: themeColors.primary,
    fontWeight: '600',
  },
  detailedBox: {
    backgroundColor: themeColors.surfaceElevated,
    padding: sp.md,
    borderRadius: radius.sm,
    marginBottom: sp.md,
    borderLeftWidth: 3,
    borderLeftColor: themeColors.primary,
  },
  detailedText: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    lineHeight: 20,
  },
  visualCueCard: {
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    borderRadius: radius.md,
    padding: sp.md,
    marginBottom: sp.md,
  },
  visualCueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
    marginBottom: sp.xs,
  },
  visualCueHeaderTitle: {
    ...typography.labelSmall,
    color: themeColors.accent,
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.8,
  },
  visualCueBody: {
    ...typography.bodyMedium,
    color: themeColors.textPrimary,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.sm,
    marginBottom: sp.md,
  },
  metricItem: {
    flexGrow: 1,
    minWidth: '45%',
    backgroundColor: themeColors.surfaceElevated,
    borderRadius: radius.sm,
    padding: sp.sm,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  metricLabel: {
    ...typography.labelSmall,
    color: themeColors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  metricValue: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  tipCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: radius.md,
    padding: sp.md,
    marginBottom: sp.sm,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
    marginBottom: 4,
  },
  tipHeaderLabel: {
    ...typography.labelSmall,
    color: '#3B82F6',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  tipText: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    lineHeight: 19,
  },
  safetyCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: radius.md,
    padding: sp.md,
    marginBottom: sp.sm,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
    marginBottom: 4,
  },
  safetyHeaderLabel: {
    ...typography.labelSmall,
    color: '#EF4444',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  safetyText: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    lineHeight: 19,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: sp.md,
    marginTop: sp.xs,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: sp.sm + 2,
    borderRadius: radius.md,
    gap: sp.xs,
  },
  prevBtn: {
    backgroundColor: themeColors.surfaceElevated,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  nextBtn: {
    backgroundColor: themeColors.primary,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    ...typography.labelMedium,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  navBtnTextDisabled: {
    color: themeColors.textMuted,
  },
  nextBtnText: {
    ...typography.labelMedium,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
