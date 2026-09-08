import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { spacing, radius, themeColors } from '../../../theme';

export interface DailyNutritionSummaryCardProps {
  calories: { consumed: number; target: number; adherencePct: number };
  protein: { consumed: number; target: number; adherencePct: number };
  carbohydrates: { consumed: number; target: number; adherencePct: number };
  fat: { consumed: number; target: number; adherencePct: number };
  water?: { consumed: number; target: number; adherencePct: number };
  adherenceMessage?: string;
}

export const DailyNutritionSummaryCard: React.FC<DailyNutritionSummaryCardProps> = ({
  calories,
  protein,
  carbohydrates,
  fat,
  water,
  adherenceMessage,
}) => {
  const renderProgressBar = (label: string, consumed: number, target: number, unit: string, color: string) => {
    const pct = target > 0 ? Math.min(Math.round((consumed / target) * 100), 100) : 0;
    return (
      <View style={styles.macroRow} key={label}>
        <View style={styles.macroHeader}>
          <Text style={styles.macroLabel}>{label}</Text>
          <Text style={styles.macroValue}>
            {consumed} / {target} {unit}
          </Text>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Today's Nutrition Summary</Text>
        <View style={styles.calBadge}>
          <Text style={styles.calBadgeText}>{calories.adherencePct}% Target</Text>
        </View>
      </View>

      {renderProgressBar('Calories', calories.consumed, calories.target, 'kcal', themeColors.primary)}
      {renderProgressBar('Protein', protein.consumed, protein.target, 'g', '#10B981')}
      {renderProgressBar('Carbohydrates', carbohydrates.consumed, carbohydrates.target, 'g', '#F59E0B')}
      {renderProgressBar('Fats', fat.consumed, fat.target, 'g', '#8B5CF6')}
      {water && renderProgressBar('Hydration', Number((water.consumed / 1000).toFixed(1)), Number((water.target / 1000).toFixed(1)), 'L', '#38BDF8')}

      {adherenceMessage ? (
        <Text style={styles.adherenceMessage}>{adherenceMessage}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E293B',
    borderRadius: radius.lg,
    padding: spacing[4],
    marginHorizontal: spacing[4],
    marginVertical: spacing[2],
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  calBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  calBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#38BDF8',
  },
  macroRow: {
    marginBottom: spacing[2],
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  macroValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  barTrack: {
    height: 6,
    backgroundColor: '#0F172A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  adherenceMessage: {
    fontSize: 12,
    color: '#38BDF8',
    fontStyle: 'italic',
    marginTop: spacing[2],
  },
});
