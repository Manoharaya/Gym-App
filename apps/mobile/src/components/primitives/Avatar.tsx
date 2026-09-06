import React from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { themeColors, typography } from '../../theme';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  sourceUrl?: string;
  name?: string;
  size?: AvatarSize;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const sizeDimensions: Record<AvatarSize, number> = {
  sm: 32,
  md: 44,
  lg: 56,
  xl: 72,
};

export const Avatar: React.FC<AvatarProps> = ({
  sourceUrl,
  name,
  size = 'md',
  style,
  accessibilityLabel,
}) => {
  const dimension = sizeDimensions[size];

  const getInitials = (fullName?: string): string => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return (fullName[0] || '?').toUpperCase();
  };

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel || name || 'User avatar'}
      style={[
        styles.container,
        { width: dimension, height: dimension, borderRadius: dimension / 2 },
        style,
      ]}
    >
      {sourceUrl ? (
        <Image
          source={{ uri: sourceUrl }}
          style={{ width: dimension, height: dimension, borderRadius: dimension / 2 }}
        />
      ) : (
        <Text style={[styles.initials, { fontSize: dimension * 0.4 }]}>{getInitials(name)}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: themeColors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: themeColors.borderLight,
  },
  initials: {
    ...typography.subtitle,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
});
