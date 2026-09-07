import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { spacing, radius } from '../../theme';

export interface AIErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const AIErrorState: React.FC<AIErrorStateProps> = ({
  message = 'AI assistant could not complete this request.',
  onRetry,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.title}>AI Request Unsuccessful</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.7}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E293B',
    borderRadius: radius.lg,
    padding: spacing[6],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    marginVertical: spacing[2],
  },
  icon: {
    fontSize: 28,
    marginBottom: spacing[2],
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: spacing[1],
  },
  message: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  retryButton: {
    backgroundColor: '#334155',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#475569',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
  },
});
