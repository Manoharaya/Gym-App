import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Screen, Card, Badge, Icon, Button } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { notificationService } from '../services/notificationService';
import type { Notification } from '@fitcore/types';

export const NotificationDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { notificationId } = route.params || {};

  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const fetchDetail = useCallback(async () => {
    if (!notificationId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await notificationService.getNotificationById(notificationId);
      setNotification(data);
      if (!data.readAt) {
        await notificationService.markAsRead(notificationId, true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load notification details');
    } finally {
      setLoading(false);
    }
  }, [notificationId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleDelete = async () => {
    if (!notificationId) return;
    try {
      setDeleting(true);
      await notificationService.deleteNotification(notificationId);
      navigation.goBack();
    } catch (err: any) {
      setError(err.message || 'Failed to delete notification');
      setDeleting(false);
    }
  };

  const handleActionPress = () => {
    if (!notification) return;
    const data = notification.data as any;
    if (data?.actionType === 'BOOKING' && data.actionId) {
      navigation.navigate('BookingDetail', { bookingId: data.actionId });
    } else if (data?.actionType === 'WORKOUT' && data.actionId) {
      navigation.navigate('WorkoutSession', { workoutId: data.actionId });
    } else if (data?.actionType === 'INVOICE' && data.actionId) {
      navigation.navigate('InvoiceDetails', { invoiceId: data.actionId });
    }
  };

  const getActionLabel = (actionType?: string) => {
    switch (actionType) {
      case 'BOOKING':
        return 'View Booking';
      case 'WORKOUT':
        return 'Open Workout Session';
      case 'INVOICE':
        return 'View Invoice';
      case 'MEMBERSHIP':
        return 'View Membership';
      default:
        return 'View Details';
    }
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconButton}
          accessibilityLabel="Go back"
        >
          <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification</Text>
        <TouchableOpacity
          onPress={handleDelete}
          disabled={deleting}
          style={styles.iconButton}
          accessibilityLabel="Delete notification"
        >
          <Icon name="close" size={20} color={themeColors.danger} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={themeColors.accent} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Icon name="alert-circle" size={40} color={themeColors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Go Back" variant="outline" onPress={() => navigation.goBack()} />
        </View>
      ) : !notification ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Notification not found</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <Card style={styles.detailCard}>
            <View style={styles.badgeRow}>
              <Badge label={notification.category} variant="accent" />
              {notification.priority === 'URGENT' && (
                <Badge label="URGENT" variant="danger" />
              )}
              <Text style={styles.timeText}>
                {new Date(notification.createdAt).toLocaleString()}
              </Text>
            </View>

            <Text style={styles.titleText}>{notification.title}</Text>
            <Text style={styles.bodyText}>{notification.body}</Text>

            {/* Deep-link action button */}
            {(notification.data as any)?.actionType && (
              <View style={styles.actionContainer}>
                <Button
                  title={getActionLabel((notification.data as any).actionType)}
                  variant="primary"
                  onPress={handleActionPress}
                />
              </View>
            )}
          </Card>
        </ScrollView>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  headerTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  iconButton: {
    padding: spacing[2],
  },
  contentContainer: {
    padding: spacing[4],
  },
  detailCard: {
    backgroundColor: themeColors.surface,
    padding: spacing[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  timeText: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  titleText: {
    ...typography.h3,
    color: themeColors.textPrimary,
    marginBottom: spacing[3],
  },
  bodyText: {
    ...typography.body,
    color: themeColors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing[4],
  },
  actionContainer: {
    marginTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    paddingTop: spacing[4],
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
  },
  loadingText: {
    ...typography.body,
    color: themeColors.textSecondary,
    marginTop: spacing[3],
  },
  errorText: {
    ...typography.body,
    color: themeColors.danger,
    marginVertical: spacing[3],
    textAlign: 'center',
  },
});
