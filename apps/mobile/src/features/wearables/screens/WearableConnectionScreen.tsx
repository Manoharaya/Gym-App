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
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen, Card, Badge, Icon, Button, Divider } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { WearablesService } from '../services/wearablesService';
import type { WearableConnectionDto } from '@fitcore/types';

export const WearableConnectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const connectionId = route.params?.connectionId;

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connection, setConnection] = useState<WearableConnectionDto | null>(null);

  const loadConnection = useCallback(async () => {
    if (!connectionId) return;
    try {
      const conn = await WearablesService.getConnection(connectionId);
      setConnection(conn);
    } catch {
      Alert.alert('Error', 'Unable to retrieve connection details');
    } finally {
      setLoading(false);
    }
  }, [connectionId]);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  const handleSyncNow = async () => {
    if (!connection) return;
    setSyncing(true);
    try {
      const result = await WearablesService.syncConnection(connection.id);
      Alert.alert(
        'Sync Complete',
        `Successfully synced ${result.recordsInserted} new health records (${result.duplicatesSkipped} duplicates skipped).`,
      );
      loadConnection();
    } catch (err: any) {
      Alert.alert('Sync Failed', err.message || 'Synchronization could not be completed.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Device',
      `Are you sure you want to disconnect ${connection?.provider}? Future health records will no longer synchronize. Your existing workout and training data will remain intact.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            if (!connection) return;
            setDisconnecting(true);
            try {
              await WearablesService.disconnect(connection.id);
              Alert.alert('Disconnected', 'Your device connection has been revoked.');
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to disconnect device.');
            } finally {
              setDisconnecting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={22} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Connection Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading || !connection ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.accent} />
          </View>
        ) : (
          <>
            {/* Status Card */}
            <Card style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={styles.deviceRow}>
                  <View style={styles.iconBox}>
                    <Icon name="activity" size={22} color={themeColors.accent} />
                  </View>
                  <View>
                    <Text style={styles.deviceName}>{connection.provider}</Text>
                    <Text style={styles.userRef}>
                      {connection.providerUserReference || 'Active Integration'}
                    </Text>
                  </View>
                </View>
                <Badge
                  label={connection.status}
                  variant={connection.status === 'CONNECTED' ? 'success' : 'warning'}
                />
              </View>

              <Divider style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Connected Date</Text>
                <Text style={styles.detailValue}>
                  {connection.connectedAt
                    ? new Date(connection.connectedAt).toLocaleDateString()
                    : '--'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Last Successful Sync</Text>
                <Text style={styles.detailValue}>
                  {connection.lastSuccessfulSyncAt
                    ? new Date(connection.lastSuccessfulSyncAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Never'}
                </Text>
              </View>

              {connection.lastErrorMessage ? (
                <View style={styles.errorBox}>
                  <Icon name="alert-circle" size={16} color={themeColors.danger} />
                  <Text style={styles.errorText}>{connection.lastErrorMessage}</Text>
                </View>
              ) : null}
            </Card>

            {/* Sync Controls */}
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Telemetry Synchronization</Text>
              <Text style={styles.cardSub}>
                FitCore runs periodic incremental synchronizations in the background. You can also trigger an immediate manual sync.
              </Text>
              <View style={styles.btnRow}>
                <Button
                  title={syncing ? 'Synchronizing...' : 'Sync Telemetry Now'}
                  onPress={handleSyncNow}
                  disabled={syncing || connection.status !== 'CONNECTED'}
                  variant="primary"
                />
              </View>
            </Card>

            {/* Scopes */}
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Authorized Telemetry Types</Text>
              <View style={styles.scopesContainer}>
                {connection.scopes.map((scope) => (
                  <View key={scope} style={styles.scopeChip}>
                    <Icon name="check" size={12} color={themeColors.accent} />
                    <Text style={styles.scopeText}>{scope.replace(/_/g, ' ')}</Text>
                  </View>
                ))}
              </View>
            </Card>

            {/* Disconnect Option */}
            <View style={styles.disconnectContainer}>
              <Button
                title={disconnecting ? 'Disconnecting...' : 'Disconnect Provider'}
                onPress={handleDisconnect}
                disabled={disconnecting}
                variant="outline"
              />
            </View>
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
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    paddingVertical: spacing.xxl * 2,
    alignItems: 'center',
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
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: themeColors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  deviceName: {
    ...typography.h4,
    color: themeColors.textPrimary,
  },
  userRef: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  divider: {
    marginVertical: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
  },
  detailValue: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.danger + '15',
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: themeColors.danger,
    flex: 1,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardSub: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    marginBottom: spacing.md,
  },
  btnRow: {
    marginTop: spacing.xs,
  },
  scopesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  scopeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    gap: 4,
  },
  scopeText: {
    ...typography.caption,
    color: themeColors.textPrimary,
  },
  disconnectContainer: {
    marginTop: spacing.lg,
  },
});
