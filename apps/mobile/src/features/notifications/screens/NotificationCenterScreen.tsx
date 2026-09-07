import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { notificationService } from '../services/notificationService';
import type { Notification } from '@fitcore/types';

const CATEGORIES = [
  { key: 'ALL', label: 'All' },
  { key: 'BOOKING', label: 'Bookings' },
  { key: 'TRAINING', label: 'Training' },
  { key: 'PAYMENT', label: 'Payments' },
  { key: 'SYSTEM', label: 'System' },
];

export const NotificationCenterScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setError(null);
      const params = selectedCategory === 'ALL' ? {} : { category: selectedCategory };
      const [res, unreadRes] = await Promise.all([
        notificationService.getNotifications(params),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(res.data || []);
      setUnreadCount(unreadRes.unreadCount || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    setLoading(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString(), status: 'READ' })),
      );
      setUnreadCount(0);
    } catch (err: any) {
      setError(err.message || 'Failed to mark notifications as read');
    }
  };

  const handleNotificationPress = async (item: Notification) => {
    if (!item.readAt) {
      try {
        await notificationService.markAsRead(item.id, true);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, readAt: new Date().toISOString(), status: 'READ' } : n)),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // Continue navigation regardless
      }
    }

    const data = item.data as any;
    if (data?.actionType === 'BOOKING' && data.actionId) {
      navigation.navigate('BookingDetail', { bookingId: data.actionId });
    } else if (data?.actionType === 'WORKOUT' && data.actionId) {
      navigation.navigate('WorkoutSession', { workoutId: data.actionId });
    } else if (data?.actionType === 'INVOICE' && data.actionId) {
      navigation.navigate('InvoiceDetails', { invoiceId: data.actionId });
    } else {
      navigation.navigate('NotificationDetail', { notificationId: item.id });
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  const getCategoryVariant = (category: string) => {
    switch (category) {
      case 'BOOKING':
        return 'accent';
      case 'TRAINING':
        return 'primary';
      case 'PAYMENT':
        return 'success';
      case 'SECURITY':
      case 'ADMIN':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.iconButton}
            accessibilityLabel="Go back"
          >
            <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadCountBadge}>
                <Text style={styles.unreadCountText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate('NotificationPreferences')}
            style={styles.iconButton}
            accessibilityLabel="Notification Preferences"
          >
            <Icon name="settings" size={20} color={themeColors.textSecondary} />
          </TouchableOpacity>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.markReadButton}>
              <Text style={styles.markReadText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories Filter Tabs */}
      <View style={styles.categoriesWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                onPress={() => setSelectedCategory(cat.key)}
                style={[styles.categoryPill, isSelected && styles.selectedCategoryPill]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={[styles.categoryText, isSelected && styles.selectedCategoryText]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={themeColors.accent} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Icon name="alert-circle" size={40} color={themeColors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchNotifications} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : notifications.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.accent} />}
        >
          <Icon name="bell" size={48} color={themeColors.textMuted} />
          <Text style={styles.emptyTitle}>You're all caught up</Text>
          <Text style={styles.emptySubtitle}>No notifications to show for {selectedCategory.toLowerCase()}.</Text>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.accent} />}
        >
          {notifications.map((item) => {
            const isUnread = !item.readAt;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`${isUnread ? 'Unread notification: ' : ''}${item.title}`}
              >
                <Card style={[styles.notificationCard, isUnread && styles.unreadCard]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardBadges}>
                      <Badge label={item.category} variant={getCategoryVariant(item.category)} />
                      {item.priority === 'URGENT' && <Badge label="URGENT" variant="danger" />}
                      {isUnread && (
                        <View style={styles.unreadTag}>
                          <Text style={styles.unreadTagText}>NEW</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.timeText}>{formatRelativeTime(item.createdAt)}</Text>
                  </View>

                  <Text style={[styles.titleText, isUnread && styles.unreadTitleText]}>
                    {item.title}
                  </Text>
                  <Text style={styles.bodyText} numberOfLines={2}>
                    {item.body}
                  </Text>
                </Card>
              </TouchableOpacity>
            );
          })}
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing[2],
  },
  headerTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  unreadCountBadge: {
    backgroundColor: themeColors.accent,
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    marginLeft: spacing[2],
  },
  unreadCountText: {
    ...typography.caption,
    color: themeColors.background,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: spacing[2],
  },
  markReadButton: {
    marginLeft: spacing[2],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  markReadText: {
    ...typography.caption,
    color: themeColors.accent,
    fontWeight: '600',
  },
  categoriesWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    backgroundColor: themeColors.background,
  },
  categoriesContainer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  categoryPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  selectedCategoryPill: {
    backgroundColor: themeColors.accent,
    borderColor: themeColors.accent,
  },
  categoryText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: themeColors.background,
    fontWeight: '700',
  },
  listContainer: {
    padding: spacing[4],
    gap: spacing[3],
  },
  notificationCard: {
    backgroundColor: themeColors.surface,
    padding: spacing[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: themeColors.accent,
    backgroundColor: themeColors.surfaceActive,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  cardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  unreadTag: {
    backgroundColor: themeColors.accent,
    paddingHorizontal: spacing[2],
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  unreadTagText: {
    ...typography.caption,
    color: themeColors.background,
    fontSize: 10,
    fontWeight: '800',
  },
  timeText: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  titleText: {
    ...typography.body,
    color: themeColors.textPrimary,
    fontWeight: '500',
    marginBottom: spacing[1],
  },
  unreadTitleText: {
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  bodyText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    lineHeight: 18,
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
    marginTop: spacing[2],
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing[3],
    backgroundColor: themeColors.surface,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  retryButtonText: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
    minHeight: 300,
  },
  emptyTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
    marginTop: spacing[3],
  },
  emptySubtitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: spacing[1],
    textAlign: 'center',
  },
});
