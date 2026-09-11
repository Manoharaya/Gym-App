/**
 * FitCore — Day 48: Mobile Integrations Platform Screen
 *
 * Provides gym administrators, managers, and staff with real-time visibility
 * and operational control over connected external providers:
 * - Payments (Stripe)
 * - Accounting (Xero, QuickBooks)
 * - Communications (Twilio, WhatsApp, SendGrid)
 * - Wearables (Apple Health, Health Connect, Fitbit)
 * - Access Control (Door controllers, turnstiles)
 * - Calendars (Google Calendar, Microsoft Outlook)
 *
 * Strict rule: Secret credentials and tokens are NEVER rendered on screen.
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
  IntegrationConnectionDto,
  IntegrationOverviewSummaryDto,
  IntegrationMetadata,
} from '@fitcore/types';

export const IntegrationsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'connected' | 'available' | 'attention' | 'history'>('connected');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Mock Overview Metrics
  const summary: IntegrationOverviewSummaryDto = {
    totalConnections: 6,
    connectedCount: 5,
    healthyCount: 4,
    degradedCount: 1,
    attentionCount: 1,
    syncsLast24h: 34,
    webhooksLast24h: 182,
    categories: {
      PAYMENTS: 1,
      ACCOUNTING: 1,
      COMMUNICATION: 1,
      MESSAGING: 1,
      EMAIL: 0,
      SMS: 1,
      PUSH: 0,
      WEARABLE: 1,
      CALENDAR: 1,
      ACCESS_CONTROL: 1,
      ANALYTICS: 0,
      STORAGE: 0,
      OTHER: 0,
    },
    providers: {
      STRIPE: 1,
      XERO: 1,
      TWILIO: 1,
      FITBIT: 1,
      GOOGLE_CALENDAR: 1,
      ACCESS_CONTROL_PROVIDER: 1,
    },
  };

  // Mock Active Connections
  const [connections, setConnections] = useState<IntegrationConnectionDto[]>([
    {
      id: 'conn-stripe-01',
      organisationId: 'org-01',
      integrationKey: 'STRIPE',
      provider: 'STRIPE',
      category: 'PAYMENTS',
      scope: 'ORGANISATION',
      status: 'CONNECTED',
      environment: 'PRODUCTION',
      externalAccountId: 'acct_1MXXXX2eZvKYlo2C',
      externalAccountName: 'FitCore Primary Merchant Account',
      hasCredentials: true,
      configuration: { defaultCurrency: 'AUD' },
      connectedByUserId: 'usr-admin-01',
      connectedAt: '2026-08-15T08:30:00Z',
      lastSuccessfulOperationAt: '2026-09-11T05:20:00Z',
      lastHealthCheckAt: '2026-09-11T05:30:00Z',
      configurationVersion: 1,
      healthStatus: 'HEALTHY',
      failureCount: 0,
      consecutiveFailures: 0,
      createdAt: '2026-08-15T08:30:00Z',
      updatedAt: '2026-09-11T05:20:00Z',
    },
    {
      id: 'conn-xero-01',
      organisationId: 'org-01',
      integrationKey: 'XERO',
      provider: 'XERO',
      category: 'ACCOUNTING',
      scope: 'ORGANISATION',
      status: 'CONNECTED',
      environment: 'PRODUCTION',
      externalAccountId: 'xero-tenant-8899',
      externalAccountName: 'FitCore Group Pty Ltd',
      hasCredentials: true,
      configuration: { syncFrequencyMinutes: 60 },
      connectedByUserId: 'usr-finance-01',
      connectedAt: '2026-08-20T10:15:00Z',
      lastSuccessfulOperationAt: '2026-09-11T05:10:00Z',
      lastSyncAt: '2026-09-11T05:10:00Z',
      lastHealthCheckAt: '2026-09-11T05:25:00Z',
      configurationVersion: 2,
      healthStatus: 'HEALTHY',
      failureCount: 0,
      consecutiveFailures: 0,
      createdAt: '2026-08-20T10:15:00Z',
      updatedAt: '2026-09-11T05:10:00Z',
    },
    {
      id: 'conn-twilio-01',
      organisationId: 'org-01',
      outletId: 'out-downtown',
      integrationKey: 'TWILIO',
      provider: 'TWILIO',
      category: 'SMS',
      scope: 'OUTLET',
      status: 'CONNECTED',
      environment: 'PRODUCTION',
      externalAccountId: 'AC_twilio_prod_9921',
      externalAccountName: 'Downtown SMS Gateway (+61 400 000 001)',
      hasCredentials: true,
      configuration: { senderId: 'FitCoreDT' },
      connectedByUserId: 'usr-manager-01',
      connectedAt: '2026-08-22T14:00:00Z',
      lastSuccessfulOperationAt: '2026-09-11T05:28:00Z',
      lastHealthCheckAt: '2026-09-11T05:30:00Z',
      configurationVersion: 1,
      healthStatus: 'HEALTHY',
      failureCount: 0,
      consecutiveFailures: 0,
      createdAt: '2026-08-22T14:00:00Z',
      updatedAt: '2026-09-11T05:28:00Z',
    },
    {
      id: 'conn-door-01',
      organisationId: 'org-01',
      outletId: 'out-downtown',
      integrationKey: 'ACCESS_CONTROL_PROVIDER',
      provider: 'ACCESS_CONTROL_PROVIDER',
      category: 'ACCESS_CONTROL',
      scope: 'OUTLET',
      status: 'CONNECTED',
      environment: 'PRODUCTION',
      externalAccountId: 'ctrl_dt_turnstile_01',
      externalAccountName: 'Front Entrance Biometric Turnstile #1',
      hasCredentials: true,
      configuration: { ipAddress: '192.168.10.50' },
      connectedByUserId: 'usr-manager-01',
      connectedAt: '2026-08-25T09:00:00Z',
      lastSuccessfulOperationAt: '2026-09-11T05:02:00Z',
      lastFailedOperationAt: '2026-09-11T05:29:00Z',
      lastHealthCheckAt: '2026-09-11T05:29:00Z',
      configurationVersion: 1,
      healthStatus: 'DEGRADED',
      failureCount: 2,
      consecutiveFailures: 2,
      createdAt: '2026-08-25T09:00:00Z',
      updatedAt: '2026-09-11T05:29:00Z',
    },
    {
      id: 'conn-fitbit-01',
      organisationId: 'org-01',
      memberId: 'mem-001',
      integrationKey: 'FITBIT',
      provider: 'FITBIT',
      category: 'WEARABLE',
      scope: 'MEMBER',
      status: 'CONNECTED',
      environment: 'PRODUCTION',
      externalAccountId: 'fb_usr_alice99',
      externalAccountName: 'Alice Johnson Fitbit Charge 6',
      hasCredentials: true,
      configuration: { syncHr: true, syncSteps: true },
      connectedByUserId: 'usr-member-01',
      connectedAt: '2026-09-01T12:00:00Z',
      lastSuccessfulOperationAt: '2026-09-11T04:00:00Z',
      lastSyncAt: '2026-09-11T04:00:00Z',
      lastHealthCheckAt: '2026-09-11T05:00:00Z',
      configurationVersion: 1,
      healthStatus: 'HEALTHY',
      failureCount: 0,
      consecutiveFailures: 0,
      createdAt: '2026-09-01T12:00:00Z',
      updatedAt: '2026-09-11T04:00:00Z',
    },
    {
      id: 'conn-cal-01',
      organisationId: 'org-01',
      staffId: 'stf-trainer-01',
      integrationKey: 'GOOGLE_CALENDAR',
      provider: 'GOOGLE_CALENDAR',
      category: 'CALENDAR',
      scope: 'STAFF',
      status: 'AUTHENTICATION_REQUIRED',
      environment: 'PRODUCTION',
      externalAccountId: 'trainer.bob@fitcore.app',
      externalAccountName: 'Trainer Bob PT Calendar',
      hasCredentials: true,
      configuration: { syncPtSessions: true },
      connectedByUserId: 'usr-trainer-01',
      connectedAt: '2026-08-28T16:00:00Z',
      lastSuccessfulOperationAt: '2026-09-09T18:00:00Z',
      lastFailedOperationAt: '2026-09-11T05:15:00Z',
      lastHealthCheckAt: '2026-09-11T05:15:00Z',
      configurationVersion: 1,
      healthStatus: 'AUTHENTICATION_REQUIRED',
      failureCount: 3,
      consecutiveFailures: 3,
      createdAt: '2026-08-28T16:00:00Z',
      updatedAt: '2026-09-11T05:15:00Z',
    },
  ]);

  // Catalog of Available Providers
  const availableProviders: IntegrationMetadata[] = [
    {
      integrationKey: 'STRIPE',
      displayName: 'Stripe Payments',
      category: 'PAYMENTS',
      provider: 'STRIPE',
      description: 'Credit cards, Apple Pay, Google Pay, and SEPA direct debit processing.',
      version: '1.0.0',
      capabilities: ['PAYMENTS', 'REFUNDS', 'WEBHOOKS'],
      supportedScopes: ['ORGANISATION'],
      supportedEnvironments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
      authenticationType: 'API_KEY',
      webhookSupport: true,
      syncSupport: false,
      status: 'GA',
    },
    {
      integrationKey: 'XERO',
      displayName: 'Xero Accounting',
      category: 'ACCOUNTING',
      provider: 'XERO',
      description: 'Automated general ledger syncing for sales, refunds, and contacts.',
      version: '1.2.0',
      capabilities: ['CONTACTS', 'INVOICES', 'PAYMENTS', 'REFUNDS', 'CREDIT_NOTES', 'WEBHOOKS', 'ACCOUNTING_SYNC'],
      supportedScopes: ['ORGANISATION'],
      supportedEnvironments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
      authenticationType: 'OAUTH2',
      webhookSupport: true,
      syncSupport: true,
      status: 'GA',
    },
    {
      integrationKey: 'QUICKBOOKS',
      displayName: 'QuickBooks Online',
      category: 'ACCOUNTING',
      provider: 'QUICKBOOKS',
      description: 'Synchronize invoices, payments, tax rates, and customer contacts.',
      version: '1.1.0',
      capabilities: ['CONTACTS', 'INVOICES', 'PAYMENTS', 'REFUNDS', 'ACCOUNTING_SYNC'],
      supportedScopes: ['ORGANISATION'],
      supportedEnvironments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
      authenticationType: 'OAUTH2',
      webhookSupport: true,
      syncSupport: true,
      status: 'GA',
    },
    {
      integrationKey: 'TWILIO',
      displayName: 'Twilio SMS & Messaging',
      category: 'SMS',
      provider: 'TWILIO',
      description: 'High-volume SMS alerts, delivery receipts, and verification codes.',
      version: '1.0.0',
      capabilities: ['SMS', 'MESSAGES', 'WEBHOOKS'],
      supportedScopes: ['ORGANISATION', 'OUTLET'],
      supportedEnvironments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
      authenticationType: 'API_KEY',
      webhookSupport: true,
      syncSupport: false,
      status: 'GA',
    },
    {
      integrationKey: 'WHATSAPP',
      displayName: 'WhatsApp Business API',
      category: 'MESSAGING',
      provider: 'WHATSAPP',
      description: 'Interactive WhatsApp messaging, class alerts, and member check-ins.',
      version: '1.0.0',
      capabilities: ['WHATSAPP', 'MESSAGES', 'WEBHOOKS'],
      supportedScopes: ['ORGANISATION', 'OUTLET'],
      supportedEnvironments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
      authenticationType: 'API_KEY',
      webhookSupport: true,
      syncSupport: false,
      status: 'GA',
    },
    {
      integrationKey: 'SENDGRID',
      displayName: 'SendGrid Email',
      category: 'EMAIL',
      provider: 'SENDGRID',
      description: 'Transactional email delivery, bounce tracking, and open metrics.',
      version: '1.0.0',
      capabilities: ['EMAIL', 'WEBHOOKS'],
      supportedScopes: ['ORGANISATION', 'OUTLET'],
      supportedEnvironments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
      authenticationType: 'API_KEY',
      webhookSupport: true,
      syncSupport: false,
      status: 'GA',
    },
    {
      integrationKey: 'APPLE_HEALTH',
      displayName: 'Apple HealthKit',
      category: 'WEARABLE',
      provider: 'APPLE_HEALTH',
      description: 'Direct mobile sync of heart rate, steps, sleep, and workouts.',
      version: '1.0.0',
      capabilities: ['HEALTH_DATA_READ', 'SYNC'],
      supportedScopes: ['MEMBER'],
      supportedEnvironments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
      authenticationType: 'DEVICE_TOKEN',
      webhookSupport: false,
      syncSupport: true,
      status: 'GA',
    },
    {
      integrationKey: 'FITBIT',
      displayName: 'Fitbit Cloud API',
      category: 'WEARABLE',
      provider: 'FITBIT',
      description: 'Sync wearable biometric telemetry, daily steps, and resting HR.',
      version: '1.0.0',
      capabilities: ['HEALTH_DATA_READ', 'SYNC', 'WEBHOOKS'],
      supportedScopes: ['MEMBER'],
      supportedEnvironments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
      authenticationType: 'OAUTH2',
      webhookSupport: true,
      syncSupport: true,
      status: 'GA',
    },
    {
      integrationKey: 'GOOGLE_CALENDAR',
      displayName: 'Google Calendar',
      category: 'CALENDAR',
      provider: 'GOOGLE_CALENDAR',
      description: 'Staff schedule and PT session calendar synchronization.',
      version: '1.0.0',
      capabilities: ['CALENDAR_READ', 'CALENDAR_WRITE', 'SYNC', 'WEBHOOKS'],
      supportedScopes: ['STAFF', 'ORGANISATION'],
      supportedEnvironments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
      authenticationType: 'OAUTH2',
      webhookSupport: true,
      syncSupport: true,
      status: 'GA',
    },
    {
      integrationKey: 'ACCESS_CONTROL_PROVIDER',
      displayName: 'Turnstile & Door Controllers',
      category: 'ACCESS_CONTROL',
      provider: 'ACCESS_CONTROL_PROVIDER',
      description: 'Biometric, RFID, and barcode door turnstile controllers.',
      version: '1.0.0',
      capabilities: ['ACCESS_CONTROL', 'DEVICE_TELEMETRY', 'WEBHOOKS'],
      supportedScopes: ['OUTLET'],
      supportedEnvironments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
      authenticationType: 'API_KEY',
      webhookSupport: true,
      syncSupport: false,
      status: 'GA',
    },
  ];

  const handleTriggerSync = (connectionId: string, providerName: string) => {
    setSyncingId(connectionId);
    setTimeout(() => {
      setSyncingId(null);
      setConnections((prev) =>
        prev.map((c) =>
          c.id === connectionId
            ? {
                ...c,
                lastSyncAt: new Date().toISOString(),
                lastSuccessfulOperationAt: new Date().toISOString(),
                healthStatus: 'HEALTHY',
                consecutiveFailures: 0,
              }
            : c,
        ),
      );
      Alert.alert('Sync Completed', `${providerName} synchronization completed successfully.`);
    }, 1200);
  };

  const handleHealthCheck = (_connectionId: string, providerName: string) => {
    Alert.alert('Health Check Active', `Checked ${providerName}: Connection is reachable with 42ms response latency.`);
  };

  const handleDisconnect = (connectionId: string, providerName: string) => {
    Alert.alert(
      'Confirm Disconnection',
      `Are you sure you want to disconnect ${providerName}? Credentials will be securely wiped.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            setConnections((prev) =>
              prev.map((c) => (c.id === connectionId ? { ...c, status: 'DISCONNECTED', healthStatus: 'UNKNOWN' } : c)),
            );
          },
        },
      ],
    );
  };

  const handleReconnect = (connectionId: string, providerName: string) => {
    setConnections((prev) =>
      prev.map((c) =>
        c.id === connectionId ? { ...c, status: 'CONNECTED', healthStatus: 'HEALTHY', consecutiveFailures: 0 } : c,
      ),
    );
    Alert.alert('Reconnected', `${providerName} connection has been re-authorized and restored.`);
  };

  // Filter connections by tab & category
  let displayedConnections = connections;
  if (activeTab === 'attention') {
    displayedConnections = displayedConnections.filter(
      (c) => c.healthStatus === 'DEGRADED' || c.healthStatus === 'AUTHENTICATION_REQUIRED' || c.status === 'ERROR',
    );
  } else if (activeTab === 'connected') {
    displayedConnections = displayedConnections.filter((c) => c.status === 'CONNECTED' || c.status === 'SYNCING');
  }

  if (selectedCategory !== 'ALL') {
    displayedConnections = displayedConnections.filter((c) => c.category === selectedCategory);
  }

  return (
    <Screen style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Integrations Platform</Text>
          <Text style={styles.subtitle}>
            Enterprise external system connectivity, sync cursors, health monitoring, and security.
          </Text>
        </View>

        {/* Top KPI Metrics Row */}
        <View style={styles.kpiRow}>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{summary.connectedCount}</Text>
            <Text style={styles.kpiLabel}>Connected</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: themeColors.success }]}>{summary.healthyCount}</Text>
            <Text style={styles.kpiLabel}>Healthy</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: themeColors.warning }]}>{summary.degradedCount}</Text>
            <Text style={styles.kpiLabel}>Degraded</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: '#EF4444' }]}>{summary.attentionCount}</Text>
            <Text style={styles.kpiLabel}>Attention</Text>
          </Card>
        </View>

        {/* Primary Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'connected' && styles.tabButtonActive]}
            onPress={() => setActiveTab('connected')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'connected' && styles.tabButtonTextActive]}>
              Connected ({summary.connectedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'available' && styles.tabButtonActive]}
            onPress={() => setActiveTab('available')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'available' && styles.tabButtonTextActive]}>
              Available ({availableProviders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'attention' && styles.tabButtonActive]}
            onPress={() => setActiveTab('attention')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'attention' && styles.tabButtonTextActive]}>
              Needs Attention ({summary.degradedCount + summary.attentionCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {['ALL', 'PAYMENTS', 'ACCOUNTING', 'SMS', 'MESSAGING', 'WEARABLE', 'CALENDAR', 'ACCESS_CONTROL'].map(
            (cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryPill, selectedCategory === cat && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.categoryPillText, selectedCategory === cat && styles.categoryPillTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ),
          )}
        </ScrollView>

        {/* Tab 1: Connected Integrations */}
        {(activeTab === 'connected' || activeTab === 'attention') && (
          <View style={styles.cardsContainer}>
            {displayedConnections.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyText}>No integrations match this view.</Text>
              </Card>
            ) : (
              displayedConnections.map((conn) => {
                const isHealthy = conn.healthStatus === 'HEALTHY';
                const isAuthRequired = conn.healthStatus === 'AUTHENTICATION_REQUIRED';
                const isDegraded = conn.healthStatus === 'DEGRADED';
                const isSyncing = syncingId === conn.id;

                return (
                  <Card key={conn.id} style={styles.connectionCard}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <Text style={styles.providerName}>{conn.provider}</Text>
                        <Text style={styles.accountName}>{conn.externalAccountName || 'Active Connection'}</Text>
                      </View>
                      <View style={styles.badgesRow}>
                        <Badge label={conn.scope} variant="neutral" />
                        <Badge
                          label={conn.healthStatus}
                          variant={isHealthy ? 'success' : isAuthRequired ? 'danger' : 'warning'}
                        />
                      </View>
                    </View>

                    <Divider style={styles.divider} />

                    {/* Operational Timestamps */}
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Last Success:</Text>
                      <Text style={styles.metaValue}>
                        {conn.lastSuccessfulOperationAt
                          ? new Date(conn.lastSuccessfulOperationAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'None'}
                      </Text>
                      {conn.lastSyncAt && (
                        <>
                          <Text style={[styles.metaLabel, { marginLeft: spacing.md }]}>Last Sync:</Text>
                          <Text style={styles.metaValue}>
                            {new Date(conn.lastSyncAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </>
                      )}
                    </View>

                    {/* Attention Warning Banner */}
                    {isAuthRequired && (
                      <View style={styles.warningBanner}>
                        <Text style={styles.warningText}>
                          ⚠️ Provider token has expired. Please re-authenticate to restore operations.
                        </Text>
                      </View>
                    )}

                    {isDegraded && (
                      <View style={styles.warningBanner}>
                        <Text style={styles.warningText}>
                          ⚠️ {conn.consecutiveFailures} consecutive operations failed. Review provider status.
                        </Text>
                      </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionButtonsRow}>
                      {conn.lastSyncAt !== undefined && (
                        <Button
                          title={isSyncing ? 'Syncing...' : 'Sync Now'}
                          onPress={() => handleTriggerSync(conn.id, conn.provider)}
                          disabled={isSyncing}
                          size="sm"
                          variant="secondary"
                        />
                      )}

                      <Button
                        title="Health Check"
                        onPress={() => handleHealthCheck(conn.id, conn.provider)}
                        size="sm"
                        variant="ghost"
                      />

                      {isAuthRequired ? (
                        <Button
                          title="Reconnect"
                          onPress={() => handleReconnect(conn.id, conn.provider)}
                          size="sm"
                          variant="primary"
                        />
                      ) : (
                        <Button
                          title="Disconnect"
                          onPress={() => handleDisconnect(conn.id, conn.provider)}
                          size="sm"
                          variant="ghost"
                        />
                      )}
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        )}

        {/* Tab 2: Available Providers Catalog */}
        {activeTab === 'available' && (
          <View style={styles.cardsContainer}>
            {availableProviders.map((prov) => (
              <Card key={prov.integrationKey} style={styles.availableCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.providerName}>{prov.displayName}</Text>
                    <Text style={styles.categoryText}>{prov.category}</Text>
                  </View>
                  <Badge label={prov.authenticationType} variant="neutral" />
                </View>

                <Text style={styles.providerDescription}>{prov.description}</Text>

                <View style={styles.capabilitiesContainer}>
                  <Text style={styles.capTitle}>Supported Capabilities:</Text>
                  <View style={styles.capPills}>
                    {prov.capabilities.map((cap) => (
                      <View key={cap} style={styles.capPill}>
                        <Text style={styles.capPillText}>✓ {cap}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.availableCardFooter}>
                  <Text style={styles.supportedScopesText}>
                    Scopes: {prov.supportedScopes.join(', ')}
                  </Text>
                  <Button
                    title="Connect"
                    onPress={() =>
                      Alert.alert(
                        `Connect ${prov.displayName}`,
                        `Launching secure ${prov.authenticationType} authorization wizard for ${prov.displayName}...`,
                      )
                    }
                    size="sm"
                    variant="primary"
                  />
                </View>
              </Card>
            ))}
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
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.headlineMedium,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.bodyMedium,
    color: themeColors.textSecondary,
    marginTop: spacing.xs,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  kpiCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
    marginHorizontal: 3,
    backgroundColor: themeColors.cardBackground,
  },
  kpiValue: {
    ...typography.headlineSmall,
    fontWeight: '700',
    color: themeColors.primary,
  },
  kpiLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: themeColors.surfaceHighlight,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.md,
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
  tabButtonText: {
    ...typography.button,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  categoryScroll: {
    marginBottom: spacing.md,
  },
  categoryPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: themeColors.cardBackground,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  categoryPillActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  categoryPillText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  cardsContainer: {
    gap: spacing.md,
  },
  connectionCard: {
    padding: spacing.md,
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderLeft: {
    flex: 1,
  },
  providerName: {
    ...typography.titleMedium,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  accountName: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  divider: {
    marginVertical: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  metaLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  metaValue: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  warningBanner: {
    backgroundColor: '#3E2723',
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  warningText: {
    ...typography.bodySmall,
    color: '#FFCC80',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.bodyMedium,
    color: themeColors.textSecondary,
  },
  availableCard: {
    padding: spacing.md,
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
  },
  categoryText: {
    ...typography.caption,
    color: themeColors.primary,
    fontWeight: '600',
  },
  providerDescription: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    marginVertical: spacing.sm,
  },
  capabilitiesContainer: {
    marginBottom: spacing.md,
  },
  capTitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  capPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  capPill: {
    backgroundColor: themeColors.surfaceHighlight,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  capPillText: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.textPrimary,
  },
  availableCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    paddingTop: spacing.sm,
  },
  supportedScopesText: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
});
