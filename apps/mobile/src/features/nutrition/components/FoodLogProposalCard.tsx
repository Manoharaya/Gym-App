import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { spacing, radius, themeColors } from '../../../theme';
import type { ParsedFoodLogProposal } from '@fitcore/types';

export interface FoodLogProposalCardProps {
  proposal: ParsedFoodLogProposal;
  onConfirm: (proposal: ParsedFoodLogProposal) => Promise<void>;
}

export const FoodLogProposalCard: React.FC<FoodLogProposalCardProps> = ({
  proposal,
  onConfirm,
}) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsConfirming(true);
      await onConfirm(proposal);
      setIsConfirmed(true);
    } catch {
      // Handled by caller
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.badge}>PROPOSED FOOD LOG</Text>
        <Text style={styles.mealType}>{proposal.mealType}</Text>
      </View>

      <View style={styles.itemsList}>
        {proposal.items.map((item, idx) => (
          <View key={`${idx}-${item.foodName}`} style={styles.itemRow}>
            <View style={styles.itemDetails}>
              <Text style={styles.foodName}>{item.foodName}</Text>
              <Text style={styles.quantityText}>
                {item.quantity} {item.unit}
              </Text>
            </View>
            <View style={styles.macroPills}>
              <Text style={styles.calText}>{Math.round(item.calories)} kcal</Text>
              <Text style={styles.macroText}>P: {item.protein}g</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total Estimated:</Text>
        <Text style={styles.totalValue}>
          {Math.round(proposal.totalCalories)} kcal • {proposal.totalProtein}g Protein • {proposal.totalCarbohydrates}g Carbs
        </Text>
      </View>

      {proposal.warning ? (
        <Text style={styles.warningText}>⚠️ {proposal.warning}</Text>
      ) : null}

      {isConfirmed ? (
        <View style={styles.confirmedBadge}>
          <Text style={styles.confirmedText}>✓ Logged to Nutrition Diary</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.confirmButton, isConfirming && styles.buttonDisabled]}
          onPress={handleConfirm}
          disabled={isConfirming}
          activeOpacity={0.8}
        >
          {isConfirming ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm & Save to Log</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E293B',
    borderRadius: radius.md,
    padding: spacing[3],
    marginVertical: spacing[2],
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  badge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38BDF8',
    letterSpacing: 0.5,
  },
  mealType: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    backgroundColor: '#0F172A',
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  itemsList: {
    gap: spacing[1],
    marginBottom: spacing[2],
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  itemDetails: {
    flex: 1,
  },
  foodName: {
    fontSize: 13,
    color: '#F1F5F9',
    fontWeight: '500',
  },
  quantityText: {
    fontSize: 11,
    color: '#64748B',
  },
  macroPills: {
    alignItems: 'flex-end',
  },
  calText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  macroText: {
    fontSize: 10,
    color: '#10B981',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: spacing[2],
    marginBottom: spacing[2],
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  totalValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38BDF8',
  },
  warningText: {
    fontSize: 11,
    color: '#F59E0B',
    marginBottom: spacing[2],
  },
  confirmButton: {
    backgroundColor: themeColors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing[2],
    alignItems: 'center',
    marginTop: spacing[1],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  confirmedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: radius.md,
    paddingVertical: spacing[2],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  confirmedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
});
