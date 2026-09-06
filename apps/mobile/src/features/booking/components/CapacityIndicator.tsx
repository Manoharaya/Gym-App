import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { themeColors } from '../../../theme';

interface CapacityIndicatorProps {
  capacity: number;
  spotsRemaining: number;
  waitlistCount?: number;
  isCancelled?: boolean;
}

export const CapacityIndicator: React.FC<CapacityIndicatorProps> = ({
  capacity,
  spotsRemaining,
  waitlistCount = 0,
  isCancelled = false,
}) => {
  if (isCancelled) {
    return (
      <View style={[styles.badge, styles.cancelledBadge]}>
        <Text style={[styles.badgeText, styles.cancelledText]}>CANCELLED</Text>
      </View>
    );
  }

  const isFull = spotsRemaining <= 0;
  const isLimited = spotsRemaining > 0 && spotsRemaining <= 4;
  const bookedCount = Math.max(0, capacity - spotsRemaining);
  const fillPercent = capacity > 0 ? Math.min(100, Math.round((bookedCount / capacity) * 100)) : 0;

  let badgeStyle = styles.openBadge;
  let textStyle = styles.openText;
  let label = `${spotsRemaining} spots left`;

  if (isFull) {
    if (waitlistCount > 0) {
      badgeStyle = styles.waitlistBadge;
      textStyle = styles.waitlistText;
      label = `Waitlist (${waitlistCount})`;
    } else {
      badgeStyle = styles.fullBadge;
      textStyle = styles.fullText;
      label = 'Class Full';
    }
  } else if (isLimited) {
    badgeStyle = styles.limitedBadge;
    textStyle = styles.limitedText;
    label = `Only ${spotsRemaining} left`;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.badge, badgeStyle]}>
        <Text style={[styles.badgeText, textStyle]}>{label}</Text>
      </View>
      <View style={styles.progressBarBackground}>
        <View
          style={[
            styles.progressBarFill,
            isFull
              ? styles.progressFull
              : isLimited
              ? styles.progressLimited
              : styles.progressNormal,
            { width: `${fillPercent}%` },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  openBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
  },
  openText: {
    color: '#34D399',
  },
  limitedBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
  },
  limitedText: {
    color: '#FBBF24',
  },
  fullBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  fullText: {
    color: '#EF4444',
  },
  waitlistBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
  },
  waitlistText: {
    color: '#C084FC',
  },
  cancelledBadge: {
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
  },
  cancelledText: {
    color: '#9CA3AF',
  },
  progressBarBackground: {
    width: 70,
    height: 3,
    backgroundColor: themeColors.inputBorder,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressNormal: {
    backgroundColor: '#34D399',
  },
  progressLimited: {
    backgroundColor: '#FBBF24',
  },
  progressFull: {
    backgroundColor: '#EF4444',
  },
});
