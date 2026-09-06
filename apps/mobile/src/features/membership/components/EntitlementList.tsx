import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { MembershipEntitlement } from '../types';

interface EntitlementListProps {
  entitlements?: MembershipEntitlement[];
}

export const EntitlementList: React.FC<EntitlementListProps> = ({ entitlements = [] }) => {
  if (entitlements.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Standard facility access privileges included.</Text>
      </View>
    );
  }

  const getFriendlyName = (_type: string, name: string, value?: number) => {
    if (value && value > 0) {
      return `${name} (${value}/mo)`;
    }
    return name;
  };

  return (
    <View style={styles.container}>
      {entitlements.map((ent, idx) => (
        <View key={ent.id || idx} style={styles.itemRow}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkText}>✓</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.itemName}>
              {getFriendlyName(ent.type, ent.name, ent.value)}
            </Text>
            {ent.description && (
              <Text style={styles.itemDescription}>{ent.description}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  checkText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: 'bold',
  },
  textContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  itemDescription: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  emptyContainer: {
    paddingVertical: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
  },
});
