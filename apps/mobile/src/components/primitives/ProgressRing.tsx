import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { themeColors, typography } from '../../theme';

export interface ProgressRingProps {
  progress: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  label?: string;
  valueText?: string;
  style?: StyleProp<ViewStyle>;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 80,
  strokeWidth = 8,
  color = themeColors.accent,
  backgroundColor = themeColors.surfaceActive,
  label,
  valueText,
  style,
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* Background track circle */}
      <View
        style={[
          styles.circleTrack,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: backgroundColor,
          },
        ]}
      />

      {/* Foreground progress indicator */}
      <View
        style={[
          styles.circleProgress,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: color,
            borderBottomColor: clampedProgress < 75 ? 'transparent' : color,
            borderLeftColor: clampedProgress < 50 ? 'transparent' : color,
            borderTopColor: clampedProgress < 25 ? 'transparent' : color,
            transform: [{ rotate: '-45deg' }],
          },
        ]}
      />

      {/* Center Label / Value */}
      <View style={styles.centerContent}>
        {valueText ? (
          <Text style={[styles.valueText, { fontSize: size * 0.22 }]}>{valueText}</Text>
        ) : (
          <Text style={[styles.valueText, { fontSize: size * 0.22 }]}>{Math.round(clampedProgress)}%</Text>
        )}
        {label && <Text style={[styles.labelText, { fontSize: size * 0.12 }]}>{label}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circleTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  circleProgress: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    ...typography.h3,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  labelText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
    marginTop: -2,
  },
});
