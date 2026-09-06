import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Screen, Card, Badge, MetricCard, ProgressRing } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';

export const OutletManagerHomeScreen: React.FC = () => {
  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>BRANCH OPERATIONS · OUTLET MANAGER</Text>
          <Text style={styles.managerName}>David Miller · Perth CBD</Text>
        </View>
        <Badge label="FACILITY GREEN" variant="success" />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* KPI Metrics */}
        <View style={styles.metricsRow}>
          <MetricCard
            label="TODAY'S VISITS"
            value="384"
            unit="check-ins"
            change="+14%"
            trend="up"
            icon="users"
            accentColor={themeColors.accent}
            style={styles.flexMetric}
          />
          <MetricCard
            label="CLASS OCCUPANCY"
            value="92%"
            unit="roster"
            change="+4%"
            trend="up"
            icon="dumbbell"
            accentColor={themeColors.primary}
            style={styles.flexMetric}
          />
        </View>

        {/* Live Facility Occupancy Gauge */}
        <Card style={styles.occupancyCard}>
          <View style={styles.occupancyHeader}>
            <View>
              <Text style={styles.sectionHeading}>LIVE FACILITY OCCUPANCY</Text>
              <Text style={styles.occupancyCount}>142 Members On-Floor</Text>
              <Text style={styles.occupancyCap}>Max Safe Capacity: 250</Text>
            </View>
            <ProgressRing
              progress={57}
              size={84}
              strokeWidth={8}
              color={themeColors.accent}
              valueText="57%"
              label="PEAK LOAD"
            />
          </View>
        </Card>

        {/* Hardware & IoT Controllers Health */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>FACILITY HARDWARE & ACCESS POINTS</Text>

          <View style={styles.deviceRow}>
            <View style={styles.deviceItem}>
              <View style={styles.dotOnline} />
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>Turnstiles 1–4</Text>
                <Text style={styles.deviceStatus}>All 4 Online · 0 Failures</Text>
              </View>
            </View>
            <Badge label="100% ONLINE" variant="success" />
          </View>

          <View style={styles.deviceRow}>
            <View style={styles.deviceItem}>
              <View style={styles.dotOnline} />
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>Studio Access Relays</Text>
                <Text style={styles.deviceStatus}>Studio 1 & 2 Latches Active</Text>
              </View>
            </View>
            <Badge label="HEALTHY" variant="success" />
          </View>

          <View style={styles.deviceRow}>
            <View style={styles.deviceItem}>
              <View style={styles.dotOnline} />
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>Climate & Air Quality</Text>
                <Text style={styles.deviceStatus}>21.2°C · 480 ppm CO2 (Optimal)</Text>
              </View>
            </View>
            <Badge label="OPTIMAL" variant="success" />
          </View>
        </Card>

        {/* Staff on Duty Roster */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>STAFF ON DUTY TODAY</Text>

          <View style={styles.staffList}>
            <View style={styles.staffItem}>
              <View style={styles.staffAvatar}>
                <Text style={styles.avatarLetter}>MB</Text>
              </View>
              <View style={styles.staffDetails}>
                <Text style={styles.staffName}>Marcus Brody</Text>
                <Text style={styles.staffRole}>Master Trainer · Shift: 08:00–18:00</Text>
              </View>
              <Badge label="FLOOR DUTY" variant="accent" />
            </View>

            <View style={styles.staffItem}>
              <View style={styles.staffAvatar}>
                <Text style={styles.avatarLetter}>EW</Text>
              </View>
              <View style={styles.staffDetails}>
                <Text style={styles.staffName}>Emma Watson</Text>
                <Text style={styles.staffRole}>Reception Lead · Shift: 07:00–15:30</Text>
              </View>
              <Badge label="FRONT DESK" variant="info" />
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
  managerName: {
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
  occupancyCard: {
    padding: spacing[4],
  },
  occupancyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeading: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  occupancyCount: {
    ...typography.h2,
    color: themeColors.textPrimary,
    fontWeight: '800',
    marginTop: 4,
  },
  occupancyCap: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  sectionCard: {
    padding: spacing[4],
    gap: spacing[3],
  },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[1.5],
    borderBottomWidth: 1,
    borderBottomColor: themeColors.surface,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
  },
  dotOnline: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: themeColors.success,
  },
  deviceInfo: {
    gap: 2,
  },
  deviceName: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  deviceStatus: {
    fontSize: 11,
    color: themeColors.textSecondary,
  },
  staffList: {
    gap: spacing[2.5],
  },
  staffItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[1],
  },
  staffAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: themeColors.surfaceActive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  staffDetails: {
    flex: 1,
    gap: 2,
  },
  staffName: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  staffRole: {
    fontSize: 11,
    color: themeColors.textMuted,
  },
});
