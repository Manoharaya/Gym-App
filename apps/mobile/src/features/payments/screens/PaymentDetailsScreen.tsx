import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { usePaymentDetails } from '../hooks';
import { PaymentStatusBadge } from '../components';

interface PaymentDetailsScreenProps {
  route: any;
  navigation: any;
}

export const PaymentDetailsScreen: React.FC<PaymentDetailsScreenProps> = ({
  route,
  navigation,
}) => {
  const { transactionId } = route.params || {};
  const { data: tx, isLoading } = usePaymentDetails(transactionId);

  const formatMoney = (minor: number) => `$${(minor / 100).toFixed(2)}`;

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Loading receipt details...</Text>
      </View>
    );
  }

  if (!tx) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Transaction Not Found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Receipt Hero */}
      <View style={styles.heroCard}>
        <Text style={styles.receiptHeader}>PAYMENT RECEIPT</Text>
        <Text style={styles.amountDisplay}>{formatMoney(tx.amountMinor)}</Text>
        <Text style={styles.currencyDisplay}>{tx.currency} • AUD</Text>

        <View style={styles.badgeWrap}>
          <PaymentStatusBadge status={tx.status} />
        </View>

        <Text style={styles.timestamp}>
          {new Date(tx.createdAt).toLocaleDateString('en-AU', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      {/* Transaction Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>TRANSACTION INFORMATION</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Reference ID</Text>
          <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="middle">
            {tx.providerTransactionId || tx.id}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Provider</Text>
          <Text style={styles.detailValue}>{tx.provider}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Payment Method</Text>
          <Text style={styles.detailValue}>
            {tx.paymentMethod?.brand || tx.paymentMethodType} ••••{' '}
            {tx.paymentMethod?.last4 || '••••'}
          </Text>
        </View>

        {tx.description && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Description</Text>
            <Text style={styles.detailValue}>{tx.description}</Text>
          </View>
        )}
      </View>

      {/* Linked Invoice */}
      {tx.invoice && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>LINKED INVOICE</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Invoice Number</Text>
            <Text style={styles.detailValue}>{tx.invoice.invoiceNumber}</Text>
          </View>

          <TouchableOpacity
            style={styles.invoiceBtn}
            onPress={() =>
              navigation.navigate('InvoiceDetails', { invoiceId: tx.invoice?.id })
            }
          >
            <Text style={styles.invoiceBtnText}>View Full Invoice Details →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Refunds if any */}
      {tx.refunds && tx.refunds.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>REFUNDS ISSUED</Text>
          {tx.refunds.map((ref) => (
            <View key={ref.id} style={styles.refundRow}>
              <View>
                <Text style={styles.refundReason}>{ref.reason || 'Staff Refund'}</Text>
                <Text style={styles.refundDate}>
                  {new Date(ref.createdAt).toLocaleDateString('en-AU')}
                </Text>
              </View>
              <Text style={styles.refundAmount}>-{formatMoney(ref.amountMinor)}</Text>
            </View>
          ))}
        </View>
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
  },
  errorTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  backBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#334155',
    borderRadius: 8,
  },
  backBtnText: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  heroCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  receiptHeader: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  amountDisplay: {
    color: '#F8FAFC',
    fontSize: 36,
    fontWeight: '800',
  },
  currencyDisplay: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
    marginBottom: 12,
  },
  badgeWrap: {
    marginBottom: 12,
  },
  timestamp: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  cardTitle: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#0F172A',
  },
  detailLabel: {
    color: '#94A3B8',
    fontSize: 13,
  },
  detailValue: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  invoiceBtn: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  invoiceBtnText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
  },
  refundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#0F172A',
  },
  refundReason: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  refundDate: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  refundAmount: {
    color: '#C084FC',
    fontSize: 14,
    fontWeight: '700',
  },
});
