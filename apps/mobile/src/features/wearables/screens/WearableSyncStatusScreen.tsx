import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, Badge, Icon, Button } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { WearablesService } from '../services/wearablesService';
import type { WearableConnectionDto } from '@fitcore/types';

export const WearableSyncStatusScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [connections, setConnections] = useState<WearableConnectionDto[]>([]);

  const loadData = useCallback(async () => {
    try {
      const conns = await WearablesService.getConnections();
      setConnections(conns);
    } catch {
      Alert.alert('Error', 'Unable to retrieve sync status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRetrySync = async (connectionId: string) => {
    setSyncing(connectionId);
    try {
      const result = await WearablesService.syncConnection(connectionId, { syncType: 'RETRY' });
      Alert.alert(
        'Sync Successful',
        `Synchronized ${result.recordsInserted} records in ${result.durationMs}ms.`,
      );
      loadData();
    } catch (err: any) {
      Alert.alert('Retry Failed', err.message || 'Synchronization could not be completed.');
    } finally {
      setSyncing(null);
    }
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={22} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sync Health & History</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.accent} />
          </View>
        ) : connections.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="refresh" size={36} color={themeColors.textTertiary} />
            <Text style={styles.emptyTitle}>No Active Connections</Text>
            <Text style={styles.emptyDesc}>
              Connect Apple Health, Google Health Connect, or Fitbit to see synchronization status.
            </Text>
          </View>
        ) : (
          connections.map((conn) => {
            const hasError = conn.status === 'SYNC_ERROR' || !!conn.lastErrorMessage;
            return (
              <Card key={conn.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.providerTitle}>{conn.provider}</Text>
                  <Badge
                    label={conn.status}
                    variant={conn.status === 'CONNECTED' ? 'success' : hasError ? 'danger' : 'warning'}
                  />
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.label}>Last Successful Sync</Text>
                  <Text style={styles.value}>
                    {conn.lastSuccessfulSyncAt
                      ? new Date(conn.lastSuccessfulSyncAt).toLocaleString()
                      : 'Never'}
                  </Text>
                </View>

                {conn.lastFailedSyncAt ? (
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Last Failed Sync</Text>
                    <Text style={[styles.value, styles.errorText]}>
                      {new Date(conn.lastFailedSyncAt).toLocaleString()}
                    </Text>
                  </View>
                ) : null}

                {conn.lastErrorMessage ? (
                  <View style={styles.errorAlert}>
                    <Icon name="alert-circle" size={16} color={themeColors.danger} />
                    <Text style={styles.alertText}>{conn.lastErrorMessage}</Text>
                  </View>
                ) : null}

                <View style={styles.btnRow}>
                  <Button
                    title={syncing === conn.id ? 'Retrying Sync...' : 'Sync Now'}
                    onPress={() => handleRetrySync(conn.id)}
                    disabled={syncing === conn.id || conn.status === 'DISCONNECTED'}
                    variant={hasError ? 'primary' : 'outline'}
                  />
                </View>
              </Card>
            );
          })
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
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    paddingVertical: spacing.xxl * 2,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: spacing.xxl * 2,
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
    marginTop: spacing.md,
  },
  emptyDesc: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  card: {
    padding: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: themeColors.surface,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  providerTitle: {
    ...typography.h4,
    color: themeColors.textPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  label: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
  },
  value: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  errorText: {
    color: themeColors.danger,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.danger + '15',
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  alertText: {
    ...typography.caption,
    color: themeColors.danger,
    flex: 1,
  },
  btnRow: {
    marginTop: spacing.md,
  },
});
