import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { InvoiceLineItem } from '../types';

interface InvoiceItemRowProps {
  item: InvoiceLineItem;
  currency?: string;
}

export const InvoiceItemRow: React.FC<InvoiceItemRowProps> = ({ item }) => {
  const formatMoney = (amountMinor: number) => {
    return `$${(amountMinor / 100).toFixed(2)}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftCol}>
        <Text style={styles.description}>{item.description}</Text>
        <Text style={styles.quantity}>
          Qty: {item.quantity} × {formatMoney(item.unitAmountMinor)}
        </Text>
      </View>
      <View style={styles.rightCol}>
        <Text style={styles.total}>{formatMoney(item.totalMinor)}</Text>
        {item.discountMinor > 0 && (
          <Text style={styles.discount}>-{formatMoney(item.discountMinor)}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  leftCol: {
    flex: 1,
    paddingRight: 12,
  },
  description: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  quantity: {
    color: '#94A3B8',
    fontSize: 12,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  total: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  discount: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
