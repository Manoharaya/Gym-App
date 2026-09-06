import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { spacing, themeColors, typography } from '../../theme';

export interface LoadingProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Loading: React.FC<LoadingProps> = ({
  message,
  size = 'large',
  color = themeColors.primary,
  fullScreen = false,
  style,
}) => {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={message || 'Loading content'}
      style={[styles.container, fullScreen && styles.fullScreen, style]}
    >
      <ActivityIndicator size={size} color={color} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  fullScreen: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  message: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    textAlign: 'center',
  },
});
