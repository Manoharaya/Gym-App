import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Card, Badge, Icon, Button } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import type { GuidedSessionItem } from '../services/exerciseService';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
};

interface GuidedSessionPracticeViewProps {
  item: GuidedSessionItem;
  onCompletePractice: (payload: {
    completedReps?: number;
    checklistState?: Record<string, boolean>;
    timeSpentSeconds?: number;
  }) => void;
}

export const GuidedSessionPracticeView: React.FC<GuidedSessionPracticeViewProps> = ({
  item,
  onCompletePractice,
}) => {
  const targetReps = item.repetitionCount || null;
  const configuredDuration = item.durationSeconds || null;

  // Rep progression state (manual self-reporting)
  const [currentReps, setCurrentReps] = useState<number>(0);

  // Timer state (if timed)
  const [timeLeft, setTimeLeft] = useState<number>(configuredDuration || 0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [elapsed, setElapsed] = useState<number>(0);

  // Self-reflection checklist state
  const defaultChecklist = [
    'Starting position & joint alignment confirmed',
    'Core engaged and spinal neutrality maintained',
    'Controlled tempo throughout the range of motion',
    'Breathing coordinated (exhale on exertion)',
    'Stable return and deliberate finish',
  ];

  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let timer: any = null;
    if (isTimerRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
        setElapsed((e) => e + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isTimerRunning, timeLeft]);

  const toggleCheck = (key: string) => {
    setChecklistState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleIncrementRep = () => {
    if (targetReps && currentReps < targetReps) {
      setCurrentReps((r) => r + 1);
    } else if (!targetReps) {
      setCurrentReps((r) => r + 1);
    }
  };

  const handleDecrementRep = () => {
    if (currentReps > 0) {
      setCurrentReps((r) => r - 1);
    }
  };

  const handleFinish = () => {
    onCompletePractice({
      completedReps: targetReps ? currentReps : undefined,
      checklistState,
      timeSpentSeconds: elapsed > 0 ? elapsed : 60,
    });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.heroCard}>
        <View style={styles.badgeRow}>
          <Badge label="PRACTICE REHEARSAL" variant="success" />
          {targetReps && (
            <Badge label={`${targetReps} Repetitions`} variant="primary" />
          )}
          {configuredDuration && (
            <Badge label={`${configuredDuration}s Timed`} variant="warning" />
          )}
        </View>

        <Text style={styles.title}>{item.title}</Text>

        {item.description ? (
          <Text style={styles.description}>{item.description}</Text>
        ) : null}

        {/* Timed Practice Controls (if duration configured) */}
        {configuredDuration ? (
          <View style={styles.timerBox}>
            <Text style={styles.timerDisplay}>{formatTime(timeLeft)}</Text>
            <View style={styles.timerControlsRow}>
              <TouchableOpacity
                style={styles.timerBtn}
                onPress={() => setIsTimerRunning((r) => !r)}
                activeOpacity={0.8}
              >
                <Icon
                  name="timer"
                  size={16}
                  color="#FFFFFF"
                />
                <Text style={styles.timerBtnText}>
                  {isTimerRunning ? 'Pause' : 'Start Timer'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.timerBtn, styles.resetBtn]}
                onPress={() => {
                  setIsTimerRunning(false);
                  setTimeLeft(configuredDuration);
                }}
                activeOpacity={0.8}
              >
                <Icon name="refresh" size={16} color={themeColors.textSecondary} />
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Manual Rep Counter (if target repetitions specified) */}
        {targetReps ? (
          <View style={styles.repCounterCard}>
            <Text style={styles.repCounterLabel}>REPETITIONS REHEARSED</Text>
            <View style={styles.counterRow}>
              <TouchableOpacity
                style={[
                  styles.counterBtn,
                  currentReps === 0 && styles.counterBtnDisabled,
                ]}
                onPress={handleDecrementRep}
                disabled={currentReps === 0}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700' }}>−</Text>
              </TouchableOpacity>

              <View style={styles.repValueBox}>
                <Text style={styles.repCurrent}>{currentReps}</Text>
                <Text style={styles.repTarget}>/ {targetReps}</Text>
              </View>

              <TouchableOpacity
                style={styles.counterBtn}
                onPress={handleIncrementRep}
                activeOpacity={0.7}
              >
                <Icon name="plus" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </Card>

      {/* Technique Checklist */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="check-circle" size={20} color={themeColors.accent} />
          <Text style={styles.sectionTitle}>Technique Self-Check</Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.checklistInstruction}>
            Verify your alignment and feel before completing practice:
          </Text>

          {defaultChecklist.map((cue, idx) => {
            const isChecked = !!checklistState[cue];
            return (
              <TouchableOpacity
                key={idx}
                style={styles.checkRow}
                onPress={() => toggleCheck(cue)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkbox,
                    isChecked && styles.checkboxChecked,
                  ]}
                >
                  {isChecked && (
                    <Icon name="check" size={14} color="#FFFFFF" />
                  )}
                </View>
                <Text
                  style={[
                    styles.checkText,
                    isChecked && styles.checkTextDone,
                  ]}
                >
                  {cue}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Card>
      </View>

      {/* Non-Diagnostic Disclaimer */}
      <View style={styles.disclaimerBox}>
        <Icon name="alert-circle" size={16} color={themeColors.textMuted} />
        <Text style={styles.disclaimerText}>
          Completing practice indicates educational self-rehearsal. FitBeat does not verify physical technique via camera sensors.
        </Text>
      </View>

      {/* Complete Button */}
      <View style={styles.ctaContainer}>
        <Button
          title="Complete Practice Rehearsal"
          variant="primary"
          onPress={handleFinish}
          leftIcon={<Icon name="check-circle" size={18} color="#FFFFFF" />}
          style={styles.ctaButton}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  content: {
    padding: sp.md,
    paddingBottom: sp.lg * 2,
  },
  heroCard: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.lg,
    padding: sp.lg,
    marginBottom: sp.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.xs,
    marginBottom: sp.sm,
  },
  title: {
    ...typography.h2,
    color: themeColors.textPrimary,
    marginBottom: sp.xs,
  },
  description: {
    ...typography.body,
    color: themeColors.textSecondary,
    marginBottom: sp.md,
    lineHeight: 20,
  },
  timerBox: {
    backgroundColor: '#161C28',
    borderRadius: radius.md,
    padding: sp.md,
    alignItems: 'center',
    marginVertical: sp.sm,
    borderWidth: 1,
    borderColor: '#242D40',
  },
  timerDisplay: {
    fontSize: 40,
    fontWeight: '800',
    color: themeColors.textPrimary,
    fontVariant: ['tabular-nums'],
    marginBottom: sp.sm,
  },
  timerControlsRow: {
    flexDirection: 'row',
    gap: sp.sm,
  },
  timerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: themeColors.accent,
    paddingVertical: 8,
    paddingHorizontal: sp.md,
    borderRadius: radius.md,
  },
  timerBtnText: {
    ...typography.button,
    color: '#FFFFFF',
  },
  resetBtn: {
    backgroundColor: '#1E2638',
  },
  resetBtnText: {
    ...typography.button,
    color: themeColors.textSecondary,
  },
  repCounterCard: {
    backgroundColor: '#161C28',
    borderRadius: radius.md,
    padding: sp.md,
    alignItems: 'center',
    marginVertical: sp.sm,
    borderWidth: 1,
    borderColor: '#242D40',
  },
  repCounterLabel: {
    ...typography.caption,
    color: themeColors.textMuted,
    letterSpacing: 1,
    marginBottom: sp.sm,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.lg,
  },
  counterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: themeColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnDisabled: {
    backgroundColor: '#27334D',
    opacity: 0.5,
  },
  repValueBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  repCurrent: {
    fontSize: 36,
    fontWeight: '800',
    color: themeColors.textPrimary,
  },
  repTarget: {
    fontSize: 18,
    color: themeColors.textMuted,
    fontWeight: '600',
  },
  section: {
    marginBottom: sp.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
    marginBottom: sp.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  card: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
    padding: sp.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  checklistInstruction: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginBottom: sp.sm,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: sp.sm,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2638',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: themeColors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkText: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  checkTextDone: {
    color: themeColors.textPrimary,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
    padding: sp.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: radius.sm,
    marginBottom: sp.md,
  },
  disclaimerText: {
    ...typography.caption,
    color: themeColors.textMuted,
    flex: 1,
    lineHeight: 16,
  },
  ctaContainer: {
    marginTop: sp.xs,
  },
  ctaButton: {
    width: '100%',
    paddingVertical: 14,
  },
});
