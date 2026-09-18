import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Badge, Icon, Button } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import type { GuidedSessionItem } from '../services/exerciseService';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
};

interface GuidedSessionTransitionViewProps {
  item: GuidedSessionItem;
  nextItem?: GuidedSessionItem | null;
  onContinue: () => void;
}

export const GuidedSessionTransitionView: React.FC<GuidedSessionTransitionViewProps> = ({
  item,
  nextItem,
  onContinue,
}) => {
  const targetExercise = item.exercise || nextItem?.exercise;
  const equipment = targetExercise?.equipment;
  const movementPattern = targetExercise?.movementPattern;
  const primaryMuscle = targetExercise?.primaryMuscleGroup;

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <View style={styles.iconContainer}>
          <Icon name="chevron-right" size={40} color={themeColors.accent} />
        </View>

        <Text style={styles.badgeLabel}>TRANSITION & PREPARATION</Text>
        <Text style={styles.title}>{item.title}</Text>

        {item.description ? (
          <Text style={styles.description}>{item.description}</Text>
        ) : null}

        {/* Next Up Target Card */}
        {targetExercise ? (
          <View style={styles.targetExerciseBox}>
            <Text style={styles.targetLabel}>NEXT EXERCISE</Text>
            <Text style={styles.targetName}>{targetExercise.name}</Text>

            <View style={styles.tagsRow}>
              {movementPattern && (
                <Badge label={movementPattern} variant="accent" />
              )}
              {primaryMuscle && (
                <Badge label={primaryMuscle} variant="primary" />
              )}
              {equipment && equipment !== 'BODYWEIGHT' && (
                <Badge label={equipment.replace('_', ' ')} variant="warning" />
              )}
            </View>

            {/* Preparation Checklist */}
            <View style={styles.prepList}>
              <View style={styles.prepRow}>
                <Icon name="check-circle" size={16} color={themeColors.accent} />
                <Text style={styles.prepText}>
                  Set up {equipment ? equipment.toLowerCase().replace('_', ' ') : 'your workout area'}
                </Text>
              </View>
              <View style={styles.prepRow}>
                <Icon name="check-circle" size={16} color={themeColors.accent} />
                <Text style={styles.prepText}>
                  Assume stable starting posture
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Continue Action */}
        <Button
          title="Ready to Continue"
          variant="primary"
          onPress={onContinue}
          leftIcon={<Icon name="chevron-right" size={16} color="#FFFFFF" />}
          style={styles.ctaButton}
        />
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
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: sp.md,
  },
  badgeLabel: {
    ...typography.caption,
    color: themeColors.accent,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    ...typography.h2,
    color: themeColors.textPrimary,
    textAlign: 'center',
    marginBottom: sp.xs,
  },
  description: {
    ...typography.body,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginBottom: sp.lg,
    lineHeight: 20,
  },
  targetExerciseBox: {
    width: '100%',
    backgroundColor: '#151A26',
    borderRadius: radius.md,
    padding: sp.md,
    marginBottom: sp.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  targetLabel: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  targetName: {
    ...typography.h3,
    color: themeColors.textPrimary,
    marginBottom: sp.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.xs,
    marginBottom: sp.md,
  },
  prepList: {
    gap: sp.xs,
    paddingTop: sp.xs,
    borderTopWidth: 1,
    borderTopColor: '#222B3D',
  },
  prepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
  },
  prepText: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  ctaButton: {
    width: '100%',
    paddingVertical: 14,
  },
});
