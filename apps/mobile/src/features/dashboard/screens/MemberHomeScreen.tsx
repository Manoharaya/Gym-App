import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MemberStackParamList } from '../../../navigation/types';
import {
  Screen,
  Card,
  Button,
  Badge,
  Icon,
  MetricCard,
  ProgressRing,
} from '../../../components/primitives';
import { BottomNavDock } from '../../../components/navigation/BottomNavDock';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { useTenant } from '../../../providers/TenantProvider';

type NavigationProp = NativeStackNavigationProp<MemberStackParamList, 'MemberHome'>;

export const MemberHomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { tenant } = useTenant();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  return (
    <Screen safeAreaEdges={['top']} statusBarStyle="light">
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.accent} />
        }
      >
        {/* Top App Bar */}
        <View style={styles.topBar}>
          <View style={styles.userSection}>
            <TouchableOpacity
              onPress={() => navigation.navigate('MemberProfile')}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>AC</Text>
            </TouchableOpacity>
            <View>
              <Text style={styles.greeting}>Good morning,</Text>
              <Text style={styles.userName}>Alex Chen</Text>
            </View>
          </View>

          <View style={styles.topBarActions}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}
              style={styles.iconButton}
            >
              <Icon name="bell" size={20} color={themeColors.textPrimary} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('QRCode')}
              style={styles.qrPassButton}
            >
              <Icon name="qr" size={18} color="#FFFFFF" />
              <Text style={styles.qrPassText}>PASS</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Club Location Pill */}
        <View style={styles.locationRow}>
          <Icon name="map-pin" size={14} color={themeColors.accent} />
          <Text style={styles.locationText}>
            {tenant.outletName ? `${tenant.outletName} · Active` : 'Second Wind Perth CBD'}
          </Text>
          <Badge label="ALL-ACCESS" variant="accent" />
        </View>

        {/* AI Daily Readiness Hero Card */}
        <Card style={styles.aiHeroCard}>
          <View style={styles.aiHeader}>
            <View style={styles.aiBadgeRow}>
              <View style={styles.aiSparkleIcon}>
                <Icon name="sparkles" size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.aiBadgeText}>FITCORE AI INSIGHT</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('DailyCheckIn')}>
              <Text style={styles.checkInAction}>Daily Check-In →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.aiBody}>
            <ProgressRing
              progress={88}
              size={76}
              strokeWidth={8}
              color={themeColors.success}
              valueText="88%"
              label="READY"
            />
            <View style={styles.aiRecommendation}>
              <Text style={styles.readinessTitle}>Optimal Training Window</Text>
              <Text style={styles.readinessDescription}>
                HRV is +8ms above baseline with 8h 12m sleep recorded. Optimal condition for high-intensity intervals or heavy compound lifts today.
              </Text>
            </View>
          </View>
        </Card>

        {/* Today's Workout Hero */}
        <Card style={styles.workoutCard}>
          <View style={styles.workoutHeader}>
            <View>
              <Text style={styles.sectionTag}>TODAY'S WORKOUT</Text>
              <Text style={styles.workoutTitle}>Upper Body Hypertrophy</Text>
            </View>
            <Badge label="PHASE 2" variant="primary" />
          </View>

          <View style={styles.workoutMetaRow}>
            <View style={styles.metaBadge}>
              <Icon name="dumbbell" size={14} color={themeColors.textSecondary} />
              <Text style={styles.metaText}>5 Exercises</Text>
            </View>
            <View style={styles.metaBadge}>
              <Icon name="timer" size={14} color={themeColors.textSecondary} />
              <Text style={styles.metaText}>45 Mins</Text>
            </View>
            <View style={styles.metaBadge}>
              <Icon name="flame" size={14} color={themeColors.heartRate} />
              <Text style={styles.metaText}>380 kcal target</Text>
            </View>
          </View>

          <Button
            title="Start Workout"
            onPress={() => navigation.navigate('WorkoutSession', { workoutId: 'wk_upper_01' })}
            variant="accent"
            leftIcon={<Icon name="bolt" size={18} color="#FFFFFF" />}
            style={styles.startWorkoutButton}
          />
        </Card>

        {/* Upcoming Booking Card */}
        <Card style={styles.bookingCard}>
          <View style={styles.bookingHeader}>
            <View>
              <Text style={styles.sectionTag}>UPCOMING BOOKING</Text>
              <Text style={styles.bookingClassTitle}>HIIT Blast 45</Text>
            </View>
            <Badge label="CONFIRMED" variant="success" />
          </View>

          <View style={styles.bookingDetailsRow}>
            <View style={styles.bookingDetailItem}>
              <Text style={styles.bookingDetailLabel}>Time</Text>
              <Text style={styles.bookingDetailValue}>Today · 17:30</Text>
            </View>
            <View style={styles.bookingDetailItem}>
              <Text style={styles.bookingDetailLabel}>Instructor</Text>
              <Text style={styles.bookingDetailValue}>Marcus Brody</Text>
            </View>
            <View style={styles.bookingDetailItem}>
              <Text style={styles.bookingDetailLabel}>Room</Text>
              <Text style={styles.bookingDetailValue}>Studio 1</Text>
            </View>
          </View>

          <View style={styles.bookingActions}>
            <Button
              title="View Roster"
              onPress={() => navigation.navigate('MyBookings')}
              variant="outline"
              size="sm"
              style={styles.flexButton}
            />
            <Button
              title="Class Schedule"
              onPress={() => navigation.navigate('Bookings')}
              variant="ghost"
              size="sm"
              style={styles.flexButton}
            />
          </View>
        </Card>

        {/* Quick Action Navigation Grid */}
        <View style={styles.quickGrid}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Bookings')}
            style={styles.quickActionItem}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: `${themeColors.accent}1A` }]}>
              <Icon name="calendar" size={20} color={themeColors.accent} />
            </View>
            <Text style={styles.quickActionLabel}>Book Class</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('QRCode')}
            style={styles.quickActionItem}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: `${themeColors.primary}1A` }]}>
              <Icon name="qr" size={20} color={themeColors.primary} />
            </View>
            <Text style={styles.quickActionLabel}>Door Pass</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('AICoach')}
            style={styles.quickActionItem}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: `${themeColors.aiPrimary}1A` }]}>
              <Icon name="sparkles" size={20} color={themeColors.aiPrimary} />
            </View>
            <Text style={styles.quickActionLabel}>AI Coach</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Nutrition')}
            style={styles.quickActionItem}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: `${themeColors.success}1A` }]}>
              <Icon name="flame" size={20} color={themeColors.success} />
            </View>
            <Text style={styles.quickActionLabel}>Nutrition</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Activity Metrics Row */}
        <View style={styles.metricsRow}>
          <MetricCard
            label="CALORIES"
            value="620"
            unit="kcal"
            change="+14%"
            trend="up"
            icon="flame"
            accentColor={themeColors.caloriesBurned}
            style={styles.flexMetric}
          />
          <MetricCard
            label="ACTIVE TIME"
            value="42"
            unit="min"
            change="+8%"
            trend="up"
            icon="timer"
            accentColor={themeColors.accent}
            style={styles.flexMetric}
          />
        </View>

        {/* Weekly Training Consistency Streak */}
        <Card style={styles.streakCard}>
          <View style={styles.streakHeader}>
            <View style={styles.streakTitleRow}>
              <Icon name="bolt" size={18} color={themeColors.streakFire} />
              <Text style={styles.streakTitle}>4-Day Training Streak</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Progress')}>
              <Text style={styles.streakViewAll}>All Progress →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.daysRow}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
              const completed = idx < 4;
              const isToday = idx === 3;
              return (
                <View key={idx} style={styles.dayCol}>
                  <View
                    style={[
                      styles.dayDot,
                      completed && styles.dayDotCompleted,
                      isToday && styles.dayDotToday,
                    ]}
                  >
                    {completed && <Icon name="check" size={12} color="#FFFFFF" />}
                  </View>
                  <Text style={[styles.dayLetter, isToday && styles.dayLetterToday]}>{day}</Text>
                </View>
              );
            })}
          </View>
        </Card>
      </ScrollView>

      {/* Floating Bottom Action Dock */}
      <BottomNavDock currentRoute="MemberHome" />
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing[4],
    gap: spacing[3.5],
    paddingBottom: spacing[20],
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[1],
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: themeColors.surfaceActive,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: themeColors.accent,
  },
  avatarText: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  greeting: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  userName: {
    ...typography.h3,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: themeColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
    position: 'relative',
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: themeColors.primary,
    position: 'absolute',
    top: 8,
    right: 8,
  },
  qrPassButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.primary,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    gap: spacing[1],
  },
  qrPassText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[1],
  },
  locationText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    flex: 1,
  },
  aiHeroCard: {
    backgroundColor: '#121624',
    borderColor: '#2D2254',
    borderWidth: 1,
    padding: spacing[4],
    gap: spacing[3],
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  aiSparkleIcon: {
    width: 22,
    height: 22,
    borderRadius: radius.xs,
    backgroundColor: themeColors.aiPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBadgeText: {
    ...typography.caption,
    color: '#A78BFA',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  checkInAction: {
    ...typography.caption,
    color: themeColors.accent,
    fontWeight: '600',
  },
  aiBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  aiRecommendation: {
    flex: 1,
    gap: 2,
  },
  readinessTitle: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  readinessDescription: {
    ...typography.caption,
    color: themeColors.textSecondary,
    lineHeight: 18,
  },
  workoutCard: {
    padding: spacing[4],
    gap: spacing[3],
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sectionTag: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  workoutTitle: {
    ...typography.h2,
    color: themeColors.textPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  workoutMetaRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.surface,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
    gap: spacing[1],
  },
  metaText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '500',
  },
  startWorkoutButton: {
    marginTop: spacing[1],
  },
  bookingCard: {
    padding: spacing[4],
    gap: spacing[3],
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bookingClassTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  bookingDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: themeColors.surface,
    padding: spacing[3],
    borderRadius: radius.md,
  },
  bookingDetailItem: {
    alignItems: 'center',
  },
  bookingDetailLabel: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  bookingDetailValue: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
  bookingActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  flexButton: {
    flex: 1,
  },
  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  quickActionItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: themeColors.cardBackground,
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: spacing[1.5],
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  flexMetric: {
    flex: 1,
  },
  streakCard: {
    padding: spacing[4],
    gap: spacing[3],
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  streakTitle: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  streakViewAll: {
    ...typography.caption,
    color: themeColors.accent,
    fontWeight: '600',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayCol: {
    alignItems: 'center',
    gap: spacing[1],
  },
  dayDot: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: themeColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  dayDotCompleted: {
    backgroundColor: themeColors.accent,
    borderColor: themeColors.accent,
  },
  dayDotToday: {
    borderColor: themeColors.primary,
    borderWidth: 2,
  },
  dayLetter: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '600',
  },
  dayLetterToday: {
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
});
