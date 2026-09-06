import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { usePaymentHistory } from '../hooks';
import { PaymentStatusBadge } from '../components';

interface PaymentHistoryScreenProps {
  navigation: any;
}

export const PaymentHistoryScreen: React.FC<PaymentHistoryScreenProps> = ({
  navigation,
}) => {
  const { data: transactions, isLoading, refetch } = usePaymentHistory();

  const formatMoney = (minor: number) => `$${(minor / 100).toFixed(2)}`;

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Loading payment history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor="#38BDF8"
          />
        }
      >
        {!transactions || transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Transactions Found</Text>
            <Text style={styles.emptySubtext}>
              You have not made any payments yet. Receipts will appear here once processed.
            </Text>
          </View>
        ) : (
          transactions.map((tx) => (
            <TouchableOpacity
              key={tx.id}
              style={styles.card}
              onPress={() =>
                navigation.navigate('PaymentDetails', { transactionId: tx.id })
              }
            >
              <View style={styles.cardTop}>
                <View style={styles.leftInfo}>
                  <Text style={styles.description}>
                    {tx.description || `Charge via ${tx.provider}`}
                  </Text>
                  <Text style={styles.dateText}>
                    {new Date(tx.createdAt).toLocaleDateString('en-AU', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <PaymentStatusBadge status={tx.status} />
              </View>

              <View style={styles.cardBottom}>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodText}>
                    {tx.paymentMethod?.brand || tx.paymentMethodType || 'CARD'} ••••{' '}
                    {tx.paymentMethod?.last4 || '••••'}
                  </Text>
                </View>
                <Text style={styles.amountText}>{formatMoney(tx.amountMinor)}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 20,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  leftInfo: {
    flex: 1,
    paddingRight: 10,
  },
  description: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  dateText: {
    color: '#64748B',
    fontSize: 12,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  amountText: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
