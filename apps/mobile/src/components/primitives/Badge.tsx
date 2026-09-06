import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { radius, spacing, themeColors, typography } from '../../theme';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'ai' | 'accent';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  leftIcon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  style,
  textStyle,
  leftIcon,
}) => {
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Status: ${label}`}
      style={[styles.badge, styles[variant], style]}
    >
      {leftIcon}
      <Text style={[styles.text, textStyles[variant], textStyle]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    gap: spacing[1],
  },
  primary: {
    backgroundColor: themeColors.badgeBackground,
  },
  success: {
    backgroundColor: themeColors.successBackground,
  },
  warning: {
    backgroundColor: themeColors.warningBackground,
  },
  danger: {
    backgroundColor: themeColors.dangerBackground,
  },
  info: {
    backgroundColor: themeColors.infoBackground,
  },
  neutral: {
    backgroundColor: themeColors.surfaceActive,
  },
  ai: {
    backgroundColor: themeColors.aiLight,
  },
  accent: {
    backgroundColor: themeColors.accentLight,
  },
  text: {
    ...typography.caption,
    fontWeight: '600',
  },
});

const textStyles = StyleSheet.create({
  primary: {
    color: themeColors.badgeText,
  },
  success: {
    color: themeColors.success,
  },
  warning: {
    color: themeColors.warning,
  },
  danger: {
    color: themeColors.danger,
  },
  info: {
    color: themeColors.info,
  },
  neutral: {
    color: themeColors.textSecondary,
  },
  ai: {
    color: themeColors.aiPrimary,
  },
  accent: {
    color: themeColors.accent,
  },
});
