import React from 'react';
import { View, Text, StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';
import { themeColors, typography, radius, spacing } from '../../theme';
import { Icon, IconName } from './Icon';

export interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
  icon?: IconName;
  accentColor?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  change,
  trend = 'neutral',
  subtitle,
  icon,
  accentColor = themeColors.accent,
  onPress,
  style,
}) => {
  const isUp = trend === 'up';
  const isDown = trend === 'down';
  const trendColor = isUp ? themeColors.success : isDown ? themeColors.danger : themeColors.textSecondary;

  const content = (
    <View style={[styles.container, style]}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: `${accentColor}1A` }]}>
            <Icon name={icon} size={16} color={accentColor} />
          </View>
        )}
      </View>

      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>

      <View style={styles.footerRow}>
        {change && (
          <View style={[styles.trendBadge, { backgroundColor: `${trendColor}1A` }]}>
            <Text style={[styles.trendText, { color: trendColor }]}>
              {isUp ? '↑ ' : isDown ? '↓ ' : ''}
              {change}
            </Text>
          </View>
        )}
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.pressed]}
        accessibilityRole="button"
      >
        {content}
      </Pressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: themeColors.border,
    minWidth: 140,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  label: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing[1],
    marginBottom: spacing[2],
  },
  value: {
    ...typography.h1,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  unit: {
    ...typography.bodySmall,
    color: themeColors.textMuted,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  trendBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
