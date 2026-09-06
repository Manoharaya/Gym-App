import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MemberStackParamList } from '../../../navigation/types';
import { themeColors } from '../../../theme';
import {
  useMyBookings,
  useMyWaitlists,
  useCancelBookingMutation,
  useLeaveWaitlistMutation,
} from '../hooks/useBooking';
import { BookingStatusBadge, WaitlistBanner } from '../components';
import type { Booking, WaitlistEntry } from '../types';

type NavigationProp = NativeStackNavigationProp<MemberStackParamList>;
type TabType = 'UPCOMING' | 'WAITLIST' | 'PAST';

export const MyBookingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<TabType>('UPCOMING');
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: allBookings = [],
    isLoading: bookingsLoading,
    refetch: refetchBookings,
  } = useMyBookings(true);

  const {
    data: allWaitlists = [],
    isLoading: waitlistsLoading,
    refetch: refetchWaitlists,
  } = useMyWaitlists();

  const cancelMutation = useCancelBookingMutation();
  const leaveWaitlistMutation = useLeaveWaitlistMutation();

  const upcomingBookings = React.useMemo(() => {
    return allBookings.filter(
      (b) => b.status === 'CONFIRMED' && new Date(b.classSession?.startsAt || '') >= new Date()
    );
  }, [allBookings]);

  const pastBookings = React.useMemo(() => {
    return allBookings.filter(
      (b) =>
        b.status !== 'CONFIRMED' ||
        new Date(b.classSession?.startsAt || '') < new Date()
    );
  }, [allBookings]);

  const activeWaitlists = React.useMemo(() => {
    return allWaitlists.filter((w) => w.status === 'PENDING');
  }, [allWaitlists]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchBookings(), refetchWaitlists()]);
    setRefreshing(false);
  };

  const handleCancelBooking = (booking: Booking) => {
    Alert.alert(
      'Cancel Booking',
      `Cancel your spot for ${booking.classSession?.name || booking.classSession?.classType?.name || 'this class'}?`,
      [
        { text: 'Keep Spot', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelMutation.mutateAsync({ bookingId: booking.id });
              await refetchBookings();
              Alert.alert('Success', 'Your booking has been cancelled.');
            } catch (err: any) {
              const msg =
                err?.response?.data?.message ||
                err?.message ||
                'Unable to cancel booking.';
              Alert.alert('Error', msg);
            }
          },
        },
      ]
    );
  };

  const handleLeaveWaitlist = (entry: WaitlistEntry) => {
    Alert.alert(
      'Leave Waitlist',
      `Remove yourself from the waitlist for ${entry.classSession?.name || entry.classSession?.classType?.name || 'this class'}?`,
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveWaitlistMutation.mutateAsync(entry.id);
              await refetchWaitlists();
              Alert.alert('Success', 'You have left the waitlist.');
            } catch (err: any) {
              const msg =
                err?.response?.data?.message ||
                err?.message ||
                'Unable to leave waitlist.';
              Alert.alert('Error', msg);
            }
          },
        },
      ]
    );
  };

  const isLoading = bookingsLoading || waitlistsLoading;

  return (
    <View style={styles.container}>
      {/* Tab Segment Controls */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'UPCOMING' && styles.tabButtonActive]}
          onPress={() => setActiveTab('UPCOMING')}
          activeOpacity={0.8}
        >
          <Text
            style={[styles.tabButtonText, activeTab === 'UPCOMING' && styles.tabButtonTextActive]}
          >
            Upcoming ({upcomingBookings.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'WAITLIST' && styles.tabButtonActive]}
          onPress={() => setActiveTab('WAITLIST')}
          activeOpacity={0.8}
        >
          <Text
            style={[styles.tabButtonText, activeTab === 'WAITLIST' && styles.tabButtonTextActive]}
          >
            Waitlist ({activeWaitlists.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'PAST' && styles.tabButtonActive]}
          onPress={() => setActiveTab('PAST')}
          activeOpacity={0.8}
        >
          <Text
            style={[styles.tabButtonText, activeTab === 'PAST' && styles.tabButtonTextActive]}
          >
            History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main List */}
      {isLoading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#E63946" />
          <Text style={styles.loadingText}>Loading your reservations...</Text>
        </View>
      ) : activeTab === 'UPCOMING' ? (
        <FlatList
          data={upcomingBookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#E63946"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🗓️</Text>
              <Text style={styles.emptyTitle}>No Upcoming Classes</Text>
              <Text style={styles.emptyText}>
                You haven't booked any upcoming classes yet. Explore the timetable to get started!
              </Text>
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => (navigation as any).navigate('Bookings')}
                activeOpacity={0.85}
              >
                <Text style={styles.browseButtonText}>Browse Class Schedule</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const session = item.classSession;
            const startTimeStr = session?.startsAt
              ? new Date(session.startsAt).toLocaleString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '';
            return (
              <View style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <BookingStatusBadge status={item.status as any} />
                  <Text style={styles.bookingTime}>{startTimeStr}</Text>
                </View>

                <Text style={styles.bookingTitle}>
                  {session?.name || session?.classType?.name || 'Class Session'}
                </Text>

                <Text style={styles.bookingLocation}>
                  📍 {session?.outlet?.name || 'FitCore Outlet'} • {session?.resource?.name || 'Studio'}
                </Text>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => handleCancelBooking(item)}
                    disabled={cancelMutation.isPending}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelBtnText}>Cancel Booking</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      ) : activeTab === 'WAITLIST' ? (
        <FlatList
          data={activeWaitlists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#E63946"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>⏳</Text>
              <Text style={styles.emptyTitle}>No Waitlisted Classes</Text>
              <Text style={styles.emptyText}>
                You are not currently in any waitlist queues.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const session = item.classSession;
            const startTimeStr = session?.startsAt
              ? new Date(session.startsAt).toLocaleString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '';
            return (
              <WaitlistBanner
                position={item.position}
                className={session?.name || session?.classType?.name || 'Class'}
                startTime={startTimeStr}
                onLeave={() => handleLeaveWaitlist(item)}
                isLeaving={leaveWaitlistMutation.isPending}
              />
            );
          }}
        />
      ) : (
        <FlatList
          data={pastBookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#E63946"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📜</Text>
              <Text style={styles.emptyTitle}>No Past History</Text>
              <Text style={styles.emptyText}>
                Completed and past classes will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const session = item.classSession;
            const startTimeStr = session?.startsAt
              ? new Date(session.startsAt).toLocaleString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '';
            return (
              <View style={styles.historyCard}>
                <View style={styles.bookingHeader}>
                  <BookingStatusBadge status={item.status as any} />
                  <Text style={styles.historyTime}>{startTimeStr}</Text>
                </View>
                <Text style={styles.historyTitle}>
                  {session?.name || session?.classType?.name || 'Class Session'}
                </Text>
                <Text style={styles.historyLocation}>
                  {session?.outlet?.name || 'FitCore Outlet'}
                </Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: themeColors.cardBackground,
    padding: 6,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.inputBorder,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#E63946',
  },
  tabButtonText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  browseButton: {
    backgroundColor: '#E63946',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  bookingCard: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.inputBorder,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bookingTime: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '600',
  },
  bookingTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  bookingLocation: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 14,
  },
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 10,
    alignItems: 'flex-end',
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  cancelBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  historyCard: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: themeColors.inputBorder,
    opacity: 0.75,
  },
  historyTime: {
    color: '#6B7280',
    fontSize: 11,
  },
  historyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  historyLocation: {
    color: '#6B7280',
    fontSize: 12,
  },
});
