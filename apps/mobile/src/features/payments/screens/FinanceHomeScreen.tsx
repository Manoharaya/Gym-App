import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Screen, Card, Badge, MetricCard } from '../../../components/primitives';
import { themeColors, typography, spacing } from '../../../theme';

interface InvoiceEntry {
  id: string;
  invoiceNumber: string;
  memberName: string;
  amount: string;
  status: 'PAID' | 'OPEN' | 'OVERDUE' | 'REFUNDED';
}

const RECENT_INVOICES: InvoiceEntry[] = [
  { id: 'i1', invoiceNumber: 'INV-202609-0142', memberName: 'Alex Chen', amount: '$120.00', status: 'PAID' },
  { id: 'i2', invoiceNumber: 'INV-202609-0141', memberName: 'Sarah Connor', amount: '$120.00', status: 'PAID' },
  { id: 'i3', invoiceNumber: 'INV-202609-0139', memberName: 'James Wilson', amount: '$80.00', status: 'OVERDUE' },
  { id: 'i4', invoiceNumber: 'INV-202609-0138', memberName: 'Marcus Brody', amount: '$0.00', status: 'PAID' },
];

export const FinanceHomeScreen: React.FC = () => {
  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>FINANCE & BILLING CENTER</Text>
          <Text style={styles.financeTitle}>Revenue & Reconciliation</Text>
        </View>
        <Badge label="XERO SYNCED" variant="success" />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Financial KPIs */}
        <View style={styles.metricsRow}>
          <MetricCard
            label="COLLECTED REVENUE"
            value="$178.4k"
            unit="aud"
            change="96.8% collected"
            trend="up"
            icon="card"
            accentColor={themeColors.success}
            style={styles.flexMetric}
          />
          <MetricCard
            label="OUTSTANDING ARREARS"
            value="$5,800"
            unit="14 accounts"
            change="Dunning Active"
            trend="down"
            icon="alert-circle"
            accentColor={themeColors.danger}
            style={styles.flexMetric}
          />
        </View>

        {/* Integration Sync Status */}
        <Card style={styles.syncCard}>
          <View style={styles.syncRow}>
            <View style={styles.syncItem}>
              <View style={styles.dotSuccess} />
              <Text style={styles.syncLabel}>Stripe Gateway: Active</Text>
            </View>
            <View style={styles.syncItem}>
              <View style={styles.dotSuccess} />
              <Text style={styles.syncLabel}>Xero Ledger: Reconciled</Text>
            </View>
          </View>
        </Card>

        {/* Invoices Ledger Preview */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>RECENT INVOICES & TRANSACTIONS</Text>

          <View style={styles.invoicesList}>
            {RECENT_INVOICES.map((inv) => (
              <View key={inv.id} style={styles.invoiceItem}>
                <View style={styles.invoiceInfo}>
                  <Text style={styles.invoiceNumber}>{inv.invoiceNumber}</Text>
                  <Text style={styles.invoiceMember}>{inv.memberName}</Text>
                </View>

                <View style={styles.invoiceAmountRow}>
                  <Text style={styles.invoiceAmount}>{inv.amount}</Text>
                  <Badge
                    label={inv.status}
                    variant={inv.status === 'PAID' ? 'success' : 'danger'}
                  />
                </View>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    backgroundColor: themeColors.surface,
  },
  headerLeft: {
    gap: 2,
  },
  greeting: {
    fontSize: 10,
    fontWeight: '800',
    color: themeColors.textMuted,
    letterSpacing: 0.5,
  },
  financeTitle: {
    ...typography.h2,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  container: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[10],
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  flexMetric: {
    flex: 1,
  },
  syncCard: {
    padding: spacing[3.5],
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  syncItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  dotSuccess: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: themeColors.success,
  },
  syncLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  sectionCard: {
    padding: spacing[4],
    gap: spacing[3],
  },
  sectionHeading: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  invoicesList: {
    gap: spacing[2.5],
  },
  invoiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: themeColors.surface,
  },
  invoiceInfo: {
    gap: 2,
  },
  invoiceNumber: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  invoiceMember: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  invoiceAmountRow: {
    alignItems: 'flex-end',
    gap: 4,
  },
  invoiceAmount: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
});
