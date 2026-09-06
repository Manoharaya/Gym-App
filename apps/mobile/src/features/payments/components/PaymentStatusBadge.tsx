import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { PaymentStatus } from '../types';

interface PaymentStatusBadgeProps {
  status: PaymentStatus | string;
}

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status }) => {
  const getBadgeConfig = () => {
    switch (status?.toUpperCase()) {
      case 'SUCCEEDED':
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          border: '#10B981',
          text: '#34D399',
          label: 'SUCCEEDED',
        };
      case 'PROCESSING':
      case 'PENDING':
        return {
          bg: 'rgba(56, 189, 248, 0.15)',
          border: '#38BDF8',
          text: '#38BDF8',
          label: 'PROCESSING',
        };
      case 'FAILED':
        return {
          bg: 'rgba(239, 68, 68, 0.15)',
          border: '#EF4444',
          text: '#F87171',
          label: 'FAILED',
        };
      case 'REFUNDED':
        return {
          bg: 'rgba(168, 85, 247, 0.15)',
          border: '#A855F7',
          text: '#C084FC',
          label: 'REFUNDED',
        };
      case 'PARTIALLY_REFUNDED':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          border: '#F59E0B',
          text: '#FBBF24',
          label: 'PARTIAL REFUND',
        };
      case 'CANCELLED':
        return {
          bg: 'rgba(148, 163, 184, 0.15)',
          border: '#64748B',
          text: '#94A3B8',
          label: 'CANCELLED',
        };
      default:
        return {
          bg: 'rgba(148, 163, 184, 0.15)',
          border: '#475569',
          text: '#94A3B8',
          label: status || 'UNKNOWN',
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.border }]}>
      <Text style={[styles.badgeText, { color: config.text }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
