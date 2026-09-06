import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing } from '../../../theme';

interface NotificationItem {
  id: string;
  category: 'BOOKING' | 'PAYMENT' | 'ACHIEVEMENT' | 'ACCESS';
  title: string;
  message: string;
  time: string;
  read: boolean;
  variant: 'accent' | 'success' | 'warning' | 'primary';
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    category: 'BOOKING',
    title: 'Spot Confirmed from Waitlist! 🎉',
    message: 'A spot opened in HIIT Blast 45 with Marcus Brody. You have been promoted to Confirmed.',
    time: '25m ago',
    read: false,
    variant: 'accent',
  },
  {
    id: 'n2',
    category: 'PAYMENT',
    title: 'Payment Successful',
    message: 'Invoice INV-202609-0014 ($120.00) has been paid via Visa •••• 4242.',
    time: '3h ago',
    read: false,
    variant: 'success',
  },
  {
    id: 'n3',
    category: 'ACHIEVEMENT',
    title: '4-Day Training Streak',
    message: 'Consistency unlocked! You completed 4 workouts in a row this week.',
    time: '1d ago',
    read: true,
    variant: 'primary',
  },
  {
    id: 'n4',
    category: 'ACCESS',
    title: 'Perth CBD Turnstile Check-In',
    message: 'Dynamic QR pass authenticated at Main Entrance Gate 2.',
    time: '2d ago',
    read: true,
    variant: 'accent',
  },
];

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead}>
          <Text style={styles.markReadText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {notifications.map((item) => (
          <Card
            key={item.id}
            style={[styles.notificationCard, !item.read && styles.unreadCard]}
          >
            <View style={styles.cardHeader}>
              <Badge label={item.category} variant={item.variant} />
              <Text style={styles.timeText}>{item.time}</Text>
            </View>
            <Text style={styles.titleText}>{item.title}</Text>
            <Text style={styles.messageText}>{item.message}</Text>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  backButton: {
    padding: spacing[2],
    marginLeft: -spacing[2],
  },
  headerTitle: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  markReadText: {
    ...typography.caption,
    color: themeColors.accent,
    fontWeight: '600',
  },
  container: {
    padding: spacing[4],
    gap: spacing[3],
    paddingBottom: spacing[10],
  },
  notificationCard: {
    padding: spacing[4],
    gap: spacing[2],
  },
  unreadCard: {
    borderColor: themeColors.accent,
    backgroundColor: '#131A26',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  titleText: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  messageText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    lineHeight: 18,
  },
});
