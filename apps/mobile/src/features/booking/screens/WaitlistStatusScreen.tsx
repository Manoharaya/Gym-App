import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MemberStackParamList } from '../../../navigation/types';
import { Screen, Card, Badge, Button, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing } from '../../../theme';
import { useMyWaitlists, useCancelBooking } from '../hooks/useBooking';

type RouteProps = RouteProp<MemberStackParamList, 'WaitlistStatus'>;
type NavigationProp = NativeStackNavigationProp<MemberStackParamList>;

export const WaitlistStatusScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { waitlistId, sessionId } = route.params || {};

  const { data: waitlists = [], isLoading } = useMyWaitlists();
  const cancelMutation = useCancelBooking();
  const [isLeaving, setIsLeaving] = useState(false);

  // Find matching waitlist entry
  const entry = waitlists.find(
    (w) => (waitlistId && w.id === waitlistId) || (sessionId && w.classSessionId === sessionId) || true,
  );

  const session = entry?.classSession;
  const position = entry?.position || 1;
  const startsAt = session?.startsAt ? new Date(session.startsAt) : new Date();

  const handleLeaveWaitlist = () => {
    Alert.alert(
      'Leave Waitlist',
      'Are you sure you want to surrender your waitlist position? You will forfeit your place in line.',
      [
        { text: 'Stay in Queue', style: 'cancel' },
        {
          text: 'Leave Waitlist',
          style: 'destructive',
          onPress: async () => {
            if (!entry?.bookingId) return;
            setIsLeaving(true);
            try {
              await cancelMutation.mutateAsync({
                bookingId: entry.bookingId,
                reason: 'Voluntary leave waitlist',
              });
              Alert.alert('Removed from Waitlist', 'You have been removed from the queue.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to leave waitlist.');
            } finally {
              setIsLeaving(false);
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
        <Text style={styles.headerTitle}>Waitlist Queue</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Position Circle Hero */}
        <Card style={styles.heroCard}>
          <View style={styles.positionCircle}>
            <Text style={styles.positionHash}>#</Text>
            <Text style={styles.positionNumber}>{position}</Text>
          </View>
          <Text style={styles.heroTitle}>In Queue for Confirmation</Text>
          <Text style={styles.heroSubtitle}>
            {position === 1
              ? 'You are next in line! You will be automatically promoted as soon as a spot opens.'
              : `You are #${position} in line. When confirmed members cancel, the queue advances automatically.`}
          </Text>
          <Badge
            label={position <= 2 ? 'HIGH PROBABILITY OF SPOT' : 'ESTIMATED PROMOTION PENDING'}
            variant={position <= 2 ? 'success' : 'warning'}
            style={styles.heroBadge}
          />
        </Card>

        {/* Target Session Card */}
        <Card style={styles.sessionCard}>
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionCategory}>{session?.classType?.category || 'HIIT'}</Text>
            <Badge label="FULL · WAITLISTED" variant="warning" />
          </View>
          <Text style={styles.sessionName}>{session?.name || 'Class Session'}</Text>
          <Text style={styles.sessionTime}>
            {startsAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
            at {startsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={styles.sessionOutlet}>{session?.outlet?.name || 'Perth CBD'}</Text>
        </Card>

        {/* How It Works Explainer */}
        <Card style={styles.explainerCard}>
          <Text style={styles.explainerHeading}>HOW FITCORE WAITLIST WORKS</Text>
          <View style={styles.stepRow}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>1</Text>
            </View>
            <Text style={styles.stepText}>
              When any confirmed member cancels, our engine immediately locks the spot for promotion.
            </Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>2</Text>
            </View>
            <Text style={styles.stepText}>
              The queue strictly follows first-come first-served FIFO sequencing.
            </Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>3</Text>
            </View>
            <Text style={styles.stepText}>
              You will receive an instant notification and booking pass once promoted.
            </Text>
          </View>
        </Card>

        {/* Leave Waitlist Action */}
        <Button
          title={isLeaving ? 'Leaving...' : 'Leave Waitlist Queue'}
          variant="secondary"
          size="lg"
          loading={isLeaving}
          disabled={isLeaving || isLoading}
          onPress={handleLeaveWaitlist}
          style={styles.leaveBtn}
        />
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
  heroCard: {
    alignItems: 'center',
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[4],
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: `${themeColors.warning}40`,
  },
  positionCircle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${themeColors.warning}15`,
    borderWidth: 2,
    borderColor: themeColors.warning,
    paddingTop: 16,
    marginBottom: spacing[4],
  },
  positionHash: {
    ...typography.h3,
    color: themeColors.warning,
    fontWeight: '700',
  },
  positionNumber: {
    fontSize: 48,
    lineHeight: 52,
    fontWeight: '900',
    color: themeColors.warning,
  },
  heroTitle: {
    ...typography.h2,
    color: themeColors.textPrimary,
    textAlign: 'center',
  },
  heroSubtitle: {
    ...typography.body2,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginTop: spacing[2],
    lineHeight: 20,
  },
  heroBadge: {
    marginTop: spacing[4],
  },
  sessionCard: {
    marginTop: spacing[4],
    padding: spacing[4],
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionCategory: {
    ...typography.caption,
    color: themeColors.accent,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sessionName: {
    ...typography.h3,
    color: themeColors.textPrimary,
    marginTop: spacing[2],
  },
  sessionTime: {
    ...typography.body2,
    color: themeColors.textSecondary,
    marginTop: spacing[1],
  },
  sessionOutlet: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginTop: 2,
  },
  explainerCard: {
    marginTop: spacing[4],
    padding: spacing[4],
    backgroundColor: themeColors.surfaceElevated,
  },
  explainerHeading: {
    ...typography.caption,
    color: themeColors.textMuted,
    letterSpacing: 1.2,
    fontWeight: '700',
    marginBottom: spacing[3],
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: `${themeColors.accent}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumText: {
    ...typography.caption,
    color: themeColors.accent,
    fontWeight: '700',
  },
  stepText: {
    ...typography.body2,
    color: themeColors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  leaveBtn: {
    marginTop: spacing[6],
  },
});
