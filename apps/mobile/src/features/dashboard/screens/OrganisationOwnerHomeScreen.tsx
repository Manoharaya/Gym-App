import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Screen, Card, Badge, MetricCard } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';

interface OutletPerformance {
  id: string;
  name: string;
  members: number;
  mrr: string;
  utilization: string;
  status: 'OPTIMAL' | 'GROWING' | 'STABLE';
}

const OUTLETS_DATA: OutletPerformance[] = [
  { id: 'o1', name: 'Perth CBD Flagship', members: 920, mrr: '$92,000', utilization: '88%', status: 'OPTIMAL' },
  { id: 'o2', name: 'Fremantle Harbor Club', members: 640, mrr: '$61,500', utilization: '74%', status: 'GROWING' },
  { id: 'o3', name: 'South West Regional', members: 280, mrr: '$30,500', utilization: '62%', status: 'STABLE' },
];

export const OrganisationOwnerHomeScreen: React.FC = () => {
  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>EXECUTIVE CONSOLE · ORGANISATION OWNER</Text>
          <Text style={styles.ownerName}>Robert Sterling</Text>
        </View>
        <Badge label="SECOND WIND CLUB" variant="primary" />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Executive Growth KPIs */}
        <View style={styles.metricsRow}>
          <MetricCard
            label="NETWORK MRR"
            value="$184k"
            change="+12.4% MoM"
            trend="up"
            icon="card"
            accentColor={themeColors.success}
            style={styles.flexMetric}
          />
          <MetricCard
            label="ACTIVE MEMBERS"
            value="1,840"
            change="+142 net new"
            trend="up"
            icon="users"
            accentColor={themeColors.accent}
            style={styles.flexMetric}
          />
        </View>

        {/* Retention & Network Health Card */}
        <Card style={styles.retentionCard}>
          <View style={styles.retentionHeader}>
            <View>
              <Text style={styles.sectionHeading}>RETENTION & CHURN</Text>
              <Text style={styles.retentionRate}>94.2% Retention Rate</Text>
              <Text style={styles.retentionSubtitle}>Churn below industry benchmark (2.1%)</Text>
            </View>
            <Badge label="TOP DECILE" variant="accent" />
          </View>
        </Card>

        {/* Multi-Branch Performance Comparison */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>OUTLET NETWORK COMPARISON</Text>

          <View style={styles.outletsList}>
            {OUTLETS_DATA.map((outlet) => (
              <View key={outlet.id} style={styles.outletItem}>
                <View style={styles.outletHeader}>
                  <Text style={styles.outletName}>{outlet.name}</Text>
                  <Badge
                    label={outlet.status}
                    variant={outlet.status === 'OPTIMAL' ? 'success' : 'accent'}
                  />
                </View>

                <View style={styles.outletStatsGrid}>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>Members</Text>
                    <Text style={styles.statValue}>{outlet.members}</Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>MRR</Text>
                    <Text style={styles.statValue}>{outlet.mrr}</Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>Peak Capacity</Text>
                    <Text style={styles.statValue}>{outlet.utilization}</Text>
                  </View>
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
  ownerName: {
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
  retentionCard: {
    padding: spacing[4],
    backgroundColor: '#121A28',
    borderColor: '#1D3B5E',
    borderWidth: 1,
  },
  retentionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sectionHeading: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  retentionRate: {
    ...typography.h2,
    color: themeColors.success,
    fontWeight: '800',
    marginTop: 4,
  },
  retentionSubtitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  sectionCard: {
    padding: spacing[4],
    gap: spacing[3],
  },
  outletsList: {
    gap: spacing[3],
  },
  outletItem: {
    backgroundColor: themeColors.surface,
    padding: spacing[3.5],
    borderRadius: radius.md,
    gap: spacing[2.5],
  },
  outletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outletName: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  outletStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCol: {
    gap: 2,
  },
  statLabel: {
    fontSize: 10,
    color: themeColors.textMuted,
    textTransform: 'uppercase',
  },
  statValue: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
});
