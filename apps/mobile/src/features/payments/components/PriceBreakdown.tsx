import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PriceBreakdownProps {
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  feeMinor: number;
  totalMinor: number;
  amountPaidMinor?: number;
  amountDueMinor?: number;
  currency?: string;
}

export const PriceBreakdown: React.FC<PriceBreakdownProps> = ({
  subtotalMinor,
  discountMinor,
  taxMinor,
  feeMinor,
  totalMinor,
  amountPaidMinor = 0,
  amountDueMinor = 0,
  currency = 'AUD',
}) => {
  const formatMoney = (minor: number) => {
    return `$${(minor / 100).toFixed(2)}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SUMMARY BREAKDOWN</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Subtotal</Text>
        <Text style={styles.value}>{formatMoney(subtotalMinor)}</Text>
      </View>

      {discountMinor > 0 && (
        <View style={styles.row}>
          <Text style={[styles.label, styles.discountText]}>Discount Applied</Text>
          <Text style={[styles.value, styles.discountText]}>-{formatMoney(discountMinor)}</Text>
        </View>
      )}

      {taxMinor > 0 && (
        <View style={styles.row}>
          <Text style={styles.label}>Taxes & GST (Included)</Text>
          <Text style={styles.value}>{formatMoney(taxMinor)}</Text>
        </View>
      )}

      {feeMinor > 0 && (
        <View style={styles.row}>
          <Text style={styles.label}>Processing Fee</Text>
          <Text style={styles.value}>{formatMoney(feeMinor)}</Text>
        </View>
      )}

      <View style={[styles.row, styles.totalRow]}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{formatMoney(totalMinor)} {currency}</Text>
      </View>

      {amountPaidMinor > 0 && (
        <View style={styles.row}>
          <Text style={styles.paidLabel}>Amount Paid</Text>
          <Text style={styles.paidValue}>{formatMoney(amountPaidMinor)}</Text>
        </View>
      )}

      <View style={[styles.row, styles.dueRow]}>
        <Text style={styles.dueLabel}>Amount Due</Text>
        <Text style={styles.dueValue}>{formatMoney(amountDueMinor)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  label: {
    color: '#94A3B8',
    fontSize: 13,
  },
  value: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '500',
  },
  discountText: {
    color: '#34D399',
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    marginTop: 8,
    paddingTop: 10,
  },
  totalLabel: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  totalValue: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  paidLabel: {
    color: '#34D399',
    fontSize: 13,
  },
  paidValue: {
    color: '#34D399',
    fontSize: 13,
    fontWeight: '600',
  },
  dueRow: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  dueLabel: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '700',
  },
  dueValue: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: '800',
  },
});
