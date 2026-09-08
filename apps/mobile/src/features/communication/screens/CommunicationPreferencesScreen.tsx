import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import type { CommunicationChannel, CommunicationType } from '@fitcore/types';

interface ChannelToggle {
  channel: CommunicationChannel;
  label: string;
  icon: string;
  description: string;
}

interface CategoryToggle {
  type: CommunicationType;
  title: string;
  description: string;
  channels: Record<CommunicationChannel, boolean>;
}

export const CommunicationPreferencesScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [marketingConsentActive, setMarketingConsentActive] = useState<boolean>(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Category preferences mapped to channels
  const [categories, setCategories] = useState<Record<string, Record<CommunicationChannel, boolean>>>({
    ENGAGEMENT: {
      EMAIL: true,
      SMS: false,
      PUSH: true,
      WHATSAPP: false,
      IN_APP: true,
      VOICE: false,
    },
    REMINDER: {
      EMAIL: true,
      SMS: true,
      PUSH: true,
      WHATSAPP: true,
      IN_APP: true,
      VOICE: false,
    },
    REACTIVATION: {
      EMAIL: true,
      SMS: false,
      PUSH: true,
      WHATSAPP: false,
      IN_APP: true,
      VOICE: false,
    },
    MARKETING: {
      EMAIL: false,
      SMS: false,
      PUSH: false,
      WHATSAPP: false,
      IN_APP: true,
      VOICE: false,
    },
  });

  const toggleChannel = (cat: string, chan: CommunicationChannel) => {
    setCategories((prev) => ({
      ...prev,
      [cat]: {
        ...prev[cat],
        [chan]: !prev[cat]?.[chan],
      },
    }));
    setSuccessMsg('Preferences updated');
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const channelList: ChannelToggle[] = [
    { channel: 'PUSH', label: 'Push Notifications', icon: 'bell', description: 'Immediate mobile alerts & workout reminders' },
    { channel: 'EMAIL', label: 'Email', icon: 'mail', description: 'Weekly summaries, schedules & receipts' },
    { channel: 'SMS', label: 'SMS Text', icon: 'message-square', description: 'Time-critical alerts & trainer check-ins' },
    { channel: 'WHATSAPP', label: 'WhatsApp', icon: 'message-circle', description: 'Direct updates & class alerts' },
  ];

  return (
    <Screen style={styles.container} testID="communication-preferences-screen">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon name="arrow-left" size={24} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Communication Preferences</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <Card style={styles.infoBanner}>
          <View style={styles.bannerRow}>
            <Icon name="shield" size={20} color={themeColors.primary} />
            <Text style={styles.bannerTitle}>Your Privacy & Consent</Text>
          </View>
          <Text style={styles.bannerText}>
            FitCore strictly honors your choices. Critical transactional and security notices (like payments and entry confirmations) cannot be turned off to protect your account.
          </Text>
        </Card>

        {successMsg && (
          <View style={styles.successToast}>
            <Icon name="check-circle" size={16} color={themeColors.success} />
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        )}

        {/* Categories */}
        <Text style={styles.sectionHeader}>Notification Categories</Text>

        {/* 1. Reminders */}
        <Card style={styles.categoryCard}>
          <View style={styles.categoryHeader}>
            <View style={styles.categoryIconWrap}>
              <Icon name="calendar" size={20} color={themeColors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={styles.categoryTitle}>Booking & Class Reminders</Text>
              <Text style={styles.categoryDesc}>Upcoming reservations, PT sessions, waitlist alerts</Text>
            </View>
          </View>

          <View style={styles.channelToggles}>
            {channelList.map((ch) => (
              <View key={ch.channel} style={styles.channelRow}>
                <Text style={styles.channelName}>{ch.label}</Text>
                <Switch
                  value={categories.REMINDER?.[ch.channel] ?? false}
                  onValueChange={() => toggleChannel('REMINDER', ch.channel)}
                  trackColor={{ false: themeColors.border, true: themeColors.primary }}
                  thumbColor="#ffffff"
                  accessibilityLabel={`Toggle reminder ${ch.label}`}
                />
              </View>
            ))}
          </View>
        </Card>

        {/* 2. Engagement & Coaching */}
        <Card style={styles.categoryCard}>
          <View style={styles.categoryHeader}>
            <View style={styles.categoryIconWrap}>
              <Icon name="activity" size={20} color="#3B82F6" />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={styles.categoryTitle}>Coaching & Habits</Text>
              <Text style={styles.categoryDesc}>Workout progress, habit streaks, AI check-in nudges</Text>
            </View>
          </View>

          <View style={styles.channelToggles}>
            {channelList.map((ch) => (
              <View key={ch.channel} style={styles.channelRow}>
                <Text style={styles.channelName}>{ch.label}</Text>
                <Switch
                  value={categories.ENGAGEMENT?.[ch.channel] ?? false}
                  onValueChange={() => toggleChannel('ENGAGEMENT', ch.channel)}
                  trackColor={{ false: themeColors.border, true: themeColors.primary }}
                  thumbColor="#ffffff"
                  accessibilityLabel={`Toggle engagement ${ch.label}`}
                />
              </View>
            ))}
          </View>
        </Card>

        {/* 3. Reactivation & Routine Recovery */}
        <Card style={styles.categoryCard}>
          <View style={styles.categoryHeader}>
            <View style={styles.categoryIconWrap}>
              <Icon name="rotate-ccw" size={20} color="#10B981" />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={styles.categoryTitle}>Routine Re-engagement</Text>
              <Text style={styles.categoryDesc}>Friendly encouragement to resume your training routine</Text>
            </View>
          </View>

          <View style={styles.channelToggles}>
            {channelList.map((ch) => (
              <View key={ch.channel} style={styles.channelRow}>
                <Text style={styles.channelName}>{ch.label}</Text>
                <Switch
                  value={categories.REACTIVATION?.[ch.channel] ?? false}
                  onValueChange={() => toggleChannel('REACTIVATION', ch.channel)}
                  trackColor={{ false: themeColors.border, true: themeColors.primary }}
                  thumbColor="#ffffff"
                  accessibilityLabel={`Toggle reactivation ${ch.label}`}
                />
              </View>
            ))}
          </View>
        </Card>

        {/* 4. Marketing & Offers */}
        <Card style={styles.categoryCard}>
          <View style={styles.categoryHeader}>
            <View style={styles.categoryIconWrap}>
              <Icon name="tag" size={20} color="#F59E0B" />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={styles.categoryTitle}>Promotions & Events</Text>
              <Text style={styles.categoryDesc}>Gym social events, membership promotions, retail discounts</Text>
            </View>
          </View>

          <View style={styles.channelToggles}>
            {channelList.map((ch) => (
              <View key={ch.channel} style={styles.channelRow}>
                <Text style={styles.channelName}>{ch.label}</Text>
                <Switch
                  value={categories.MARKETING?.[ch.channel] ?? false}
                  onValueChange={() => toggleChannel('MARKETING', ch.channel)}
                  trackColor={{ false: themeColors.border, true: themeColors.primary }}
                  thumbColor="#ffffff"
                  accessibilityLabel={`Toggle marketing ${ch.label}`}
                />
              </View>
            ))}
          </View>
        </Card>

        {/* Transactional Notice */}
        <Card style={styles.lockedCard}>
          <View style={styles.bannerRow}>
            <Icon name="lock" size={18} color={themeColors.textSecondary} />
            <Text style={styles.lockedTitle}>Essential Transactional Messages</Text>
          </View>
          <Text style={styles.lockedText}>
            Payment receipts, security verifications, door access passes, and legal policy updates are always delivered to your primary email and push devices.
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  infoBanner: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderColor: 'rgba(99, 102, 241, 0.25)',
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  bannerTitle: {
    ...typography.subtitle1,
    color: themeColors.textPrimary,
    marginLeft: spacing.xs,
    fontWeight: '700',
  },
  bannerText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    lineHeight: 18,
  },
  successToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: themeColors.success,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  successText: {
    ...typography.caption,
    color: themeColors.success,
    marginLeft: spacing.xs,
    fontWeight: '600',
  },
  sectionHeader: {
    ...typography.h4,
    color: themeColors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    ...typography.subtitle1,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  categoryDesc: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  channelToggles: {
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    paddingTop: spacing.xs,
  },
  channelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  channelName: {
    ...typography.body2,
    color: themeColors.textPrimary,
  },
  lockedCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: themeColors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  lockedTitle: {
    ...typography.subtitle2,
    color: themeColors.textSecondary,
    marginLeft: spacing.xs,
    fontWeight: '600',
  },
  lockedText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
});
