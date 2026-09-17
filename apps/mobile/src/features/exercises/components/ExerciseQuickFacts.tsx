import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card, Badge, Icon } from '../../../components/primitives';
import type { IconName } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
};

export interface ExerciseQuickFactsProps {
  difficulty?: string;
  movementPattern?: string;
  exerciseMechanics?: string;
  primaryMuscle?: string;
  secondaryMuscles?: string[];
  equipmentRequirement?: string;
  equipment?: string;
  tempo?: string;
  breathingInstructions?: string;
  trainingGoals?: string[];
}

export const ExerciseQuickFacts: React.FC<ExerciseQuickFactsProps> = ({
  difficulty = 'INTERMEDIATE',
  movementPattern = 'GENERAL',
  exerciseMechanics = 'COMPOUND',
  primaryMuscle = 'FULL_BODY',
  secondaryMuscles = [],
  equipmentRequirement = 'REQUIRED',
  equipment = 'BODYWEIGHT',
  tempo,
  breathingInstructions,
  trainingGoals = [],
}) => {
  const getPatternIcon = (pattern: string): IconName => {
    switch (pattern?.toUpperCase()) {
      case 'SQUAT':
      case 'HINGE':
      case 'LUNGE':
        return 'dumbbell';
      case 'PUSH':
      case 'PULL':
        return 'bolt';
      case 'CARRY':
      case 'GAIT':
        return 'activity';
      default:
        return 'activity';
    }
  };

  const getDifficultyVariant = (diff: string): 'neutral' | 'primary' | 'accent' => {
    switch (diff?.toUpperCase()) {
      case 'BEGINNER':
        return 'neutral';
      case 'INTERMEDIATE':
        return 'primary';
      case 'ADVANCED':
      case 'EXPERT':
        return 'accent';
      default:
        return 'neutral';
    }
  };

  const cleanText = (val?: string) => (val ? val.replace(/_/g, ' ') : '');

  return (
    <Card style={styles.card}>
      {/* Primary Attributes Grid */}
      <View style={styles.grid}>
        {/* Movement Pattern */}
        <View style={styles.factCell}>
          <View style={styles.cellHeader}>
            <Icon name={getPatternIcon(movementPattern)} size={14} color={themeColors.primary} />
            <Text style={styles.cellLabel}>Pattern</Text>
          </View>
          <Text style={styles.cellValue}>{cleanText(movementPattern)}</Text>
        </View>

        {/* Mechanics */}
        <View style={styles.factCell}>
          <View style={styles.cellHeader}>
            <Icon name="activity" size={14} color={themeColors.accent} />
            <Text style={styles.cellLabel}>Mechanics</Text>
          </View>
          <Text style={styles.cellValue}>{cleanText(exerciseMechanics)}</Text>
        </View>

        {/* Difficulty */}
        <View style={styles.factCell}>
          <View style={styles.cellHeader}>
            <Icon name="award" size={14} color={themeColors.secondary} />
            <Text style={styles.cellLabel}>Difficulty</Text>
          </View>
          <Badge
            label={cleanText(difficulty)}
            variant={getDifficultyVariant(difficulty)}
            style={styles.difficultyBadge}
          />
        </View>

        {/* Equipment */}
        <View style={styles.factCell}>
          <View style={styles.cellHeader}>
            <Icon name="dumbbell" size={14} color={themeColors.primary} />
            <Text style={styles.cellLabel}>
              Equipment {equipmentRequirement ? `(${cleanText(equipmentRequirement)})` : ''}
            </Text>
          </View>
          <Text style={styles.cellValue} numberOfLines={1}>
            {cleanText(equipment)}
          </Text>
        </View>
      </View>

      {/* Muscle Focus Bar */}
      <View style={styles.muscleRow}>
        <View style={styles.muscleCol}>
          <Text style={styles.sectionSubtitle}>Primary Muscle Target</Text>
          <View style={styles.pillRow}>
            <View style={styles.primaryMusclePill}>
              <View style={styles.activeDot} />
              <Text style={styles.primaryMusclePillText}>
                {cleanText(primaryMuscle)}
              </Text>
            </View>
          </View>
        </View>

        {secondaryMuscles && secondaryMuscles.length > 0 && (
          <View style={styles.muscleCol}>
            <Text style={styles.sectionSubtitle}>Assisting Muscles</Text>
            <View style={styles.pillRow}>
              {secondaryMuscles.slice(0, 2).map((m, idx) => (
                <View key={idx} style={styles.secondaryMusclePill}>
                  <Text style={styles.secondaryMusclePillText}>{cleanText(m)}</Text>
                </View>
              ))}
              {secondaryMuscles.length > 2 && (
                <View style={styles.morePill}>
                  <Text style={styles.morePillText}>+{secondaryMuscles.length - 2}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Tempo & Rhythm Bar (If Specified) */}
      {(tempo || breathingInstructions) && (
        <View style={styles.tempoRow}>
          {tempo ? (
            <View style={styles.tempoItem}>
              <Icon name="timer" size={14} color={themeColors.primary} />
              <Text style={styles.tempoLabel}>Tempo:</Text>
              <Text style={styles.tempoValue}>{tempo}</Text>
            </View>
          ) : null}

          {breathingInstructions ? (
            <View style={styles.tempoItem}>
              <Icon name="activity" size={14} color={themeColors.accent} />
              <Text style={styles.tempoLabel}>Breathing:</Text>
              <Text style={styles.tempoValue} numberOfLines={1}>
                {breathingInstructions}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Goals Chips */}
      {trainingGoals && trainingGoals.length > 0 && (
        <View style={styles.goalsContainer}>
          <Text style={styles.goalsLabel}>Training Goals:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.goalsScroll}>
            {trainingGoals.map((goal, idx) => (
              <View key={idx} style={styles.goalChip}>
                <Text style={styles.goalChipText}>#{cleanText(goal)}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: sp.md,
    marginBottom: sp.md,
    padding: sp.md,
    backgroundColor: themeColors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: sp.md,
    paddingBottom: sp.md,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  factCell: {
    width: '48%',
  },
  cellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cellLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: themeColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cellValue: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
    fontSize: 14,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
  },
  muscleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: sp.md,
    gap: sp.md,
  },
  muscleCol: {
    flex: 1,
  },
  sectionSubtitle: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
    color: themeColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  primaryMusclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: themeColors.primary,
  },
  primaryMusclePillText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: themeColors.primary,
  },
  secondaryMusclePill: {
    backgroundColor: themeColors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  secondaryMusclePillText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '500',
    color: themeColors.textSecondary,
  },
  morePill: {
    backgroundColor: themeColors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  morePillText: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.textMuted,
  },
  tempoRow: {
    marginTop: sp.md,
    paddingTop: sp.sm,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    flexWrap: 'wrap',
  },
  tempoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tempoLabel: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textMuted,
  },
  tempoValue: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  goalsContainer: {
    marginTop: sp.md,
    paddingTop: sp.sm,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  goalsLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
    color: themeColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  goalsScroll: {
    gap: 6,
  },
  goalChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  goalChipText: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textSecondary,
  },
});
