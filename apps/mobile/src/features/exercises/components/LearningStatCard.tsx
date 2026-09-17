import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { themeColors, typography, radius, spacing } from '../../../theme';
import { Card, Icon } from '../../../components/primitives';
import type { LearningDashboardSummary } from '../services/exerciseService';

export interface LearningStatCardProps {
  summary: LearningDashboardSummary;
}

export const LearningStatCard: React.FC<LearningStatCardProps> = ({ summary }) => {
  const formatLearningTime = (minutes: number) => {
    if (minutes <= 0) return '0m';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>YOUR LEARNING PROGRESS</Text>
      </View>

      <View style={styles.grid}>
        {/* Paths Completed */}
        <View style={styles.statBox}>
          <View style={styles.iconCircle}>
            <Icon name="award" size={16} color={themeColors.primary} />
          </View>
          <Text style={styles.statValue}>{summary.pathsCompleted}</Text>
          <Text style={styles.statLabel}>Paths Completed</Text>
        </View>

        {/* Exercises Learned */}
        <View style={styles.statBox}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(0, 200, 180, 0.12)' }]}>
            <Icon name="dumbbell" size={16} color={themeColors.accent} />
          </View>
          <Text style={styles.statValue}>{summary.exercisesLearned}</Text>
          <Text style={styles.statLabel}>Exercises Learned</Text>
        </View>

        {/* Lessons Completed */}
        <View style={styles.statBox}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(76, 175, 80, 0.12)' }]}>
            <Icon name="check-circle" size={16} color={themeColors.success} />
          </View>
          <Text style={styles.statValue}>{summary.lessonsCompleted}</Text>
          <Text style={styles.statLabel}>Lessons Done</Text>
        </View>

        {/* Learning Time */}
        <View style={styles.statBox}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 193, 7, 0.12)' }]}>
            <Icon name="clock" size={16} color={themeColors.warning} />
          </View>
          <Text style={styles.statValue}>{formatLearningTime(summary.learningTimeMinutes)}</Text>
          <Text style={styles.statLabel}>Curriculum Time</Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: themeColors.cardBackground,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginBottom: spacing.md,
  },
  headerRow: {
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    color: themeColors.textSecondary,
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: spacing.sm + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    ...typography.title,
    fontSize: 20,
    fontWeight: '800',
    color: themeColors.textPrimary,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
});
