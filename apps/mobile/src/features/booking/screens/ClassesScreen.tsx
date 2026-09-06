import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MemberStackParamList } from '../../../navigation/types';
import { themeColors } from '../../../theme';
import { useClassSessions, useMyBookings, useMyWaitlists } from '../hooks/useBooking';
import { useBookingStore } from '../store/bookingStore';
import { ClassCard, SessionFilterBar } from '../components';
import type { ClassSession } from '../types';

type NavigationProp = NativeStackNavigationProp<MemberStackParamList>;

export const ClassesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [refreshing, setRefreshing] = useState(false);

  const {
    selectedDate,
    selectedCategory,
    selectedOutletId,
    setSelectedDate,
    setSelectedCategory,
  } = useBookingStore();

  const queryParams = useMemo(() => {
    // Start and end of the selected day
    const startDate = `${selectedDate}T00:00:00.000Z`;
    const endDate = `${selectedDate}T23:59:59.999Z`;
    return {
      startDate,
      endDate,
      category: selectedCategory || undefined,
      outletId: selectedOutletId || undefined,
      status: 'SCHEDULED',
    };
  }, [selectedDate, selectedCategory, selectedOutletId]);

  const {
    data: sessions = [],
    isLoading,
    refetch: refetchSessions,
  } = useClassSessions(queryParams);

  const {
    data: myBookings = [],
    refetch: refetchBookings,
  } = useMyBookings(false);

  const {
    data: myWaitlists = [],
    refetch: refetchWaitlists,
  } = useMyWaitlists();

  const myBookedSessionIds = useMemo(() => {
    return new Set(
      myBookings
        .filter((b) => b.status === 'CONFIRMED')
        .map((b) => b.classSessionId)
    );
  }, [myBookings]);

  const myWaitlistedSessionIds = useMemo(() => {
    return new Set(
      myWaitlists
        .filter((w) => w.status === 'PENDING')
        .map((w) => w.classSessionId)
    );
  }, [myWaitlists]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchSessions(),
      refetchBookings(),
      refetchWaitlists(),
    ]);
    setRefreshing(false);
  };

  const handleSessionPress = (session: ClassSession) => {
    (navigation as any).navigate('ClassDetails', { sessionId: session.id });
  };

  const upcomingCount = myBookings.filter((b) => b.status === 'CONFIRMED').length;

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.title}>Class Schedule</Text>
          <Text style={styles.subtitle}>Discover & book group workouts</Text>
        </View>

        <TouchableOpacity
          style={styles.myBookingsButton}
          onPress={() => (navigation as any).navigate('MyBookings')}
          activeOpacity={0.8}
        >
          <Text style={styles.myBookingsIcon}>📅</Text>
          <Text style={styles.myBookingsText}>My Classes</Text>
          {upcomingCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{upcomingCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Filter and Date Strip */}
      <SessionFilterBar
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Session List */}
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E63946" />
          <Text style={styles.loadingText}>Loading scheduled classes...</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
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
              <Text style={styles.emptyIcon}>🧘</Text>
              <Text style={styles.emptyTitle}>No Classes Scheduled</Text>
              <Text style={styles.emptyText}>
                No group sessions found matching your filters for this day. Try selecting another date or category.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ClassCard
              session={item}
              onPress={() => handleSessionPress(item)}
              onBookPress={() => handleSessionPress(item)}
              isBookedByMe={myBookedSessionIds.has(item.id)}
              isWaitlistedByMe={myWaitlistedSessionIds.has(item.id)}
            />
          )}
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
  myBookingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.cardBackground,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: themeColors.inputBorder,
  },
  myBookingsIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  myBookingsText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: '#E63946',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    paddingHorizontal: 4,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  loadingContainer: {
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
  },
});
