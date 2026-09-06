import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useInvoices } from '../hooks';
import { InvoiceStatusBadge } from '../components';

interface InvoicesScreenProps {
  navigation: any;
}

export const InvoicesScreen: React.FC<InvoicesScreenProps> = ({ navigation }) => {
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'PAID'>('ALL');
  const { data: invoices, isLoading, refetch } = useInvoices();

  const filteredInvoices = (invoices || []).filter((inv) => {
    if (filter === 'ALL') return true;
    return inv.status === filter;
  });

  const formatMoney = (minor: number) => `$${(minor / 100).toFixed(2)}`;

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Loading invoices...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.tabBar}>
        {(['ALL', 'OPEN', 'PAID'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, filter === tab && styles.activeTab]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.tabText, filter === tab && styles.activeTabText]}>
              {tab === 'OPEN' ? 'DUE / OPEN' : tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#38BDF8" />}
      >
        {filteredInvoices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Invoices Found</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'OPEN'
                ? 'Great news! You have no outstanding unpaid invoices.'
                : 'There are no invoices matching the selected filter.'}
            </Text>
          </View>
        ) : (
          filteredInvoices.map((inv) => (
            <TouchableOpacity
              key={inv.id}
              style={styles.card}
              onPress={() => navigation.navigate('InvoiceDetails', { invoiceId: inv.id })}
            >
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.invoiceNumber}>{inv.invoiceNumber}</Text>
                  <Text style={styles.dueDate}>
                    Due: {new Date(inv.dueDate).toLocaleDateString('en-AU', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <InvoiceStatusBadge status={inv.status} />
              </View>

              <View style={styles.cardBottom}>
                <View>
                  <Text style={styles.amountLabel}>
                    {inv.status === 'PAID' ? 'Total Paid' : 'Amount Due'}
                  </Text>
                  <Text
                    style={[
                      styles.amountValue,
                      inv.status === 'OPEN' && styles.amountDueValue,
                    ]}
                  >
                    {formatMoney(
                      inv.status === 'PAID' ? inv.amountPaidMinor : inv.amountDueMinor
                    )}
                  </Text>
                </View>
                <Text style={styles.viewDetailsText}>View Details →</Text>
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
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  activeTab: {
    backgroundColor: '#38BDF8',
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  activeTabText: {
    color: '#0F172A',
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
    marginBottom: 16,
  },
  invoiceNumber: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  dueDate: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  amountLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  amountValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  amountDueValue: {
    color: '#38BDF8',
  },
  viewDetailsText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
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
