import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  daysAway?: number;
  welcomeMessage?: string;
  onExploreWorkouts?: () => void;
  onBookClass?: () => void;
  onMessageCoach?: () => void;
  onCheckIn?: () => void;
}

export const MemberRecoveryHubCard: React.FC<Props> = ({
  daysAway = 14,
  welcomeMessage = "We're here to help you get back into your routine at your own pace. What sounds good for today?",
  onExploreWorkouts,
  onBookClass,
  onMessageCoach,
  onCheckIn,
}) => {
  return (
    <View style={styles.card} testID="member-recovery-hub-card">
      {/* Top Banner Tag */}
      <View style={styles.badgeRow}>
        <View style={styles.welcomeBadge}>
          <Text style={styles.welcomeBadgeText}>
            {daysAway > 0 ? `👋 WELCOME BACK · ${daysAway} DAYS SINCE LAST VISIT` : '👋 WELCOME BACK'}
          </Text>
        </View>
      </View>

      {/* Main Title & Supportive Message */}
      <Text style={styles.cardTitle}>Ready to get back into your routine?</Text>
      <Text style={styles.messageText}>{welcomeMessage}</Text>

      {/* Helpful Return Shortcuts */}
      <View style={styles.actionGrid}>
        {onExploreWorkouts && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onExploreWorkouts}
            testID="recovery-action-workout"
          >
            <Text style={styles.actionIcon}>🏋️</Text>
            <Text style={styles.actionTitle}>Easy Return Workout</Text>
            <Text style={styles.actionSubtitle}>Low-pressure 20 min session</Text>
          </TouchableOpacity>
        )}

        {onBookClass && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onBookClass}
            testID="recovery-action-class"
          >
            <Text style={styles.actionIcon}>🧘</Text>
            <Text style={styles.actionTitle}>Book a Class</Text>
            <Text style={styles.actionSubtitle}>Mobility, stretch, or spin</Text>
          </TouchableOpacity>
        )}

        {onMessageCoach && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onMessageCoach}
            testID="recovery-action-coach"
          >
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionTitle}>Message Coach</Text>
            <Text style={styles.actionSubtitle}>Ask about ramp-up plans</Text>
          </TouchableOpacity>
        )}

        {onCheckIn && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onCheckIn}
            testID="recovery-action-checkin"
          >
            <Text style={styles.actionIcon}>✨</Text>
            <Text style={styles.actionTitle}>Daily Check-In</Text>
            <Text style={styles.actionSubtitle}>Log energy & readiness</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 18,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  welcomeBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  welcomeBadgeText: {
    color: '#818CF8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  messageText: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  actionTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionSubtitle: {
    color: '#64748B',
    fontSize: 11,
  },
});
