import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useInvoices, usePaymentMethods, usePaymentHistory } from '../hooks';
import { PaymentStatusBadge, PaymentMethodCard } from '../components';

interface BillingScreenProps {
  navigation: any;
}

export const BillingScreen: React.FC<BillingScreenProps> = ({ navigation }) => {
  const { data: invoices, isLoading: loadingInvoices } = useInvoices();
  const { data: paymentMethods, isLoading: loadingMethods } = usePaymentMethods();
  const { data: transactions, isLoading: loadingTxs } = usePaymentHistory();

  const isLoading = loadingInvoices || loadingMethods || loadingTxs;

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Loading billing information...</Text>
      </View>
    );
  }

  const openInvoices = invoices?.filter((i) => i.status === 'OPEN') || [];
  const firstOpen = openInvoices.length > 0 ? openInvoices[0] : null;
  const defaultMethod = paymentMethods?.find((m) => m.isDefault) || paymentMethods?.[0];
  const recentTransactions = transactions?.slice(0, 3) || [];

  const formatMoney = (minor: number) => `$${(minor / 100).toFixed(2)}`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Billing & Financials</Text>
        <Text style={styles.headerSubtitle}>
          Second Wind Athletic Club — Accounts & Invoicing
        </Text>
      </View>

      {/* Due Invoices Alert / Summary Card */}
      {firstOpen ? (
        <View style={styles.alertCard}>
          <View style={styles.alertHeader}>
            <View>
              <Text style={styles.alertTitle}>OUTSTANDING BALANCE</Text>
              <Text style={styles.alertAmount}>
                {formatMoney(
                  openInvoices.reduce((acc, curr) => acc + curr.amountDueMinor, 0)
                )}
              </Text>
            </View>
            <View style={styles.dueBadge}>
              <Text style={styles.dueBadgeText}>{openInvoices.length} INVOICE DUE</Text>
            </View>
          </View>

          <Text style={styles.alertSubtext}>
            Next due: {new Date(firstOpen.dueDate).toLocaleDateString('en-AU')}
          </Text>

          <TouchableOpacity
            style={styles.payButton}
            onPress={() =>
              navigation.navigate('InvoiceDetails', { invoiceId: firstOpen.id })
            }
          >
            <Text style={styles.payButtonText}>Review & Pay Now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.upToDateCard}>
          <Text style={styles.upToDateTitle}>✓ All Caught Up</Text>
          <Text style={styles.upToDateSubtext}>
            You have no outstanding invoices. Your next cycle will bill automatically.
          </Text>
        </View>
      )}

      {/* Quick Navigation Cards */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={styles.navCard}
          onPress={() => navigation.navigate('Invoices')}
        >
          <Text style={styles.navCardTitle}>Invoices</Text>
          <Text style={styles.navCardSubtitle}>
            {invoices?.length || 0} total invoices
          </Text>
          <Text style={styles.navCardAction}>View All →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navCard}
          onPress={() => navigation.navigate('PaymentHistory')}
        >
          <Text style={styles.navCardTitle}>Receipts</Text>
          <Text style={styles.navCardSubtitle}>
            {transactions?.length || 0} payments
          </Text>
          <Text style={styles.navCardAction}>History →</Text>
        </TouchableOpacity>
      </View>

      {/* Payment Method Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>PAYMENT METHOD</Text>
        <TouchableOpacity onPress={() => navigation.navigate('PaymentMethods')}>
          <Text style={styles.sectionLink}>Manage</Text>
        </TouchableOpacity>
      </View>

      {defaultMethod ? (
        <PaymentMethodCard
          method={defaultMethod}
          onSelect={() => navigation.navigate('PaymentMethods')}
        />
      ) : (
        <TouchableOpacity
          style={styles.addMethodBox}
          onPress={() => navigation.navigate('AddPaymentMethod')}
        >
          <Text style={styles.addMethodText}>+ Add a Payment Method</Text>
        </TouchableOpacity>
      )}

      {/* Recent Activity */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>RECENT TRANSACTIONS</Text>
        <TouchableOpacity onPress={() => navigation.navigate('PaymentHistory')}>
          <Text style={styles.sectionLink}>View All</Text>
        </TouchableOpacity>
      </View>

      {recentTransactions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No recent transactions found.</Text>
        </View>
      ) : (
        recentTransactions.map((tx) => (
          <TouchableOpacity
            key={tx.id}
            style={styles.txRow}
            onPress={() =>
              navigation.navigate('PaymentDetails', { transactionId: tx.id })
            }
          >
            <View style={styles.txLeft}>
              <Text style={styles.txDescription}>
                {tx.description || `Charge via ${tx.provider}`}
              </Text>
              <Text style={styles.txDate}>
                {new Date(tx.createdAt).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <View style={styles.txRight}>
              <Text style={styles.txAmount}>{formatMoney(tx.amountMinor)}</Text>
              <PaymentStatusBadge status={tx.status} />
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
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
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  alertCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#38BDF8',
    marginBottom: 20,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  alertTitle: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  alertAmount: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  dueBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  dueBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
  },
  alertSubtext: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 8,
    marginBottom: 16,
  },
  payButton: {
    backgroundColor: '#38BDF8',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  upToDateCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginBottom: 20,
  },
  upToDateTitle: {
    color: '#34D399',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  upToDateSubtext: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  navCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  navCardTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  navCardSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
  },
  navCardAction: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sectionLink: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
  },
  addMethodBox: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
  },
  addMethodText: {
    color: '#38BDF8',
    fontWeight: '600',
    fontSize: 14,
  },
  txRow: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  txLeft: {
    flex: 1,
    paddingRight: 10,
  },
  txDescription: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  txDate: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 3,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  txAmount: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
});
