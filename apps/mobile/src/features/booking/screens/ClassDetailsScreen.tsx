import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MemberStackParamList } from '../../../navigation/types';
import { themeColors } from '../../../theme';
import {
  useClassSession,
  useBookSessionMutation,
  useJoinWaitlistMutation,
  useCancelBookingMutation,
  useLeaveWaitlistMutation,
  useMyBookings,
  useMyWaitlists,
} from '../hooks/useBooking';

type RouteProps = RouteProp<MemberStackParamList, 'ClassDetails'>;
type NavigationProp = NativeStackNavigationProp<MemberStackParamList>;

export const ClassDetailsScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { sessionId } = route.params;

  const { data: session, isLoading, refetch } = useClassSession(sessionId);
  const { data: myBookings = [] } = useMyBookings(false);
  const { data: myWaitlists = [] } = useMyWaitlists();

  const bookMutation = useBookSessionMutation();
  const waitlistMutation = useJoinWaitlistMutation();
  const cancelMutation = useCancelBookingMutation();
  const leaveWaitlistMutation = useLeaveWaitlistMutation();

  const [actionError, setActionError] = useState<string | null>(null);

  const activeBooking = myBookings.find(
    (b) => b.classSessionId === sessionId && b.status === 'CONFIRMED'
  );

  const activeWaitlist = myWaitlists.find(
    (w) => w.classSessionId === sessionId && w.status === 'PENDING'
  );

  if (isLoading || !session) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E63946" />
        <Text style={styles.loadingText}>Loading class details...</Text>
      </View>
    );
  }

  const spotsLeft = session.spotsRemaining ?? (session.capacity - (session.confirmedBookingCount || 0));
  const isFull = spotsLeft <= 0;
  const isCancelled = session.status === 'CANCELLED';

  const startDate = new Date(session.startsAt);
  const endDate = new Date(session.endsAt);
  const dateFormatted = startDate.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  const timeFormatted = `${startDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })} – ${endDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  const handleBook = async () => {
    setActionError(null);
    try {
      const res = await bookMutation.mutateAsync({
        sessionId,
        idempotencyKey: `booking-${session.id}-${Date.now()}`,
      });
      (navigation as any).navigate('BookingConfirmation', {
        booking: res.booking,
        waitlist: res.waitlist,
        isWaitlisted: res.status === 'WAITLISTED',
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Unable to book class. Please verify your membership.';
      setActionError(msg);
      Alert.alert('Booking Error', msg);
    }
  };

  const handleJoinWaitlist = async () => {
    setActionError(null);
    try {
      const waitlist = await waitlistMutation.mutateAsync(sessionId);
      (navigation as any).navigate('BookingConfirmation', {
        waitlist,
        isWaitlisted: true,
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Unable to join waitlist.';
      setActionError(msg);
      Alert.alert('Waitlist Error', msg);
    }
  };

  const handleCancelBooking = () => {
    if (!activeBooking) return;
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this class reservation? A spot will be offered to the waitlist.',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelMutation.mutateAsync({ bookingId: activeBooking.id });
              await refetch();
              Alert.alert('Cancelled', 'Your booking has been cancelled.');
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

  const handleLeaveWaitlist = () => {
    if (!activeWaitlist) return;
    Alert.alert(
      'Leave Waitlist',
      'Are you sure you want to remove yourself from the waitlist?',
      [
        { text: 'Stay in Queue', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveWaitlistMutation.mutateAsync(activeWaitlist.id);
              await refetch();
              Alert.alert('Removed', 'You have left the waitlist.');
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

  const policy = (session as any).policy;
  const cancelHours = policy?.cancellationCutoffHours ?? 2;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Category & Title Header */}
      <View style={styles.headerBox}>
        <View style={styles.badgeRow}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>
              {session.classType?.category || 'GROUP CLASS'}
            </Text>
          </View>
          <Text style={styles.durationBadge}>
            {session.classType?.durationMinutes ?? 45} Minutes
          </Text>
        </View>

        <Text style={styles.sessionTitle}>
          {session.name || session.classType?.name}
        </Text>
      </View>

      {/* Date & Time Section */}
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📅</Text>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{dateFormatted}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>⏰</Text>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Time</Text>
            <Text style={styles.infoValue}>{timeFormatted}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📍</Text>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Location & Studio</Text>
            <Text style={styles.infoValue}>
              {session.outlet?.name || 'FitCore Outlet'} — {session.resource?.name || 'Studio Room'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>👤</Text>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Instructor</Text>
            <Text style={styles.infoValue}>
              {session.trainer
                ? `${session.trainer.firstName} ${session.trainer.lastName}`
                : 'FitCore Lead Coach'}
            </Text>
          </View>
        </View>
      </View>

      {/* Spots & Availability Box */}
      <View style={styles.card}>
        <View style={styles.capacityHeader}>
          <Text style={styles.sectionHeading}>Capacity & Availability</Text>
          <Text
            style={[
              styles.spotsNumber,
              isFull ? styles.spotsFull : styles.spotsAvailable,
            ]}
          >
            {isFull ? 'FULL' : `${spotsLeft} spots left`}
          </Text>
        </View>

        <Text style={styles.capacitySub}>
          Maximum capacity: {session.capacity} participants
        </Text>
      </View>

      {/* Description */}
      {(session.classType?.description || session.classTemplate?.description) && (
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>About this Class</Text>
          <Text style={styles.descriptionText}>
            {session.classType?.description || session.classTemplate?.description}
          </Text>
        </View>
      )}

      {/* Cancellation Policy */}
      <View style={styles.policyCard}>
        <Text style={styles.policyTitle}>Cancellation Policy</Text>
        <Text style={styles.policyText}>
          You can cancel free of penalty up to {cancelHours} hours prior to class start. Late cancellations or no-shows may count towards your booking quota.
        </Text>
      </View>

      {/* Error Banner */}
      {actionError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {actionError}</Text>
        </View>
      )}

      {/* Action Footer */}
      <View style={styles.footerContainer}>
        {activeBooking ? (
          <View style={styles.bookedContainer}>
            <View style={styles.confirmedStatusBadge}>
              <Text style={styles.confirmedStatusText}>✓ YOU ARE BOOKED</Text>
            </View>
            <TouchableOpacity
              style={styles.cancelBookingButton}
              onPress={handleCancelBooking}
              disabled={cancelMutation.isPending}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBookingText}>
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Reservation'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : activeWaitlist ? (
          <View style={styles.waitlistedContainer}>
            <View style={styles.waitlistStatusBadge}>
              <Text style={styles.waitlistStatusText}>
                ⏳ #{activeWaitlist.position} ON WAITLIST
              </Text>
            </View>
            <TouchableOpacity
              style={styles.cancelBookingButton}
              onPress={handleLeaveWaitlist}
              disabled={leaveWaitlistMutation.isPending}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBookingText}>
                {leaveWaitlistMutation.isPending ? 'Leaving...' : 'Leave Waitlist'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : isCancelled ? (
          <View style={styles.cancelledContainer}>
            <Text style={styles.cancelledText}>This class has been cancelled by the gym.</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.primaryButton,
              isFull ? styles.waitlistButton : styles.bookButton,
            ]}
            onPress={isFull ? handleJoinWaitlist : handleBook}
            disabled={bookMutation.isPending || waitlistMutation.isPending}
            activeOpacity={0.85}
          >
            {bookMutation.isPending || waitlistMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isFull ? 'Join Waitlist' : 'Book Class Now'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.background,
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
  },
  headerBox: {
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryPill: {
    backgroundColor: 'rgba(230, 57, 70, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryPillText: {
    color: '#FF4D5E',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  durationBadge: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  sessionTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: themeColors.inputBorder,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 14,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 6,
  },
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionHeading: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  spotsNumber: {
    fontSize: 14,
    fontWeight: '800',
  },
  spotsAvailable: {
    color: '#34D399',
  },
  spotsFull: {
    color: '#C084FC',
  },
  capacitySub: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  descriptionText: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
  },
  policyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  policyTitle: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  policyText: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  footerContainer: {
    marginTop: 8,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButton: {
    backgroundColor: '#E63946',
  },
  waitlistButton: {
    backgroundColor: '#A855F7',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bookedContainer: {
    alignItems: 'center',
  },
  confirmedStatusBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  confirmedStatusText: {
    color: '#34D399',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  waitlistedContainer: {
    alignItems: 'center',
  },
  waitlistStatusBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  waitlistStatusText: {
    color: '#C084FC',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cancelBookingButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  cancelBookingText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelledContainer: {
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelledText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
});
