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
import { Screen, Card, Badge, Icon, MetricCard, Button } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { WearableIntelligenceService } from '../services/wearableIntelligenceService';
import type {
  WearableIntelligenceSummaryDto,
  WearableIntelligenceResponseDto,
  RecoveryCategory,
} from '@fitcore/types';

export const WearableIntelligenceScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<WearableIntelligenceSummaryDto | null>(null);
  const [insight, setInsight] = useState<WearableIntelligenceResponseDto | null>(null);
  const [insightId, setInsightId] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      setError(null);
      const summaryData = await WearableIntelligenceService.getSummary(isRefresh);
      setSummary(summaryData);

      // Also generate / retrieve AI synthesized insight
      try {
        const aiResult = await WearableIntelligenceService.generateInsight();
        setInsight(aiResult.insight);
        if (aiResult.insightId) {
          setInsightId(aiResult.insightId);
        }
      } catch {
        // Graceful fallback to deterministic metrics
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load wearable intelligence.');
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

  const handleFeedback = async (rating: 'HELPFUL' | 'NOT_HELPFUL') => {
    if (!insightId || feedbackSent) return;
    try {
      await WearableIntelligenceService.submitFeedback({
        insightId,
        rating,
      });
      setFeedbackSent(rating);
    } catch {
      // Ignore error for non-critical feedback
    }
  };

  const getRecoveryBadge = (category?: RecoveryCategory) => {
    switch (category) {
      case 'GOOD':
        return { variant: 'success' as const, label: 'Favorable Recovery', color: themeColors.success };
      case 'MODERATE':
        return { variant: 'warning' as const, label: 'Moderate Recovery', color: themeColors.warning };
      case 'LOW':
        return { variant: 'danger' as const, label: 'Rest Prioritized', color: themeColors.danger };
      default:
        return { variant: 'neutral' as const, label: 'Building Baseline', color: themeColors.textSecondary };
    }
  };

  const recoveryBadge = getRecoveryBadge(summary?.recovery?.category);

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Back">
          <Icon name="chevron-left" size={22} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Recovery & Readiness</Text>
          <View style={styles.aiTag}>
            <Badge label="AI ENGINE" variant="ai" />
          </View>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('WearablePrivacy')}
          style={styles.privacyButton}
          accessibilityLabel="Privacy and Transparency"
        >
          <Icon name="shield" size={18} color={themeColors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.accent}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.accent} />
            <Text style={styles.loadingText}>Synthesizing wearable telemetry...</Text>
          </View>
        ) : error ? (
          <Card style={styles.errorCard}>
            <Icon name="alert-circle" size={32} color={themeColors.warning} />
            <Text style={styles.errorTitle}>Telemetry Sync Required</Text>
            <Text style={styles.errorDesc}>{error}</Text>
            <Button
              title="Manage Wearables"
              variant="secondary"
              onPress={() => navigation.navigate('WearablesHome')}
              style={styles.errorButton}
            />
          </Card>
        ) : (
          <>
            {/* 1. Recovery Readiness Card */}
            <Card style={styles.recoveryCard}>
              <View style={styles.recoveryHeaderRow}>
                <View>
                  <Text style={styles.cardSuperTitle}>TODAY'S READINESS</Text>
                  <Text style={styles.recoveryTitle}>Recovery Status</Text>
                </View>
                <Badge label={recoveryBadge.label} variant={recoveryBadge.variant} />
              </View>

              <Text style={styles.recoveryExplanation}>
                {summary?.recovery?.explanation ||
                  'Your recent recovery metrics are being monitored against your 7-day and 28-day baselines.'}
              </Text>

              {summary?.recovery?.confidence && (
                <View style={styles.scoreContainer}>
                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreCaption}>Confidence: </Text>
                    <Badge label={summary.recovery.confidence} variant="neutral" />
                  </View>
                </View>
              )}
            </Card>

            {/* 2. AI Synthesized Guidance */}
            {insight && (
              <Card style={styles.aiInsightCard}>
                <View style={styles.aiInsightHeader}>
                  <Icon name="sparkles" size={20} color={themeColors.accent} />
                  <Text style={styles.aiInsightTitle}>AI Telemetry Insights</Text>
                </View>

                <Text style={styles.aiInsightSummary}>{insight.summary}</Text>

                {insight.trainingGuidance && insight.trainingGuidance.length > 0 && (
                  <View style={styles.guidanceSection}>
                    <Text style={styles.guidanceSectionTitle}>TRAINING GUIDANCE</Text>
                    {insight.trainingGuidance.map((g, idx) => (
                      <View key={idx} style={styles.guidanceItem}>
                        <View style={styles.guidanceBadgeRow}>
                          <Badge
                            label={g.type.replace('_', ' ')}
                            variant={
                              g.type === 'TRAIN'
                                ? 'success'
                                : g.type === 'REDUCE_INTENSITY'
                                ? 'warning'
                                : 'accent'
                            }
                          />
                        </View>
                        <Text style={styles.guidanceText}>{g.recommendation}</Text>
                        <Text style={styles.guidanceReason}>{g.reason}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Feedback buttons */}
                <View style={styles.feedbackContainer}>
                  <Text style={styles.feedbackPrompt}>Was this insight helpful?</Text>
                  <View style={styles.feedbackButtonsRow}>
                    <TouchableOpacity
                      style={[
                        styles.feedbackBtn,
                        feedbackSent === 'HELPFUL' && styles.feedbackBtnActive,
                      ]}
                      onPress={() => handleFeedback('HELPFUL')}
                      disabled={!!feedbackSent}
                    >
                      <Icon
                        name="check"
                        size={14}
                        color={feedbackSent === 'HELPFUL' ? themeColors.success : themeColors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.feedbackBtnText,
                          feedbackSent === 'HELPFUL' && styles.feedbackBtnTextActive,
                        ]}
                      >
                        Helpful
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.feedbackBtn,
                        feedbackSent === 'NOT_HELPFUL' && styles.feedbackBtnActive,
                      ]}
                      onPress={() => handleFeedback('NOT_HELPFUL')}
                      disabled={!!feedbackSent}
                    >
                      <Icon
                        name="close"
                        size={14}
                        color={feedbackSent === 'NOT_HELPFUL' ? themeColors.danger : themeColors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.feedbackBtnText,
                          feedbackSent === 'NOT_HELPFUL' && styles.feedbackBtnTextActive,
                        ]}
                      >
                        Not helpful
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            )}

            {/* 3. Rolling Telemetry Metrics */}
            <Text style={styles.sectionHeading}>METRIC HIGHLIGHTS</Text>

            <View style={styles.metricsRow}>
              <MetricCard
                label="SLEEP DURATION"
                value={
                  summary?.sleep?.lastSleepDurationMinutes
                    ? `${Math.floor(summary.sleep.lastSleepDurationMinutes / 60)}h ${summary.sleep.lastSleepDurationMinutes % 60}m`
                    : '--'
                }
                subtitle={
                  summary?.sleep?.sevenDayAverageMinutes
                    ? `7d avg: ${Math.floor(summary.sleep.sevenDayAverageMinutes / 60)}h ${summary.sleep.sevenDayAverageMinutes % 60}m`
                    : 'Awaiting sync'
                }
                icon="clock"
                accentColor={themeColors.accent}
                style={styles.metricCard}
              />
              <MetricCard
                label="RESTING HR"
                value={summary?.heart?.latestRestingHeartRateBpm ? String(summary.heart.latestRestingHeartRateBpm) : '--'}
                unit="bpm"
                subtitle={
                  summary?.heart?.sevenDayAverageRestingHeartRateBpm
                    ? `7d avg: ${summary.heart.sevenDayAverageRestingHeartRateBpm} bpm`
                    : 'Stable baseline'
                }
                icon="heart"
                accentColor={themeColors.heartRate}
                style={styles.metricCard}
              />
            </View>

            <View style={styles.metricsRow}>
              <MetricCard
                label="DAILY STEPS"
                value={summary?.activity?.todaySteps ? summary.activity.todaySteps.toLocaleString() : '0'}
                unit="steps"
                subtitle={
                  summary?.activity?.sevenDayAverageSteps
                    ? `7d avg: ${summary.activity.sevenDayAverageSteps.toLocaleString()}`
                    : 'Consistent'
                }
                icon="activity"
                accentColor={themeColors.success}
                style={styles.metricCard}
              />
              <MetricCard
                label="WORKOUT FREQ"
                value={summary?.activity?.activityFrequencyPerWeek ? `${summary.activity.activityFrequencyPerWeek}x` : '0x'}
                unit="wk"
                subtitle="Logged sessions"
                icon="flame"
                accentColor={themeColors.warning}
                style={styles.metricCard}
              />
            </View>

            {/* 4. Training Correlations */}
            {summary?.correlations && summary.correlations.length > 0 && (
              <>
                <Text style={styles.sectionHeading}>TRAINING CORRELATIONS</Text>
                {summary.correlations.map((c, idx) => (
                  <Card key={idx} style={styles.correlationCard}>
                    <View style={styles.correlationHeader}>
                      <Icon name="activity" size={16} color={themeColors.accent} />
                      <Text style={styles.correlationTitle}>
                        {c.pattern.replace(/_/g, ' ')}
                      </Text>
                    </View>
                    <Text style={styles.correlationSummary}>{c.correlationSummary}</Text>
                    <Text style={styles.correlationDisclaimer}>{c.disclaimer}</Text>
                  </Card>
                ))}
              </>
            )}

            {/* 5. Non-Medical Disclaimer Banner */}
            <View style={styles.disclaimerContainer}>
              <Icon name="alert-circle" size={16} color={themeColors.textTertiary} />
              <Text style={styles.disclaimerText}>
                Wearable data is used for fitness tracking and recovery insights only. This is not medical advice, diagnosis, or clinical evaluation.
              </Text>
            </View>
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
    backgroundColor: themeColors.surface,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  headerTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  aiTag: {
    marginLeft: spacing[1],
  },
  backButton: {
    padding: spacing[1],
  },
  privacyButton: {
    padding: spacing[1],
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  loadingContainer: {
    paddingVertical: spacing[12],
    alignItems: 'center',
    gap: spacing[3],
  },
  loadingText: {
    ...typography.bodySecondary,
    color: themeColors.textSecondary,
  },
  errorCard: {
    alignItems: 'center',
    padding: spacing[6],
    gap: spacing[3],
  },
  errorTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  errorDesc: {
    ...typography.bodySecondary,
    color: themeColors.textSecondary,
    textAlign: 'center',
  },
  errorButton: {
    marginTop: spacing[2],
  },
  recoveryCard: {
    marginBottom: spacing[4],
    backgroundColor: themeColors.cardBackground,
    borderColor: themeColors.border,
    borderWidth: 1,
  },
  recoveryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  cardSuperTitle: {
    ...typography.caption,
    color: themeColors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  recoveryTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
    marginTop: spacing[0.5],
  },
  recoveryExplanation: {
    ...typography.body,
    color: themeColors.textSecondary,
    lineHeight: 22,
    marginTop: spacing[1],
  },
  scoreContainer: {
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    ...typography.h1,
    color: themeColors.accent,
    fontWeight: '700',
  },
  scoreMax: {
    ...typography.h3,
    color: themeColors.textTertiary,
    marginLeft: spacing[1],
  },
  scoreCaption: {
    ...typography.caption,
    color: themeColors.textTertiary,
  },
  aiInsightCard: {
    marginBottom: spacing[4],
    backgroundColor: themeColors.cardBackground,
    borderColor: `${themeColors.accent}40`,
    borderWidth: 1,
  },
  aiInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  aiInsightTitle: {
    ...typography.h4,
    color: themeColors.accent,
  },
  aiInsightSummary: {
    ...typography.body,
    color: themeColors.textPrimary,
    lineHeight: 22,
  },
  guidanceSection: {
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  guidanceSectionTitle: {
    ...typography.caption,
    color: themeColors.textTertiary,
    letterSpacing: 1,
    marginBottom: spacing[2],
  },
  guidanceItem: {
    marginBottom: spacing[3],
    backgroundColor: themeColors.surface,
    padding: spacing[3],
    borderRadius: radius.md,
  },
  guidanceBadgeRow: {
    marginBottom: spacing[1],
  },
  guidanceText: {
    ...typography.body,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  guidanceReason: {
    ...typography.bodySecondary,
    color: themeColors.textSecondary,
    marginTop: spacing[1],
  },
  feedbackContainer: {
    marginTop: spacing[2],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  feedbackPrompt: {
    ...typography.caption,
    color: themeColors.textTertiary,
  },
  feedbackButtonsRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  feedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  feedbackBtnActive: {
    borderColor: themeColors.accent,
  },
  feedbackBtnText: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  feedbackBtnTextActive: {
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  sectionHeading: {
    ...typography.caption,
    color: themeColors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing[2],
    marginTop: spacing[2],
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  metricCard: {
    flex: 1,
  },
  correlationCard: {
    marginBottom: spacing[3],
    backgroundColor: themeColors.cardBackground,
  },
  correlationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  correlationTitle: {
    ...typography.h4,
    color: themeColors.textPrimary,
    textTransform: 'capitalize',
  },
  correlationSummary: {
    ...typography.body,
    color: themeColors.textSecondary,
    lineHeight: 20,
  },
  correlationDisclaimer: {
    ...typography.caption,
    color: themeColors.textTertiary,
    fontStyle: 'italic',
    marginTop: spacing[2],
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    padding: spacing[3],
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    marginTop: spacing[4],
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  disclaimerText: {
    ...typography.caption,
    color: themeColors.textTertiary,
    flex: 1,
    lineHeight: 18,
  },
});
