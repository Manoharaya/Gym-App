import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { Card } from '../../../components/primitives/Card';
import { Badge } from '../../../components/primitives/Badge';

export interface LoginActivityProps {
  navigation?: any;
}

interface ActivityItem {
  id: string;
  eventType: string;
  timestamp: string;
  source: string;
  ipAddress: string;
  status: 'SUCCESS' | 'FAILED' | 'CHALLENGED';
  location: string;
}

export const LoginActivityScreen: React.FC<LoginActivityProps> = () => {
  const [activities] = useState<ActivityItem[]>([
    {
      id: 'act_1',
      eventType: 'Signed In (Password + MFA)',
      timestamp: 'Today, 08:30 AM',
      source: 'FitCore Mobile App (iOS)',
      ipAddress: '203.0.113.42',
      status: 'SUCCESS',
      location: 'Perth, WA (Approximate)',
    },
    {
      id: 'act_2',
      eventType: 'Failed Password Attempt',
      timestamp: 'Yesterday, 10:45 PM',
      source: 'Web Portal (Safari)',
      ipAddress: '198.51.100.12',
      status: 'FAILED',
      location: 'Sydney, NSW (Approximate)',
    },
    {
      id: 'act_3',
      eventType: 'Signed In (Password + TOTP)',
      timestamp: 'Sep 09, 02:14 PM',
      source: 'FitCore Mobile App (iOS)',
      ipAddress: '203.0.113.42',
      status: 'SUCCESS',
      location: 'Perth, WA (Approximate)',
    },
    {
      id: 'act_4',
      eventType: 'Two-Factor Challenge Presented',
      timestamp: 'Sep 08, 11:19 AM',
      source: 'Mobile App (iOS)',
      ipAddress: '203.0.113.42',
      status: 'CHALLENGED',
      location: 'Perth, WA (Approximate)',
    },
  ]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="h2" style={styles.title}>
        Recent Login Activity
      </Text>
      <Text variant="bodySmall" style={styles.subtitle}>
        Review past authentication attempts, locations, and security events for your account.
      </Text>

      {activities.map((act) => (
        <Card key={act.id} style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.mainColumn}>
              <Text variant="body" style={styles.eventTitle}>
                {act.eventType}
              </Text>
              <Text variant="caption" style={styles.subText}>
                {act.timestamp} • {act.location}
              </Text>
              <Text variant="caption" style={styles.sourceText}>
                {act.source} • IP: {act.ipAddress}
              </Text>
            </View>
            <Badge
              variant={
                act.status === 'SUCCESS'
                  ? 'success'
                  : act.status === 'FAILED'
                    ? 'danger'
                    : 'warning'
              }
              label={act.status}
            />
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
  card: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  mainColumn: { flex: 1, marginRight: 8 },
  eventTitle: { color: '#FFFFFF', fontWeight: '600', marginBottom: 4 },
  subText: { color: '#94A3B8', marginBottom: 2 },
  sourceText: { color: '#64748B', fontFamily: 'monospace', fontSize: 11 },
});
