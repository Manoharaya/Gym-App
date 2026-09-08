import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, Badge, Icon, MetricCard } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { WearablesService } from '../services/wearablesService';
import type {
  WearableProviderInfo,
  WearableConnectionDto,
  HealthDataSummaryDto,
} from '@fitcore/types';

export const WearablesHomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [providers, setProviders] = useState<WearableProviderInfo[]>([]);
  const [connections, setConnections] = useState<WearableConnectionDto[]>([]);
  const [summary, setSummary] = useState<HealthDataSummaryDto | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [providersData, connectionsData, summaryData] = await Promise.all([
        WearablesService.getProviders().catch(() => []),
        WearablesService.getConnections().catch(() => []),
        WearablesService.getHealthSummary().catch(() => null),
      ]);
      setProviders(providersData);
      setConnections(connectionsData);
      setSummary(summaryData);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const connectedMap = new Map(connections.map((c) => [c.provider, c]));
  const wave1Providers = providers.filter((p) => p.wave === 1);
  const wave2Providers = providers.filter((p) => p.wave === 2);

  const todayMetrics = summary?.dailySummaries?.[summary.dailySummaries.length - 1];

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={22} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wearables & Health</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('WearablePrivacy')}
          style={styles.privacyButton}
        >
          <Icon name="shield" size={18} color={themeColors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.accent}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.accent} />
          </View>
        ) : (
          <>
            {/* AI Recovery & Readiness Intelligence Banner */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('WearableIntelligence')}
              style={styles.aiBannerTouchable}
            >
              <Card style={styles.aiIntelligenceBanner}>
                <View style={styles.aiBannerHeader}>
                  <View style={styles.aiBannerLeft}>
                    <Icon name="sparkles" size={20} color={themeColors.accent} />
                    <Text style={styles.aiBannerTitle}>AI Recovery & Readiness</Text>
                  </View>
                  <Badge label="AI ENGINE" variant="ai" />
                </View>
                <Text style={styles.aiBannerSubtitle}>
                  View personalized recovery trends, rolling baselines, and workout readiness insights.
                </Text>
                <View style={styles.aiBannerAction}>
                  <Text style={styles.aiBannerActionText}>Explore Recovery & Correlations</Text>
                  <Icon name="chevron-right" size={16} color={themeColors.accent} />
                </View>
              </Card>
            </TouchableOpacity>

            {/* Live Today Telemetry Card */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>TODAY'S ACTIVITY</Text>
              <TouchableOpacity onPress={() => navigation.navigate('WearableData')}>
                <Text style={styles.sectionLink}>View All Logs →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.metricsRow}>
              <MetricCard
                label="STEPS"
                value={todayMetrics ? String(todayMetrics.steps.toLocaleString()) : '0'}
                unit="steps"
                icon="activity"
                accentColor={themeColors.accent}
                style={styles.metricCard}
              />
              <MetricCard
                label="ACTIVE ENERGY"
                value={todayMetrics ? String(todayMetrics.activeCaloriesKcal) : '0'}
                unit="kcal"
                icon="flame"
                accentColor={themeColors.warning}
                style={styles.metricCard}
              />
            </View>

            <View style={styles.metricsRow}>
              <MetricCard
                label="DISTANCE"
                value={todayMetrics ? String(todayMetrics.distanceKm) : '0'}
                unit="km"
                icon="map-pin"
                accentColor={themeColors.success}
                style={styles.metricCard}
              />
              <MetricCard
                label="RESTING HR"
                value={todayMetrics?.restingHeartRateBpm ? String(todayMetrics.restingHeartRateBpm) : '--'}
                unit="bpm"
                icon="heart"
                accentColor={themeColors.heartRate}
                style={styles.metricCard}
              />
            </View>

            {/* Connected Providers */}
            <Text style={styles.sectionTitle}>CONNECTED PLATFORMS</Text>
            {connections.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Icon name="activity" size={28} color={themeColors.textTertiary} />
                <Text style={styles.emptyTitle}>No Wearables Connected</Text>
                <Text style={styles.emptyDesc}>
                  Link Apple Health, Health Connect, or Fitbit to automatically sync your workouts and activity.
                </Text>
              </Card>
            ) : (
              connections.map((conn) => {
                const providerInfo = providers.find((p) => p.provider === conn.provider);
                return (
                  <TouchableOpacity
                    key={conn.id}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('WearableConnection', { connectionId: conn.id })}
                  >
                    <Card style={styles.connectionCard}>
                      <View style={styles.providerRow}>
                        <View style={styles.iconContainer}>
                          <Icon name="activity" size={20} color={themeColors.accent} />
                        </View>
                        <View style={styles.providerInfo}>
                          <View style={styles.titleRow}>
                            <Text style={styles.providerName}>{providerInfo?.name || conn.provider}</Text>
                            <Badge
                              label={conn.status}
                              variant={conn.status === 'CONNECTED' ? 'success' : 'warning'}
                            />
                          </View>
                          <Text style={styles.syncText}>
                            {conn.lastSuccessfulSyncAt
                              ? `Last synced: ${new Date(conn.lastSuccessfulSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                              : 'Pending initial sync'}
                          </Text>
                        </View>
                        <Icon name="chevron-right" size={18} color={themeColors.textTertiary} />
                      </View>
                    </Card>
                  </TouchableOpacity>
                );
              })
            )}

            {/* Available Platforms (Wave 1) */}
            <Text style={styles.sectionTitle}>AVAILABLE INTEGRATIONS</Text>
            {wave1Providers.map((prov) => {
              const isConnected = connectedMap.has(prov.provider);
              return (
                <TouchableOpacity
                  key={prov.provider}
                  activeOpacity={0.7}
                  onPress={() =>
                    navigation.navigate('WearableProviderDetail', { provider: prov.provider })
                  }
                >
                  <Card style={styles.providerItemCard}>
                    <View style={styles.providerRow}>
                      <View style={styles.iconContainer}>
                        <Icon
                          name={prov.provider === 'FITBIT' ? 'bolt' : 'activity'}
                          size={20}
                          color={isConnected ? themeColors.success : themeColors.accent}
                        />
                      </View>
                      <View style={styles.providerInfo}>
                        <View style={styles.titleRow}>
                          <Text style={styles.providerName}>{prov.name}</Text>
                          {isConnected ? (
                            <Badge label="LINKED" variant="neutral" />
                          ) : (
                            <Badge label="READY" variant="primary" />
                          )}
                        </View>
                        <Text style={styles.providerDesc} numberOfLines={2}>
                          {prov.description}
                        </Text>
                      </View>
                      <Icon name="chevron-right" size={18} color={themeColors.textTertiary} />
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}

            {/* Wave 2 Future Integrations */}
            <Text style={styles.sectionTitle}>COMING IN WAVE 2</Text>
            {wave2Providers.map((prov) => (
              <Card key={prov.provider} style={styles.disabledProviderCard}>
                <View style={styles.providerRow}>
                  <View style={[styles.iconContainer, styles.disabledIcon]}>
                    <Icon name="timer" size={20} color={themeColors.textTertiary} />
                  </View>
                  <View style={styles.providerInfo}>
                    <View style={styles.titleRow}>
                      <Text style={styles.disabledProviderName}>{prov.name}</Text>
                      <Badge label="COMING SOON" variant="neutral" />
                    </View>
                    <Text style={styles.providerDesc}>{prov.description}</Text>
                  </View>
                </View>
              </Card>
            ))}

            {/* Privacy Guarantee Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('WearablePrivacy')}
            >
              <Card style={styles.privacyCard}>
                <View style={styles.privacyRow}>
                  <Icon name="shield" size={24} color={themeColors.accent} />
                  <View style={styles.privacyTextContainer}>
                    <Text style={styles.privacyHeading}>Member-Owned Health Data</Text>
                    <Text style={styles.privacySub}>
                      Your telemetry belongs exclusively to you. Personal notes and raw sensor feeds are never exposed to gym staff or trainers without your consent.
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={16} color={themeColors.textTertiary} />
                </View>
              </Card>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  privacyButton: {
    padding: spacing.xs,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    paddingVertical: spacing.xxl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: themeColors.textTertiary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionLink: {
    ...typography.caption,
    fontWeight: '600',
    color: themeColors.accent,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: themeColors.surface,
  },
  emptyTitle: {
    ...typography.h4,
    color: themeColors.textPrimary,
    marginTop: spacing.sm,
  },
  emptyDesc: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  connectionCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: themeColors.surface,
    borderColor: themeColors.accent + '33',
  },
  providerItemCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: themeColors.surface,
  },
  disabledProviderCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: themeColors.surface,
    opacity: 0.6,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: themeColors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  disabledIcon: {
    backgroundColor: themeColors.surface,
  },
  providerInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  providerName: {
    ...typography.body,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  disabledProviderName: {
    ...typography.body,
    fontWeight: '600',
    color: themeColors.textTertiary,
  },
  syncText: {
    ...typography.caption,
    color: themeColors.textTertiary,
  },
  providerDesc: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  privacyCard: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: themeColors.surfaceLight,
    borderWidth: 1,
    borderColor: themeColors.accent + '22',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  privacyTextContainer: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  privacyHeading: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  privacySub: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  aiBannerTouchable: {
    marginBottom: spacing.lg,
  },
  aiIntelligenceBanner: {
    padding: spacing.md,
    backgroundColor: themeColors.surfaceLight,
    borderWidth: 1,
    borderColor: themeColors.accent + '44',
  },
  aiBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  aiBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  aiBannerTitle: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  aiBannerSubtitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  aiBannerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  aiBannerActionText: {
    ...typography.caption,
    color: themeColors.accent,
    fontWeight: '600',
  },
});
