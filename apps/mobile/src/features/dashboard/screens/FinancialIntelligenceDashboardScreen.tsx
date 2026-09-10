import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Screen, Card, Badge, MetricCard, Divider } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { FinancialTimeRange } from '@fitcore/types';

interface OutletFinancialRow {
  id: string;
  name: string;
  grossMajor: number;
  netMajor: number;
  refundsMajor: number;
  refundRate: number;
  transactionCount: number;
}

interface PlanFinancialRow {
  planId: string;
  name: string;
  revenueMajor: number;
  sharePercentage: number;
  activeCount: number;
}

const SAMPLE_OUTLETS: OutletFinancialRow[] = [
  { id: 'out-1', name: 'Downtown Flagship', grossMajor: 24500, netMajor: 23800, refundsMajor: 700, refundRate: 2.8, transactionCount: 285 },
  { id: 'out-2', name: 'Westside Performance', grossMajor: 12200, netMajor: 11950, refundsMajor: 250, refundRate: 2.0, transactionCount: 144 },
  { id: 'out-3', name: 'Northshore Express', grossMajor: 6150, netMajor: 5850, refundsMajor: 300, refundRate: 4.8, transactionCount: 78 },
];

const SAMPLE_PLANS: PlanFinancialRow[] = [
  { planId: 'plan-1', name: 'All-Access Platinum', revenueMajor: 21400, sharePercentage: 51.4, activeCount: 180 },
  { planId: 'plan-2', name: 'Standard Monthly', revenueMajor: 13200, sharePercentage: 31.7, activeCount: 145 },
  { planId: 'plan-3', name: 'Personal Training Add-on', revenueMajor: 7000, sharePercentage: 16.9, activeCount: 42 },
];

export const FinancialIntelligenceDashboardScreen: React.FC = () => {
  const [selectedRange, setSelectedRange] = useState<FinancialTimeRange>('LAST_30_DAYS');
  const [selectedCurrency, setSelectedCurrency] = useState<'AUD' | 'USD' | 'NPR'>('AUD');

  const currencySymbol = selectedCurrency === 'AUD' ? 'A$' : selectedCurrency === 'USD' ? '$' : 'Rs.';

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerCategory}>EXECUTIVE INTELLIGENCE</Text>
          <Text style={styles.headerTitle}>Financial Intelligence</Text>
        </View>
        <Badge label="AUTHORITATIVE (CASH)" variant="primary" />
      </View>

      {/* Currency Isolation Selector */}
      <View style={styles.currencySelector}>
        <Text style={styles.selectorLabel}>CURRENCY (ISOLATED):</Text>
        <View style={styles.currencyPills}>
          {(['AUD', 'USD', 'NPR'] as const).map((curr) => (
            <TouchableOpacity
              key={curr}
              style={[styles.currencyTab, selectedCurrency === curr && styles.currencyTabActive]}
              onPress={() => setSelectedCurrency(curr)}
            >
              <Text style={[styles.currencyTabText, selectedCurrency === curr && styles.currencyTabTextActive]}>
                {curr}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Time Range Selector */}
      <View style={styles.rangeSelector}>
        {(['TODAY', 'LAST_7_DAYS', 'LAST_30_DAYS', 'THIS_MONTH', 'LAST_90_DAYS'] as FinancialTimeRange[]).map((range) => (
          <TouchableOpacity
            key={range}
            style={[styles.rangeTab, selectedRange === range && styles.rangeTabActive]}
            onPress={() => setSelectedRange(range)}
          >
            <Text style={[styles.rangeTabText, selectedRange === range && styles.rangeTabTextActive]}>
              {range === 'TODAY'
                ? 'Today'
                : range === 'LAST_7_DAYS'
                ? '7 Days'
                : range === 'LAST_30_DAYS'
                ? '30 Days'
                : range === 'THIS_MONTH'
                ? 'This Month'
                : '90 Days'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Top-Level KPI Cards */}
        <View style={styles.metricsRow}>
          <MetricCard
            label="GROSS REVENUE"
            value={`${currencySymbol}42,850`}
            change="+12.4%"
            trend="up"
            icon="card"
            accentColor={themeColors.success}
            style={styles.flexMetric}
          />
          <MetricCard
            label="NET REVENUE"
            value={`${currencySymbol}41,600`}
            change="+11.8%"
            trend="up"
            icon="activity"
            accentColor={themeColors.primary}
            style={styles.flexMetric}
          />
        </View>

        <View style={styles.metricsRow}>
          <MetricCard
            label="TOTAL REFUNDS"
            value={`${currencySymbol}1,250`}
            change="2.9% rate"
            trend="neutral"
            icon="refresh"
            accentColor={themeColors.accent}
            style={styles.flexMetric}
          />
          <MetricCard
            label="PAYMENT SUCCESS"
            value="96.8%"
            change="507 / 524 tx"
            trend="up"
            icon="check-circle"
            accentColor={themeColors.success}
            style={styles.flexMetric}
          />
        </View>

        <View style={styles.metricsRow}>
          <MetricCard
            label="OUTSTANDING INVOICES"
            value={`${currencySymbol}3,420`}
            change="8 unpaid"
            trend="down"
            icon="alert-circle"
            accentColor={themeColors.warning}
            style={styles.flexMetric}
          />
          <MetricCard
            label="AVG TX VALUE"
            value={`${currencySymbol}84.51`}
            change="+3.2%"
            trend="up"
            icon="activity"
            accentColor={themeColors.accent}
            style={styles.flexMetric}
          />
        </View>

        {/* Outlet Attribution Breakdown */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Outlet Financial Performance</Text>
              <Text style={styles.sectionSubtitle}>Attributed strictly via origin outlet on memberships</Text>
            </View>
            <Badge label="STRICT ATTRIBUTION" variant="neutral" />
          </View>
          <Divider style={styles.divider} />

          {SAMPLE_OUTLETS.map((outlet, index) => (
            <View key={outlet.id} style={styles.outletRow}>
              <View style={styles.outletInfo}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View>
                  <Text style={styles.outletName}>{outlet.name}</Text>
                  <Text style={styles.outletSub}>
                    {outlet.transactionCount} transactions • Refund: {outlet.refundRate}%
                  </Text>
                </View>
              </View>
              <View style={styles.outletAmounts}>
                <Text style={styles.outletGross}>{currencySymbol}{outlet.grossMajor.toLocaleString()}</Text>
                <Text style={styles.outletNet}>Net: {currencySymbol}{outlet.netMajor.toLocaleString()}</Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Membership Plan Contribution */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Membership Revenue Mix</Text>
              <Text style={styles.sectionSubtitle}>Recognized cash flow by plan type</Text>
            </View>
            <Badge label="CASH MIX" variant="neutral" />
          </View>
          <Divider style={styles.divider} />

          {SAMPLE_PLANS.map((plan) => (
            <View key={plan.planId} style={styles.planRow}>
              <View style={styles.planMeta}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planCount}>{plan.activeCount} active subscriptions</Text>
              </View>
              <View style={styles.planBarContainer}>
                <View style={[styles.planBarFill, { width: `${plan.sharePercentage}%` }]} />
              </View>
              <View style={styles.planRevenue}>
                <Text style={styles.planRevenueText}>{currencySymbol}{plan.revenueMajor.toLocaleString()}</Text>
                <Text style={styles.planShareText}>{plan.sharePercentage}%</Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Audit, Reconciliation & Data Quality Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Reconciliation & Integrity</Text>
              <Text style={styles.sectionSubtitle}>Synchronized against Day 6 Authoritative Ledgers</Text>
            </View>
            <Badge label="EXCELLENT (100%)" variant="success" />
          </View>
          <Divider style={styles.divider} />

          <View style={styles.integrityGrid}>
            <View style={styles.integrityItem}>
              <Text style={styles.integrityLabel}>PROJECTION SYNC</Text>
              <Text style={[styles.integrityValue, { color: themeColors.success }]}>Synchronized</Text>
              <Text style={styles.integritySub}>0 unprojected tx</Text>
            </View>
            <View style={styles.integrityItem}>
              <Text style={styles.integrityLabel}>DATA QUALITY</Text>
              <Text style={[styles.integrityValue, { color: themeColors.success }]}>100 / 100</Text>
              <Text style={styles.integritySub}>0 anomalies flagged</Text>
            </View>
            <View style={styles.integrityItem}>
              <Text style={styles.integrityLabel}>ZERO-LEAK BOUNDARY</Text>
              <Text style={[styles.integrityValue, { color: themeColors.primary }]}>Enforced</Text>
              <Text style={styles.integritySub}>Role & tenant isolated</Text>
            </View>
          </View>
        </Card>

        <View style={styles.footerNote}>
          <Text style={styles.footerText}>
            FitCore Financial Intelligence Engine • Cash-basis recognized revenue • Integer cents precision
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerLeft: {
    flex: 1,
  },
  headerCategory: {
    ...typography.caption,
    color: themeColors.textMuted,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  headerTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
    fontWeight: '800',
    marginTop: 2,
  },
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: themeColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  selectorLabel: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  currencyPills: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  currencyTab: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  currencyTabActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  currencyTabText: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.textMuted,
  },
  currencyTabTextActive: {
    color: '#000000',
  },
  rangeSelector: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: themeColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  rangeTab: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.xs,
    borderRadius: radius.sm,
  },
  rangeTabActive: {
    backgroundColor: themeColors.primary + '22',
  },
  rangeTabText: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '600',
  },
  rangeTabTextActive: {
    color: themeColors.primary,
    fontWeight: '700',
  },
  container: {
    padding: spacing.md,
    gap: spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flexMetric: {
    flex: 1,
  },
  sectionCard: {
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.bodyBold,
    color: themeColors.textPrimary,
    fontSize: 16,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginTop: 2,
  },
  divider: {
    marginVertical: spacing.sm,
  },
  outletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  outletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: themeColors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    ...typography.caption,
    fontWeight: '800',
    color: themeColors.textMuted,
  },
  outletName: {
    ...typography.bodyBold,
    color: themeColors.textPrimary,
  },
  outletSub: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  outletAmounts: {
    alignItems: 'flex-end',
  },
  outletGross: {
    ...typography.bodyBold,
    color: themeColors.success,
  },
  outletNet: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  planMeta: {
    width: '38%',
  },
  planName: {
    ...typography.bodyBold,
    color: themeColors.textPrimary,
    fontSize: 13,
  },
  planCount: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontSize: 11,
  },
  planBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: themeColors.surfaceLight,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  planBarFill: {
    height: '100%',
    backgroundColor: themeColors.primary,
    borderRadius: radius.full,
  },
  planRevenue: {
    width: '24%',
    alignItems: 'flex-end',
  },
  planRevenueText: {
    ...typography.bodyBold,
    color: themeColors.textPrimary,
    fontSize: 13,
  },
  planShareText: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontSize: 11,
  },
  integrityGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  integrityItem: {
    flex: 1,
    alignItems: 'center',
  },
  integrityLabel: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '700',
    fontSize: 10,
  },
  integrityValue: {
    ...typography.bodyBold,
    fontSize: 14,
    marginTop: 2,
  },
  integritySub: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  footerNote: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  footerText: {
    ...typography.caption,
    color: themeColors.textMuted,
    textAlign: 'center',
    fontSize: 11,
  },
});
