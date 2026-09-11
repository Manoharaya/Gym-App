import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { Card } from '../../../components/primitives/Card';
import { Badge } from '../../../components/primitives/Badge';

export const AIPrivacyScreen: React.FC = () => {
  const [isPersonalizationOn, setIsPersonalizationOn] = useState(true);

  const aiFeatures = [
    {
      name: 'AI Fitness Coach',
      purpose: 'Recommends exercise progressions, weight jumps, and deload cycles.',
      dataUsed: ['Recent workouts', 'Personal records', 'Injuries (with consent)'],
      lastUsed: 'Yesterday',
    },
    {
      name: 'AI Nutrition Assistant',
      purpose: 'Analyzes daily calories, protein targets, and dietary adherence.',
      dataUsed: ['Food logs', 'Nutrition targets', 'Dietary preferences'],
      lastUsed: '3 days ago',
    },
    {
      name: 'Daily Check-In Intelligence',
      purpose: 'Summarizes readiness scores combining sleep, resting HR, and streak.',
      dataUsed: ['Wearable sleep score', 'Daily activity', 'Check-in mood'],
      lastUsed: 'Today',
    },
  ];

  const handleToggle = (val: boolean) => {
    setIsPersonalizationOn(val);
    Alert.alert(
      val ? 'AI Personalization Active' : 'AI Personalization Disabled',
      val
        ? 'AI models will reference your training and nutrition history for customized advice.'
        : 'AI models will operate in generic mode with zero access to your personal history.',
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="h2" style={styles.title}>
        AI Privacy & Governance
      </Text>
      <Text variant="bodySmall" style={styles.subtitle}>
        Full transparency into how FitCore AI assistants process your health and workout data.
      </Text>

      {/* Main Switch Card */}
      <Card style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.textCol}>
            <Text variant="body" style={styles.mainTitle}>
              AI Personalization
            </Text>
            <Text variant="caption" style={styles.mainDesc}>
              When enabled, AI features use your training data to tailor workouts. When disabled, models operate strictly on generic advice.
            </Text>
          </View>
          <Switch
            value={isPersonalizationOn}
            onValueChange={handleToggle}
            thumbColor={isPersonalizationOn ? '#38BDF8' : '#94A3B8'}
            trackColor={{ false: '#334155', true: '#0369A1' }}
          />
        </View>
      </Card>

      {/* Security Invariant Card */}
      <Card style={styles.guaranteeCard}>
        <Text variant="bodySmall" style={styles.guaranteeTitle}>
          🛡️ FitCore AI Guardrails
        </Text>
        <Text variant="caption" style={styles.guaranteeDesc}>
          • Personal data is never used to train global public foundational models.{'\n'}
          • Health data requires explicit, active consent before inclusion in AI context.{'\n'}
          • AI conversational context is automatically expired after 90 days.
        </Text>
      </Card>

      <Text variant="body" style={styles.subHeading}>
        Active AI Features & Data Access
      </Text>

      <View style={styles.list}>
        {aiFeatures.map((item, idx) => (
          <Card key={idx} style={styles.featureCard}>
            <View style={styles.rowBetween}>
              <Text variant="body" style={styles.featureName}>
                {item.name}
              </Text>
              <Badge variant="info" label={item.lastUsed} />
            </View>

            <Text variant="caption" style={styles.featurePurpose}>
              {item.purpose}
            </Text>

            <View style={styles.chipsRow}>
              {item.dataUsed.map((d, dIdx) => (
                <View key={dIdx} style={styles.chip}>
                  <Text variant="caption" style={styles.chipText}>
                    {d}
                  </Text>
                </View>
              ))}
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
    marginBottom: 4,
  },
  textCol: {
    flex: 1,
    marginRight: 12,
  },
  mainTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  mainDesc: {
    color: '#94A3B8',
    lineHeight: 16,
  },
  guaranteeCard: {
    backgroundColor: '#0F172A',
    borderColor: '#38BDF8',
    borderWidth: 1,
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
  },
  guaranteeTitle: {
    color: '#38BDF8',
    fontWeight: '600',
    marginBottom: 6,
  },
  guaranteeDesc: {
    color: '#CBD5E1',
    lineHeight: 18,
  },
  subHeading: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 12,
  },
  list: {
    gap: 12,
  },
  featureCard: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  featureName: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  featurePurpose: {
    color: '#94A3B8',
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chipText: {
    color: '#CBD5E1',
    fontSize: 11,
  },
});
