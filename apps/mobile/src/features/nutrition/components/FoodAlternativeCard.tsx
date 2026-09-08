import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { spacing, radius } from '../../../theme';
import type { FoodAlternative } from '@fitcore/types';

export interface FoodAlternativeCardProps {
  alternative: FoodAlternative;
}

export const FoodAlternativeCard: React.FC<FoodAlternativeCardProps> = ({ alternative }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.badge}>FOOD ALTERNATIVE</Text>
        <Text style={styles.confidence}>Confidence: {alternative.confidence}</Text>
      </View>

      <View style={styles.comparisonRow}>
        <Text style={styles.origFood}>{alternative.originalFood}</Text>
        <Text style={styles.arrow}>➔</Text>
        <Text style={styles.subFood}>{alternative.substituteFood}</Text>
      </View>

      <Text style={styles.reason}>{alternative.reason}</Text>

      {alternative.nutritionalComparison ? (
        <Text style={styles.nutritionalComparison}>
          📊 {alternative.nutritionalComparison}
        </Text>
      ) : null}

      {alternative.allergyWarning ? (
        <Text style={styles.allergyWarning}>⚠️ {alternative.allergyWarning}</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  badge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#38BDF8',
    letterSpacing: 0.5,
  },
  confidence: {
    fontSize: 10,
    color: '#64748B',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginVertical: 4,
  },
  origFood: {
    fontSize: 13,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  arrow: {
    fontSize: 12,
    color: '#38BDF8',
  },
  subFood: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  reason: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 16,
    marginVertical: 2,
  },
  nutritionalComparison: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  allergyWarning: {
    fontSize: 11,
    color: '#F59E0B',
    marginTop: 4,
  },
});
