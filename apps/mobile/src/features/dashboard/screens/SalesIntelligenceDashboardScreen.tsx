import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Screen, Card, Badge, MetricCard, Divider } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { SalesTimeRange } from '@fitcore/types';

interface FunnelStage {
  stage: string;
  name: string;
  count: number;
  percentage: number;
  conversionRate: number | null;
}

const SAMPLE_FUNNEL: FunnelStage[] = [
  { stage: 'LEAD', name: 'Leads Captured', count: 128, percentage: 100, conversionRate: 74.2 },
  { stage: 'CONTACTED', name: 'Contacted', count: 95, percentage: 74.2, conversionRate: 67.4 },
  { stage: 'QUALIFIED', name: 'Qualified', count: 64, percentage: 50.0, conversionRate: 59.4 },
  { stage: 'TRIAL', name: 'Trial Pass', count: 38, percentage: 29.7, conversionRate: 68.4 },
  { stage: 'TOUR_BOOKED', name: 'Tour Booked', count: 26, percentage: 20.3, conversionRate: 73.1 },
  { stage: 'OFFERED', name: 'Offer Presented', count: 19, percentage: 14.8, conversionRate: 68.4 },
  { stage: 'CONVERTED', name: 'Converted', count: 13, percentage: 10.2, conversionRate: null },
];

export const SalesIntelligenceDashboardScreen: React.FC = () => {
  const [selectedRange, setSelectedRange] = useState<SalesTimeRange>('LAST_30_DAYS');

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerCategory}>EXECUTIVE INTELLIGENCE</Text>
          <Text style={styles.headerTitle}>Sales & Conversion Analytics</Text>
        </View>
        <Badge label="AUTHORITATIVE" variant="primary" />
      </View>

      {/* Time Range Selector */}
      <View style={styles.rangeSelector}>
        {(['TODAY', 'LAST_7_DAYS', 'LAST_30_DAYS', 'THIS_MONTH'] as SalesTimeRange[]).map((range) => (
          <TouchableOpacity
            key={range}
            style={[styles.rangeTab, selectedRange === range && styles.rangeTabActive]}
            onPress={() => setSelectedRange(range)}
          >
            <Text style={[styles.rangeTabText, selectedRange === range && styles.rangeTabTextActive]}>
              {range === 'TODAY' ? 'Today' : range === 'LAST_7_DAYS' ? '7 Days' : range === 'LAST_30_DAYS' ? '30 Days' : 'This Month'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Top-Level KPI Cards */}
        <View style={styles.metricsRow}>
          <MetricCard
            label="NEW LEADS"
            value="128"
            change="+14.2%"
            trend="up"
            icon="users"
            accentColor={themeColors.accent}
            style={styles.flexMetric}
          />
          <MetricCard
            label="QUALIFIED LEADS"
            value="64"
            change="+18.5%"
            trend="up"
            icon="shield"
            accentColor={themeColors.primary}
            style={styles.flexMetric}
          />
        </View>

        <View style={styles.metricsRow}>
          <MetricCard
            label="CONVERSIONS"
            value="13"
            change="+8.3%"
            trend="up"
            icon="check"
            accentColor={themeColors.success}
            style={styles.flexMetric}
          />
          <MetricCard
            label="CONVERSION RATE"
            value="10.2%"
            change="+0.8% pts"
            trend="up"
            icon="activity"
            accentColor={themeColors.accent}
            style={styles.flexMetric}
          />
        </View>

        <View style={styles.metricsRow}>
          <MetricCard
            label="SPEED TO LEAD"
            value="142s"
            change="-28s faster"
            trend="up"
            icon="clock"
            accentColor={themeColors.success}
            style={styles.flexMetric}
          />
          <MetricCard
            label="EST. PIPELINE"
            value="$42,800"
            change="+12.4%"
            trend="up"
            icon="card"
            accentColor={themeColors.primary}
            style={styles.flexMetric}
          />
        </View>

        {/* Visual Sales Funnel Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeading}>SALES FUNNEL PROGRESSION</Text>
            <Badge label="10.2% TOTAL CONV" variant="success" />
          </View>

          <View style={styles.funnelContainer}>
            {SAMPLE_FUNNEL.map((stage) => (
              <View key={stage.stage} style={styles.funnelRow}>
                <View style={styles.funnelLabelRow}>
                  <Text style={styles.funnelStageName}>{stage.name}</Text>
                  <Text style={styles.funnelStageCount}>{stage.count}</Text>
                </View>

                <View style={styles.funnelBarBackground}>
                  <View style={[styles.funnelBarFill, { width: `${stage.percentage}%` }]} />
                </View>

                {stage.conversionRate !== null && (
                  <Text style={styles.stageConvRate}>
                    {stage.conversionRate}% progress to next stage
                  </Text>
                )}
              </View>
            ))}
          </View>
        </Card>

        {/* Follow-Up & AI Performance Card */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>AI & AUTOMATION VELOCITY</Text>
          <Text style={styles.sectionSubheading}>Observational correlation across touchpoints</Text>

          <Divider style={styles.divider} />

          <View style={styles.statGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>184</Text>
              <Text style={styles.statLabel}>Follow-Ups Sent</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>31.5%</Text>
              <Text style={styles.statLabel}>Response Rate</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>78</Text>
              <Text style={styles.statLabel}>AI Conversations</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>9</Text>
              <Text style={styles.statLabel}>Conversions Post-AI</Text>
            </View>
          </View>
        </Card>

        {/* Top Loss Reasons Card */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>TOP PIPELINE LOSS REASONS</Text>
          <View style={styles.lossList}>
            <View style={styles.lossItem}>
              <Text style={styles.lossReason}>Price / Membership Cost</Text>
              <Badge label="38%" variant="accent" />
            </View>
            <View style={styles.lossItem}>
              <Text style={styles.lossReason}>No Response / Unreachable</Text>
              <Badge label="24%" variant="outline" />
            </View>
            <View style={styles.lossItem}>
              <Text style={styles.lossReason}>Location / Distance</Text>
              <Badge label="18%" variant="outline" />
            </View>
          </View>
        </Card>
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
    fontSize: typography.sizes.xs,
    fontFamily: typography.weights.bold,
    color: themeColors.muted,
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.weights.bold,
    color: themeColors.text,
    marginTop: 2,
  },
  rangeSelector: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  rangeTab: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    borderRadius: radius.sm,
    backgroundColor: themeColors.surface,
  },
  rangeTabActive: {
    backgroundColor: themeColors.primary,
  },
  rangeTabText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.weights.medium,
    color: themeColors.muted,
  },
  rangeTabTextActive: {
    color: themeColors.text,
    fontFamily: typography.weights.bold,
  },
  container: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  flexMetric: {
    flex: 1,
  },
  sectionCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionHeading: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.weights.bold,
    color: themeColors.text,
    letterSpacing: 0.5,
  },
  sectionSubheading: {
    fontSize: typography.sizes.xs,
    color: themeColors.muted,
    marginTop: 2,
  },
  divider: {
    marginVertical: spacing.sm,
  },
  funnelContainer: {
    marginTop: spacing.xs,
  },
  funnelRow: {
    marginBottom: spacing.sm,
  },
  funnelLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  funnelStageName: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.weights.medium,
    color: themeColors.text,
  },
  funnelStageCount: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.weights.bold,
    color: themeColors.primary,
  },
  funnelBarBackground: {
    height: 8,
    backgroundColor: themeColors.surface,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  funnelBarFill: {
    height: '100%',
    backgroundColor: themeColors.primary,
    borderRadius: radius.full,
  },
  stageConvRate: {
    fontSize: 10,
    color: themeColors.muted,
    marginTop: 2,
    textAlign: 'right',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: themeColors.surface,
    padding: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.weights.bold,
    color: themeColors.text,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: themeColors.muted,
    marginTop: 2,
  },
  lossList: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  lossItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  lossReason: {
    fontSize: typography.sizes.sm,
    color: themeColors.text,
  },
});
