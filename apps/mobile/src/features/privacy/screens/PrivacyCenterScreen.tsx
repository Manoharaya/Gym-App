import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { Card } from '../../../components/primitives/Card';
import { Badge } from '../../../components/primitives/Badge';

export interface PrivacyCenterProps {
  navigation: any;
}

export const PrivacyCenterScreen: React.FC<PrivacyCenterProps> = ({ navigation }) => {
  const hubItems = [
    {
      title: 'My Data',
      desc: 'See all personal data categories FitCore stores about you and why.',
      screen: 'MyData',
      badge: 'Transparent',
    },
    {
      title: 'Consent Center',
      desc: 'View active legal consents, policy versions, and withdrawal options.',
      screen: 'ConsentManagement',
      badge: 'Managed',
    },
    {
      title: 'Privacy Preferences',
      desc: 'Control AI personalization, analytics, and marketing data usage.',
      screen: 'PrivacyPreferences',
      badge: 'Customizable',
    },
    {
      title: 'Export My Data',
      desc: 'Download a secure, encrypted machine-readable copy of your data.',
      screen: 'DataExport',
      badge: 'Download',
    },
    {
      title: 'Delete My Data',
      desc: 'Request full account deletion per privacy governance policies.',
      screen: 'DeletionRequest',
      badge: 'Protected',
    },
    {
      title: 'Privacy Requests History',
      desc: 'Track the real-time status of your data access and deletion requests.',
      screen: 'PrivacyRequests',
      badge: 'Trackable',
    },
    {
      title: 'AI Privacy',
      desc: 'Inspect how AI coaches use your workout and nutrition history.',
      screen: 'AIPrivacy',
      badge: 'Controlled',
    },
    {
      title: 'Wearable Privacy',
      desc: 'Manage connected health wearables and synchronization settings.',
      screen: 'WearablePrivacy',
      badge: 'Connected',
    },
    {
      title: 'Communication Channels',
      desc: 'Configure email, SMS, and push notification privacy options.',
      screen: 'CommunicationPrivacy',
      badge: 'Preferences',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="h2" style={styles.title}>
        Privacy & Compliance Center
      </Text>
      <Text variant="bodySmall" style={styles.subtitle}>
        Transparency, consent, data portability, and deletion controls for your FitCore account.
      </Text>

      <Card style={styles.infoCard}>
        <Text variant="body" style={styles.infoTitle}>
          Our Privacy Commitment
        </Text>
        <Text variant="caption" style={styles.infoText}>
          FitCore collects only the minimum necessary data required to deliver your membership, ensure training safety, and provide personalized coaching. We never sell your personal data.
        </Text>
      </Card>

      <View style={styles.list}>
        {hubItems.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.touchableCard}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Card style={styles.itemCard}>
              <View style={styles.rowBetween}>
                <Text variant="body" style={styles.itemTitle}>
                  {item.title}
                </Text>
                <Badge variant="neutral" label={item.badge} />
              </View>
              <Text variant="caption" style={styles.itemDesc}>
                {item.desc}
              </Text>
            </Card>
          </TouchableOpacity>
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
  infoCard: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#38BDF8',
  },
  infoTitle: {
    color: '#38BDF8',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoText: {
    color: '#CBD5E1',
    lineHeight: 18,
  },
  list: {
    gap: 12,
  },
  touchableCard: {
    marginBottom: 10,
  },
  itemCard: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  itemDesc: {
    color: '#94A3B8',
    lineHeight: 16,
  },
});
