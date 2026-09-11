import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { Card } from '../../../components/primitives/Card';
import { Badge } from '../../../components/primitives/Badge';

export interface SessionsScreenProps {
  navigation: any;
}

interface MockSession {
  id: string;
  isCurrent: boolean;
  deviceName: string;
  location: string;
  ipAddress: string;
  lastActive: string;
  mfaVerified: boolean;
}

export const SessionsScreen: React.FC<SessionsScreenProps> = ({ navigation: _navigation }) => {
  const [sessions, setSessions] = useState<MockSession[]>([
    {
      id: 'sess_1',
      isCurrent: true,
      deviceName: 'iPhone 15 Pro — Mobile App',
      location: 'Perth, Australia (Approximate)',
      ipAddress: '203.0.113.42',
      lastActive: 'Active now',
      mfaVerified: true,
    },
    {
      id: 'sess_2',
      isCurrent: false,
      deviceName: 'Chrome on macOS',
      location: 'Sydney, Australia (Approximate)',
      ipAddress: '198.51.100.12',
      lastActive: '2 hours ago',
      mfaVerified: true,
    },
  ]);

  const handleRevoke = (id: string, name: string) => {
    Alert.alert('Revoke Session', `Terminate session on ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: () => {
          setSessions((prev) => prev.filter((s) => s.id !== id));
        },
      },
    ]);
  };

  const handleRevokeAllOther = () => {
    Alert.alert(
      'Revoke All Other Sessions',
      'This will sign you out of all devices and browsers except this current phone. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke Others',
          style: 'destructive',
          onPress: () => {
            setSessions((prev) => prev.filter((s) => s.isCurrent));
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="h2" style={styles.title}>
        Active Sessions
      </Text>
      <Text variant="bodySmall" style={styles.subtitle}>
        Manage all active logins across your phones, tablets, and web browsers.
      </Text>

      {sessions.map((item) => (
        <Card key={item.id} style={styles.sessionCard}>
          <View style={styles.rowBetween}>
            <View style={styles.headerColumn}>
              <Text variant="body" style={styles.deviceName}>
                {item.deviceName}
              </Text>
              <Text variant="caption" style={styles.subInfo}>
                {item.location} • {item.lastActive}
              </Text>
              <Text variant="caption" style={styles.ipText}>
                IP: {item.ipAddress}
              </Text>
            </View>
            <View style={styles.badgeColumn}>
              {item.isCurrent && <Badge variant="success" label="Current Session" />}
              {item.mfaVerified && (
                <View style={{ marginTop: 4 }}>
                  <Badge variant="info" label="MFA Verified" />
                </View>
              )}
            </View>
          </View>

          {!item.isCurrent && (
            <TouchableOpacity
              style={styles.revokeBtn}
              onPress={() => handleRevoke(item.id, item.deviceName)}
            >
              <Text style={styles.revokeText}>Revoke Session</Text>
            </TouchableOpacity>
          )}
        </Card>
      ))}

      {sessions.length > 1 && (
        <TouchableOpacity style={styles.revokeAllBtn} onPress={handleRevokeAllOther}>
          <Text style={styles.revokeAllText}>Sign Out of All Other Sessions</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F19' },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: '#FFFFFF', fontWeight: 'bold', marginBottom: 6 },
  subtitle: { color: '#94A3B8', marginBottom: 20 },
  sessionCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  headerColumn: { flex: 1, marginRight: 8 },
  badgeColumn: { alignItems: 'flex-end' },
  deviceName: { color: '#FFFFFF', fontWeight: '600', marginBottom: 4 },
  subInfo: { color: '#94A3B8', marginBottom: 2 },
  ipText: { color: '#64748B', fontFamily: 'monospace' },
  revokeBtn: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
    alignItems: 'flex-start',
  },
  revokeText: { color: '#EF4444', fontWeight: '600' },
  revokeAllBtn: {
    marginTop: 12,
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  revokeAllText: { color: '#F87171', fontWeight: '600' },
});
