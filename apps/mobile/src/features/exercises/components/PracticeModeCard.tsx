import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { TechniqueChecklistCard } from './TechniqueChecklistCard';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
};

export interface PracticeModeCardProps {
  exerciseName: string;
  checklist: string[];
  initialChecklistState?: Record<string, boolean>;
  isPracticeCompleted?: boolean;
  onFinishPractice: (checklistState: Record<string, boolean>) => void;
}

export const PracticeModeCard: React.FC<PracticeModeCardProps> = ({
  exerciseName,
  checklist = [],
  initialChecklistState = {},
  isPracticeCompleted = false,
  onFinishPractice,
}) => {
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>(
    initialChecklistState,
  );
  const [isDone, setIsDone] = useState(isPracticeCompleted);

  const handleToggle = (item: string, isChecked: boolean) => {
    setCheckedState((prev) => ({ ...prev, [item]: isChecked }));
  };

  const handleFinish = () => {
    setIsDone(true);
    onFinishPractice(checkedState);
  };

  return (
    <Card style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Icon name="activity" size={20} color={themeColors.accent} />
          <Text style={styles.title}>Practice Mode: {exerciseName}</Text>
        </View>
        <Badge
          label={isDone ? 'PRACTICE COMPLETED' : 'SELF-CHECK MODE'}
          variant={isDone ? 'success' : 'accent'}
        />
      </View>

      {/* Guidance Banner */}
      <View style={styles.guidanceBox}>
        <Text style={styles.guidanceTitle}>Practice Protocol</Text>
        <Text style={styles.guidanceStep}>1. Assume the starting stance and set neutral spine.</Text>
        <Text style={styles.guidanceStep}>2. Perform 3-5 unweighted or light rehearsal reps.</Text>
        <Text style={styles.guidanceStep}>3. Check off each technique item as you execute.</Text>
        <Text style={styles.guidanceStep}>4. Verify controlled tempo and breathing cadence.</Text>
      </View>

      {/* Embedded Checklist */}
      <TechniqueChecklistCard
        checklist={checklist}
        checkedState={checkedState}
        onToggleItem={handleToggle}
        title="Physical Self-Checklist"
        subtitle="Confirm you can reproduce these points during practice:"
      />

      {/* Disclaimer */}
      <View style={styles.disclaimerRow}>
        <Icon name="shield" size={14} color={themeColors.textSecondary} />
        <Text style={styles.disclaimerText}>
          Educational self-check simulation. This exercise does not use camera sensors or claim automated clinical verification.
        </Text>
      </View>

      {/* Finish Practice Button */}
      <TouchableOpacity
        style={[styles.finishBtn, isDone && styles.finishBtnDone]}
        onPress={handleFinish}
        activeOpacity={0.8}
      >
        <Icon
          name={isDone ? 'check-circle' : 'trophy'}
          size={18}
          color="#000000"
        />
        <Text style={styles.finishBtnText}>
          {isDone ? 'Practice Recorded (Tap to Update)' : 'Finish Practice & Continue'}
        </Text>
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: sp.md,
    marginBottom: sp.md,
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: themeColors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  guidanceBox: {
    backgroundColor: '#0F141F',
    borderRadius: radius.md,
    padding: sp.sm,
    marginBottom: sp.md,
    borderLeftWidth: 3,
    borderLeftColor: themeColors.accent,
  },
  guidanceTitle: {
    ...typography.caption,
    color: themeColors.accent,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  guidanceStep: {
    ...typography.bodySm,
    color: themeColors.textPrimary,
    lineHeight: 18,
    marginBottom: 2,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: sp.md,
    paddingHorizontal: 4,
  },
  disclaimerText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 10,
    flex: 1,
    lineHeight: 14,
  },
  finishBtn: {
    backgroundColor: themeColors.accent,
    borderRadius: radius.md,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  finishBtnDone: {
    backgroundColor: '#10B981',
  },
  finishBtnText: {
    ...typography.button,
    color: '#000000',
    fontWeight: '800',
  },
});
