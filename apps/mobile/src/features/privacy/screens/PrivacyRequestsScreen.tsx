import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { Card } from '../../../components/primitives/Card';
import { Badge } from '../../../components/primitives/Badge';

export const PrivacyRequestsScreen: React.FC = () => {
  const requests = [
    {
      id: 'req_cl123export',
      type: 'EXPORT',
      status: 'COMPLETED',
      submittedAt: 'Today at 08:30 AM',
      completedAt: 'Today at 08:32 AM',
      description: 'Full personal data export archive (JSON package)',
    },
    {
      id: 'req_cl456access',
      type: 'ACCESS',
      status: 'COMPLETED',
      submittedAt: 'Mar 10, 2026',
      completedAt: 'Mar 10, 2026',
      description: 'Data inventory view verification',
    },
    {
      id: 'req_cl789del',
      type: 'DELETION',
      status: 'CANCELLED',
      submittedAt: 'Feb 20, 2026',
      completedAt: 'Feb 20, 2026',
      description: 'Account deletion cancelled by user',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="h2" style={styles.title}>
        Privacy Requests
      </Text>
      <Text variant="bodySmall" style={styles.subtitle}>
        Track the lifecycle, verification status, and completion timeline of your data requests.
      </Text>

      <View style={styles.list}>
        {requests.map((item) => (
          <Card key={item.id} style={styles.card}>
            <View style={styles.rowBetween}>
              <View>
                <Text variant="body" style={styles.typeText}>
                  {item.type} Request
                </Text>
                <Text variant="caption" style={styles.idText}>
                  ID: {item.id}
                </Text>
              </View>
              <Badge
                variant={
                  item.status === 'COMPLETED'
                    ? 'success'
                    : item.status === 'PROCESSING'
                    ? 'warning'
                    : item.status === 'CANCELLED'
                    ? 'neutral'
                    : 'danger'
                }
                label={item.status}
              />
            </View>

            <Text variant="caption" style={styles.desc}>
              {item.description}
            </Text>

            <View style={styles.metaRow}>
              <Text variant="caption" style={styles.metaLabel}>
                Submitted: {item.submittedAt}
              </Text>
              {item.completedAt && (
                <Text variant="caption" style={styles.metaLabel}>
                  Resolved: {item.completedAt}
                </Text>
              )}
            </View>
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
    marginBottom: 8,
  },
  typeText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  idText: {
    color: '#64748B',
    marginTop: 2,
  },
  desc: {
    color: '#CBD5E1',
    lineHeight: 18,
    marginBottom: 10,
  },
  metaRow: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    color: '#64748B',
  },
});
