import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { Card } from '../../../components/primitives/Card';
import { Badge } from '../../../components/primitives/Badge';

export interface DevicesScreenProps {
  navigation: any;
}

interface MockDevice {
  id: string;
  name: string;
  platform: string;
  isTrusted: boolean;
  firstSeen: string;
  lastSeen: string;
}

export const DevicesScreen: React.FC<DevicesScreenProps> = ({ navigation: _navigation }) => {
  const [devices, setDevices] = useState<MockDevice[]>([
    {
      id: 'dev_1',
      name: 'iPhone 15 Pro',
      platform: 'iOS (Mobile App)',
      isTrusted: true,
      firstSeen: 'Aug 15, 2026',
      lastSeen: 'Today at 08:30 AM',
    },
    {
      id: 'dev_2',
      name: 'MacBook Pro 16"',
      platform: 'macOS (Chrome)',
      isTrusted: false,
      firstSeen: 'Sep 01, 2026',
      lastSeen: 'Yesterday at 04:15 PM',
    },
  ]);

  const handleTrustToggle = (dev: MockDevice) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === dev.id ? { ...d, isTrusted: !d.isTrusted } : d)),
    );
  };

  const handleRevoke = (id: string, name: string) => {
    Alert.alert(
      'Revoke Device',
      `Remove '${name}'? This device will be signed out and unlinked from your account.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke Device',
          style: 'destructive',
          onPress: () => {
            setDevices((prev) => prev.filter((d) => d.id !== id));
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="h2" style={styles.title}>
        Registered Devices
      </Text>
      <Text variant="bodySmall" style={styles.subtitle}>
        Recognized phones, tablets, and computers connected to your FitCore account.
      </Text>

      {devices.map((item) => (
        <Card key={item.id} style={styles.deviceCard}>
          <View style={styles.rowBetween}>
            <View style={styles.headerColumn}>
              <Text variant="body" style={styles.deviceName}>
                {item.name}
              </Text>
              <Text variant="caption" style={styles.subInfo}>
                {item.platform}
              </Text>
              <Text variant="caption" style={styles.subInfo}>
                Last seen: {item.lastSeen}
              </Text>
            </View>
            <Badge
              variant={item.isTrusted ? 'success' : 'neutral'}
              label={item.isTrusted ? 'Trusted' : 'Untrusted'}
            />
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.trustBtn}
              onPress={() => handleTrustToggle(item)}
            >
              <Text style={styles.trustBtnText}>
                {item.isTrusted ? 'Revoke Trust' : 'Mark as Trusted'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.revokeBtn}
              onPress={() => handleRevoke(item.id, item.name)}
            >
              <Text style={styles.revokeBtnText}>Remove Device</Text>
            </TouchableOpacity>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F19' },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: '#FFFFFF', fontWeight: 'bold', marginBottom: 6 },
  subtitle: { color: '#94A3B8', marginBottom: 20 },
  deviceCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  headerColumn: { flex: 1, marginRight: 8 },
  deviceName: { color: '#FFFFFF', fontWeight: '600', marginBottom: 4 },
  subInfo: { color: '#94A3B8', marginBottom: 2 },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
    gap: 12,
  },
  trustBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  trustBtnText: { color: '#38BDF8', fontWeight: '600', fontSize: 13 },
  revokeBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  revokeBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 13 },
});
