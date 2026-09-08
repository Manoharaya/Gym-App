import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { TrainerClientEngagementDto } from '@fitcore/types';

interface Props {
  engagement: TrainerClientEngagementDto;
}

export const TrainerClientEngagementCard: React.FC<Props> = ({ engagement }) => {
  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'IMPROVING':
        return '#10B981';
      case 'STABLE':
        return '#38BDF8';
      case 'DECLINING':
        return '#F59E0B';
      default:
        return '#94A3B8';
    }
  };

  return (
    <View style={styles.card} testID="trainer-client-engagement-card">
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>Member Engagement</Text>
        <View
          style={[
            styles.trendBadge,
            { backgroundColor: `${getTrendColor(engagement.trend)}20` },
          ]}
        >
          <Text style={[styles.trendBadgeText, { color: getTrendColor(engagement.trend) }]}>
            {engagement.trend}
          </Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Level</Text>
          <Text style={styles.metricValue}>{engagement.engagementLevel.replace('_', ' ')}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Visits (30d)</Text>
          <Text style={styles.metricValue}>{engagement.attendanceVisitsLast30d}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Adherence</Text>
          <Text style={styles.metricValue}>{engagement.workoutAdherencePercent}%</Text>
        </View>
      </View>

      {/* Observed Signals */}
      {engagement.observedSignals && engagement.observedSignals.length > 0 && (
        <View style={styles.signalsContainer}>
          <Text style={styles.sectionSubtitle}>Signals</Text>
          {engagement.observedSignals.map((signal, idx) => (
            <View key={`sig-${idx}`} style={styles.signalRow}>
              <Text style={styles.signalBullet}>•</Text>
              <Text style={styles.signalText}>{signal.observation}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Suggested Follow-up (Non-autonomous) */}
      <View style={styles.followUpContainer}>
        <Text style={styles.followUpLabel}>Suggested Follow-up</Text>
        <Text style={styles.followUpText}>{engagement.suggestedFollowUp}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#141822',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#232B3E',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  trendBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0F1219',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  signalsContainer: {
    marginBottom: 12,
  },
  sectionSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  signalBullet: {
    color: '#38BDF8',
    fontSize: 14,
    marginRight: 6,
    lineHeight: 18,
  },
  signalText: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  followUpContainer: {
    backgroundColor: '#1A2130',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#38BDF8',
  },
  followUpLabel: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  followUpText: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
  },
});
