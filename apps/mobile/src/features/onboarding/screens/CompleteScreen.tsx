import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { Button } from '../../../components/primitives/Button';
import { Card } from '../../../components/primitives/Card';
import { themeColors } from '../../../theme';

interface CompleteScreenProps {
  onFinish: () => void;
}

export const CompleteScreen: React.FC<CompleteScreenProps> = ({ onFinish }) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.badgeWrap}>
        <Text style={styles.badgeIcon}>🎉</Text>
      </View>

      <Text style={styles.title}>Welcome to FitCore</Text>
      <Text style={styles.subtitle}>
        Second Wind Athletic Club onboarding is officially complete! Your profile is verified and active.
      </Text>

      <Card style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Profile Status</Text>
          <View style={styles.activePill}>
            <Text style={styles.activePillText}>✓ COMPLETE</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Health & Safety Clearance</Text>
          <View style={styles.activePill}>
            <Text style={styles.activePillText}>✓ VERIFIED</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Compliance & Waivers</Text>
          <View style={styles.activePill}>
            <Text style={styles.activePillText}>✓ SIGNED</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.roadmapCard}>
        <Text style={styles.roadmapTitle}>Coming Soon in Future Milestones</Text>

        <View style={styles.roadmapItem}>
          <Text style={styles.roadmapName}>Membership Subscriptions</Text>
          <Text style={styles.roadmapBadge}>Coming Soon</Text>
        </View>

        <View style={styles.roadmapItem}>
          <Text style={styles.roadmapName}>Workout Tracking & Programs</Text>
          <Text style={styles.roadmapBadge}>Coming Soon</Text>
        </View>

        <View style={styles.roadmapItem}>
          <Text style={styles.roadmapName}>FitCore AI Coach</Text>
          <Text style={styles.roadmapBadge}>Coming Soon</Text>
        </View>

        <View style={styles.roadmapItem}>
          <Text style={styles.roadmapName}>Apple Health & Wearable Telemetry</Text>
          <Text style={styles.roadmapBadge}>Coming Soon</Text>
        </View>
      </Card>

      <Button
        title="Go to Member Dashboard"
        variant="primary"
        size="lg"
        onPress={onFinish}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  content: {
    padding: 24,
    alignItems: 'center',
    paddingBottom: 40,
  },
  badgeWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  badgeIcon: {
    fontSize: 36,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#A3A3A3',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  statusCard: {
    width: '100%',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2B2B2B',
  },
  statusLabel: {
    color: '#D4D4D4',
    fontSize: 14,
    fontWeight: '500',
  },
  activePill: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activePillText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '700',
  },
  roadmapCard: {
    width: '100%',
    backgroundColor: '#161616',
    borderRadius: 12,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#262626',
  },
  roadmapTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roadmapItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  roadmapName: {
    color: '#A3A3A3',
    fontSize: 13,
  },
  roadmapBadge: {
    color: themeColors.primary,
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
