import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, Button } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { engagementService, EngagementSummaryResponse } from '../services/engagementService';

export const EngagementHomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [summary, setSummary] = useState<EngagementSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEngagement = useCallback(async () => {
    try {
      setError(null);
      const data = await engagementService.getEngagementSummary();
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load engagement data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEngagement();
  }, [fetchEngagement]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEngagement();
  };

  const getLevelColor = (level?: string) => {
    switch (level) {
      case 'HIGHLY_ENGAGED':
        return '#10B981';
      case 'ENGAGED':
        return '#3B82F6';
      case 'ACTIVE':
        return '#6366F1';
      case 'AT_RISK':
        return '#F59E0B';
      case 'DORMANT':
        return '#EF4444';
      default:
        return '#8B5CF6';
    }
  };

  return (
    <Screen>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Engagement & Habits</Text>
          <Text style={styles.subtitle}>Consistency is the foundation of lasting results</Text>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
          </View>
        ) : error ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Retry" onPress={fetchEngagement} size="sm" variant="outline" style={{ marginTop: 12 }} />
          </Card>
        ) : (
          <>
            {/* Streak & Score Hero */}
            <Card style={styles.heroCard}>
              <View style={styles.heroRow}>
                <View>
                  <Text style={styles.streakEmoji}>🔥</Text>
                  <Text style={styles.streakCount}>{summary?.profile.currentStreak || 0} Days</Text>
                  <Text style={styles.streakLabel}>Current Streak</Text>
                </View>
                <View style={styles.scoreContainer}>
                  <View
                    style={[
                      styles.levelBadge,
                      { backgroundColor: `${getLevelColor(summary?.profile.engagementLevel)}20` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.levelBadgeText,
                        { color: getLevelColor(summary?.profile.engagementLevel) },
                      ]}
                    >
                      {summary?.profile.engagementLevel || 'NEW'}
                    </Text>
                  </View>
                  <Text style={styles.scoreValue}>
                    {Math.round(summary?.profile.engagementScore || 0)}
                    <Text style={styles.scoreMax}> / 100</Text>
                  </Text>
                  <Text style={styles.scoreLabel}>Engagement Score</Text>
                </View>
              </View>

              <View style={styles.heroFooter}>
                <Text style={styles.longestStreakText}>
                  Personal Best: <Text style={{ fontWeight: '700' }}>{summary?.profile.longestStreak || 0} Days</Text>
                </Text>
              </View>
            </Card>

            {/* Quick Actions */}
            <View style={styles.navRow}>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => navigation.navigate('HabitsScreen')}
                activeOpacity={0.8}
              >
                <Text style={styles.navIcon}>✓</Text>
                <Text style={styles.navLabel}>Habits</Text>
                <Text style={styles.navCount}>{summary?.counts.activeHabits || 0} Active</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navButton}
                onPress={() => navigation.navigate('ChallengesScreen')}
                activeOpacity={0.8}
              >
                <Text style={styles.navIcon}>🏆</Text>
                <Text style={styles.navLabel}>Challenges</Text>
                <Text style={styles.navCount}>{summary?.counts.activeChallenges || 0} Joined</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navButton}
                onPress={() => navigation.navigate('RewardsScreen')}
                activeOpacity={0.8}
              >
                <Text style={styles.navIcon}>🎖️</Text>
                <Text style={styles.navLabel}>Badges</Text>
                <Text style={styles.navCount}>{summary?.counts.earnedBadges || 0} Earned</Text>
              </TouchableOpacity>
            </View>

            {/* Weekly Activity Summary */}
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>This Week</Text>
              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricNumber}>{summary?.weeklySummary.visits || 0}</Text>
                  <Text style={styles.metricLabel}>Gym Visits</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricNumber}>{summary?.weeklySummary.workouts || 0}</Text>
                  <Text style={styles.metricLabel}>Workouts</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricNumber}>{summary?.weeklySummary.classes || 0}</Text>
                  <Text style={styles.metricLabel}>Classes</Text>
                </View>
              </View>
            </Card>

            {/* Total Lifetime Milestones */}
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Lifetime Milestones</Text>
              <View style={styles.statsRow}>
                <Text style={styles.statLabel}>Total Workouts Completed</Text>
                <Text style={styles.statValue}>{summary?.profile.totalWorkouts || 0}</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={styles.statLabel}>Total Gym Check-ins</Text>
                <Text style={styles.statValue}>{summary?.profile.totalVisits || 0}</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={styles.statLabel}>Total Classes Attended</Text>
                <Text style={styles.statValue}>{summary?.profile.totalCompletedClasses || 0}</Text>
              </View>
              <View style={[styles.statsRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.statLabel}>Total Goals Completed</Text>
                <Text style={styles.statValue}>{summary?.profile.totalCompletedGoals || 0}</Text>
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  contentContainer: {
    padding: spacing[4],
    paddingBottom: spacing[8] * 2,
  },
  header: {
    marginBottom: spacing[4],
  },
  title: {
    ...typography.heading2,
    color: '#F8FAFC',
    fontWeight: '700',
  },
  subtitle: {
    ...typography.bodySmall,
    color: '#94A3B8',
    marginTop: 2,
  },
  loaderContainer: {
    padding: spacing[8],
    alignItems: 'center',
  },
  errorCard: {
    backgroundColor: '#1E293B',
    padding: spacing[4],
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
  },
  heroCard: {
    backgroundColor: '#1E293B',
    borderRadius: radius.lg,
    padding: spacing[6],
    marginBottom: spacing[4],
    borderColor: '#334155',
    borderWidth: 1,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakEmoji: {
    fontSize: 28,
  },
  streakCount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F97316',
    marginTop: 4,
  },
  streakLabel: {
    fontSize: 12,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginBottom: 6,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  scoreMax: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '400',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginTop: 2,
  },
  heroFooter: {
    marginTop: spacing[4],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  longestStreakText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  navButton: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: radius.md,
    padding: spacing[4],
    alignItems: 'center',
    borderColor: '#334155',
    borderWidth: 1,
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  navLabel: {
    color: '#F8FAFC',
    fontWeight: '600',
    fontSize: 14,
  },
  navCount: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: radius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderColor: '#334155',
    borderWidth: 1,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: spacing[4],
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricNumber: {
    color: themeColors.primary,
    fontSize: 24,
    fontWeight: '800',
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 14,
  },
  statValue: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 14,
  },
});
