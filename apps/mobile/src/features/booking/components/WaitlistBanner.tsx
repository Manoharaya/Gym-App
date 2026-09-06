import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { themeColors } from '../../../theme';

interface WaitlistBannerProps {
  position: number;
  className: string;
  startTime: string;
  onLeave?: () => void;
  isLeaving?: boolean;
}

export const WaitlistBanner: React.FC<WaitlistBannerProps> = ({
  position,
  className,
  startTime,
  onLeave,
  isLeaving = false,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>#{position} IN QUEUE</Text>
        </View>
        <Text style={styles.statusText}>Auto-Promotion Active</Text>
      </View>

      <Text style={styles.title}>{className}</Text>
      <Text style={styles.subtitle}>{startTime}</Text>

      <Text style={styles.infoText}>
        If a confirmed attendee cancels, the system will automatically promote the next eligible member in queue and confirm your booking.
      </Text>

      {onLeave && (
        <TouchableOpacity
          style={styles.leaveButton}
          onPress={onLeave}
          disabled={isLeaving}
          activeOpacity={0.8}
        >
          <Text style={styles.leaveButtonText}>
            {isLeaving ? 'Leaving...' : 'Leave Waitlist'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#C084FC',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 2,
  },
  subtitle: {
    color: '#D1D5DB',
    fontSize: 13,
    marginBottom: 8,
  },
  infoText: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  leaveButton: {
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  leaveButtonText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
});
