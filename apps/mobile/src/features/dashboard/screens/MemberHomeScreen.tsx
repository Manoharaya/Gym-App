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
import { dailyCheckInService } from '../../check-ins/services/dailyCheckInService';
import { WearablesService } from '../../wearables/services/wearablesService';
import { FitnessMomentumCard } from '../../retention';
import { MemberRecoveryHubCard, reactivationService } from '../../reactivation';
import type { DailyCheckInDto } from '@fitcore/types';

type NavigationProp = NativeStackNavigationProp<MemberStackParamList, 'MemberHome'>;

export const MemberHomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { tenant } = useTenant();
  const [refreshing, setRefreshing] = React.useState(false);
  const [todayCheckIn, setTodayCheckIn] = React.useState<DailyCheckInDto | null>(null);
  const [wearableInfo, setWearableInfo] = React.useState<{
    provider?: string;
    lastSync?: string;
    steps?: number;
  } | null>(null);
  const [recoveryState, setRecoveryState] = React.useState<any>(null);

  const fetchDashboardData = React.useCallback(async () => {
    try {
      const [checkInRes, connectionsRes, summaryRes, recoveryRes] = await Promise.all([
        dailyCheckInService.getTodayCheckIn().catch(() => null),
        WearablesService.getConnections().catch(() => []),
        WearablesService.getHealthSummary().catch(() => null),
        reactivationService.getMemberRecoveryState().catch(() => null),
      ]);
      setTodayCheckIn(checkInRes);
      setRecoveryState(recoveryRes);

      const activeConn = connectionsRes?.find((c: any) => c.status === 'CONNECTED');
      if (activeConn) {
        const todayStats = summaryRes?.dailySummaries?.[summaryRes.dailySummaries.length - 1];
        setWearableInfo({
          provider: activeConn.provider,
          lastSync: activeConn.lastSuccessfulSyncAt
            ? new Date(activeConn.lastSuccessfulSyncAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : undefined,
          steps: todayStats?.steps,
        });
      } else {
        setWearableInfo(null);
      }
    } catch {
      // Graceful fallback
    }
  }, []);

  React.useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchDashboardData().finally(() => setRefreshing(false));
  }, [fetchDashboardData]);

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
              onPress={() => (navigation as any).navigate('VerificationShell')}
              style={styles.iconButton}
              accessibilityLabel="Back to Platform Launcher"
            >
              <Icon name="home" size={20} color={themeColors.textPrimary} />
            </TouchableOpacity>

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
            <TouchableOpacity
              onPress={() =>
                todayCheckIn?.status === 'COMPLETED'
                  ? navigation.navigate('DailyCheckInResult', { checkInId: todayCheckIn.id })
                  : navigation.navigate('DailyCheckIn')
              }
            >
              <Text style={styles.checkInAction}>
                {todayCheckIn?.status === 'COMPLETED' ? 'View Details →' : 'Daily Check-In →'}
              </Text>
            </TouchableOpacity>
          </View>

          {todayCheckIn?.status === 'COMPLETED' ? (
            <View style={styles.aiBody}>
              <ProgressRing
                progress={todayCheckIn.readinessScore ?? 75}
                size={76}
                strokeWidth={8}
                color={
                  todayCheckIn.readinessCategory === 'OPTIMAL'
                    ? themeColors.success
                    : todayCheckIn.readinessCategory === 'RECOVERY_FOCUSED'
                    ? themeColors.warning
                    : themeColors.accent
                }
                valueText={`${todayCheckIn.readinessScore ?? 75}%`}
                label="READINESS"
              />
              <View style={styles.aiRecommendation}>
                <Text style={styles.readinessTitle}>
                  {todayCheckIn.todayFocus ||
                    (todayCheckIn.readinessCategory === 'OPTIMAL'
                      ? 'High Training Capacity'
                      : 'Active Daily Maintenance')}
                </Text>
                <Text style={styles.readinessDescription} numberOfLines={2}>
                  {todayCheckIn.aiSummary ||
                    todayCheckIn.readinessRationale ||
                    'Daily check-in completed. Training volume aligned with recovery status.'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.aiBody}>
              <View style={styles.checkInPromptIcon}>
                <Icon name="activity" size={32} color={themeColors.accent} />
              </View>
              <View style={styles.aiRecommendation}>
                <Text style={styles.readinessTitle}>Log Today's Readiness</Text>
                <Text style={styles.readinessDescription}>
                  Take 30 seconds to report your sleep, soreness, and stress to unlock personalized training adjustments.
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* Wearables Telemetry Status Widget */}
        <Card style={styles.wearablesWidgetCard}>
          <View style={styles.aiHeader}>
            <View style={styles.aiBadgeRow}>
              <View style={[styles.aiSparkleIcon, { backgroundColor: themeColors.accent }]}>
                <Icon name="activity" size={12} color="#FFFFFF" />
              </View>
              <Text style={[styles.aiBadgeText, { color: themeColors.accent }]}>
                WEARABLES & TELEMETRY
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Wearables')}>
              <Text style={styles.checkInAction}>
                {wearableInfo?.provider ? 'View Health Data →' : 'Connect Devices →'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.wearablesWidgetBody}>
            {wearableInfo?.provider ? (
              <View style={styles.wearableConnectedRow}>
                <View style={styles.wearableIconBox}>
                  <Icon name="activity" size={20} color={themeColors.success} />
                </View>
                <View style={styles.wearableInfo}>
                  <View style={styles.wearableTitleRow}>
                    <Text style={styles.wearableProviderText}>{wearableInfo.provider}</Text>
                    <Badge label="CONNECTED" variant="success" />
                  </View>
                  <Text style={styles.wearableSyncText}>
                    {wearableInfo.lastSync ? `Synced ${wearableInfo.lastSync}` : 'Active'}
                    {wearableInfo.steps ? ` · ${wearableInfo.steps.toLocaleString()} steps today` : ''}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.wearablePromptRow}>
                <View style={styles.wearableIconBox}>
                  <Icon name="bolt" size={20} color={themeColors.accent} />
                </View>
                <View style={styles.wearableInfo}>
                  <Text style={styles.wearablePromptTitle}>Connect Your Health Data</Text>
                  <Text style={styles.wearablePromptSub}>
                    Link Apple Health, Health Connect, or Fitbit to automatically sync your workouts.
                  </Text>
                </View>
              </View>
            )}
          </View>
        </Card>

        {/* Day 27: AI Reactivation Member Recovery Hub Card */}
        {recoveryState && (recoveryState.recoveryState === 'RECOVERING' || recoveryState.recoveryState === 'INACTIVE' || recoveryState.recoveryState === 'DISENGAGED' || (recoveryState.inactivityDays && recoveryState.inactivityDays >= 14)) && (
          <MemberRecoveryHubCard
            daysAway={recoveryState.inactivityDays ?? 14}
            welcomeMessage={recoveryState.suggestedFocus ? `We're happy to see you! Ready to rebuild your momentum with ${recoveryState.suggestedFocus.toLowerCase()}?` : undefined}
            onExploreWorkouts={() => navigation.navigate('WorkoutSession', { workoutId: 'wk_upper_01' })}
            onBookClass={() => navigation.navigate('Bookings')}
            onCheckIn={() => navigation.navigate('DailyCheckIn')}
            onMessageCoach={() => navigation.navigate('MyTrainer')}
          />
        )}

        {/* Member Motivation: Fitness Momentum Card */}
        <FitnessMomentumCard
          workoutsThisWeek={3}
          streakWeeks={2}
          onNavigateWorkouts={() => navigation.navigate('WorkoutSession', { workoutId: 'wk_upper_01' })}
          onNavigateClasses={() => navigation.navigate('Bookings')}
          onNavigateGoals={() => navigation.navigate('Goals')}
          onNavigateCheckIn={() => navigation.navigate('DailyCheckIn')}
        />

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
            <TouchableOpacity onPress={() => navigation.navigate('EngagementHome')}>
              <Text style={styles.streakViewAll}>Engagement & Habits →</Text>
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
  checkInPromptIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.full || 30,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
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
  wearablesWidgetCard: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
    borderWidth: 1,
    padding: spacing[4],
    gap: spacing[3],
  },
  wearablesWidgetBody: {
    paddingTop: spacing[1],
  },
  wearableConnectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wearablePromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wearableIconBox: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: themeColors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  wearableInfo: {
    flex: 1,
  },
  wearableTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  wearableProviderText: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  wearableSyncText: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  wearablePromptTitle: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  wearablePromptSub: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
});
