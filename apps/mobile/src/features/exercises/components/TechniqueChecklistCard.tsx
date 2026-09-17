import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
};

export interface TechniqueChecklistCardProps {
  checklist: string[];
  checkedState: Record<string, boolean>;
  onToggleItem: (item: string, isChecked: boolean) => void;
  title?: string;
  subtitle?: string;
}

export const TechniqueChecklistCard: React.FC<TechniqueChecklistCardProps> = ({
  checklist = [],
  checkedState = {},
  onToggleItem,
  title = 'Technique Self-Checklist',
  subtitle = 'Check off each biomechanical checkpoint as you review your technique.',
}) => {
  if (!checklist || checklist.length === 0) return null;

  const completedCount = checklist.filter((item) => !!checkedState[item]).length;
  const progressPercent = Math.round((completedCount / checklist.length) * 100);

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Icon name="check-circle" size={18} color={themeColors.accent} />
          <Text style={styles.title}>{title}</Text>
        </View>
        <Badge
          label={`${completedCount} / ${checklist.length}`}
          variant={completedCount === checklist.length ? 'success' : 'neutral'}
        />
      </View>

      <Text style={styles.subtitle}>{subtitle}</Text>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.progressPercent}>{progressPercent}% Ready</Text>
      </View>

      {/* Checklist Items */}
      <View style={styles.list}>
        {checklist.map((item, idx) => {
          const isChecked = !!checkedState[item];
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.itemRow, isChecked && styles.itemRowChecked]}
              onPress={() => onToggleItem(item, !isChecked)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                {isChecked && <Icon name="check" size={12} color="#000000" />}
              </View>
              <Text style={[styles.itemText, isChecked && styles.itemTextChecked]}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: sp.md,
    marginBottom: sp.md,
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: themeColors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  subtitle: {
    ...typography.bodySm,
    color: themeColors.textSecondary,
    marginBottom: sp.sm,
    lineHeight: 18,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    marginBottom: sp.md,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: themeColors.accent,
    borderRadius: 3,
  },
  progressPercent: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  list: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: sp.sm,
    backgroundColor: '#0F141F',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.cardBorder,
    gap: sp.sm,
  },
  itemRowChecked: {
    borderColor: 'rgba(34, 197, 94, 0.4)',
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: themeColors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: themeColors.accent,
    borderColor: themeColors.accent,
  },
  itemText: {
    ...typography.bodySm,
    color: themeColors.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
  itemTextChecked: {
    color: themeColors.textSecondary,
    textDecorationLine: 'line-through',
  },
});
