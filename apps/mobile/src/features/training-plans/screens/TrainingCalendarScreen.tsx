import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen, Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, spacing, radius } from '../../../theme';
import { TrainingPlanService } from '../services/trainingPlanService';
import type { TrainingPlanDay } from '@fitcore/types';

export const TrainingCalendarScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const planIdParam = route.params?.planId;

  const [days, setDays] = useState<TrainingPlanDay[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'WEEK' | 'MONTH'>('WEEK');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const loadCalendar = useCallback(async () => {
    try {
      setLoading(true);
      let planId = planIdParam;
      if (!planId) {
        const res = await TrainingPlanService.getPlans({ status: 'ACTIVE', limit: 1 });
        if (res.items.length > 0 && res.items[0]) {
          planId = res.items[0].id;
        }
      }

      if (planId) {
        const calendarDays = await TrainingPlanService.getCalendar(planId);
        setDays(calendarDays);
      }
    } catch (err) {
      console.error('Failed to load training calendar', err);
    } finally {
      setLoading(false);
    }
  }, [planIdParam]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate((prev) => {
      const delta = viewMode === 'WEEK' ? 7 : 30;
      const factor = direction === 'next' ? 1 : -1;
      return new Date(prev.getTime() + factor * delta * 24 * 60 * 60 * 1000);
    });
  };

  if (loading) {
    return (
      <Screen style={styles.centerContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>Loading calendar schedule...</Text>
      </Screen>
    );
  }

  return (
    <Screen style={styles.container}>
      {/* Calendar Header */}
      <View style={styles.headerBar}>
        <View style={styles.viewModeToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'WEEK' && styles.toggleButtonActive]}
            onPress={() => setViewMode('WEEK')}
            accessibilityRole="button"
            accessibilityLabel="Week View"
          >
            <Text style={[styles.toggleText, viewMode === 'WEEK' && styles.toggleTextActive]}>Week</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'MONTH' && styles.toggleButtonActive]}
            onPress={() => setViewMode('MONTH')}
            accessibilityRole="button"
            accessibilityLabel="Month View"
          >
            <Text style={[styles.toggleText, viewMode === 'MONTH' && styles.toggleTextActive]}>Month</Text>
          </TouchableOpacity>
        </View>

        {/* Date Navigation */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateDate('prev')}
            accessibilityRole="button"
            accessibilityLabel="Previous Period"
          >
            <Text style={styles.navArrow}>←</Text>
          </TouchableOpacity>

          <Text style={styles.periodTitle}>
            {selectedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </Text>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateDate('next')}
            accessibilityRole="button"
            accessibilityLabel="Next Period"
          >
            <Text style={styles.navArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {days.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Icon name="calendar" size={40} color={themeColors.textMuted} />
            <Text style={styles.emptyTitle}>No Scheduled Workouts</Text>
            <Text style={styles.emptySubtitle}>There are no workouts scheduled in this plan.</Text>
          </Card>
        ) : (
          days.map((day) => {
            const dayDate = day.date ? new Date(day.date) : null;
            const dateStr = dayDate
              ? dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
              : `Day ${day.dayNumber}`;

            return (
              <Card key={day.id} style={styles.dayRowCard}>
                <View style={styles.dateColumn}>
                  <Text style={styles.dateLabel}>{dateStr}</Text>
                  <Text style={styles.weekTag}>
                    {(day as any).trainingPlanWeek ? `W${(day as any).trainingPlanWeek.weekNumber}` : ''}
                  </Text>
                </View>

                <View style={styles.eventColumn}>
                  {day.restDay ? (
                    <View style={styles.restDayPill}>
                      <Text style={styles.restDayText}>🛋️ Rest & Active Recovery</Text>
                    </View>
                  ) : day.workout ? (
                    <TouchableOpacity
                      onPress={() => {
                        navigation.navigate('WorkoutSession', { workoutId: day.workout!.id });
                      }}
                      style={styles.workoutItem}
                      accessibilityRole="button"
                      accessibilityLabel={`View ${day.workout.title}`}
                    >
                      <View style={styles.workoutTitleRow}>
                        <Text style={styles.workoutTitle}>{day.workout.title}</Text>
                        <Badge
                          label={day.workout.status}
                          variant={
                            day.workout.status === 'COMPLETED'
                              ? 'success'
                              : day.workout.status === 'IN_PROGRESS'
                              ? 'warning'
                              : 'neutral'
                          }
                        />
                      </View>
                      {day.name ? <Text style={styles.dayFocusText}>{day.name}</Text> : null}
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.unscheduledText}>No Workout Assigned</Text>
                  )}
                </View>
              </Card>
            );
          })
        )}
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
    marginTop: spacing[3],
    color: themeColors.textMuted,
    fontSize: 14,
  },
  headerBar: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: themeColors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.sm,
    padding: 2,
  },
  toggleButton: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    borderRadius: radius.sm - 2,
  },
  toggleButtonActive: {
    backgroundColor: themeColors.primary,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.textMuted,
  },
  toggleTextActive: {
    color: '#000000',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  navButton: {
    padding: spacing[2],
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.sm,
  },
  navArrow: {
    fontSize: 14,
    color: themeColors.textPrimary,
    fontWeight: 'bold',
  },
  periodTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    minWidth: 90,
    textAlign: 'center',
  },
  scrollContent: {
    padding: spacing[4],
    gap: spacing[3],
    paddingBottom: spacing[12],
  },
  dayRowCard: {
    padding: spacing[4],
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  dateColumn: {
    width: 100,
    marginRight: spacing[3],
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
  },
  weekTag: {
    fontSize: 10,
    color: themeColors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  eventColumn: {
    flex: 1,
  },
  restDayPill: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.sm,
  },
  restDayText: {
    fontSize: 12,
    color: themeColors.textSecondary,
    fontStyle: 'italic',
  },
  workoutItem: {
    paddingVertical: spacing[1],
  },
  workoutTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.textPrimary,
    flex: 1,
    marginRight: spacing[2],
  },
  dayFocusText: {
    fontSize: 12,
    color: themeColors.textMuted,
    marginTop: 2,
  },
  unscheduledText: {
    fontSize: 12,
    color: themeColors.textMuted,
  },
  emptyCard: {
    padding: spacing[8],
    alignItems: 'center',
    gap: spacing[2],
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: themeColors.textMuted,
  },
});
