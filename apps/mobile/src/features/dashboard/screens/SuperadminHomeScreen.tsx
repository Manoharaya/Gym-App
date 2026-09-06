import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Screen, Card, Badge, Icon, MetricCard } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';

interface AuditLog {
  id: string;
  time: string;
  tenant: string;
  action: string;
  actor: string;
  status: 'SUCCESS' | 'BLOCKED';
}

const AUDIT_FEED: AuditLog[] = [
  { id: 'al_1', time: 'Just now', tenant: 'Second Wind', action: 'Staff Override: Turnstile Gate 1', actor: 'E. Watson (Reception)', status: 'SUCCESS' },
  { id: 'al_2', time: '14m ago', tenant: 'Ironclad Fitness', action: 'Cross-Tenant Access Attempt', actor: 'Unknown User #882', status: 'BLOCKED' },
  { id: 'al_3', time: '42m ago', tenant: 'Metro Athletics', action: 'Plan Entitlement Update', actor: 'Org Admin', status: 'SUCCESS' },
  { id: 'al_4', time: '1h ago', tenant: 'Second Wind', action: 'Batch Invoicing Run (142 invoices)', actor: 'Automated Billing Cron', status: 'SUCCESS' },
];

export const SuperadminHomeScreen: React.FC = () => {
  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>GLOBAL PLATFORM TELEMETRY · SUPERADMIN</Text>
          <Text style={styles.adminTitle}>FitCore Multi-Tenant Cloud</Text>
        </View>
        <Badge label="SYSTEM HEALTH: 99.98%" variant="success" />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Global Network KPIs */}
        <View style={styles.metricsRow}>
          <MetricCard
            label="ACTIVE ORGANISATIONS"
            value="14"
            unit="48 Outlets"
            change="+2 this month"
            trend="up"
            icon="users"
            accentColor={themeColors.accent}
            style={styles.flexMetric}
          />
          <MetricCard
            label="GROSS VOLUME (MRR)"
            value="$1.82M"
            unit="aud"
            change="+18.4% YoY"
            trend="up"
            icon="card"
            accentColor={themeColors.success}
            style={styles.flexMetric}
          />
        </View>

        {/* AI Gateway Infrastructure Telemetry */}
        <Card style={styles.aiTelemetryCard}>
          <View style={styles.aiHeader}>
            <View style={styles.aiBadgeRow}>
              <Icon name="sparkles" size={16} color="#A78BFA" />
              <Text style={styles.aiHeading}>GLOBAL AI GATEWAY TELEMETRY</Text>
            </View>
            <Badge label="INFERENCE ACTIVE" variant="ai" />
          </View>

          <View style={styles.aiStatsRow}>
            <View style={styles.aiStatItem}>
              <Text style={styles.aiStatVal}>142k</Text>
              <Text style={styles.aiStatLabel}>Tokens / 24h</Text>
            </View>
            <View style={styles.aiStatItem}>
              <Text style={styles.aiStatVal}>240 ms</Text>
              <Text style={styles.aiStatLabel}>Avg Latency</Text>
            </View>
            <View style={styles.aiStatItem}>
              <Text style={styles.aiStatVal}>$32.40</Text>
              <Text style={styles.aiStatLabel}>Daily Compute</Text>
            </View>
          </View>
        </Card>

        {/* IoT Fleet Health */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>FLEET ACCESS CONTROLLERS & IOT</Text>
          <View style={styles.hardwareRow}>
            <View style={styles.hardwareItem}>
              <Text style={styles.hardwareCount}>184</Text>
              <Text style={styles.hardwareLabel}>Turnstiles Online</Text>
            </View>
            <View style={styles.hardwareItem}>
              <Text style={styles.hardwareCount}>0</Text>
              <Text style={styles.hardwareLabel}>Offline Outlets</Text>
            </View>
            <View style={styles.hardwareItem}>
              <Text style={styles.hardwareCount}>100%</Text>
              <Text style={styles.hardwareLabel}>Relay Reliability</Text>
            </View>
          </View>
        </Card>

        {/* Real-time Security & Tamper Audit Feed */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>REAL-TIME SECURITY & AUDIT STREAM</Text>

          <View style={styles.auditList}>
            {AUDIT_FEED.map((log) => (
              <View key={log.id} style={styles.auditItem}>
                <View style={styles.auditHeader}>
                  <Text style={styles.auditTenant}>{log.tenant}</Text>
                  <Badge
                    label={log.status}
                    variant={log.status === 'SUCCESS' ? 'success' : 'danger'}
                  />
                </View>
                <Text style={styles.auditAction}>{log.action}</Text>
                <View style={styles.auditMetaRow}>
                  <Text style={styles.auditActor}>{log.actor}</Text>
                  <Text style={styles.auditTime}>{log.time}</Text>
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
  adminTitle: {
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
  aiTelemetryCard: {
    padding: spacing[4],
    backgroundColor: '#121624',
    borderColor: '#2D2254',
    borderWidth: 1,
    gap: spacing[3],
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  aiHeading: {
    ...typography.caption,
    color: '#A78BFA',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  aiStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: themeColors.surface,
    padding: spacing[3],
    borderRadius: radius.md,
  },
  aiStatItem: {
    alignItems: 'center',
  },
  aiStatVal: {
    ...typography.h3,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  aiStatLabel: {
    fontSize: 10,
    color: themeColors.textMuted,
    marginTop: 2,
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
  hardwareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: themeColors.surface,
    padding: spacing[3],
    borderRadius: radius.md,
  },
  hardwareItem: {
    alignItems: 'center',
  },
  hardwareCount: {
    ...typography.h2,
    color: themeColors.success,
    fontWeight: '800',
  },
  hardwareLabel: {
    fontSize: 10,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  auditList: {
    gap: spacing[2.5],
  },
  auditItem: {
    backgroundColor: themeColors.surface,
    padding: spacing[3],
    borderRadius: radius.md,
    gap: 4,
  },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  auditTenant: {
    ...typography.caption,
    color: themeColors.accent,
    fontWeight: '700',
  },
  auditAction: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  auditMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  auditActor: {
    fontSize: 11,
    color: themeColors.textMuted,
  },
  auditTime: {
    fontSize: 11,
    color: themeColors.textMuted,
  },
});
