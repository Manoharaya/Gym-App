import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, Badge, Icon, MetricCard, Tabs } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';

type ProgressTab = 'volume' | 'records' | 'attendance';

const TABS = [
  { id: 'volume' as ProgressTab, label: 'Volume' },
  { id: 'records' as ProgressTab, label: 'Records' },
  { id: 'attendance' as ProgressTab, label: 'Consistency' },
];

const WEEKLY_VOLUME = [
  { week: 'W1', volume: 18400, target: 20000 },
  { week: 'W2', volume: 21200, target: 20000 },
  { week: 'W3', volume: 19800, target: 20000 },
  { week: 'W4', volume: 24850, target: 20000 },
];

const RECORDS = [
  { exercise: 'Barbell Deadlift', weight: '180 kg', reps: '3 reps', date: 'Sep 02, 2026', pr: true },
  { exercise: 'Back Squat', weight: '145 kg', reps: '5 reps', date: 'Aug 24, 2026', pr: true },
  { exercise: 'Barbell Bench Press', weight: '100 kg', reps: '4 reps', date: 'Aug 18, 2026', pr: false },
  { exercise: 'Overhead Press', weight: '65 kg', reps: '6 reps', date: 'Aug 10, 2026', pr: false },
];

export const ProgressScreen: React.FC = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<ProgressTab>('volume');

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Progress & Analytics</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* KPI Metrics */}
        <View style={styles.metricsRow}>
          <MetricCard
            label="MONTHLY WORKOUTS"
            value="18"
            unit="sessions"
            change="+22%"
            trend="up"
            icon="bolt"
            accentColor={themeColors.accent}
            style={styles.flexMetric}
          />
          <MetricCard
            label="TOTAL TONNAGE"
            value="84.2"
            unit="tonnes"
            change="+11%"
            trend="up"
            icon="dumbbell"
            accentColor={themeColors.primary}
            style={styles.flexMetric}
          />
        </View>

        {/* Tab Selector */}
        <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} variant="pill" />

        {/* Tab 1: Volume Visualization */}
        {activeTab === 'volume' && (
          <Card style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Weekly Tonnage (kg)</Text>
                <Text style={styles.chartSubtitle}>Current Month Volume Progression</Text>
              </View>
              <Badge label="PROGRESSIVE LOAD" variant="success" />
            </View>

            {/* Custom Responsive Bar Chart */}
            <View style={styles.barChartContainer}>
              {WEEKLY_VOLUME.map((item, idx) => {
                const maxVol = 26000;
                const barHeight = (item.volume / maxVol) * 140;
                const isTargetExceeded = item.volume >= item.target;
                return (
                  <View key={idx} style={styles.barColumn}>
                    <Text style={styles.barValueText}>{(item.volume / 1000).toFixed(1)}k</Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { height: barHeight },
                          isTargetExceeded && styles.barFillTarget,
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabelText}>{item.week}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.chartFooter}>
              <Icon name="sparkles" size={14} color={themeColors.aiPrimary} />
              <Text style={styles.aiAnalysisText}>
                FitCore AI: Volume increased 18.2% over 4 weeks with zero overreaching fatigue indicators detected.
              </Text>
            </View>
          </Card>
        )}

        {/* Tab 2: Personal Records */}
        {activeTab === 'records' && (
          <View style={styles.recordsList}>
            {RECORDS.map((record, i) => (
              <Card key={i} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <View>
                    <Text style={styles.recordExercise}>{record.exercise}</Text>
                    <Text style={styles.recordDate}>{record.date}</Text>
                  </View>
                  {record.pr ? (
                    <Badge label="NEW PR" variant="accent" />
                  ) : (
                    <Badge label="PERSONAL BEST" variant="neutral" />
                  )}
                </View>
                <View style={styles.recordStatsRow}>
                  <Text style={styles.recordWeight}>{record.weight}</Text>
                  <Text style={styles.recordReps}>for {record.reps}</Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Tab 3: Attendance Consistency */}
        {activeTab === 'attendance' && (
          <Card style={styles.attendanceCard}>
            <View style={styles.attendanceHeader}>
              <Text style={styles.attendanceTitle}>30-Day Check-in Consistency</Text>
              <Text style={styles.attendanceRate}>82% Goal Adherence</Text>
            </View>

            <View style={styles.heatGrid}>
              {Array.from({ length: 28 }).map((_, idx) => {
                const attended = [0, 1, 3, 4, 6, 7, 8, 10, 11, 13, 15, 17, 18, 20, 21, 24, 25, 27].includes(idx);
                return (
                  <View
                    key={idx}
                    style={[styles.heatBox, attended && styles.heatBoxActive]}
                  />
                );
              })}
            </View>

            <View style={styles.heatLegend}>
              <View style={styles.legendItem}>
                <View style={styles.heatBox} />
                <Text style={styles.legendText}>Rest Day</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.heatBox, styles.heatBoxActive]} />
                <Text style={styles.legendText}>Trained / Checked In</Text>
              </View>
            </View>
          </Card>
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
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  backButton: {
    padding: spacing[2],
    marginLeft: -spacing[2],
  },
  headerTitle: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  container: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[10],
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  flexMetric: {
    flex: 1,
  },
  chartCard: {
    padding: spacing[4],
    gap: spacing[4],
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  chartTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  chartSubtitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 180,
    paddingTop: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  barColumn: {
    alignItems: 'center',
    gap: spacing[1.5],
  },
  barValueText: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '600',
    fontSize: 10,
  },
  barTrack: {
    width: 32,
    height: 140,
    backgroundColor: themeColors.surface,
    borderRadius: radius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: themeColors.accent,
    borderRadius: radius.sm,
  },
  barFillTarget: {
    backgroundColor: themeColors.success,
  },
  barLabelText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '700',
  },
  chartFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.surface,
    padding: spacing[3],
    borderRadius: radius.md,
    gap: spacing[2],
  },
  aiAnalysisText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  recordsList: {
    gap: spacing[3],
  },
  recordCard: {
    padding: spacing[4],
    gap: spacing[2],
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  recordExercise: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  recordDate: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginTop: 2,
  },
  recordStatsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing[2],
  },
  recordWeight: {
    ...typography.h2,
    color: themeColors.accent,
    fontWeight: '800',
  },
  recordReps: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
  },
  attendanceCard: {
    padding: spacing[4],
    gap: spacing[3.5],
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendanceTitle: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  attendanceRate: {
    ...typography.caption,
    color: themeColors.success,
    fontWeight: '700',
  },
  heatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heatBox: {
    width: 24,
    height: 24,
    borderRadius: radius.xs,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  heatBoxActive: {
    backgroundColor: themeColors.accent,
    borderColor: themeColors.accent,
  },
  heatLegend: {
    flexDirection: 'row',
    gap: spacing[4],
    marginTop: spacing[1],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  legendText: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
});
