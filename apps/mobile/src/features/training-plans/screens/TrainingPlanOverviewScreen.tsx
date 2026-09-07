import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { MemberStackParamList } from '../../../navigation/types';
import { Screen, Card, Button, Badge, Icon } from '../../../components/primitives';
import { themeColors, spacing, radius } from '../../../theme';
import { TrainingPlanService } from '../services/trainingPlanService';
import type { TrainingPlan, PlanAdherenceMetrics } from '@fitcore/types';

type NavigationProp = NativeStackNavigationProp<MemberStackParamList>;
type RouteProps = RouteProp<MemberStackParamList, 'TrainingPlanOverview'>;

export const TrainingPlanOverviewScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const planIdParam = route.params?.planId;

  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [adherence, setAdherence] = useState<PlanAdherenceMetrics | null>(null);
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadPlanData = useCallback(async () => {
    try {
      setLoading(true);
      let targetPlan: TrainingPlan | null = null;

      if (planIdParam) {
        targetPlan = await TrainingPlanService.getPlanById(planIdParam);
      } else {
        const res = await TrainingPlanService.getPlans({ status: 'ACTIVE', limit: 1 });
        if (res.items.length > 0 && res.items[0]) {
          targetPlan = await TrainingPlanService.getPlanById(res.items[0].id);
        } else {
          const allRes = await TrainingPlanService.getPlans({ limit: 1 });
          if (allRes.items.length > 0 && allRes.items[0]) {
            targetPlan = await TrainingPlanService.getPlanById(allRes.items[0].id);
          }
        }
      }

      if (targetPlan) {
        setPlan(targetPlan);
        const adh = await TrainingPlanService.getAdherence(targetPlan.id);
        setAdherence(adh);

        const currentWeek = targetPlan.weeks?.find((w) => w.status === 'IN_PROGRESS');
        if (currentWeek) {
          setSelectedWeekNumber(currentWeek.weekNumber);
        } else if (targetPlan.weeks && targetPlan.weeks.length > 0 && targetPlan.weeks[0]) {
          setSelectedWeekNumber(targetPlan.weeks[0].weekNumber);
        }
      }
    } catch (err) {
      console.error('Failed to load training plan', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [planIdParam]);

  useEffect(() => {
    loadPlanData();
  }, [loadPlanData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPlanData();
  };

  if (loading && !refreshing) {
    return (
      <Screen style={styles.centerContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>Loading training plan...</Text>
      </Screen>
    );
  }

  if (!plan) {
    return (
      <Screen style={styles.container}>
        <View style={styles.emptyContainer}>
          <Icon name="dumbbell" size={48} color={themeColors.textMuted} />
          <Text style={styles.emptyTitle}>No Training Plan Found</Text>
          <Text style={styles.emptyDescription}>
            You do not have an active multi-week training plan assigned. Contact your trainer to get started.
          </Text>
        </View>
      </Screen>
    );
  }

  const currentWeek = plan.weeks?.find((w) => w.weekNumber === selectedWeekNumber);
  const weekDays = currentWeek?.days || [];

  return (
    <Screen style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />}
      >
        {/* Plan Header Card */}
        <Card style={styles.planHeaderCard}>
          <View style={styles.planHeaderTop}>
            <Badge
              label={plan.status}
              variant={plan.status === 'ACTIVE' ? 'success' : 'neutral'}
            />
            <Text style={styles.planDurationText}>{plan.durationWeeks} WEEKS</Text>
          </View>

          <Text style={styles.planTitle}>{plan.name}</Text>
          {plan.objective ? (
            <Text style={styles.planObjective}>{plan.objective}</Text>
          ) : null}

          {plan.trainerProfile?.staffProfile?.user ? (
            <View style={styles.coachRow}>
              <Icon name="user" size={16} color={themeColors.textMuted} />
              <Text style={styles.coachText}>
                Coached by {plan.trainerProfile.staffProfile.user.firstName}{' '}
                {plan.trainerProfile.staffProfile.user.lastName}
              </Text>
            </View>
          ) : null}

          {/* Adherence Bar */}
          {adherence ? (
            <View style={styles.adherenceContainer}>
              <View style={styles.adherenceHeader}>
                <Text style={styles.adherenceLabel}>Plan Adherence</Text>
                <Text style={styles.adherenceValue}>{adherence.adherencePercentage}%</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(adherence.adherencePercentage, 100)}%` },
                  ]}
                />
              </View>
              <View style={styles.adherenceStatsRow}>
                <Text style={styles.statPillText}>
                  ✓ {adherence.completed} Completed
                </Text>
                <Text style={styles.statPillText}>
                  ⏳ {adherence.pending} Upcoming
                </Text>
                {adherence.overdue > 0 ? (
                  <Text style={[styles.statPillText, { color: themeColors.danger }]}>
                    ⚠️ {adherence.overdue} Overdue
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}
        </Card>

        {/* Multi-Week Tab Selector */}
        <View style={styles.weekSelectorSection}>
          <Text style={styles.sectionHeader}>Select Week</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weekPillsScroll}
          >
            {plan.weeks?.map((week) => {
              const isSelected = week.weekNumber === selectedWeekNumber;
              return (
                <TouchableOpacity
                  key={week.id}
                  style={[styles.weekPill, isSelected && styles.weekPillActive]}
                  onPress={() => setSelectedWeekNumber(week.weekNumber)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select Week ${week.weekNumber}`}
                >
                  <Text style={[styles.weekPillNumber, isSelected && styles.weekPillNumberActive]}>
                    W{week.weekNumber}
                  </Text>
                  <Text style={[styles.weekPillStatus, isSelected && styles.weekPillStatusActive]}>
                    {week.status}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Current Week Header */}
        <View style={styles.weekFocusContainer}>
          <Text style={styles.weekFocusTitle}>
            Week {selectedWeekNumber}: {currentWeek?.name || 'Programming'}
          </Text>
          {currentWeek?.focus ? (
            <Text style={styles.weekFocusDescription}>{currentWeek.focus}</Text>
          ) : null}
        </View>

        {/* Day-by-Day Schedule */}
        <View style={styles.daysContainer}>
          {weekDays.length === 0 ? (
            <Card style={styles.emptyWeekCard}>
              <Text style={styles.emptyWeekText}>No workout days scheduled for this week yet.</Text>
            </Card>
          ) : (
            weekDays.map((day) => {
              const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
              const dayLabel = dayNames[day.dayNumber - 1] || `Day ${day.dayNumber}`;

              return (
                <Card key={day.id} style={styles.dayCard}>
                  <View style={styles.dayCardHeader}>
                    <View style={styles.dayBadge}>
                      <Text style={styles.dayBadgeText}>{dayLabel}</Text>
                    </View>

                    <View style={styles.dayTitleContainer}>
                      <Text style={styles.dayName}>{day.name || (day.restDay ? 'Rest Day' : 'Training Session')}</Text>
                      {day.focus ? <Text style={styles.dayFocus}>{day.focus}</Text> : null}
                    </View>

                    {day.restDay ? (
                      <Badge label="REST" variant="info" />
                    ) : day.workout?.status === 'COMPLETED' ? (
                      <Badge label="COMPLETED" variant="success" />
                    ) : day.workout?.status === 'IN_PROGRESS' ? (
                      <Badge label="IN PROGRESS" variant="warning" />
                    ) : (
                      <Badge label="SCHEDULED" variant="neutral" />
                    )}
                  </View>

                  {/* If Workout exists */}
                  {day.workout ? (
                    <View style={styles.workoutSummary}>
                      <View style={styles.workoutMetaRow}>
                        <Text style={styles.workoutMetaText}>
                          🏋️ {day.workout.exercises?.length || 0} Exercises Prescribed
                        </Text>
                        {day.workout.estimatedDurationMinutes ? (
                          <Text style={styles.workoutMetaText}>
                            ⏱️ {day.workout.estimatedDurationMinutes} mins
                          </Text>
                        ) : null}
                      </View>

                      {/* Action Button */}
                      {day.workout.status !== 'COMPLETED' ? (
                        <Button
                          title="Start Workout"
                          variant="primary"
                          onPress={() => {
                            navigation.navigate('WorkoutSession' as any, { workoutId: day.workout!.id });
                          }}
                          style={styles.startWorkoutButton}
                        />
                      ) : (
                        <TouchableOpacity
                          style={styles.viewWorkoutLink}
                          onPress={() => {
                            navigation.navigate('WorkoutSession' as any, { workoutId: day.workout!.id });
                          }}
                        >
                          <Text style={styles.viewWorkoutLinkText}>View Performance Summary →</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : day.restDay ? (
                    <View style={styles.restDayContainer}>
                      <Text style={styles.restDayText}>
                        Rest and muscle recovery. Hydrate and get adequate sleep.
                      </Text>
                    </View>
                  ) : null}
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeColors.background,
  },
  loadingText: {
    marginTop: spacing[4],
    color: themeColors.textMuted,
    fontSize: 14,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[12],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[8],
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    marginTop: spacing[4],
  },
  emptyDescription: {
    fontSize: 14,
    color: themeColors.textMuted,
    textAlign: 'center',
    marginTop: spacing[2],
    lineHeight: 20,
  },
  planHeaderCard: {
    padding: spacing[5],
    marginBottom: spacing[4],
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.lg,
  },
  planHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  planDurationText: {
    fontSize: 12,
    fontWeight: '700',
    color: themeColors.primary,
    letterSpacing: 1,
  },
  planTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    marginBottom: spacing[1],
  },
  planObjective: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginBottom: spacing[3],
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  coachText: {
    fontSize: 12,
    color: themeColors.textMuted,
  },
  adherenceContainer: {
    marginTop: spacing[2],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  adherenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  adherenceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.textSecondary,
  },
  adherenceValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: themeColors.primary,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: themeColors.cardBackground,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing[2],
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: themeColors.primary,
    borderRadius: 3,
  },
  adherenceStatsRow: {
    flexDirection: 'row',
    gap: spacing[4],
    marginTop: spacing[1],
  },
  statPillText: {
    fontSize: 12,
    color: themeColors.textMuted,
  },
  weekSelectorSection: {
    marginBottom: spacing[4],
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: themeColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
  },
  weekPillsScroll: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  weekPill: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
    minWidth: 72,
  },
  weekPillActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  weekPillNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
  },
  weekPillNumberActive: {
    color: '#000000',
  },
  weekPillStatus: {
    fontSize: 9,
    fontWeight: '600',
    color: themeColors.textMuted,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  weekPillStatusActive: {
    color: '#000000',
  },
  weekFocusContainer: {
    marginBottom: spacing[3],
  },
  weekFocusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  weekFocusDescription: {
    fontSize: 14,
    color: themeColors.textMuted,
    marginTop: 2,
  },
  daysContainer: {
    gap: spacing[3],
  },
  dayCard: {
    padding: spacing[4],
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  dayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayBadge: {
    backgroundColor: themeColors.elevatedBackground,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: radius.sm,
    marginRight: spacing[3],
  },
  dayBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
  },
  dayTitleContainer: {
    flex: 1,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  dayFocus: {
    fontSize: 12,
    color: themeColors.textMuted,
    marginTop: 2,
  },
  workoutSummary: {
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  workoutMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  workoutMetaText: {
    fontSize: 12,
    color: themeColors.textSecondary,
  },
  startWorkoutButton: {
    marginTop: spacing[1],
  },
  viewWorkoutLink: {
    paddingVertical: spacing[1],
  },
  viewWorkoutLinkText: {
    fontSize: 12,
    color: themeColors.primary,
    fontWeight: '600',
  },
  restDayContainer: {
    marginTop: spacing[2],
  },
  restDayText: {
    fontSize: 12,
    color: themeColors.textMuted,
    fontStyle: 'italic',
  },
  emptyWeekCard: {
    padding: spacing[6],
    alignItems: 'center',
  },
  emptyWeekText: {
    color: themeColors.textMuted,
    fontSize: 14,
  },
});
