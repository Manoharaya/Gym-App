import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { MembershipPlan } from '../types';
import { EntitlementList } from './EntitlementList';

interface PlanCardProps {
  plan: MembershipPlan;
  onSelect?: (plan: MembershipPlan) => void;
  isCurrentPlan?: boolean;
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan, onSelect, isCurrentPlan = false }) => {
  const formatPrice = (price: number, currency: string, unit: string) => {
    if (price === 0) return 'Free';
    return `${currency} $${price.toFixed(2)} / ${unit.toLowerCase()}`;
  };

  return (
    <View style={[styles.card, isCurrentPlan && styles.currentCard]}>
      {isCurrentPlan && (
        <View style={styles.currentBadge}>
          <Text style={styles.currentBadgeText}>CURRENT PLAN</Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.title}>{plan.name}</Text>
        <Text style={styles.price}>
          {formatPrice(plan.price, plan.currency, plan.durationUnit)}
        </Text>
      </View>

      {plan.description && (
        <Text style={styles.description}>{plan.description}</Text>
      )}

      <View style={styles.divider} />

      <Text style={styles.benefitsTitle}>Included Privileges:</Text>
      <EntitlementList entitlements={plan.entitlements} />

      {onSelect && !isCurrentPlan && (
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => onSelect(plan)}
          activeOpacity={0.8}
        >
          <Text style={styles.selectButtonText}>Choose Plan</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
  },
  currentCard: {
    borderColor: '#10B981',
    backgroundColor: '#0F172A',
  },
  currentBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  currentBadgeText: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#38BDF8',
  },
  description: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 14,
  },
  benefitsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#CBD5E1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  selectButton: {
    marginTop: 16,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
