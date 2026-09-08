import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  workoutsThisWeek?: number;
  streakWeeks?: number;
  momentumMessage?: string;
  onNavigateWorkouts?: () => void;
  onNavigateClasses?: () => void;
  onNavigateGoals?: () => void;
  onNavigateCheckIn?: () => void;
  onContactTrainer?: () => void;
}

export const FitnessMomentumCard: React.FC<Props> = ({
  workoutsThisWeek = 3,
  streakWeeks = 2,
  momentumMessage = "You've built solid training momentum this week. Keep your momentum going!",
  onNavigateWorkouts,
  onNavigateClasses,
  onNavigateGoals,
  onNavigateCheckIn,
  onContactTrainer,
}) => {
  return (
    <View style={styles.card} testID="fitness-momentum-card">
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleWrapper}>
          <Text style={styles.cardTag}>MOMENTUM</Text>
          <Text style={styles.cardTitle}>Your Fitness Momentum</Text>
        </View>
        <View style={styles.streakBadge}>
          <Text style={styles.streakText}>🔥 {streakWeeks} wk streak</Text>
        </View>
      </View>

      {/* Main Stats / Highlight */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{workoutsThisWeek}</Text>
          <Text style={styles.statLabel}>Workouts This Week</Text>
        </View>
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{momentumMessage}</Text>
        </View>
      </View>

      {/* Quick Action Shortcuts */}
      <View style={styles.actionsContainer}>
        {onNavigateWorkouts && (
          <TouchableOpacity
            style={styles.actionChip}
            onPress={onNavigateWorkouts}
            testID="momentum-action-workouts"
          >
            <Text style={styles.actionChipText}>🏋️ Workouts</Text>
          </TouchableOpacity>
        )}
        {onNavigateClasses && (
          <TouchableOpacity
            style={styles.actionChip}
            onPress={onNavigateClasses}
            testID="momentum-action-classes"
          >
            <Text style={styles.actionChipText}>📅 Classes</Text>
          </TouchableOpacity>
        )}
        {onNavigateCheckIn && (
          <TouchableOpacity
            style={styles.actionChip}
            onPress={onNavigateCheckIn}
            testID="momentum-action-checkin"
          >
            <Text style={styles.actionChipText}>✨ Check-In</Text>
          </TouchableOpacity>
        )}
        {onNavigateGoals && (
          <TouchableOpacity
            style={styles.actionChip}
            onPress={onNavigateGoals}
            testID="momentum-action-goals"
          >
            <Text style={styles.actionChipText}>🎯 Goals</Text>
          </TouchableOpacity>
        )}
        {onContactTrainer && (
          <TouchableOpacity
            style={styles.actionChip}
            onPress={onContactTrainer}
            testID="momentum-action-trainer"
          >
            <Text style={styles.actionChipText}>💬 Trainer</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#131826',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#232C42',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleWrapper: {
    flexDirection: 'column',
  },
  cardTag: {
    color: '#6366F1',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  streakBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  streakText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: '#0E131F',
    borderRadius: 12,
    padding: 12,
  },
  statBox: {
    alignItems: 'center',
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: '#1E283E',
  },
  statValue: {
    color: '#38BDF8',
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
    maxWidth: 70,
  },
  messageBox: {
    flex: 1,
    paddingLeft: 12,
  },
  messageText: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 17,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionChip: {
    backgroundColor: '#1E2638',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A354E',
  },
  actionChipText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
});
