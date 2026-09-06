import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MemberStackParamList } from '../../../navigation/types';
import { Screen, Card, Badge, Button, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { useClassSession } from '../../booking/hooks/useBooking';
import { useCheckInMutation } from '../hooks/useAttendance';

type RouteProps = RouteProp<MemberStackParamList, 'ClassCheckIn'>;
type NavigationProp = NativeStackNavigationProp<MemberStackParamList>;

export const ClassCheckInScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { sessionId } = route.params;

  const { data: session, isLoading } = useClassSession(sessionId);
  const checkInMutation = useCheckInMutation();

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  if (isLoading || !session) {
    return (
      <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={themeColors.accent} />
          <Text style={styles.loadingText}>Loading session details...</Text>
        </View>
      </Screen>
    );
  }

  const startsAt = new Date(session.startsAt);
  const endsAt = new Date(session.endsAt);

  // Check-in window rules: -30m to +15m
  const opensAt = new Date(startsAt.getTime() - 30 * 60 * 1000);
  const closesAt = new Date(startsAt.getTime() + 15 * 60 * 1000);

  const isTooEarly = currentTime < opensAt;
  const isTooLate = currentTime > closesAt;
  const isLate = currentTime > startsAt && currentTime <= closesAt;
  const isOpen = !isTooEarly && !isTooLate;

  const minutesUntilStart = Math.round((startsAt.getTime() - currentTime.getTime()) / 60000);
  const minutesLate = isLate ? Math.round((currentTime.getTime() - startsAt.getTime()) / 60000) : 0;

  const handleCheckIn = async () => {
    try {
      const record = await checkInMutation.mutateAsync({
        sessionId,
        payload: {
          method: 'MEMBER_SELF_SERVICE',
        },
      });

      navigation.replace('AttendanceConfirmation', {
        attendanceRecord: record,
      });
    } catch (err: any) {
      Alert.alert(
        'Check-In Failed',
        err.message || 'Unable to check in. Please see the front desk for assistance.',
      );
    }
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            testID="back-button"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="chevron-left" size={24} color={themeColors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Class Check-In</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Digital Board Pass Card */}
        <Card style={styles.passCard}>
          <View style={styles.passHeader}>
            <View style={styles.classInfo}>
              <Badge
                label={session.classType?.category || 'GROUP FITNESS'}
                variant="accent"
              />
              <Text style={styles.className}>{session.classType?.name || 'Class Session'}</Text>
            </View>
            <View style={styles.durationBadge}>
              <Icon name="clock" size={14} color={themeColors.textSecondary} />
              <Text style={styles.durationText}>
                {Math.round((endsAt.getTime() - startsAt.getTime()) / 60000)}m
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Timing & Location Details */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>TIME</Text>
              <Text style={styles.detailValue}>
                {startsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                {endsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>INSTRUCTOR</Text>
              <Text style={styles.detailValue}>
                {session.trainer
                  ? `${session.trainer.firstName} ${session.trainer.lastName}`
                  : 'Coach'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>LOCATION</Text>
              <Text style={styles.detailValue}>
                {session.outlet?.name || 'Main Studio'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>STUDIO ROOM</Text>
              <Text style={styles.detailValue}>
                {session.resource?.name || 'Studio 1'}
              </Text>
            </View>
          </View>

          {/* QR Scan Simulator */}
          <View style={styles.qrContainer}>
            <View style={styles.qrFrame}>
              <Icon name="qr" size={100} color={themeColors.accent} />
            </View>
            <Text style={styles.qrCaption}>Present at Kiosk or Check-In Below</Text>
          </View>

          {/* Window Status Banner */}
          {isTooEarly && (
            <View style={[styles.statusBanner, styles.bannerMuted]}>
              <Icon name="clock" size={18} color={themeColors.textSecondary} />
              <Text style={styles.bannerMutedText}>
                Check-in opens 30 minutes before class (at{' '}
                {opensAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </Text>
            </View>
          )}

          {isLate && (
            <View style={[styles.statusBanner, styles.bannerWarning]}>
              <Icon name="alert-circle" size={18} color={themeColors.warning} />
              <Text style={styles.bannerWarningText}>
                Class is already in progress ({minutesLate} min late). Check in now to secure your spot.
              </Text>
            </View>
          )}

          {isTooLate && (
            <View style={[styles.statusBanner, styles.bannerDanger]}>
              <Icon name="alert-circle" size={18} color={themeColors.danger} />
              <Text style={styles.bannerDangerText}>
                Check-in closed 15 minutes after start. Please see the front desk.
              </Text>
            </View>
          )}

          {isOpen && !isLate && (
            <View style={[styles.statusBanner, styles.bannerSuccess]}>
              <Icon name="check-circle" size={18} color={themeColors.success} />
              <Text style={styles.bannerSuccessText}>
                Check-in is open! Class starts in {minutesUntilStart} minutes.
              </Text>
            </View>
          )}

          {/* Action Button */}
          <Button
            testID="check-in-button"
            title={
              checkInMutation.isPending
                ? 'Confirming Arrival...'
                : isTooEarly
                  ? 'Check-In Not Open'
                  : isTooLate
                    ? 'Check-In Closed'
                    : isLate
                      ? `Check In Now (${minutesLate}m Late)`
                      : 'Check In to Class'
            }
            variant="primary"
            disabled={!isOpen || checkInMutation.isPending}
            onPress={handleCheckIn}
            style={styles.actionBtn}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: themeColors.textSecondary,
    marginTop: spacing[4],
    ...typography.body2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[6],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: themeColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: themeColors.textPrimary,
    ...typography.h3,
  },
  passCard: {
    padding: spacing[5],
    borderRadius: radius.xl,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  passHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  classInfo: {
    flex: 1,
  },
  className: {
    color: themeColors.textPrimary,
    ...typography.h2,
    marginTop: spacing[1],
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.background,
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: radius.full,
    gap: 4,
  },
  durationText: {
    color: themeColors.textSecondary,
    ...typography.caption,
  },
  divider: {
    height: 1,
    backgroundColor: themeColors.border,
    marginVertical: spacing[4],
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
    marginBottom: spacing[6],
  },
  detailItem: {
    width: '46%',
  },
  detailLabel: {
    color: themeColors.textSecondary,
    ...typography.caption,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    color: themeColors.textPrimary,
    ...typography.body1,
    fontWeight: '600',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing[3],
    padding: spacing[4],
    backgroundColor: themeColors.inputBackground,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  qrFrame: {
    padding: spacing[3],
  },
  qrCaption: {
    color: themeColors.textSecondary,
    ...typography.caption,
    marginTop: spacing[1],
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: radius.md,
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  bannerMuted: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  bannerMutedText: {
    color: themeColors.textSecondary,
    ...typography.caption,
    flex: 1,
  },
  bannerWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  bannerWarningText: {
    color: themeColors.warning,
    ...typography.caption,
    flex: 1,
    fontWeight: '600',
  },
  bannerDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  bannerDangerText: {
    color: themeColors.danger,
    ...typography.caption,
    flex: 1,
    fontWeight: '600',
  },
  bannerSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  bannerSuccessText: {
    color: themeColors.success,
    ...typography.caption,
    flex: 1,
    fontWeight: '600',
  },
  actionBtn: {
    marginTop: spacing[2],
  },
});
