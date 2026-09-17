import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
};

export interface ExerciseMovementPlayerProps {
  phases: any[];
  instructionSteps?: any[];
  commonMistakes?: any[];
  activePhaseIndex?: number;
  onPhaseChange?: (index: number, phase: any) => void;
  onTogglePhaseLoop?: (isLooping: boolean) => void;
}

export const ExerciseMovementPlayer: React.FC<ExerciseMovementPlayerProps> = ({
  phases = [],
  instructionSteps = [],
  commonMistakes = [],
  activePhaseIndex: externalActiveIndex,
  onPhaseChange,
  onTogglePhaseLoop,
}) => {
  const [internalActiveIndex, setInternalActiveIndex] = useState(0);

  const activeIndex =
    externalActiveIndex !== undefined ? externalActiveIndex : internalActiveIndex;

  if (!phases || phases.length === 0) {
    return null;
  }

  const currentPhase = phases[activeIndex] || phases[0];
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === phases.length - 1;

  const selectPhase = (index: number) => {
    if (index >= 0 && index < phases.length) {
      setInternalActiveIndex(index);
      onPhaseChange?.(index, phases[index]);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      selectPhase(activeIndex - 1);
    }
  };

  const handleNext = () => {
    if (!isLast) {
      selectPhase(activeIndex + 1);
    } else {
      // Loop back to start
      selectPhase(0);
    }
  };

  // Filter linked steps for this phase
  const linkedSteps = instructionSteps.filter(
    (step) =>
      (step.phaseId && step.phaseId === currentPhase.id) ||
      (step.movementPhase &&
        step.movementPhase.toUpperCase() === currentPhase.phaseType?.toUpperCase())
  );

  // Filter linked common mistakes for this phase
  const linkedMistakes = commonMistakes.filter(
    (m) => m.phaseId && m.phaseId === currentPhase.id
  );

  const formatPhaseType = (type?: string) => {
    if (!type) return 'MOVEMENT PHASE';
    return type.replace(/_/g, ' ');
  };

  return (
    <Card style={styles.container}>
      {/* Header & Stepper */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.sectionOverline}>Interactive Movement Breakdown</Text>
          <Text style={styles.sectionHeading}>
            Phase {activeIndex + 1} of {phases.length}
          </Text>
        </View>
        <Badge
          label={formatPhaseType(currentPhase.phaseType || currentPhase.phaseName)}
          variant="primary"
        />
      </View>

      {/* Stepper Progress Bar */}
      <View style={styles.stepperContainer}>
        {phases.map((p, idx) => {
          const isActive = idx === activeIndex;
          const isPassed = idx < activeIndex;
          return (
            <TouchableOpacity
              key={p.id || `phase-step-${idx}`}
              style={[
                styles.stepSegment,
                isActive && styles.stepSegmentActive,
                isPassed && styles.stepSegmentPassed,
              ]}
              onPress={() => selectPhase(idx)}
              accessibilityLabel={`Select phase ${idx + 1}: ${p.title || p.phaseName}`}
            >
              <Text
                style={[
                  styles.stepSegmentText,
                  isActive && styles.stepSegmentTextActive,
                ]}
              >
                {idx + 1}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Active Phase Card Body */}
      <View style={styles.phaseBody}>
        {/* Title & Description */}
        <Text style={styles.phaseTitle}>
          {currentPhase.title || currentPhase.phaseName || `Phase ${activeIndex + 1}`}
        </Text>
        {currentPhase.description ? (
          <Text style={styles.phaseDescription}>{currentPhase.description}</Text>
        ) : null}

        {/* Visual Cue Banner */}
        {currentPhase.cueText ? (
          <View style={styles.cueBanner}>
            <View style={styles.cueIconWrapper}>
              <Icon name="sparkles" size={16} color={themeColors.accent} />
            </View>
            <View style={styles.cueTextWrapper}>
              <Text style={styles.cueLabel}>VISUAL CUE</Text>
              <Text style={styles.cueText}>{currentPhase.cueText}</Text>
            </View>
          </View>
        ) : null}

        {/* Dynamic Attributes: Breathing & Tempo Chips */}
        <View style={styles.chipsRow}>
          {currentPhase.breathingPattern ? (
            <View style={styles.attributeChip}>
              <Icon name="activity" size={14} color={themeColors.primary} />
              <Text style={styles.attributeChipText} numberOfLines={1}>
                {currentPhase.breathingPattern.replace(/_/g, ' ')}
              </Text>
            </View>
          ) : null}

          {currentPhase.tempoSeconds ? (
            <View style={styles.attributeChip}>
              <Icon name="timer" size={14} color={themeColors.secondary} />
              <Text style={styles.attributeChipText}>
                {currentPhase.tempoSeconds}s Tempo
              </Text>
            </View>
          ) : null}

          {currentPhase.rangeOfMotionType ? (
            <View style={styles.attributeChip}>
              <Icon name="award" size={14} color={themeColors.accent} />
              <Text style={styles.attributeChipText}>
                ROM: {currentPhase.rangeOfMotionType.replace(/_/g, ' ')}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Joint Alignments / Key Checkpoints */}
        {Array.isArray(currentPhase.keyCheckpoints) &&
          currentPhase.keyCheckpoints.length > 0 && (
            <View style={styles.checkpointsContainer}>
              <Text style={styles.checkpointsHeading}>KEY CHECKPOINTS</Text>
              {currentPhase.keyCheckpoints.map((cp: string, cIdx: number) => (
                <View key={cIdx} style={styles.checkpointItem}>
                  <Icon name="check-circle" size={14} color={themeColors.primary} />
                  <Text style={styles.checkpointText}>{cp}</Text>
                </View>
              ))}
            </View>
          )}

        {/* Linked Steps within this Phase */}
        {linkedSteps.length > 0 && (
          <View style={styles.linkedStepsContainer}>
            <Text style={styles.checkpointsHeading}>SUB-STEPS IN THIS PHASE</Text>
            {linkedSteps.map((step, sIdx) => (
              <View key={step.id || sIdx} style={styles.linkedStepRow}>
                <View style={styles.stepNumBadge}>
                  <Text style={styles.stepNumBadgeText}>{step.stepNumber || sIdx + 1}</Text>
                </View>
                <View style={styles.linkedStepTextWrapper}>
                  <Text style={styles.linkedStepTitle}>{step.title}</Text>
                  {step.description ? (
                    <Text style={styles.linkedStepDesc}>{step.description}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Linked Mistakes for this Phase */}
        {linkedMistakes.length > 0 && (
          <View style={styles.mistakesCallout}>
            <View style={styles.mistakesHeader}>
              <Icon name="alert-circle" size={16} color={themeColors.danger} />
              <Text style={styles.mistakesTitle}>Watch Out In This Phase</Text>
            </View>
            {linkedMistakes.map((m, mIdx) => (
              <View key={m.id || mIdx} style={styles.mistakeItem}>
                <Text style={styles.mistakeText}>• {m.mistake}</Text>
                {m.correction ? (
                  <Text style={styles.mistakeCorrection}>Fix: {m.correction}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Navigation Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.navBtn, isFirst && styles.navBtnDisabled]}
          onPress={handlePrev}
          disabled={isFirst}
          accessibilityLabel="Previous phase"
        >
          <Icon
            name="chevron-left"
            size={18}
            color={isFirst ? themeColors.textMuted : themeColors.textPrimary}
          />
          <Text
            style={[styles.navBtnText, isFirst && styles.navBtnTextDisabled]}
          >
            Prev Phase
          </Text>
        </TouchableOpacity>

        {/* Restart / Loop indicator */}
        <TouchableOpacity
          style={styles.centerLoopBtn}
          onPress={() => onTogglePhaseLoop?.(true)}
          accessibilityLabel="Loop active phase video"
        >
          <Icon name="refresh" size={16} color={themeColors.primary} />
          <Text style={styles.centerLoopText}>Phase Loop</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navBtnPrimary}
          onPress={handleNext}
          accessibilityLabel={isLast ? 'Restart phases' : 'Next phase'}
        >
          <Text style={styles.navBtnPrimaryText}>
            {isLast ? 'Restart' : 'Next Phase'}
          </Text>
          <Icon
            name={isLast ? 'refresh' : 'chevron-right'}
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
    marginHorizontal: sp.md,
    marginBottom: sp.md,
    padding: sp.md,
    backgroundColor: themeColors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp.md,
  },
  sectionOverline: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeading: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
    fontSize: 15,
  },
  stepperContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: sp.md,
  },
  stepSegment: {
    flex: 1,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: themeColors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  stepSegmentActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  stepSegmentPassed: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  stepSegmentText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: themeColors.textMuted,
  },
  stepSegmentTextActive: {
    color: '#FFFFFF',
  },
  phaseBody: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: radius.md,
    padding: sp.md,
    marginBottom: sp.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  phaseTitle: {
    ...typography.h3,
    fontSize: 18,
    color: themeColors.textPrimary,
    marginBottom: 6,
  },
  phaseDescription: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 19,
    color: themeColors.textSecondary,
    marginBottom: sp.md,
  },
  cueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: sp.sm,
    marginBottom: sp.md,
  },
  cueIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cueTextWrapper: {
    flex: 1,
  },
  cueLabel: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '800',
    color: themeColors.accent,
    letterSpacing: 0.5,
  },
  cueText: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: sp.md,
  },
  attributeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: themeColors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  attributeChipText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: themeColors.textSecondary,
  },
  checkpointsContainer: {
    marginTop: sp.xs,
    marginBottom: sp.md,
    paddingTop: sp.sm,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  checkpointsHeading: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  checkpointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  checkpointText: {
    ...typography.body,
    fontSize: 12,
    color: themeColors.textSecondary,
    flex: 1,
  },
  linkedStepsContainer: {
    marginTop: sp.xs,
    marginBottom: sp.md,
    paddingTop: sp.sm,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  linkedStepRow: {
    flexDirection: 'row',
    gap: sp.sm,
    marginBottom: 8,
  },
  stepNumBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumBadgeText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: themeColors.primary,
  },
  linkedStepTextWrapper: {
    flex: 1,
  },
  linkedStepTitle: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  linkedStepDesc: {
    ...typography.caption,
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  mistakesCallout: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: sp.sm,
  },
  mistakesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  mistakesTitle: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: themeColors.danger,
    textTransform: 'uppercase',
  },
  mistakeItem: {
    marginTop: 2,
  },
  mistakeText: {
    ...typography.body,
    fontSize: 12,
    color: themeColors.textPrimary,
  },
  mistakeCorrection: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textMuted,
    marginLeft: 10,
    marginTop: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: sp.sm,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: themeColors.surfaceElevated,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  navBtnDisabled: {
    opacity: 0.5,
  },
  navBtnText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  navBtnTextDisabled: {
    color: themeColors.textMuted,
  },
  centerLoopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  centerLoopText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: themeColors.primary,
  },
  navBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: themeColors.primary,
  },
  navBtnPrimaryText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
