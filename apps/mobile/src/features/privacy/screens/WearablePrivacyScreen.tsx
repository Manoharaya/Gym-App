import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { Card } from '../../../components/primitives/Card';
import { Badge } from '../../../components/primitives/Badge';

export const WearablePrivacyScreen: React.FC = () => {
  const [wearables, setWearables] = useState([
    {
      id: 'conn_apple',
      provider: 'Apple Health',
      connected: true,
      lastSync: '15 minutes ago',
      categories: ['Resting Heart Rate', 'Sleep Architecture', 'Daily Steps', 'Active Calories'],
    },
    {
      id: 'conn_garmin',
      provider: 'Garmin Connect',
      connected: false,
      lastSync: 'Never',
      categories: ['Heart Rate Variability', 'Activity Telemetry'],
    },
    {
      id: 'conn_whoop',
      provider: 'Whoop Strap',
      connected: false,
      lastSync: 'Never',
      categories: ['Recovery Score', 'Sleep Performance'],
    },
  ]);

  const handleDisconnect = (provider: string) => {
    Alert.alert(
      `Disconnect ${provider}?`,
      `Disconnecting will immediately stop future biometric synchronization and revoke stored connection credentials.\n\nPreviously synced historical data will remain subject to your 2-year retention setting unless you request full data deletion.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            setWearables((prev) =>
              prev.map((w) => (w.provider === provider ? { ...w, connected: false } : w)),
            );
            Alert.alert(
              'Wearable Disconnected',
              `${provider} has been disconnected. Synchronization is halted and tokens revoked.`,
            );
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="h2" style={styles.title}>
        Wearable Privacy
      </Text>
      <Text variant="bodySmall" style={styles.subtitle}>
        Manage connected wearable devices and control continuous biometric data streaming.
      </Text>

      <View style={styles.list}>
        {wearables.map((item) => (
          <Card key={item.id} style={styles.card}>
            <View style={styles.rowBetween}>
              <View>
                <Text variant="body" style={styles.providerName}>
                  {item.provider}
                </Text>
                <Text variant="caption" style={styles.syncMeta}>
                  {item.connected ? `Last synced: ${item.lastSync}` : 'Not connected'}
                </Text>
              </View>
              <Badge
                variant={item.connected ? 'success' : 'neutral'}
                label={item.connected ? 'Active Sync' : 'Disconnected'}
              />
            </View>

            <View style={styles.chipsRow}>
              {item.categories.map((c, cIdx) => (
                <View key={cIdx} style={styles.chip}>
                  <Text variant="caption" style={styles.chipText}>
                    {c}
                  </Text>
                </View>
              ))}
            </View>

            {item.connected && (
              <TouchableOpacity
                style={styles.disconnectBtn}
                onPress={() => handleDisconnect(item.provider)}
              >
                <Text variant="caption" style={styles.disconnectText}>
                  Disconnect & Revoke Sync
                </Text>
              </TouchableOpacity>
            )}
          </Card>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    color: '#94A3B8',
    marginBottom: 16,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  providerName: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  syncMeta: {
    color: '#64748B',
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chipText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  disconnectBtn: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
    alignItems: 'flex-end',
  },
  disconnectText: {
    color: '#EF4444',
    fontWeight: '600',
  },
});
