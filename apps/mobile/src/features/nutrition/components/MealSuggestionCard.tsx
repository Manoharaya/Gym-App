import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { spacing, radius } from '../../../theme';
import type { MealSuggestion } from '@fitcore/types';

export interface MealSuggestionCardProps {
  suggestion: MealSuggestion;
}

export const MealSuggestionCard: React.FC<MealSuggestionCardProps> = ({ suggestion }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.badge}>AI SUGGESTION</Text>
        <Text style={styles.name}>{suggestion.name}</Text>
      </View>

      <Text style={styles.whyText}>{suggestion.whyItFits}</Text>

      <View style={styles.ingredientsWrap}>
        <Text style={styles.ingLabel}>Ingredients:</Text>
        <Text style={styles.ingText}>{suggestion.ingredients.join(' • ')}</Text>
      </View>

      {suggestion.estimatedCalories ? (
        <View style={styles.macrosRow}>
          <Text style={styles.macroPill}>~{suggestion.estimatedCalories} kcal</Text>
          {suggestion.estimatedProtein ? (
            <Text style={[styles.macroPill, styles.proteinPill]}>
              P: {suggestion.estimatedProtein}g
            </Text>
          ) : null}
          {suggestion.estimatedCarbs ? (
            <Text style={[styles.macroPill, styles.carbsPill]}>
              C: {suggestion.estimatedCarbs}g
            </Text>
          ) : null}
          {suggestion.estimatedFat ? (
            <Text style={[styles.macroPill, styles.fatPill]}>
              F: {suggestion.estimatedFat}g
            </Text>
          ) : null}
        </View>
      ) : null}

      {suggestion.allergySafetyNote ? (
        <Text style={styles.allergyNote}>🛡️ {suggestion.allergySafetyNote}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    borderRadius: radius.md,
    padding: spacing[3],
    marginVertical: spacing[1],
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  header: {
    marginBottom: 4,
  },
  badge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  whyText: {
    fontSize: 12,
    color: '#CBD5E1',
    marginBottom: spacing[2],
    lineHeight: 16,
  },
  ingredientsWrap: {
    marginBottom: spacing[2],
  },
  ingLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 2,
  },
  ingText: {
    fontSize: 12,
    color: '#E2E8F0',
  },
  macrosRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: 4,
  },
  macroPill: {
    fontSize: 11,
    fontWeight: '600',
    color: '#CBD5E1',
    backgroundColor: '#1E293B',
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  proteinPill: {
    color: '#10B981',
  },
  carbsPill: {
    color: '#F59E0B',
  },
  fatPill: {
    color: '#8B5CF6',
  },
  allergyNote: {
    fontSize: 11,
    color: '#34D399',
    marginTop: 4,
  },
});
