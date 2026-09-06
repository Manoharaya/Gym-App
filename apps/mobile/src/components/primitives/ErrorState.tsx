import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { spacing, themeColors, typography } from '../../theme';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryTitle?: string;
  style?: StyleProp<ViewStyle>;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryTitle = 'Try Again',
  style,
}) => {
  return (
    <View accessible accessibilityRole="alert" style={[styles.container, style]}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>!</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Button
          title={retryTitle}
          onPress={onRetry}
          variant="outline"
          size="sm"
          style={styles.retryButton}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: themeColors.dangerBackground,
    borderWidth: 1,
    borderColor: themeColors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  badgeText: {
    ...typography.h3,
    color: themeColors.danger,
    fontWeight: '800',
  },
  title: {
    ...typography.h3,
    color: themeColors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  message: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
    marginBottom: spacing[4],
  },
  retryButton: {
    marginTop: spacing[2],
  },
});
