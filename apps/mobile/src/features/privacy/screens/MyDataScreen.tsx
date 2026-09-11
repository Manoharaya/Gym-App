import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { Card } from '../../../components/primitives/Card';
import { Badge } from '../../../components/primitives/Badge';

export const MyDataScreen: React.FC = () => {
  const dataCategories = [
    {
      title: 'Profile & Contact Data',
      fields: 'Name, email, phone number, date of birth, emergency contacts',
      purpose: 'Account management, emergency response, and club communication',
      retention: 'Duration of active account',
      classification: 'PERSONAL',
    },
    {
      title: 'Memberships & Passes',
      fields: 'Plan tier, renewal cycle, pass allocations, contract agreement',
      purpose: 'Service delivery and facility access entitlement',
      retention: 'Duration of membership + 7 years (statutory tax requirement)',
      classification: 'INTERNAL',
    },
    {
      title: 'Workouts & Performance',
      fields: 'Exercise logs, weights, reps, completed programs, personal records',
      purpose: 'Fitness coaching, progress tracking, and training adaptations',
      retention: 'Duration of membership (deletable on request)',
      classification: 'PERSONAL',
    },
    {
      title: 'Nutrition & Daily Fuel',
      fields: 'Food logs, calorie goals, macronutrient breakdowns, water intake',
      purpose: 'Nutrition coaching and personalized dietary guidance',
      retention: 'Duration of membership (deletable on request)',
      classification: 'PERSONAL',
    },
    {
      title: 'Health & Safety Screening',
      fields: 'PAR-Q responses, medical conditions, physician clearances',
      purpose: 'Ensuring exercise safety and liability compliance',
      retention: '7 years (statutory healthcare retention standard)',
      classification: 'HIGHLY_SENSITIVE',
    },
    {
      title: 'Connected Wearables',
      fields: 'Heart rate, sleep tracking, steps, calories burned',
      purpose: 'Wearable intelligence and recovery analytics',
      retention: '2 years max (deletable upon disconnection)',
      classification: 'HIGHLY_SENSITIVE',
    },
    {
      title: 'Payments & Billing',
      fields: 'Payment receipts, masked card numbers (last 4 digits), invoices',
      purpose: 'Financial processing, tax compliance, and transaction history',
      retention: '7 years statutory retention (retained for tax and accounting)',
      classification: 'SENSITIVE',
    },
    {
      title: 'AI Coaching Interactions',
      fields: 'Conversations with AI coach, daily check-in feedback',
      purpose: 'Personalized AI assistant responses',
      retention: '90 days automatic expiry',
      classification: 'PERSONAL',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="h2" style={styles.title}>
        My Data Inventory
      </Text>
      <Text variant="bodySmall" style={styles.subtitle}>
        A transparent breakdown of what personal data FitCore holds, why we hold it, and how long it is kept.
      </Text>

      <View style={styles.list}>
        {dataCategories.map((item, idx) => (
          <Card key={idx} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text variant="body" style={styles.cardTitle}>
                {item.title}
              </Text>
              <Badge
                variant={
                  item.classification === 'HIGHLY_SENSITIVE'
                    ? 'danger'
                    : item.classification === 'SENSITIVE'
                    ? 'warning'
                    : 'info'
                }
                label={item.classification}
              />
            </View>

            <View style={styles.section}>
              <Text variant="caption" style={styles.label}>
                Information Stored:
              </Text>
              <Text variant="bodySmall" style={styles.value}>
                {item.fields}
              </Text>
            </View>

            <View style={styles.section}>
              <Text variant="caption" style={styles.label}>
                Purpose of Collection:
              </Text>
              <Text variant="bodySmall" style={styles.value}>
                {item.purpose}
              </Text>
            </View>

            <View style={styles.section}>
              <Text variant="caption" style={styles.label}>
                Retention Policy:
              </Text>
              <Text variant="bodySmall" style={styles.retentionValue}>
                {item.retention}
              </Text>
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
    gap: 14,
  },
  card: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  section: {
    marginTop: 8,
  },
  label: {
    color: '#64748B',
    marginBottom: 2,
    fontWeight: '500',
  },
  value: {
    color: '#CBD5E1',
    lineHeight: 18,
  },
  retentionValue: {
    color: '#38BDF8',
    fontWeight: '500',
  },
});
