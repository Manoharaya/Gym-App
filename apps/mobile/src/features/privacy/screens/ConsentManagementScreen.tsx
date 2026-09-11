import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { Card } from '../../../components/primitives/Card';
import { Badge } from '../../../components/primitives/Badge';

export const ConsentManagementScreen: React.FC = () => {
  const [consents, setConsents] = useState([
    {
      key: 'TERMS_AND_CONDITIONS',
      name: 'Terms of Service',
      version: 'v2.1',
      date: 'Jan 10, 2026',
      consented: true,
      mandatory: true,
      description: 'Core agreement governing facility access, equipment usage, and club rules.',
    },
    {
      key: 'PRIVACY_POLICY',
      name: 'Privacy & Data Governance Policy',
      version: 'v2.0',
      date: 'Jan 10, 2026',
      consented: true,
      mandatory: true,
      description: 'Authorizes processing of basic account and membership data.',
    },
    {
      key: 'HEALTH_DATA_PROCESSING',
      name: 'Health Data & PAR-Q Processing',
      version: 'v1.4',
      date: 'Jan 10, 2026',
      consented: true,
      mandatory: false,
      description: 'Enables trainers and coaches to tailor workouts to your medical conditions and injuries.',
    },
    {
      key: 'WEARABLE_DATA',
      name: 'Wearable Sync & Biometrics',
      version: 'v1.0',
      date: 'Feb 15, 2026',
      consented: true,
      mandatory: false,
      description: 'Allows continuous sync of heart rate, sleep architecture, and daily activity.',
    },
    {
      key: 'AI_PROCESSING',
      name: 'AI Personalization & Insights',
      version: 'v1.2',
      date: 'Jan 10, 2026',
      consented: true,
      mandatory: false,
      description: 'Allows AI models to generate customized training adaptations and recovery check-ins.',
    },
    {
      key: 'MARKETING',
      name: 'Marketing & Partner Promotions',
      version: 'v1.0',
      date: 'Jan 10, 2026',
      consented: false,
      mandatory: false,
      description: 'Promotional offers, club events, and exclusive partner product discounts.',
    },
  ]);

  const handleToggleConsent = (item: (typeof consents)[0]) => {
    if (item.mandatory) {
      Alert.alert(
        'Mandatory Consent',
        `${item.name} is required to maintain your gym membership and facility access. It cannot be withdrawn while your membership is active.`,
      );
      return;
    }

    if (item.consented) {
      Alert.alert(
        `Withdraw Consent for ${item.name}?`,
        `Withdrawing this consent will immediately disable related features. Previously collected historical data will be retained in accordance with your retention settings.\n\nAre you sure?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Withdraw Consent',
            style: 'destructive',
            onPress: () => {
              setConsents((prev) =>
                prev.map((c) => (c.key === item.key ? { ...c, consented: false } : c)),
              );
              Alert.alert('Consent Withdrawn', `You have withdrawn consent for ${item.name}.`);
            },
          },
        ],
      );
    } else {
      setConsents((prev) =>
        prev.map((c) => (c.key === item.key ? { ...c, consented: true } : c)),
      );
      Alert.alert('Consent Granted', `You have granted consent for ${item.name}.`);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="h2" style={styles.title}>
        Consent Center
      </Text>
      <Text variant="bodySmall" style={styles.subtitle}>
        Manage explicit permissions granted to FitCore. You can review versions and withdraw non-mandatory consents at any time.
      </Text>

      <View style={styles.list}>
        {consents.map((item, idx) => (
          <Card key={idx} style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={styles.titleColumn}>
                <Text variant="body" style={styles.consentName}>
                  {item.name}
                </Text>
                <Text variant="caption" style={styles.versionText}>
                  Version {item.version} • Granted {item.date}
                </Text>
              </View>
              <Badge
                variant={item.consented ? 'success' : 'neutral'}
                label={item.consented ? 'Active' : 'Withdrawn'}
              />
            </View>

            <Text variant="caption" style={styles.desc}>
              {item.description}
            </Text>

            <View style={styles.actionRow}>
              {item.mandatory ? (
                <Text variant="caption" style={styles.mandatoryNote}>
                  Required for membership access
                </Text>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.button,
                    item.consented ? styles.withdrawBtn : styles.grantBtn,
                  ]}
                  onPress={() => handleToggleConsent(item)}
                >
                  <Text
                    variant="caption"
                    style={item.consented ? styles.withdrawText : styles.grantText}
                  >
                    {item.consented ? 'Withdraw Consent' : 'Grant Consent'}
                  </Text>
                </TouchableOpacity>
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
  titleColumn: {
    flex: 1,
    marginRight: 10,
  },
  consentName: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  versionText: {
    color: '#64748B',
    marginTop: 2,
  },
  desc: {
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
  },
  mandatoryNote: {
    color: '#64748B',
    fontStyle: 'italic',
  },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  withdrawBtn: {
    backgroundColor: '#451A1A',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  grantBtn: {
    backgroundColor: '#064E3B',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  withdrawText: {
    color: '#F87171',
    fontWeight: '600',
  },
  grantText: {
    color: '#34D399',
    fontWeight: '600',
  },
});
