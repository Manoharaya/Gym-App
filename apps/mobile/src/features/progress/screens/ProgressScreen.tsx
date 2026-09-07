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
import { Screen, Card, Badge, Icon, MetricCard, Tabs, Button } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { ProgressService, ProgressSummaryDto } from '../services/progressService';

type ProgressTab = 'overview' | 'measurements' | 'assessments' | 'performance' | 'records' | 'goals';

const TABS = [
  { id: 'overview' as ProgressTab, label: 'Overview' },
  { id: 'measurements' as ProgressTab, label: 'Body Metrics' },
  { id: 'assessments' as ProgressTab, label: 'Assessments' },
  { id: 'performance' as ProgressTab, label: 'Performance' },
  { id: 'records' as ProgressTab, label: 'PRs' },
  { id: 'goals' as ProgressTab, label: 'Goals' },
];

export const ProgressScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = (route.params || {}) as { memberId?: string; clientName?: string };

  const [activeTab, setActiveTab] = useState<ProgressTab>('overview');
  const [period, setPeriod] = useState<string>('30D');
  const [data, setData] = useState<ProgressSummaryDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadProgress = useCallback(async () => {
    try {
      setError(null);
      let summary: ProgressSummaryDto;
      if (params.memberId) {
        summary = await ProgressService.getMemberProgress(params.memberId, period);
      } else {
        summary = await ProgressService.getMyProgress(period);
      }
      setData(summary);
    } catch (err: any) {
      setError(err?.message || 'Failed to load progress analytics. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.memberId, period]);

  useEffect(() => {
    setLoading(true);
    loadProgress();
  }, [loadProgress]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProgress();
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {params.clientName ? `${params.clientName}'s Progress` : 'Progress & Analytics'}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setPeriod(period === '30D' ? '90D' : '30D')}
            style={styles.periodPill}
            accessibilityLabel={`Time period: ${period}`}
          >
            <Text style={styles.periodPillText}>{period}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} variant="pill" />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />}
      >
        {/* Loading State */}
        {loading && !refreshing && (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={themeColors.primary} />
            <Text style={styles.stateText}>Loading verified progress analytics...</Text>
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card style={styles.errorCard}>
            <Icon name="alert-circle" size={24} color={themeColors.danger} />
            <Text style={styles.errorTitle}>Analytics Unavailable</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <Button
              title="Retry"
              variant="secondary"
              size="sm"
              onPress={loadProgress}
              style={{ marginTop: spacing[3] }}
            />
          </Card>
        )}

        {/* Loaded Data Content */}
        {!loading && !error && data && (
          <>
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <View style={styles.tabContent}>
                <View style={styles.metricsRow}>
                  <MetricCard
                    label="WORKOUTS COMPLETED"
                    value={data.workoutsCompleted.toString()}
                    unit="sessions"
                    change={data.adherence.completed > 0 ? 'Active' : 'None'}
                    trend={data.adherence.completed > 0 ? 'up' : 'neutral'}
                    icon="bolt"
                    accentColor={themeColors.accent}
                    style={styles.flexMetric}
                  />
                  <MetricCard
                    label="TOTAL TONNAGE"
                    value={
                      data.totalTonnageLifted > 1000
                        ? (data.totalTonnageLifted / 1000).toFixed(1)
                        : data.totalTonnageLifted.toString()
                    }
                    unit={data.totalTonnageLifted > 1000 ? 'tonnes' : 'kg'}
                    trend="up"
                    icon="dumbbell"
                    accentColor={themeColors.primary}
                    style={styles.flexMetric}
                  />
                </View>

                {/* Adherence Card */}
                <Card style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Training Adherence</Text>
                    <Badge
                      label={`${data.adherence.adherenceRate}% ADHERENCE`}
                      variant={data.adherence.adherenceRate >= 80 ? 'success' : 'neutral'}
                    />
                  </View>
                  <Text style={styles.subtext}>
                    {data.adherence.completed} of {data.adherence.effectiveScheduled} effective scheduled workouts completed
                    {data.adherence.cancelled > 0 && ` (${data.adherence.cancelled} cancelled excluded)`}.
                  </Text>

                  <View style={styles.adherenceGrid}>
                    <View style={styles.adherenceStat}>
                      <Text style={styles.adherenceNumber}>{data.adherence.totalScheduled}</Text>
                      <Text style={styles.adherenceLabel}>Scheduled</Text>
                    </View>
                    <View style={styles.adherenceStat}>
                      <Text style={[styles.adherenceNumber, { color: themeColors.success }]}>
                        {data.adherence.completed}
                      </Text>
                      <Text style={styles.adherenceLabel}>Completed</Text>
                    </View>
                    <View style={styles.adherenceStat}>
                      <Text style={[styles.adherenceNumber, { color: themeColors.warning }]}>
                        {data.adherence.skipped}
                      </Text>
                      <Text style={styles.adherenceLabel}>Skipped</Text>
                    </View>
                    <View style={styles.adherenceStat}>
                      <Text style={[styles.adherenceNumber, { color: themeColors.danger }]}>
                        {data.adherence.overdue}
                      </Text>
                      <Text style={styles.adherenceLabel}>Overdue</Text>
                    </View>
                  </View>
                </Card>

                {/* Latest Achievements Preview */}
                {data.personalRecords.length > 0 && (
                  <Card style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>Top Personal Records</Text>
                      <Badge label={`${data.personalRecords.length} ACHIEVED`} variant="accent" />
                    </View>
                    {data.personalRecords.slice(0, 3).map((pr, idx) => (
                      <View key={idx} style={styles.recordRow}>
                        <View>
                          <Text style={styles.recordExerciseName}>{pr.exercise.name}</Text>
                          <Text style={styles.recordDetail}>
                            {pr.recordType.replace('_', ' ')} • {new Date(pr.achievedAt).toLocaleDateString()}
                          </Text>
                        </View>
                        <Text style={styles.recordVal}>
                          {pr.value} {pr.unit}
                        </Text>
                      </View>
                    ))}
                  </Card>
                )}
              </View>
            )}

            {/* TAB 2: MEASUREMENTS */}
            {activeTab === 'measurements' && (
              <View style={styles.tabContent}>
                {data.recentMeasurements.length === 0 ? (
                  <Card style={styles.emptyCard}>
                    <Icon name="activity" size={32} color={themeColors.textMuted} />
                    <Text style={styles.emptyTitle}>No measurements recorded yet</Text>
                    <Text style={styles.emptyMessage}>
                      Log body weight, fat percentage, and body circumferences to track composition trends.
                    </Text>
                  </Card>
                ) : (
                  data.recentMeasurements.map((m) => (
                    <Card key={m.id} style={styles.measurementCard}>
                      <View style={styles.cardHeader}>
                        <View>
                          <Text style={styles.measurementType}>{m.measurementType.replace(/_/g, ' ')}</Text>
                          <Text style={styles.subtext}>{new Date(m.recordedAt).toLocaleDateString()}</Text>
                        </View>
                        <View style={styles.measurementValueBox}>
                          <Text style={styles.measurementValText}>
                            {m.value} {m.unit}
                          </Text>
                        </View>
                      </View>
                      {m.notes && <Text style={styles.notesText}>{m.notes}</Text>}
                    </Card>
                  ))
                )}
              </View>
            )}

            {/* TAB 3: ASSESSMENTS */}
            {activeTab === 'assessments' && (
              <View style={styles.tabContent}>
                {data.recentAssessments.length === 0 ? (
                  <Card style={styles.emptyCard}>
                    <Icon name="activity" size={32} color={themeColors.textMuted} />
                    <Text style={styles.emptyTitle}>No assessments completed yet</Text>
                    <Text style={styles.emptyMessage}>
                      Fitness assessments evaluate strength, endurance, mobility, and cardio capacities.
                    </Text>
                  </Card>
                ) : (
                  data.recentAssessments.map((a) => (
                    <Card key={a.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View>
                          <Text style={styles.cardTitle}>{a.title}</Text>
                          <Text style={styles.subtext}>
                            {a.category} • {new Date(a.completedAt).toLocaleDateString()}
                          </Text>
                        </View>
                        <Badge label={a.status} variant={a.status === 'COMPLETED' ? 'success' : 'neutral'} />
                      </View>
                      {a.results.map((r, i) => (
                        <View key={i} style={styles.resultRow}>
                          <Text style={styles.resultMetric}>{r.metricName}</Text>
                          <Text style={styles.resultValue}>
                            {r.value !== undefined ? `${r.value} ${r.unit || ''}` : r.score ? `${r.score} pts` : '-'}
                          </Text>
                        </View>
                      ))}
                    </Card>
                  ))
                )}
              </View>
            )}

            {/* TAB 4: PERFORMANCE */}
            {activeTab === 'performance' && (
              <View style={styles.tabContent}>
                {data.exerciseAnalytics.length === 0 ? (
                  <Card style={styles.emptyCard}>
                    <Icon name="activity" size={32} color={themeColors.textMuted} />
                    <Text style={styles.emptyTitle}>No performance records in this period</Text>
                    <Text style={styles.emptyMessage}>
                      Completed workout sets automatically produce training volume, rep, and load analytics.
                    </Text>
                  </Card>
                ) : (
                  data.exerciseAnalytics.map((ex) => (
                    <Card key={ex.exerciseId} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View>
                          <Text style={styles.cardTitle}>{ex.exerciseName}</Text>
                          <Text style={styles.subtext}>{ex.exerciseType}</Text>
                        </View>
                        {ex.totalVolume > 0 && (
                          <Badge label={`${(ex.totalVolume / 1000).toFixed(1)}t`} variant="accent" />
                        )}
                      </View>
                      <View style={styles.perfGrid}>
                        <View style={styles.perfItem}>
                          <Text style={styles.perfVal}>{ex.totalSets}</Text>
                          <Text style={styles.perfLabel}>Sets</Text>
                        </View>
                        <View style={styles.perfItem}>
                          <Text style={styles.perfVal}>{ex.totalReps}</Text>
                          <Text style={styles.perfLabel}>Reps</Text>
                        </View>
                        <View style={styles.perfItem}>
                          <Text style={styles.perfVal}>{ex.maxLoad} kg</Text>
                          <Text style={styles.perfLabel}>Max Load</Text>
                        </View>
                        <View style={styles.perfItem}>
                          <Text style={styles.perfVal}>{ex.averageRpe ? ex.averageRpe : '-'}</Text>
                          <Text style={styles.perfLabel}>Avg RPE</Text>
                        </View>
                      </View>
                    </Card>
                  ))
                )}
              </View>
            )}

            {/* TAB 5: PERSONAL RECORDS */}
            {activeTab === 'records' && (
              <View style={styles.tabContent}>
                {data.personalRecords.length === 0 ? (
                  <Card style={styles.emptyCard}>
                    <Icon name="award" size={32} color={themeColors.textMuted} />
                    <Text style={styles.emptyTitle}>No personal records achieved yet</Text>
                    <Text style={styles.emptyMessage}>
                      Personal records are verified automatically from completed workout sets.
                    </Text>
                  </Card>
                ) : (
                  data.personalRecords.map((pr) => (
                    <Card key={pr.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View>
                          <Text style={styles.cardTitle}>{pr.exercise.name}</Text>
                          <Text style={styles.subtext}>
                            {pr.recordType.replace(/_/g, ' ')} • {new Date(pr.achievedAt).toLocaleDateString()}
                          </Text>
                        </View>
                        <Badge label="PERSONAL RECORD" variant="accent" />
                      </View>
                      <View style={styles.prValueRow}>
                        <Text style={styles.prValueText}>
                          {pr.value} {pr.unit}
                        </Text>
                        {pr.previousValue && (
                          <Text style={styles.prImprovement}>
                            ↑ {pr.improvementPercentage}% vs previous ({pr.previousValue} {pr.unit})
                          </Text>
                        )}
                      </View>
                    </Card>
                  ))
                )}
              </View>
            )}

            {/* TAB 6: GOALS */}
            {activeTab === 'goals' && (
              <View style={styles.tabContent}>
                {data.activeGoals.length === 0 ? (
                  <Card style={styles.emptyCard}>
                    <Icon name="award" size={32} color={themeColors.textMuted} />
                    <Text style={styles.emptyTitle}>No active goals currently tracked</Text>
                    <Text style={styles.emptyMessage}>
                      Set measurable target weight, strength, or endurance goals with your trainer.
                    </Text>
                  </Card>
                ) : (
                  data.activeGoals.map((g) => (
                    <Card key={g.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View>
                          <Text style={styles.cardTitle}>{g.title}</Text>
                          <Text style={styles.subtext}>{g.category.replace(/_/g, ' ')}</Text>
                        </View>
                        <Badge
                          label={`${g.progressPercentage}%`}
                          variant={g.isCompleted ? 'success' : g.isOverdue ? 'danger' : 'neutral'}
                        />
                      </View>

                      {/* Progress Bar */}
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${Math.min(100, Math.max(0, g.progressPercentage))}%` },
                            g.isCompleted && { backgroundColor: themeColors.success },
                          ]}
                        />
                      </View>

                      <View style={styles.goalValuesRow}>
                        <Text style={styles.subtext}>Baseline: {g.baselineValue ?? '-'} {g.unit || ''}</Text>
                        <Text style={[styles.subtext, { fontWeight: '700', color: themeColors.textPrimary }]}>
                          Current: {g.currentValue ?? '-'} {g.unit || ''}
                        </Text>
                        <Text style={styles.subtext}>Target: {g.targetValue ?? '-'} {g.unit || ''}</Text>
                      </View>
                    </Card>
                  ))
                )}
              </View>
            )}
          </>
        )}
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
  backButton: {
    padding: spacing[1],
  },
  headerTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodPill: {
    backgroundColor: themeColors.surfaceActive,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  periodPillText: {
    ...typography.caption,
    color: themeColors.accent,
    fontWeight: '700',
  },
  tabsContainer: {
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  container: {
    padding: spacing[4],
    paddingBottom: spacing[12],
  },
  tabContent: {
    gap: spacing[4],
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  flexMetric: {
    flex: 1,
  },
  card: {
    padding: spacing[4],
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: spacing[3],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  subtext: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  adherenceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  adherenceStat: {
    alignItems: 'center',
  },
  adherenceNumber: {
    ...typography.h3,
    fontWeight: '800',
    color: themeColors.textPrimary,
  },
  adherenceLabel: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  recordExerciseName: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  recordDetail: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  recordVal: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.accent,
  },
  measurementCard: {
    padding: spacing[4],
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  measurementType: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  measurementValueBox: {
    backgroundColor: themeColors.surfaceActive,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
  },
  measurementValText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: themeColors.primary,
  },
  notesText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing[2],
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[1],
  },
  resultMetric: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
  },
  resultValue: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  perfGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: themeColors.surfaceActive,
    padding: spacing[3],
    borderRadius: radius.sm,
  },
  perfItem: {
    alignItems: 'center',
  },
  perfVal: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  perfLabel: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  prValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[1],
  },
  prValueText: {
    ...typography.h3,
    fontWeight: '800',
    color: themeColors.accent,
  },
  prImprovement: {
    ...typography.caption,
    color: themeColors.success,
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: themeColors.surfaceActive,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: themeColors.primary,
    borderRadius: radius.full,
  },
  goalValuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centerState: {
    paddingVertical: spacing[16],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  stateText: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
  },
  emptyCard: {
    padding: spacing[8],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: spacing[2],
  },
  emptyTitle: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginTop: spacing[2],
  },
  emptyMessage: {
    ...typography.caption,
    color: themeColors.textSecondary,
    textAlign: 'center',
  },
  errorCard: {
    padding: spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.surface,
    borderColor: themeColors.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    gap: spacing[2],
  },
  errorTitle: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.danger,
  },
  errorMessage: {
    ...typography.caption,
    color: themeColors.textSecondary,
    textAlign: 'center',
  },
});
