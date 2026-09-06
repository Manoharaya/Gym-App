import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useInvoiceDetails, usePaymentMethods, useChargeInvoice } from '../hooks';
import {
  InvoiceStatusBadge,
  PaymentStatusBadge,
  InvoiceItemRow,
  PriceBreakdown,
  PaymentMethodCard,
} from '../components';

interface InvoiceDetailsScreenProps {
  route: any;
  navigation: any;
}

export const InvoiceDetailsScreen: React.FC<InvoiceDetailsScreenProps> = ({
  route,
  navigation,
}) => {
  const { invoiceId } = route.params || {};
  const { data: invoice, isLoading, refetch } = useInvoiceDetails(invoiceId);
  const { data: paymentMethods } = usePaymentMethods();
  const chargeMutation = useChargeInvoice();

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Loading invoice details...</Text>
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Invoice Not Found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const defaultMethod =
    paymentMethods?.find((m) => m.isDefault) || paymentMethods?.[0];

  const handlePayNow = async () => {
    if (!defaultMethod) {
      Alert.alert(
        'Payment Method Required',
        'Please add a payment method before proceeding with payment.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add Method',
            onPress: () => navigation.navigate('AddPaymentMethod'),
          },
        ]
      );
      return;
    }

    try {
      await chargeMutation.mutateAsync({
        invoiceId: invoice.id,
        memberProfileId: invoice.memberProfileId,
        amountMinor: invoice.amountDueMinor,
        currency: invoice.currency,
        paymentMethodId: defaultMethod.id,
        idempotencyKey: `pay_${invoice.id}_${Date.now()}`,
      });

      Alert.alert('Payment Successful', 'Your invoice has been successfully paid!', [
        { text: 'OK', onPress: () => refetch() },
      ]);
    } catch (err: any) {
      Alert.alert(
        'Payment Failed',
        err.message || 'Unable to complete transaction. Please check your card or contact support.'
      );
    }
  };

  const formatMoney = (minor: number) => `$${(minor / 100).toFixed(2)}`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Info */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
            <Text style={styles.dateText}>
              Issued: {new Date(invoice.createdAt).toLocaleDateString('en-AU')}
            </Text>
            <Text style={styles.dateText}>
              Due: {new Date(invoice.dueDate).toLocaleDateString('en-AU')}
            </Text>
          </View>
          <InvoiceStatusBadge status={invoice.status} />
        </View>

        {invoice.description && (
          <Text style={styles.descriptionText}>{invoice.description}</Text>
        )}
      </View>

      {/* Line Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>LINE ITEMS</Text>
        <View style={styles.itemsCard}>
          {(invoice.lineItems || []).map((item) => (
            <InvoiceItemRow key={item.id} item={item} currency={invoice.currency} />
          ))}
        </View>
      </View>

      {/* Price Summary Breakdown */}
      <View style={styles.section}>
        <PriceBreakdown
          subtotalMinor={invoice.subtotalMinor}
          discountMinor={invoice.discountMinor}
          taxMinor={invoice.taxMinor}
          feeMinor={invoice.feeMinor}
          totalMinor={invoice.totalMinor}
          amountPaidMinor={invoice.amountPaidMinor}
          amountDueMinor={invoice.amountDueMinor}
          currency={invoice.currency}
        />
      </View>

      {/* Pay Now Action for OPEN Invoices */}
      {invoice.status === 'OPEN' && invoice.amountDueMinor > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PAYMENT METHOD</Text>
          {defaultMethod ? (
            <PaymentMethodCard
              method={defaultMethod}
              isSelected={true}
              onSelect={() => navigation.navigate('PaymentMethods')}
            />
          ) : (
            <TouchableOpacity
              style={styles.noMethodCard}
              onPress={() => navigation.navigate('AddPaymentMethod')}
            >
              <Text style={styles.noMethodText}>+ Add a Payment Method</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.payButton,
              chargeMutation.isPending && styles.payButtonDisabled,
            ]}
            onPress={handlePayNow}
            disabled={chargeMutation.isPending}
          >
            {chargeMutation.isPending ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <Text style={styles.payButtonText}>
                Pay {formatMoney(invoice.amountDueMinor)} Now
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Linked Transactions */}
      {invoice.transactions && invoice.transactions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PAYMENT TRANSACTIONS</Text>
          {invoice.transactions.map((tx) => (
            <TouchableOpacity
              key={tx.id}
              style={styles.txRow}
              onPress={() =>
                navigation.navigate('PaymentDetails', { transactionId: tx.id })
              }
            >
              <View>
                <Text style={styles.txProvider}>
                  {tx.paymentMethodType} • {tx.provider}
                </Text>
                <Text style={styles.txDate}>
                  {new Date(tx.createdAt).toLocaleDateString('en-AU')}
                </Text>
              </View>
              <View style={styles.txRight}>
                <Text style={styles.txAmount}>{formatMoney(tx.amountMinor)}</Text>
                <PaymentStatusBadge status={tx.status} />
              </View>
            </TouchableOpacity>
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
  headerCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceNumber: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  dateText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  descriptionText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  itemsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  noMethodCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  noMethodText: {
    color: '#38BDF8',
    fontWeight: '600',
  },
  payButton: {
    backgroundColor: '#38BDF8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
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
    marginBottom: 8,
  },
  txProvider: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  txDate: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
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
});
