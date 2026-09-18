import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { themeColors, typography, radius, spacing } from '../../../theme';
import { Icon, Badge } from '../../../components/primitives';
import {
  MovementCoachPhase,
  TechniqueChecklistItem,
} from '../services/exerciseService';

interface PhasePracticeInteractiveCardProps {
  phase: MovementCoachPhase;
  phaseIndex: number;
  totalPhases: number;
  phaseChecklist: TechniqueChecklistItem[];
  checklistState: Record<string, boolean>;
  onToggleCheck: (key: string) => void;
  onRecordPractice: (reps: number, durationSeconds: number) => void;
  onCompletePhase: () => void;
  onPrevPhase?: (() => void) | null;
}

export const PhasePracticeInteractiveCard: React.FC<PhasePracticeInteractiveCardProps> = ({
  phase,
  phaseIndex,
  totalPhases,
  phaseChecklist,
  checklistState,
  onToggleCheck,
  onRecordPractice,
  onCompletePhase,
  onPrevPhase,
}) => {
  const [reps, setReps] = useState(5);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  // Reset timer when phase changes
  useEffect(() => {
    setIsTimerRunning(false);
    setSecondsElapsed(0);
  }, [phase.id]);

  const toggleTimer = () => {
    setIsTimerRunning((prev) => !prev);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setSecondsElapsed(0);
  };

  const handleFinishPhase = () => {
    onRecordPractice(reps, secondsElapsed);
    onCompletePhase();
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isLastPhase = phaseIndex === totalPhases - 1;

  return (
    <View style={styles.container}>
      {/* 1. Phase Header Bar */}
      <View style={styles.header}>
        <View style={styles.phaseIndicatorRow}>
          <Text style={styles.phaseStepText}>
            Phase {phaseIndex + 1} of {totalPhases}
          </Text>
          <View style={styles.badgesRow}>
            <Badge label={phase.phaseType} variant="primary" />
            {phase.bodyPosition && (
              <Badge label={phase.bodyPosition} variant="neutral" />
            )}
          </View>
        </View>
        <Text style={styles.phaseTitle}>
          {phase.title || `${phase.phaseName} Phase`}
        </Text>
        {phase.description && (
          <Text style={styles.phaseDesc}>{phase.description}</Text>
        )}
      </View>

      {/* 2. Coaching Cue Callout */}
      {phase.cueText && (
        <View style={styles.cueBanner}>
          <Icon name="sparkles" size={16} color={themeColors.primary} />
          <View style={styles.cueTextContainer}>
            <Text style={styles.cueLabel}>COACHING CUE</Text>
            <Text style={styles.cueText}>{phase.cueText}</Text>
          </View>
        </View>
      )}

      {/* 3. Technique Expectations for this phase */}
      {phase.expectations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Form Focus Points</Text>
          <View style={styles.expectationsList}>
            {phase.expectations.map((exp) => (
              <View key={exp.id} style={styles.expectationCard}>
                <View style={styles.expHeaderRow}>
                  <Text style={styles.expTitle}>{exp.title}</Text>
                  <View style={styles.regionTag}>
                    <Text style={styles.regionTagText}>{exp.bodyRegion}</Text>
                  </View>
                </View>
                <Text style={styles.expDesc}>{exp.description}</Text>
                {exp.expectedAlignment && (
                  <Text style={styles.expDetail}>
                    • Alignment: {exp.expectedAlignment}
                  </Text>
                )}
                {exp.expectedBreathing && (
                  <Text style={styles.expDetail}>
                    • Breathing: {exp.expectedBreathing}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 4. Common Mistakes to avoid */}
      {phase.mistakes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Watch Out For</Text>
          {phase.mistakes.map((m, idx) => (
            <View key={idx} style={styles.mistakeCard}>
              <View style={styles.mistakeTitleRow}>
                <Icon name="alert-circle" size={14} color={themeColors.danger} />
                <Text style={styles.mistakeTitle}>{m.mistake}</Text>
              </View>
              <View style={styles.correctionRow}>
                <Icon name="check-circle" size={12} color={themeColors.primary} />
                <Text style={styles.correctionText}>Fix: {m.correction}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 5. Interactive Rehearsal Tools */}
      <View style={styles.rehearsalBox}>
        <Text style={styles.rehearsalHeader}>Interactive Rehearsal</Text>
        <Text style={styles.rehearsalSub}>
          Perform practice repetitions focusing on the cue and posture checkpoints.
        </Text>

        <View style={styles.toolsRow}>
          {/* Rep Counter */}
          <View style={styles.toolCard}>
            <Text style={styles.toolLabel}>Reps Rehearsed</Text>
            <View style={styles.counterRow}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setReps((r) => Math.max(1, r - 1))}
              >
                <Text style={styles.counterBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.counterValue}>{reps}</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setReps((r) => r + 1)}
              >
                <Text style={styles.counterBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stopwatch Timer */}
          <View style={styles.toolCard}>
            <Text style={styles.toolLabel}>Rehearsal Time</Text>
            <Text style={styles.timerDisplay}>{formatTime(secondsElapsed)}</Text>
            <View style={styles.timerActionsRow}>
              <TouchableOpacity
                style={[
                  styles.timerBtn,
                  isTimerRunning ? styles.timerBtnStop : styles.timerBtnStart,
                ]}
                onPress={toggleTimer}
              >
                <Text style={styles.timerBtnText}>
                  {isTimerRunning ? 'Pause' : 'Start'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.timerBtnReset} onPress={resetTimer}>
                <Text style={styles.timerBtnResetText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Phase Checklist Items */}
        {phaseChecklist.length > 0 && (
          <View style={styles.phaseChecklistContainer}>
            <Text style={styles.phaseChecklistTitle}>Phase Checkpoints</Text>
            {phaseChecklist.map((c) => {
              const isChecked = Boolean(checklistState[c.id]);
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.checklistItem,
                    isChecked && styles.checklistItemChecked,
                  ]}
                  onPress={() => onToggleCheck(c.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.checkbox,
                      isChecked && styles.checkboxChecked,
                    ]}
                  >
                    {isChecked && <Icon name="check" size={14} color="#FFFFFF" />}
                  </View>
                  <View style={styles.checklistTextContainer}>
                    <Text
                      style={[
                        styles.checklistTitle,
                        isChecked && styles.checklistTitleChecked,
                      ]}
                    >
                      {c.title}
                    </Text>
                    {c.description && (
                      <Text style={styles.checklistDesc}>{c.description}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* 6. Navigation / Finish Buttons */}
      <View style={styles.navigationRow}>
        {onPrevPhase ? (
          <TouchableOpacity style={styles.prevButton} onPress={onPrevPhase}>
            <Icon name="chevron-left" size={18} color={themeColors.textSecondary} />
            <Text style={styles.prevButtonText}>Previous</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}

        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleFinishPhase}
          accessibilityRole="button"
          accessibilityLabel={isLastPhase ? 'Proceed to Self-Review' : 'Next Phase'}
        >
          <Text style={styles.nextButtonText}>
            {isLastPhase ? 'Proceed to Self-Review' : 'Next Phase'}
          </Text>
          <Icon name="chevron-right" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: spacing.md,
  },
  header: {
    gap: 4,
  },
  phaseIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phaseStepText: {
    ...typography.caption,
    fontWeight: '800',
    color: themeColors.primary,
    letterSpacing: 0.5,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  phaseTitle: {
    ...typography.title,
    fontWeight: '800',
    color: themeColors.textPrimary,
    marginTop: 2,
  },
  phaseDesc: {
    ...typography.caption,
    color: themeColors.textSecondary,
    lineHeight: 18,
  },
  cueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.3)',
  },
  cueTextContainer: {
    flex: 1,
    gap: 2,
  },
  cueLabel: {
    ...typography.caption,
    fontWeight: '800',
    color: themeColors.primary,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  cueText: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.subtitle,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  expectationsList: {
    gap: spacing.xs,
  },
  expectationCard: {
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: 4,
  },
  expHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  expTitle: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
    flex: 1,
  },
  regionTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  regionTagText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.textTertiary,
  },
  expDesc: {
    ...typography.caption,
    color: themeColors.textSecondary,
    lineHeight: 16,
  },
  expDetail: {
    ...typography.caption,
    color: themeColors.primary,
    fontSize: 11,
  },
  mistakeCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    gap: 4,
  },
  mistakeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mistakeTitle: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.danger,
    flex: 1,
  },
  correctionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  correctionText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    lineHeight: 16,
  },
  rehearsalBox: {
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: spacing.sm,
  },
  rehearsalHeader: {
    ...typography.subtitle,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  rehearsalSub: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  toolsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 4,
  },
  toolCard: {
    flex: 1,
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: 6,
  },
  toolLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  counterBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: themeColors.elevatedBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  counterBtnText: {
    color: themeColors.textPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
  counterValue: {
    ...typography.title,
    color: themeColors.primary,
    fontWeight: '800',
  },
  timerDisplay: {
    ...typography.title,
    color: themeColors.primary,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  timerActionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  timerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  timerBtnStart: {
    backgroundColor: themeColors.primary,
  },
  timerBtnStop: {
    backgroundColor: themeColors.danger,
  },
  timerBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  timerBtnReset: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: themeColors.elevatedBackground,
  },
  timerBtnResetText: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  phaseChecklistContainer: {
    marginTop: spacing.xs,
    gap: 6,
  },
  phaseChecklistTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  checklistItemChecked: {
    borderColor: 'rgba(14, 165, 233, 0.35)',
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: radius.xs,
    borderWidth: 1.5,
    borderColor: themeColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  checklistTextContainer: {
    flex: 1,
    gap: 2,
  },
  checklistTitle: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  checklistTitleChecked: {
    color: themeColors.textSecondary,
  },
  checklistDesc: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
  },
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  prevButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  prevButtonText: {
    ...typography.body,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: themeColors.primary,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  nextButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
