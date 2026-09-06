import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MembershipStatusBadgeProps {
  status: string;
  daysRemaining?: number;
}

export const MembershipStatusBadge: React.FC<MembershipStatusBadgeProps> = ({
  status,
  daysRemaining,
}) => {
  let displayStatus = status.toUpperCase();
  let bg = '#1E293B';
  let text = '#94A3B8';
  let border = '#334155';

  if (displayStatus === 'ACTIVE') {
    if (daysRemaining !== undefined && daysRemaining <= 7 && daysRemaining > 0) {
      displayStatus = 'EXPIRING SOON';
      bg = 'rgba(245, 158, 11, 0.15)';
      text = '#F59E0B';
      border = 'rgba(245, 158, 11, 0.3)';
    } else {
      bg = 'rgba(16, 185, 129, 0.15)';
      text = '#10B981';
      border = 'rgba(16, 185, 129, 0.3)';
    }
  } else if (displayStatus === 'TRIAL') {
    bg = 'rgba(6, 182, 212, 0.15)';
    text = '#06B6D4';
    border = 'rgba(6, 182, 212, 0.3)';
  } else if (displayStatus === 'PAUSED') {
    bg = 'rgba(139, 92, 246, 0.15)';
    text = '#A78BFA';
    border = 'rgba(139, 92, 246, 0.3)';
  } else if (displayStatus === 'SUSPENDED') {
    bg = 'rgba(239, 68, 68, 0.15)';
    text = '#EF4444';
    border = 'rgba(239, 68, 68, 0.3)';
  } else if (displayStatus === 'EXPIRED') {
    bg = 'rgba(100, 116, 139, 0.15)';
    text = '#94A3B8';
    border = 'rgba(100, 116, 139, 0.3)';
  } else if (displayStatus === 'CANCELLED') {
    bg = 'rgba(71, 85, 105, 0.2)';
    text = '#64748B';
    border = 'rgba(71, 85, 105, 0.4)';
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: border }]}>
      <View style={[styles.dot, { backgroundColor: text }]} />
      <Text style={[styles.text, { color: text }]}>{displayStatus}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
