import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { Card } from '../../../components/primitives/Card';

export const CommunicationPrivacyScreen: React.FC = () => {
  const [channels, setChannels] = useState({
    operational: true,
    reminders: true,
    engagement: false,
    marketing: false,
  });

  const handleToggle = (key: keyof typeof channels, val: boolean) => {
    setChannels((prev) => ({ ...prev, [key]: val }));
    Alert.alert('Communication Channel Updated', 'Your messaging preferences have been saved.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="h2" style={styles.title}>
        Communication Privacy
      </Text>
      <Text variant="bodySmall" style={styles.subtitle}>
        Manage email, SMS, and push notification preferences across all FitCore messaging streams.
      </Text>

      <Card style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.textCol}>
            <Text variant="body" style={styles.optionTitle}>
              Security & Billing (Mandatory)
            </Text>
            <Text variant="caption" style={styles.optionDesc}>
              Password resets, two-factor authentication codes, payment receipts, and facility access security alerts.
            </Text>
          </View>
          <Switch
            value={true}
            disabled={true}
            thumbColor="#38BDF8"
            trackColor={{ false: '#334155', true: '#0369A1' }}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.rowBetween}>
          <View style={styles.textCol}>
            <Text variant="body" style={styles.optionTitle}>
              Operational Notifications
            </Text>
            <Text variant="caption" style={styles.optionDesc}>
              Gym holiday hours, urgent facility maintenance alerts, and class schedule cancellations.
            </Text>
          </View>
          <Switch
            value={channels.operational}
            onValueChange={(val) => handleToggle('operational', val)}
            thumbColor={channels.operational ? '#38BDF8' : '#94A3B8'}
            trackColor={{ false: '#334155', true: '#0369A1' }}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.rowBetween}>
          <View style={styles.textCol}>
            <Text variant="body" style={styles.optionTitle}>
              Workout Reminders & Bookings
            </Text>
            <Text variant="caption" style={styles.optionDesc}>
              Reminders for booked group fitness classes, PT sessions, and waitlist spot confirmations.
            </Text>
          </View>
          <Switch
            value={channels.reminders}
            onValueChange={(val) => handleToggle('reminders', val)}
            thumbColor={channels.reminders ? '#38BDF8' : '#94A3B8'}
            trackColor={{ false: '#334155', true: '#0369A1' }}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.rowBetween}>
          <View style={styles.textCol}>
            <Text variant="body" style={styles.optionTitle}>
              Streaks & Habit Coaching
            </Text>
            <Text variant="caption" style={styles.optionDesc}>
              Congratulatory badges, weekly workout milestone summaries, and motivational nudges.
            </Text>
          </View>
          <Switch
            value={channels.engagement}
            onValueChange={(val) => handleToggle('engagement', val)}
            thumbColor={channels.engagement ? '#38BDF8' : '#94A3B8'}
            trackColor={{ false: '#334155', true: '#0369A1' }}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.rowBetween}>
          <View style={styles.textCol}>
            <Text variant="body" style={styles.optionTitle}>
              Promotions & Partner Deals
            </Text>
            <Text variant="caption" style={styles.optionDesc}>
              Club retail discounts, special membership upgrade pricing, and local gym partner deals.
            </Text>
          </View>
          <Switch
            value={channels.marketing}
            onValueChange={(val) => handleToggle('marketing', val)}
            thumbColor={channels.marketing ? '#38BDF8' : '#94A3B8'}
            trackColor={{ false: '#334155', true: '#0369A1' }}
          />
        </View>
      </Card>
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
  card: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  textCol: {
    flex: 1,
    marginRight: 12,
  },
  optionTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDesc: {
    color: '#94A3B8',
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
  },
});
