import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { Card } from '../../../components/primitives/Card';

export const PrivacyPreferencesScreen: React.FC = () => {
  const [prefs, setPrefs] = useState({
    aiPersonalization: true,
    analytics: true,
    marketing: false,
    wearables: true,
    dataSharing: false,
    personalization: true,
  });

  const handleToggle = (key: keyof typeof prefs, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    Alert.alert('Preferences Saved', 'Your privacy preferences have been updated immediately.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="h2" style={styles.title}>
        Privacy Preferences
      </Text>
      <Text variant="bodySmall" style={styles.subtitle}>
        Customize how your personal data is utilized across FitCore algorithms and features.
      </Text>

      <Card style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.textCol}>
            <Text variant="body" style={styles.optionTitle}>
              AI Personalization
            </Text>
            <Text variant="caption" style={styles.optionDesc}>
              Allows AI coaches to analyze past workouts, goals, and nutrition to generate tailored recommendations.
            </Text>
          </View>
          <Switch
            value={prefs.aiPersonalization}
            onValueChange={(val) => handleToggle('aiPersonalization', val)}
            thumbColor={prefs.aiPersonalization ? '#38BDF8' : '#94A3B8'}
            trackColor={{ false: '#334155', true: '#0369A1' }}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.rowBetween}>
          <View style={styles.textCol}>
            <Text variant="body" style={styles.optionTitle}>
              Wearable Health Processing
            </Text>
            <Text variant="caption" style={styles.optionDesc}>
              Synchronize resting heart rate, sleep scores, and step counts from Apple Health, Garmin, or Whoop.
            </Text>
          </View>
          <Switch
            value={prefs.wearables}
            onValueChange={(val) => handleToggle('wearables', val)}
            thumbColor={prefs.wearables ? '#38BDF8' : '#94A3B8'}
            trackColor={{ false: '#334155', true: '#0369A1' }}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.rowBetween}>
          <View style={styles.textCol}>
            <Text variant="body" style={styles.optionTitle}>
              Usage Analytics
            </Text>
            <Text variant="caption" style={styles.optionDesc}>
              Help us improve facility schedules, app speed, and equipment availability with anonymized usage metrics.
            </Text>
          </View>
          <Switch
            value={prefs.analytics}
            onValueChange={(val) => handleToggle('analytics', val)}
            thumbColor={prefs.analytics ? '#38BDF8' : '#94A3B8'}
            trackColor={{ false: '#334155', true: '#0369A1' }}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.rowBetween}>
          <View style={styles.textCol}>
            <Text variant="body" style={styles.optionTitle}>
              Marketing & Promotions
            </Text>
            <Text variant="caption" style={styles.optionDesc}>
              Receive partner discounts, new supplement releases, and community event invitations.
            </Text>
          </View>
          <Switch
            value={prefs.marketing}
            onValueChange={(val) => handleToggle('marketing', val)}
            thumbColor={prefs.marketing ? '#38BDF8' : '#94A3B8'}
            trackColor={{ false: '#334155', true: '#0369A1' }}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.rowBetween}>
          <View style={styles.textCol}>
            <Text variant="body" style={styles.optionTitle}>
              Third-Party Data Sharing
            </Text>
            <Text variant="caption" style={styles.optionDesc}>
              FitCore never sells data. This controls optional verified fitness partner integrations.
            </Text>
          </View>
          <Switch
            value={prefs.dataSharing}
            onValueChange={(val) => handleToggle('dataSharing', val)}
            thumbColor={prefs.dataSharing ? '#38BDF8' : '#94A3B8'}
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
