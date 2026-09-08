import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { EngagementIntelligenceService } from '../services/engagementIntelligenceService';
import type {
  MemberEngagementProfileDto,
  EngagementTrendItem,
  EngagementIntelligenceResponse,
} from '@fitcore/types';

export const MemberEngagementScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<MemberEngagementProfileDto | null>(null);
  const [trends, setTrends] = useState<EngagementTrendItem[]>([]);
  const [aiInsight, setAiInsight] = useState<EngagementIntelligenceResponse | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      // Log app screen viewed event
      EngagementIntelligenceService.recordAppEvent('PROFILE_VIEWED', { screen: 'MemberEngagement' }).catch(() => {});

      const [summaryData, trendsData] = await Promise.all([
        EngagementIntelligenceService.getSummary(isRefresh),
        EngagementIntelligenceService.getTrends(isRefresh),
      ]);

      setProfile(summaryData);
      setTrends(trendsData);

      // Fetch AI narrative insight
      try {
        const insightRes = await EngagementIntelligenceService.generateInsight();
        setAiInsight(insightRes.insight);
      } catch (insightErr) {
        // Non-blocking for UI rendering
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load fitness momentum.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const getMomentumColor = (trend?: string) => {
    switch (trend) {
      case 'IMPROVING':
        return '#10B981'; // Emerald green
      case 'STABLE':
        return '#38BDF8'; // Sky blue
      case 'DECLINING':
        return '#F59E0B'; // Warm amber (never alarming red)
      default:
        return '#94A3B8';
    }
  };

  const getMomentumLabel = (trend?: string) => {
    switch (trend) {
      case 'IMPROVING':
        return 'Accelerating';
      case 'STABLE':
        return 'Steady Routine';
      case 'DECLINING':
        return 'Finding Rhythm';
      default:
        return 'Building Baseline';
    }
  };

  const formatLevel = (level?: string) => {
    if (!level || level === 'INSUFFICIENT_DATA') return 'Getting Started';
    return level.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered} testID="loading-indicator">
          <ActivityIndicator size="large" color="#38BDF8" />
          <Text style={styles.loadingText}>Analyzing your fitness momentum...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered} testID="error-state">
          <Text style={styles.errorTitle}>Momentum Unavailable</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadData()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isInsufficientData = !profile || profile.overallEngagement === 'INSUFFICIENT_DATA';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38BDF8" />}
        accessibilityLabel="Member Fitness Momentum Screen"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>FITCORE MOMENTUM</Text>
          <Text style={styles.headerTitle} accessibilityRole="header">
            Your Fitness Momentum
          </Text>
          <Text style={styles.headerDescription}>
            Track your training rhythm and stay inspired.
          </Text>
        </View>

        {isInsufficientData ? (
          <View style={styles.insufficientDataCard} testID="insufficient-data-card">
            <Text style={styles.insufficientTitle}>Welcome to FitCore!</Text>
            <Text style={styles.insufficientBody}>
              We are tracking your first gym visits and workout sessions. Once you record a few workouts and visits,
              your personalized momentum analytics and consistency trends will appear here!
            </Text>
          </View>
        ) : (
          <>
            {/* Momentum Highlight Card */}
            <View style={styles.momentumCard} testID="momentum-card">
              <View style={styles.momentumHeader}>
                <View>
                  <Text style={styles.cardLabel}>CURRENT ENGAGEMENT</Text>
                  <Text style={styles.levelTitle}>{formatLevel(profile?.overallEngagement)}</Text>
                </View>
                <View
                  style={[
                    styles.momentumBadge,
                    { backgroundColor: `${getMomentumColor(profile?.trend)}20` },
                  ]}
                  accessibilityLabel={`Momentum trend: ${getMomentumLabel(profile?.trend)}`}
                >
                  <View
                    style={[
                      styles.momentumDot,
                      { backgroundColor: getMomentumColor(profile?.trend) },
                    ]}
                  />
                  <Text
                    style={[
                      styles.momentumBadgeText,
                      { color: getMomentumColor(profile?.trend) },
                    ]}
                  >
                    {getMomentumLabel(profile?.trend)}
                  </Text>
                </View>
              </View>

              {/* Narrative Summary */}
              {aiInsight?.summary ? (
                <View style={styles.narrativeContainer}>
                  <Text style={styles.narrativeText}>{aiInsight.summary}</Text>
                </View>
              ) : null}

              {/* 30-Day Activity Counters */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{profile?.attendanceFrequency ?? 0}</Text>
                  <Text style={styles.statLabel}>Visits / Wk</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{profile?.workoutAdherence ?? 0}%</Text>
                  <Text style={styles.statLabel}>Adherence</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{profile?.bookingFrequency ?? 0}</Text>
                  <Text style={styles.statLabel}>Bookings / Wk</Text>
                </View>
              </View>
            </View>

            {/* Active Highlights & Trends */}
            {trends.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Consistency Insights</Text>
                {trends.map((item, index) => (
                  <View key={`${item.trendType}-${index}`} style={styles.trendCard} testID="trend-item">
                    <View style={styles.trendRow}>
                      <View
                        style={[
                          styles.trendIconCircle,
                          {
                            backgroundColor:
                              item.direction === 'IMPROVING'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : item.direction === 'DECLINING'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'rgba(56, 189, 248, 0.15)',
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color:
                              item.direction === 'IMPROVING'
                                ? '#10B981'
                                : item.direction === 'DECLINING'
                                ? '#F59E0B'
                                : '#38BDF8',
                            fontSize: 16,
                            fontWeight: '700',
                          }}
                        >
                          {item.direction === 'IMPROVING' ? '↑' : item.direction === 'DECLINING' ? '↓' : '→'}
                        </Text>
                      </View>
                      <View style={styles.trendTextContainer}>
                        <Text style={styles.trendMetric}>{item.metric}</Text>
                        <Text style={styles.trendDescription}>{item.description}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Recommended Momentum Actions */}
            {aiInsight?.recommendedActions && aiInsight.recommendedActions.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Keep Your Momentum</Text>
                {aiInsight.recommendedActions.map((action, i) => (
                  <View key={`action-${i}`} style={styles.actionCard}>
                    <Text style={styles.actionTypeBadge}>{action.type.replace('_', ' ')}</Text>
                    <Text style={styles.actionRecommendation}>{action.recommendation}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* Quick Action Buttons (Slice 23) */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('BookingHome')}
            accessibilityLabel="Book a class"
            accessibilityRole="button"
          >
            <Text style={styles.actionButtonText}>Book a Class</Text>
            <Text style={styles.actionButtonArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('WorkoutsHome')}
            accessibilityLabel="Resume workout"
            accessibilityRole="button"
          >
            <Text style={styles.actionButtonText}>Resume Workout</Text>
            <Text style={styles.actionButtonArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('GoalsHome')}
            accessibilityLabel="Review training goals"
            accessibilityRole="button"
          >
            <Text style={styles.actionButtonText}>Review Goals</Text>
            <Text style={styles.actionButtonArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('DailyCheckInHome')}
            accessibilityLabel="Complete today's check-in"
            accessibilityRole="button"
          >
            <Text style={styles.actionButtonText}>Complete Today's Check-In</Text>
            <Text style={styles.actionButtonArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AICoachChat')}
            accessibilityLabel="Talk to Fitness Coach"
            accessibilityRole="button"
          >
            <Text style={styles.actionButtonText}>Talk to Fitness Coach</Text>
            <Text style={styles.actionButtonArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0D14',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#94A3B8',
    fontSize: 14,
  },
  errorTitle: {
    color: '#F87171',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#38BDF8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#0A0D14',
    fontWeight: '700',
  },
  header: {
    marginBottom: 20,
  },
  headerSubtitle: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
  },
  headerDescription: {
    color: '#94A3B8',
    fontSize: 14,
  },
  insufficientDataCard: {
    backgroundColor: '#141822',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#232B3E',
    marginBottom: 20,
  },
  insufficientTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  insufficientBody: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
  },
  momentumCard: {
    backgroundColor: '#141822',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#232B3E',
    marginBottom: 24,
  },
  momentumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  levelTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  momentumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  momentumDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  momentumBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  narrativeContainer: {
    backgroundColor: '#0F1219',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  narrativeText: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F2738',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#1F2738',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  trendCard: {
    backgroundColor: '#141822',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1F2738',
    marginBottom: 10,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trendTextContainer: {
    flex: 1,
  },
  trendMetric: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  trendDescription: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
  },
  actionCard: {
    backgroundColor: '#141822',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1F2738',
    marginBottom: 10,
  },
  actionTypeBadge: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  actionRecommendation: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 20,
  },
  quickActionsContainer: {
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#141822',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#232B3E',
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  actionButtonArrow: {
    color: '#64748B',
    fontSize: 20,
    fontWeight: '700',
  },
});
