import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { Badge, BadgeVariant, Icon, IconName } from '../../../components/primitives';
import { themeColors, spacing } from '../../../theme';
import type { LearningMasteryStatus } from '../services/exerciseService';

export interface ContentMasteryBadgeProps {
  status: LearningMasteryStatus | string;
  completionPercent?: number;
  score?: number | null;
  size?: 'sm' | 'md' | 'lg';
  showPercent?: boolean;
  showIcon?: boolean;
  style?: StyleProp<ViewStyle>;
}

interface MasteryConfig {
  label: string;
  variant: BadgeVariant;
  iconName: IconName;
  color: string;
  description: string;
}

const DEFAULT_CONFIG: MasteryConfig = {
  label: 'Not Started',
  variant: 'neutral',
  iconName: 'clock',
  color: themeColors.textMuted,
  description: 'Educational material not yet started',
};

const STATUS_CONFIG_MAP: Record<string, MasteryConfig> = {
  MASTERED: {
    label: 'Mastered',
    variant: 'accent',
    iconName: 'award',
    color: themeColors.accent,
    description: 'Educational objectives and knowledge check satisfied',
  },
  COMPLETED: {
    label: 'Completed',
    variant: 'success',
    iconName: 'check-circle',
    color: themeColors.success,
    description: 'All tutorial movement phases and practice steps completed',
  },
  PROGRESSING: {
    label: 'Progressing',
    variant: 'primary',
    iconName: 'activity',
    color: themeColors.primary,
    description: 'Actively progressing through multi-step curriculum',
  },
  PRACTICING: {
    label: 'Practicing',
    variant: 'info',
    iconName: 'bolt',
    color: themeColors.info,
    description: 'Practicing exercise technique with rehearsal checklist',
  },
  LEARNING: {
    label: 'Learning',
    variant: 'info',
    iconName: 'timer',
    color: themeColors.info,
    description: 'Exploring movement breakdown, muscles, and setup',
  },
  EXPLORING: {
    label: 'Exploring',
    variant: 'neutral',
    iconName: 'sparkles',
    color: themeColors.textSecondary,
    description: 'Initial exercise discovery and overview started',
  },
  REVIEW: {
    label: 'Needs Review',
    variant: 'warning',
    iconName: 'alert-circle',
    color: themeColors.warning,
    description: 'Concept review recommended based on recent knowledge check',
  },
  NOT_STARTED: DEFAULT_CONFIG,
};

export const ContentMasteryBadge: React.FC<ContentMasteryBadgeProps> = ({
  status,
  completionPercent,
  score,
  size = 'md',
  showPercent = false,
  showIcon = true,
  style,
}) => {
  const normalizedStatus = (status || 'NOT_STARTED').toUpperCase();
  const config = STATUS_CONFIG_MAP[normalizedStatus] || DEFAULT_CONFIG;

  let displayLabel = config.label;
  if (showPercent && typeof completionPercent === 'number' && completionPercent > 0 && normalizedStatus !== 'MASTERED' && normalizedStatus !== 'COMPLETED') {
    displayLabel = `${config.label} ${Math.round(completionPercent)}%`;
  } else if (score !== undefined && score !== null && normalizedStatus === 'MASTERED') {
    displayLabel = `${config.label} (${Math.round(score)}%)`;
  }

  const iconSize = size === 'sm' ? 10 : size === 'lg' ? 14 : 12;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Educational Status: ${config.label}. ${config.description}`}
      style={[styles.wrapper, style]}
    >
      <Badge
        label={displayLabel}
        variant={config.variant}
        leftIcon={
          showIcon ? (
            <Icon
              name={config.iconName}
              size={iconSize}
              color={config.color}
            />
          ) : undefined
        }
        textStyle={[
          size === 'sm' && styles.textSm,
          size === 'lg' && styles.textLg,
        ]}
        style={[
          size === 'sm' && styles.badgeSm,
          size === 'lg' && styles.badgeLg,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: spacing[1],
    paddingVertical: 2,
  },
  badgeLg: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1] + 2,
  },
  textSm: {
    fontSize: 10,
    lineHeight: 12,
  },
  textLg: {
    fontSize: 13,
    lineHeight: 16,
  },
});
