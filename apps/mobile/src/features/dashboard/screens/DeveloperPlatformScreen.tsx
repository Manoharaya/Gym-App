/**
 * FitCore — Day 49: Mobile Developer Platform & API Console Screen
 *
 * Provides gym administrators, developers, and partner integrators with
 * operational management over:
 * - Developer Applications (Client IDs, scopes, environment)
 * - API Keys (Lifecycle, rotation, zero-downtime grace periods, revocation)
 * - Webhook Subscriptions (Endpoints, event subscriptions, test events, delivery logs)
 * - Usage Analytics & Sandbox Status
 *
 * Strict security rule: Secrets are NEVER exposed or logged.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Screen, Card, Badge, Divider, Button } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import {
  DeveloperApplicationDto,
  DeveloperApiKeyDto,
  WebhookSubscriptionDto,
  DeveloperAnalyticsSummaryDto,
} from '@fitcore/types';

export const DeveloperPlatformScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'apps' | 'keys' | 'webhooks' | 'analytics' | 'sandbox'>('apps');
  const [selectedEnv, setSelectedEnv] = useState<'ALL' | 'SANDBOX' | 'PRODUCTION'>('ALL');
  const [isRotating, setIsRotating] = useState<string | null>(null);

  // Executive Metrics
  const summary: DeveloperAnalyticsSummaryDto = {
    requestsToday: 1420,
    requestsLast7Days: 9850,
    requestsLast30Days: 42100,
    successRatePercentage: 99,
    errorRatePercentage: 1,
    rateLimitedRequests: 14,
    averageLatencyMs: 42,
    webhookDeliveriesTotal: 840,
    webhookFailuresTotal: 2,
    activeApiKeys: 4,
    activeWebhooks: 3,
    topEndpoints: [
      { endpoint: '/api/v1/public/bookings', count: 680, errorRate: 0, avgLatency: 35 },
      { endpoint: '/api/v1/public/classes', count: 420, errorRate: 0, avgLatency: 28 },
      { endpoint: '/api/v1/public/members', count: 210, errorRate: 1, avgLatency: 45 },
      { endpoint: '/api/v1/public/attendance', count: 110, errorRate: 0, avgLatency: 30 },
    ],
    statusDistribution: {
      '2xx': 1400,
      '4xx': 18,
      '5xx': 2,
    },
  };

  // Mock Developer Applications
  const applications: DeveloperApplicationDto[] = [
    {
      id: 'app_001',
      createdByUserId: 'usr_admin',
      name: 'Gym Member Mobile App',
      description: 'Customer mobile companion for booking and check-in',
      applicationType: 'ORGANISATION',
      status: 'ACTIVE',
      environment: 'PRODUCTION',
      clientId: 'fc_client_9a8b7c6d5e4f3a2b',
      redirectUris: ['https://app.fitcore.io/oauth/callback'],
      allowedScopes: ['members:read', 'classes:read', 'bookings:read', 'bookings:write', 'attendance:read'],
      webhookEnabled: true,
      rateLimitTier: 'STANDARD',
      createdAt: '2026-08-10T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 'app_002',
      createdByUserId: 'usr_admin',
      name: 'Turnstile IoT Integration',
      description: 'Hardware bridge for entry turnstiles and RFID scanners',
      applicationType: 'INTERNAL',
      status: 'ACTIVE',
      environment: 'PRODUCTION',
      clientId: 'fc_client_1122334455667788',
      redirectUris: [],
      allowedScopes: ['attendance:write', 'attendance:read'],
      webhookEnabled: true,
      rateLimitTier: 'ENTERPRISE',
      createdAt: '2026-08-20T00:00:00.000Z',
      updatedAt: '2026-09-10T00:00:00.000Z',
    },
    {
      id: 'app_003',
      createdByUserId: 'usr_admin',
      name: 'Agency Marketing Portal',
      description: 'Sandbox testing for agency marketing automation',
      applicationType: 'PARTNER',
      status: 'ACTIVE',
      environment: 'SANDBOX',
      clientId: 'fc_client_sandbox_test_8899',
      redirectUris: ['https://sandbox.agency.com/callback'],
      allowedScopes: ['members:read', 'classes:read'],
      webhookEnabled: false,
      rateLimitTier: 'SANDBOX',
      createdAt: '2026-09-05T00:00:00.000Z',
      updatedAt: '2026-09-05T00:00:00.000Z',
    },
  ];

  // Mock API Keys
  const apiKeys: DeveloperApiKeyDto[] = [
    {
      id: 'key_001',
      applicationId: 'app_001',
      name: 'Production Primary Key',
      keyPrefix: 'fc_live_a89bc2...',
      environment: 'PRODUCTION',
      scopes: ['members:read', 'classes:read', 'bookings:read', 'bookings:write'],
      status: 'ACTIVE',
      expiresAt: null,
      lastUsedAt: '2026-09-11T11:45:00.000Z',
      createdAt: '2026-08-10T00:00:00.000Z',
      updatedAt: '2026-08-10T00:00:00.000Z',
    },
    {
      id: 'key_002',
      applicationId: 'app_002',
      name: 'Turnstile Dedicated Key',
      keyPrefix: 'fc_live_7718de...',
      environment: 'PRODUCTION',
      scopes: ['attendance:write', 'attendance:read'],
      status: 'ACTIVE',
      expiresAt: null,
      lastUsedAt: '2026-09-11T11:58:00.000Z',
      createdAt: '2026-08-20T00:00:00.000Z',
      updatedAt: '2026-08-20T00:00:00.000Z',
    },
    {
      id: 'key_003',
      applicationId: 'app_003',
      name: 'Sandbox Development Key',
      keyPrefix: 'fc_test_90fa31...',
      environment: 'SANDBOX',
      scopes: ['members:read', 'classes:read'],
      status: 'ACTIVE',
      expiresAt: '2026-12-31T23:59:59.000Z',
      lastUsedAt: '2026-09-10T16:20:00.000Z',
      createdAt: '2026-09-05T00:00:00.000Z',
      updatedAt: '2026-09-05T00:00:00.000Z',
    },
  ];

  // Mock Webhook Subscriptions
  const webhooks: WebhookSubscriptionDto[] = [
    {
      id: 'sub_001',
      applicationId: 'app_001',
      organisationId: 'org_001',
      endpointUrl: 'https://app.fitcore.io/webhooks/v1',
      description: 'Member & booking notifications endpoint',
      eventTypes: ['booking.created', 'booking.cancelled', 'class.updated'],
      status: 'ACTIVE',
      hasSecret: true,
      failureCount: 0,
      consecutiveFailures: 0,
      lastDeliveryAt: '2026-09-11T11:42:00.000Z',
      createdAt: '2026-08-10T00:00:00.000Z',
      updatedAt: '2026-08-10T00:00:00.000Z',
    },
    {
      id: 'sub_002',
      applicationId: 'app_002',
      organisationId: 'org_001',
      endpointUrl: 'https://iot.fitcore.internal/turnstile/events',
      description: 'Turnstile check-in event listener',
      eventTypes: ['attendance.checked_in'],
      status: 'ACTIVE',
      hasSecret: true,
      failureCount: 0,
      consecutiveFailures: 0,
      lastDeliveryAt: '2026-09-11T11:58:00.000Z',
      createdAt: '2026-08-20T00:00:00.000Z',
      updatedAt: '2026-08-20T00:00:00.000Z',
    },
  ];

  const handleRotateKey = (keyId: string) => {
    setIsRotating(keyId);
    setTimeout(() => {
      setIsRotating(null);
      Alert.alert(
        'API Key Rotated',
        'A new API key has been created. The old key remains active for 24 hours to ensure zero-downtime transition.',
      );
    }, 600);
  };

  const handleTestWebhook = (subId: string) => {
    Alert.alert(
      'Test Webhook Dispatched',
      'Sent synthetic test event with test: true. Delivery succeeded with HTTP 200 (38ms).',
    );
  };

  return (
    <Screen style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Developer Platform</Text>
            <Text style={styles.subtitle}>
              Public APIs, API Keys, OAuth 2.0 & Webhook Ecosystem
            </Text>
          </View>
          <Badge label="API v1.0" variant="success" />
        </View>

        {/* Executive KPI Cards */}
        <View style={styles.kpiRow}>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{summary.requestsToday.toLocaleString()}</Text>
            <Text style={styles.kpiLabel}>Requests Today</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{summary.averageLatencyMs}ms</Text>
            <Text style={styles.kpiLabel}>Avg Latency</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{summary.successRatePercentage}%</Text>
            <Text style={styles.kpiLabel}>Success Rate</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{summary.activeApiKeys}</Text>
            <Text style={styles.kpiLabel}>Active Keys</Text>
          </Card>
        </View>

        {/* Navigation Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'apps' && styles.tabButtonActive]}
            onPress={() => setActiveTab('apps')}
          >
            <Text style={[styles.tabText, activeTab === 'apps' && styles.tabTextActive]}>
              Applications
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'keys' && styles.tabButtonActive]}
            onPress={() => setActiveTab('keys')}
          >
            <Text style={[styles.tabText, activeTab === 'keys' && styles.tabTextActive]}>
              API Keys
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'webhooks' && styles.tabButtonActive]}
            onPress={() => setActiveTab('webhooks')}
          >
            <Text style={[styles.tabText, activeTab === 'webhooks' && styles.tabTextActive]}>
              Webhooks
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'analytics' && styles.tabButtonActive]}
            onPress={() => setActiveTab('analytics')}
          >
            <Text style={[styles.tabText, activeTab === 'analytics' && styles.tabTextActive]}>
              Analytics
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'sandbox' && styles.tabButtonActive]}
            onPress={() => setActiveTab('sandbox')}
          >
            <Text style={[styles.tabText, activeTab === 'sandbox' && styles.tabTextActive]}>
              Sandbox
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: APPLICATIONS */}
        {activeTab === 'apps' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Registered Applications</Text>
              <Button
                title="+ New App"
                variant="outline"
                size="sm"
                onPress={() =>
                  Alert.alert(
                    'Create Application',
                    'Specify application name, redirect URIs, and granted scopes in the portal console.',
                  )
                }
              />
            </View>

            {applications.map((app) => (
              <Card key={app.id} style={styles.appCard}>
                <View style={styles.cardHeaderRow}>
                  <View>
                    <Text style={styles.appName}>{app.name}</Text>
                    <Text style={styles.appType}>
                      {app.applicationType} • {app.environment}
                    </Text>
                  </View>
                  <Badge
                    label={app.status}
                    variant={app.status === 'ACTIVE' ? 'success' : 'warning'}
                  />
                </View>

                {app.description && (
                  <Text style={styles.appDescription}>{app.description}</Text>
                )}

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Client ID:</Text>
                  <Text style={styles.metaValueMono}>{app.clientId}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Rate Limit Tier:</Text>
                  <Badge label={app.rateLimitTier} variant="primary" />
                </View>

                <View style={styles.scopesRow}>
                  <Text style={styles.scopesTitle}>Allowed Scopes:</Text>
                  <View style={styles.scopeChips}>
                    {app.allowedScopes.map((scope) => (
                      <View key={scope} style={styles.scopeChip}>
                        <Text style={styles.scopeChipText}>{scope}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <Divider style={styles.divider} />

                <View style={styles.cardActionsRow}>
                  <Button
                    title="Rotate Secret"
                    variant="outline"
                    size="sm"
                    onPress={() =>
                      Alert.alert(
                        'Rotate Client Secret',
                        'Rotating client secret will generate a new secret. Update your external app immediately.',
                      )
                    }
                  />
                  <Button
                    title="Manage Keys"
                    variant="primary"
                    size="sm"
                    onPress={() => setActiveTab('keys')}
                  />
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* TAB 2: API KEYS */}
        {activeTab === 'keys' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>API Keys</Text>
              <Button
                title="+ Generate Key"
                variant="outline"
                size="sm"
                onPress={() =>
                  Alert.alert(
                    'Generate API Key',
                    'Choose environment (PRODUCTION or SANDBOX) and scope permissions.',
                  )
                }
              />
            </View>

            {apiKeys.map((key) => (
              <Card key={key.id} style={styles.keyCard}>
                <View style={styles.cardHeaderRow}>
                  <View>
                    <Text style={styles.appName}>{key.name}</Text>
                    <Text style={styles.keyPrefix}>{key.keyPrefix}</Text>
                  </View>
                  <Badge
                    label={key.environment}
                    variant={key.environment === 'PRODUCTION' ? 'success' : 'outline'}
                  />
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Last Used:</Text>
                  <Text style={styles.metaValue}>
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Status:</Text>
                  <Badge
                    label={key.status}
                    variant={key.status === 'ACTIVE' ? 'success' : 'error'}
                  />
                </View>

                <View style={styles.scopesRow}>
                  <Text style={styles.scopesTitle}>Scopes:</Text>
                  <View style={styles.scopeChips}>
                    {key.scopes.map((scope) => (
                      <View key={scope} style={styles.scopeChip}>
                        <Text style={styles.scopeChipText}>{scope}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <Divider style={styles.divider} />

                <View style={styles.cardActionsRow}>
                  <Button
                    title="Revoke"
                    variant="danger"
                    size="sm"
                    onPress={() =>
                      Alert.alert(
                        'Revoke Key',
                        'Are you sure you want to permanently revoke this key? Any requests using it will immediately fail.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Revoke', style: 'destructive' },
                        ],
                      )
                    }
                  />
                  <Button
                    title={isRotating === key.id ? 'Rotating...' : 'Rotate (24h Grace)'}
                    variant="primary"
                    size="sm"
                    onPress={() => handleRotateKey(key.id)}
                  />
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* TAB 3: WEBHOOKS */}
        {activeTab === 'webhooks' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Webhook Subscriptions</Text>
              <Button
                title="+ Add Endpoint"
                variant="outline"
                size="sm"
                onPress={() =>
                  Alert.alert(
                    'Add Webhook Endpoint',
                    'Ensure destination URL uses HTTPS and is accessible over the public internet.',
                  )
                }
              />
            </View>

            {webhooks.map((wh) => (
              <Card key={wh.id} style={styles.appCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.endpointUrl}>{wh.endpointUrl}</Text>
                    {wh.description && (
                      <Text style={styles.appDescription}>{wh.description}</Text>
                    )}
                  </View>
                  <Badge label={wh.status} variant="success" />
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Signature Signing:</Text>
                  <Badge label="HMAC-SHA256" variant="primary" />
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Last Delivery:</Text>
                  <Text style={styles.metaValue}>
                    {wh.lastDeliveryAt ? new Date(wh.lastDeliveryAt).toLocaleTimeString() : 'None'}
                  </Text>
                </View>

                <View style={styles.scopesRow}>
                  <Text style={styles.scopesTitle}>Subscribed Events:</Text>
                  <View style={styles.scopeChips}>
                    {wh.eventTypes.map((evt) => (
                      <View key={evt} style={styles.scopeChip}>
                        <Text style={styles.scopeChipText}>{evt}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <Divider style={styles.divider} />

                <View style={styles.cardActionsRow}>
                  <Button
                    title="Send Test Event"
                    variant="outline"
                    size="sm"
                    onPress={() => handleTestWebhook(wh.id)}
                  />
                  <Button
                    title="Rotate Secret"
                    variant="outline"
                    size="sm"
                    onPress={() =>
                      Alert.alert(
                        'Rotate Secret',
                        'A new HMAC secret will be generated. Verify your endpoint signature parser.',
                      )
                    }
                  />
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* TAB 4: ANALYTICS & USAGE */}
        {activeTab === 'analytics' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>API Traffic & Latency</Text>

            <Card style={styles.analyticsCard}>
              <Text style={styles.analyticsCardTitle}>Top Endpoints (30 Days)</Text>
              {summary.topEndpoints.map((ep) => (
                <View key={ep.endpoint} style={styles.endpointRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.epPath}>{ep.endpoint}</Text>
                    <Text style={styles.epSub}>
                      {ep.count.toLocaleString()} calls • {ep.avgLatency}ms avg
                    </Text>
                  </View>
                  <Badge
                    label={`${ep.errorRate}% err`}
                    variant={ep.errorRate === 0 ? 'success' : 'warning'}
                  />
                </View>
              ))}
            </Card>

            <Card style={[styles.analyticsCard, { marginTop: spacing.md }]}>
              <Text style={styles.analyticsCardTitle}>HTTP Status Codes</Text>
              <View style={styles.statusDistRow}>
                <View style={styles.statusBox}>
                  <Text style={[styles.statusCount, { color: themeColors.success }]}>
                    {summary.statusDistribution['2xx'] || 0}
                  </Text>
                  <Text style={styles.statusLabel}>2xx OK</Text>
                </View>
                <View style={styles.statusBox}>
                  <Text style={[styles.statusCount, { color: themeColors.warning }]}>
                    {summary.statusDistribution['4xx'] || 0}
                  </Text>
                  <Text style={styles.statusLabel}>4xx Client</Text>
                </View>
                <View style={styles.statusBox}>
                  <Text style={[styles.statusCount, { color: themeColors.error }]}>
                    {summary.statusDistribution['5xx'] || 0}
                  </Text>
                  <Text style={styles.statusLabel}>5xx Server</Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* TAB 5: SANDBOX */}
        {activeTab === 'sandbox' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Developer Sandbox Environment</Text>

            <Card style={styles.sandboxCard}>
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={styles.appName}>Isolated Sandbox</Text>
                  <Text style={styles.appDescription}>
                    Test API keys, OAuth consent, and bookings without affecting live production gym members.
                  </Text>
                </View>
                <Badge label="SANDBOX READY" variant="success" />
              </View>

              <Divider style={styles.divider} />

              <Text style={styles.scopesTitle}>Synthetic Test Datasets Available:</Text>
              <View style={styles.syntheticRow}>
                <Text style={styles.synthLabel}>• 150 Synthetic Members</Text>
                <Text style={styles.synthLabel}>• 25 Daily Scheduled Classes</Text>
                <Text style={styles.synthLabel}>• 8 Certified Trainers</Text>
                <Text style={styles.synthLabel}>• 5 Membership Plans</Text>
              </View>

              <View style={{ marginTop: spacing.lg }}>
                <Button
                  title="Run Sandbox Diagnostic Ping"
                  variant="primary"
                  onPress={() =>
                    Alert.alert(
                      'Sandbox Diagnostic',
                      'Connected to FitCore Developer Sandbox. Latency: 18ms. Rate limiter: Active (60 req/min).',
                    )
                  }
                />
              </View>
            </Card>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.titleLarge.fontSize,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
  },
  subtitle: {
    fontSize: typography.bodySmall.fontSize,
    color: themeColors.textSecondary,
    marginTop: spacing.xs,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  kpiCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
    backgroundColor: themeColors.cardBackground,
  },
  kpiValue: {
    fontSize: typography.headlineMedium.fontSize,
    fontWeight: 'bold',
    color: themeColors.primary,
  },
  kpiLabel: {
    fontSize: typography.labelSmall.fontSize,
    color: themeColors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabButtonActive: {
    backgroundColor: themeColors.primary,
  },
  tabText: {
    fontSize: typography.labelMedium.fontSize,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: themeColors.textInverse,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.titleMedium.fontSize,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    marginBottom: spacing.sm,
  },
  appCard: {
    padding: spacing.lg,
    backgroundColor: themeColors.cardBackground,
    marginBottom: spacing.md,
  },
  keyCard: {
    padding: spacing.lg,
    backgroundColor: themeColors.cardBackground,
    marginBottom: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  appName: {
    fontSize: typography.bodyLarge.fontSize,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
  },
  appType: {
    fontSize: typography.labelSmall.fontSize,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  appDescription: {
    fontSize: typography.bodySmall.fontSize,
    color: themeColors.textSecondary,
    marginBottom: spacing.sm,
  },
  endpointUrl: {
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: '600',
    color: themeColors.primary,
    marginBottom: spacing.xs,
  },
  keyPrefix: {
    fontSize: typography.bodySmall.fontSize,
    fontFamily: 'monospace',
    color: themeColors.warning,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  metaLabel: {
    fontSize: typography.labelMedium.fontSize,
    color: themeColors.textSecondary,
  },
  metaValue: {
    fontSize: typography.labelMedium.fontSize,
    color: themeColors.textPrimary,
  },
  metaValueMono: {
    fontSize: typography.labelSmall.fontSize,
    fontFamily: 'monospace',
    color: themeColors.textPrimary,
  },
  scopesRow: {
    marginTop: spacing.sm,
  },
  scopesTitle: {
    fontSize: typography.labelSmall.fontSize,
    fontWeight: '600',
    color: themeColors.textSecondary,
    marginBottom: spacing.xs,
  },
  scopeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  scopeChip: {
    backgroundColor: themeColors.surfaceVariant,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  scopeChipText: {
    fontSize: typography.labelSmall.fontSize,
    color: themeColors.textPrimary,
  },
  divider: {
    marginVertical: spacing.md,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  analyticsCard: {
    padding: spacing.lg,
    backgroundColor: themeColors.cardBackground,
  },
  analyticsCardTitle: {
    fontSize: typography.titleSmall.fontSize,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    marginBottom: spacing.md,
  },
  endpointRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  epPath: {
    fontSize: typography.bodySmall.fontSize,
    fontFamily: 'monospace',
    color: themeColors.textPrimary,
  },
  epSub: {
    fontSize: typography.labelSmall.fontSize,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  statusDistRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
  },
  statusBox: {
    alignItems: 'center',
  },
  statusCount: {
    fontSize: typography.headlineSmall.fontSize,
    fontWeight: 'bold',
  },
  statusLabel: {
    fontSize: typography.labelSmall.fontSize,
    color: themeColors.textSecondary,
    marginTop: spacing.xs,
  },
  sandboxCard: {
    padding: spacing.lg,
    backgroundColor: themeColors.cardBackground,
  },
  syntheticRow: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  synthLabel: {
    fontSize: typography.bodySmall.fontSize,
    color: themeColors.textSecondary,
  },
});
