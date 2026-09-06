import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MemberStackParamList } from '../../../navigation/types';
import { Screen, Card, Badge, Button, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { useMyBookings, useCancelBooking } from '../hooks/useBooking';

type RouteProps = RouteProp<MemberStackParamList, 'BookingDetail'>;
type NavigationProp = NativeStackNavigationProp<MemberStackParamList>;

export const BookingDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { bookingId } = route.params;

  const { data: bookings = [], isLoading } = useMyBookings(false);
  const cancelBookingMutation = useCancelBooking();
  const [cancelling, setCancelling] = useState(false);

  const booking = bookings.find((b) => b.id === bookingId);

  if (isLoading) {
    return (
      <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.accent} />
          <Text style={styles.loadingText}>Loading booking details...</Text>
        </View>
      </Screen>
    );
  }

  if (!booking) {
    return (
      <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color={themeColors.danger} />
          <Text style={styles.errorTitle}>Booking Not Found</Text>
          <Text style={styles.errorSubtitle}>The requested booking pass could not be retrieved.</Text>
          <Button
            title="Return to My Bookings"
            variant="secondary"
            onPress={() => navigation.navigate('MyBookings')}
            style={styles.backBtn}
          />
        </View>
      </Screen>
    );
  }

  const session = booking.classSession;
  const isConfirmed = booking.status === 'CONFIRMED';
  const isWaitlisted = booking.status === 'WAITLISTED';
  const isCancelled = booking.status === 'CANCELLED';
  const isCheckedIn = booking.status === 'CHECKED_IN';

  const startsAt = session?.startsAt ? new Date(session.startsAt) : new Date();
  const endsAt = session?.endsAt ? new Date(session.endsAt) : new Date();

  const handleCancelBooking = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? If you cancel, your spot will be offered to the waitlist.',
      [
        { text: 'Keep Spot', style: 'cancel' },
        {
          text: 'Confirm Cancellation',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await cancelBookingMutation.mutateAsync({
                bookingId: booking.id,
                reason: 'Member voluntary cancellation',
              });
              Alert.alert('Booking Cancelled', 'Your spot has been successfully released.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (err: any) {
              Alert.alert('Cancellation Error', err.message || 'Unable to cancel booking.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Icon name="chevron-left" size={24} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Pass</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Pass Hero Card */}
        <Card style={styles.passCard}>
          <View style={styles.passHeader}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{session?.classType?.category || 'FITNESS'}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing[2], alignItems: 'center' }}>
              {session?.isOverride && (
                <Badge label="SCHEDULE OVERRIDE" variant="warning" />
              )}
              <Badge
                label={booking.status}
                variant={
                  isConfirmed
                    ? 'success'
                    : isWaitlisted
                    ? 'warning'
                    : isCheckedIn
                    ? 'accent'
                    : isCancelled
                    ? 'danger'
                    : 'primary'
                }
              />
            </View>
          </View>

          <Text style={styles.className}>{session?.name || 'Group Training'}</Text>

          {isWaitlisted && (
            <View style={styles.waitlistBanner}>
              <Icon name="clock" size={18} color={themeColors.warning} />
              <Text style={styles.waitlistText}>
                Waitlist Position: <Text style={styles.boldText}>#{booking.waitlistPosition || 1}</Text>
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* Time & Date */}
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Icon name="calendar" size={20} color={themeColors.accent} />
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>DATE & TIME</Text>
              <Text style={styles.infoValue}>
                {startsAt.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              <Text style={styles.infoSubValue}>
                {startsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                {endsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>

          {/* Location & Room */}
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Icon name="map-pin" size={20} color={themeColors.accent} />
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>LOCATION</Text>
              <Text style={styles.infoValue}>{session?.outlet?.name || 'FitCore Main Campus'}</Text>
              <Text style={styles.infoSubValue}>
                {session?.resource?.name || 'Studio 1 · Main Room'}
              </Text>
            </View>
          </View>

          {/* Trainer */}
          {session?.trainer && (
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <Icon name="user" size={20} color={themeColors.accent} />
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>INSTRUCTOR</Text>
                <Text style={styles.infoValue}>
                  {session.trainer.firstName} {session.trainer.lastName}
                </Text>
                <Text style={styles.infoSubValue}>Certified FitCore Coach</Text>
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {/* Reference & Barcode Stub */}
          <View style={styles.passFooter}>
            <View>
              <Text style={styles.refLabel}>BOOKING REFERENCE</Text>
              <Text style={styles.refValue}>BK-{booking.id.substring(0, 8).toUpperCase()}</Text>
            </View>
            <View style={styles.qrStub}>
              <Icon name="qr" size={32} color={themeColors.accent} />
            </View>
          </View>
        </Card>

        {/* Cancellation Guideline Alert */}
        {isConfirmed && (
          <Card style={styles.policyCard}>
            <View style={styles.policyHeader}>
              <Icon name="alert-circle" size={18} color={themeColors.textSecondary} />
              <Text style={styles.policyTitle}>Cancellation Window</Text>
            </View>
            <Text style={styles.policyBody}>
              Cancellations up to 2 hours prior to class start are free of charge. Spots will automatically roll over to waiting members.
            </Text>
          </Card>
        )}

        {/* Actions */}
        {(isConfirmed || isWaitlisted) && (
          <Button
            title={cancelling ? 'Cancelling...' : isWaitlisted ? 'Leave Waitlist' : 'Cancel Booking'}
            variant="danger"
            size="lg"
            loading={cancelling}
            disabled={cancelling}
            onPress={handleCancelBooking}
            style={styles.actionBtn}
          />
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body2,
    color: themeColors.textSecondary,
    marginTop: spacing[3],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
  },
  errorTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
    marginTop: spacing[4],
  },
  errorSubtitle: {
    ...typography.body2,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginTop: spacing[2],
  },
  backBtn: {
    marginTop: spacing[6],
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  headerBack: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  content: {
    padding: spacing[4],
    paddingBottom: spacing[12],
  },
  passCard: {
    backgroundColor: themeColors.surface,
    borderRadius: radius.xl,
    padding: spacing[5],
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  passHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: `${themeColors.accent}15`,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
  },
  categoryText: {
    ...typography.caption,
    color: themeColors.accent,
    fontWeight: '700',
    letterSpacing: 1,
  },
  className: {
    ...typography.h2,
    color: themeColors.textPrimary,
    marginTop: spacing[3],
  },
  waitlistBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${themeColors.warning}15`,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
    marginTop: spacing[3],
    gap: spacing[2],
  },
  waitlistText: {
    ...typography.body2,
    color: themeColors.warning,
  },
  boldText: {
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: themeColors.border,
    marginVertical: spacing[4],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
    gap: spacing[3],
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${themeColors.accent}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    ...typography.caption,
    color: themeColors.textMuted,
    letterSpacing: 1,
    fontWeight: '600',
  },
  infoValue: {
    ...typography.subtitle1,
    color: themeColors.textPrimary,
    marginTop: 2,
  },
  infoSubValue: {
    ...typography.body2,
    color: themeColors.textSecondary,
    marginTop: 1,
  },
  passFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing[2],
  },
  refLabel: {
    ...typography.caption,
    color: themeColors.textMuted,
    letterSpacing: 1,
    fontWeight: '600',
  },
  refValue: {
    ...typography.subtitle2,
    color: themeColors.accent,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  qrStub: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: `${themeColors.accent}10`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${themeColors.accent}30`,
  },
  policyCard: {
    marginTop: spacing[4],
    backgroundColor: themeColors.surfaceElevated,
    padding: spacing[4],
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  policyTitle: {
    ...typography.subtitle2,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  policyBody: {
    ...typography.caption,
    color: themeColors.textMuted,
    lineHeight: 18,
  },
  actionBtn: {
    marginTop: spacing[6],
  },
});
