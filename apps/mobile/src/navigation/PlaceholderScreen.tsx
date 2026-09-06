import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { themeColors, typography, spacing } from '../theme';
import { Badge } from '../components/primitives/Badge';

interface Props {
  title: string;
  module: string;
  roleScope: string;
}

export const NavigationPlaceholderScreen: React.FC<Props> = ({ title, module, roleScope }) => {
  return (
    <View style={styles.container}>
      <Badge label={module} variant="neutral" style={styles.badge} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Role Scope: {roleScope}</Text>
      <Text style={styles.caption}>Architectural Navigation Boundary (Day 1)</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  badge: {
    marginBottom: spacing[3],
  },
  title: {
    ...typography.h2,
    color: themeColors.textPrimary,
    marginBottom: spacing[2],
  },
  subtitle: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    marginBottom: spacing[1],
  },
  caption: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
});
