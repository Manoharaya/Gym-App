import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { PaymentMethod } from '../types';

interface PaymentMethodCardProps {
  method: PaymentMethod;
  isSelected?: boolean;
  onSelect?: () => void;
  onSetDefault?: () => void;
  onRemove?: () => void;
  showActions?: boolean;
}

export const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  method,
  isSelected,
  onSelect,
  onSetDefault,
  onRemove,
  showActions = false,
}) => {
  const brandDisplay = method.brand ? method.brand.toUpperCase() : 'CARD';
  const expiryDisplay =
    method.expiryMonth && method.expiryYear
      ? `${String(method.expiryMonth).padStart(2, '0')}/${String(method.expiryYear).slice(-2)}`
      : 'N/A';

  return (
    <TouchableOpacity
      activeOpacity={onSelect ? 0.8 : 1}
      onPress={onSelect}
      style={[
        styles.card,
        isSelected && styles.selectedCard,
        method.isDefault && styles.defaultCard,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.brandContainer}>
          <Text style={styles.brandText}>{brandDisplay}</Text>
        </View>
        {method.isDefault && (
          <View style={styles.defaultPill}>
            <Text style={styles.defaultPillText}>DEFAULT</Text>
          </View>
        )}
      </View>

      <Text style={styles.cardNumber}>
        ••••  ••••  ••••  {method.last4 || '••••'}
      </Text>

      <View style={styles.bottomRow}>
        <View>
          <Text style={styles.metaLabel}>EXPIRES</Text>
          <Text style={styles.metaValue}>{expiryDisplay}</Text>
        </View>

        {showActions && (
          <View style={styles.actionButtons}>
            {!method.isDefault && onSetDefault && (
              <TouchableOpacity style={styles.actionBtn} onPress={onSetDefault}>
                <Text style={styles.actionBtnText}>Set Default</Text>
              </TouchableOpacity>
            )}
            {onRemove && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.removeBtn]}
                onPress={onRemove}
              >
                <Text style={styles.removeBtnText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  selectedCard: {
    borderColor: '#38BDF8',
    backgroundColor: '#0F2540',
  },
  defaultCard: {
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandContainer: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  brandText: {
    color: '#38BDF8',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
  defaultPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  defaultPillText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardNumber: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 2.5,
    marginBottom: 16,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  metaLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
  },
  metaValue: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  actionBtnText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  removeBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  removeBtnText: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: '600',
  },
});
