import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { spacing, radius } from '../../theme';

export type AIStatus = 'AVAILABLE' | 'THINKING' | 'DEGRADED' | 'OFFLINE';

export interface AIStatusIndicatorProps {
  status: AIStatus;
  label?: string;
}

export const AIStatusIndicator: React.FC<AIStatusIndicatorProps> = ({ status, label }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'AVAILABLE':
        return '#10B981';
      case 'THINKING':
        return '#0EA5E9';
      case 'DEGRADED':
        return '#F59E0B';
      case 'OFFLINE':
      default:
        return '#64748B';
    }
  };

  const getStatusText = () => {
    if (label) return label;
    switch (status) {
      case 'AVAILABLE':
        return 'AI Ready';
      case 'THINKING':
        return 'AI Thinking...';
      case 'DEGRADED':
        return 'AI Degraded';
      case 'OFFLINE':
      default:
        return 'AI Offline';
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: getStatusColor() }]} />
      <Text style={styles.label}>{getStatusText()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing[1],
  },
  label: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '500',
  },
});
