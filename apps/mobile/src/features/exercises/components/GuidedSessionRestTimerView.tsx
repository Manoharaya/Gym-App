import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Icon, Button, Badge } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
};

interface GuidedSessionRestTimerViewProps {
  durationSeconds?: number | null;
  itemTitle?: string;
  itemDescription?: string | null;
  onCompleteRest: (restSkipped: boolean, timeSpentSeconds: number) => void;
}

export const GuidedSessionRestTimerView: React.FC<GuidedSessionRestTimerViewProps> = ({
  durationSeconds = 45,
  itemTitle = 'Rest Interval',
  itemDescription,
  onCompleteRest,
}) => {
  const initialDuration = Math.max(5, durationSeconds || 45);
  const [timeLeft, setTimeLeft] = useState<number>(initialDuration);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    let interval: any = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsRunning(false);
            onCompleteRest(false, elapsed + 1);
            return 0;
          }
          return prev - 1;
        });
        setElapsed((e) => e + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, elapsed, onCompleteRest]);

  const toggleTimer = () => {
    setIsRunning((prev) => !prev);
  };

  const addTime = (seconds: number) => {
    setTimeLeft((prev) => prev + seconds);
  };

  const handleSkip = () => {
    setIsRunning(false);
    onCompleteRest(true, elapsed);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Badge label="REST & RECOVERY" variant="warning" />

        <Text style={styles.title}>{itemTitle}</Text>

        {itemDescription ? (
          <Text style={styles.description}>{itemDescription}</Text>
        ) : (
          <Text style={styles.description}>
            Use this time to reset your posture and breathe deeply.
          </Text>
        )}

        {/* Circular Countdown Surface */}
        <View style={styles.timerCircle}>
          <Text style={styles.timerDigits}>{formatTime(timeLeft)}</Text>
          <Text style={styles.timerSub}>
            {timeLeft === 0 ? 'Rest Complete!' : `${timeLeft}s remaining`}
          </Text>
        </View>

        {/* Quick Add Buttons */}
        <View style={styles.adjustRow}>
          <TouchableOpacity
            style={styles.adjustBtn}
            onPress={() => addTime(15)}
            activeOpacity={0.8}
          >
            <Text style={styles.adjustBtnText}>+15s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.adjustBtn}
            onPress={() => addTime(30)}
            activeOpacity={0.8}
          >
            <Text style={styles.adjustBtnText}>+30s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.adjustBtn, styles.pauseBtn]}
            onPress={toggleTimer}
            activeOpacity={0.8}
          >
            <Icon
              name="timer"
              size={14}
              color={themeColors.textPrimary}
            />
            <Text style={styles.adjustBtnText}>
              {isRunning ? 'Pause' : 'Resume'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <Button
            title={timeLeft === 0 ? 'Continue' : 'Skip Rest'}
            variant={timeLeft === 0 ? 'primary' : 'outline'}
            onPress={handleSkip}
            leftIcon={
              <Icon
                name={timeLeft === 0 ? 'check' : 'chevron-right'}
                size={16}
                color={timeLeft === 0 ? '#FFFFFF' : themeColors.textPrimary}
              />
            }
            style={styles.ctaButton}
          />
        </View>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: sp.md,
    justifyContent: 'center',
    backgroundColor: themeColors.background,
  },
  card: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.lg,
    padding: sp.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  title: {
    ...typography.h2,
    color: themeColors.textPrimary,
    marginTop: sp.sm,
    marginBottom: 4,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginBottom: sp.lg,
    lineHeight: 20,
  },
  timerCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#161C28',
    borderWidth: 4,
    borderColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: sp.lg,
  },
  timerDigits: {
    fontSize: 38,
    fontWeight: '800',
    color: themeColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  timerSub: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginTop: 4,
  },
  adjustRow: {
    flexDirection: 'row',
    gap: sp.sm,
    marginBottom: sp.lg,
  },
  adjustBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E2638',
    paddingVertical: 8,
    paddingHorizontal: sp.md,
    borderRadius: radius.full,
  },
  pauseBtn: {
    backgroundColor: '#27334D',
  },
  adjustBtnText: {
    ...typography.caption,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  actionRow: {
    width: '100%',
  },
  ctaButton: {
    width: '100%',
    paddingVertical: 14,
  },
});
