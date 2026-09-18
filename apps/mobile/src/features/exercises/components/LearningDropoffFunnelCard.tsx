import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Card, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import type { ContentMasteryAnalytics } from '../services/exerciseService';

export interface LearningDropoffFunnelCardProps {
  analytics: ContentMasteryAnalytics;
  style?: StyleProp<ViewStyle>;
}

export const LearningDropoffFunnelCard: React.FC<LearningDropoffFunnelCardProps> = ({
  analytics,
  style,
}) => {
  const formatTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0m';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <Card style={[styles.container, style]}>
      {/* Title & Stats Summary */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Educational Engagement Funnel</Text>
          <Text style={styles.contentTitle} numberOfLines={1}>
            {analytics.contentTitle || 'Tutorial Breakdown'}
          </Text>
        </View>

        <View style={styles.rateBox}>
          <Text style={styles.rateValue}>{analytics.completionRate}%</Text>
          <Text style={styles.rateLabel}>Completion</Text>
        </View>
      </View>

      {/* Overview Metric Pills */}
      <View style={styles.pillRow}>
        <View style={styles.pill}>
          <Icon name="users" size={12} color={themeColors.textSecondary} />
          <Text style={styles.pillText}>
            {analytics.uniqueLearnersCount} {analytics.uniqueLearnersCount === 1 ? 'Learner' : 'Learners'}
          </Text>
        </View>

        <View style={styles.pill}>
          <Icon name="clock" size={12} color={themeColors.textSecondary} />
          <Text style={styles.pillText}>
            Avg {formatTime(analytics.averageTimeSpentSeconds)}
          </Text>
        </View>

        {analytics.knowledgeCheckPassRate !== null &&
          analytics.knowledgeCheckPassRate !== undefined && (
            <View style={styles.pill}>
              <Icon name="check-circle" size={12} color={themeColors.success} />
              <Text style={styles.pillText}>
                {analytics.knowledgeCheckPassRate}% Pass Rate
              </Text>
            </View>
          )}

        <View style={styles.pill}>
          <Icon name="alert-circle" size={12} color={themeColors.warning} />
          <Text style={styles.pillText}>
            {analytics.reviewRate}% In Review
          </Text>
        </View>
      </View>

      {/* Funnel Stages */}
      <View style={styles.funnelSection}>
        <Text style={styles.funnelHeader}>Stage Retention Progression</Text>
        {analytics.dropoffFunnel.map((stage, idx) => {
          const isHighest = stage.percentage >= 80;
          const isMid = stage.percentage >= 50 && stage.percentage < 80;

          return (
            <View key={stage.stage || idx} style={styles.stageRow}>
              <View style={styles.stageLabelCol}>
                <Text style={styles.stageName} numberOfLines={1}>
                  {stage.stage}
                </Text>
                <Text style={styles.stageCount}>
                  {stage.count} {stage.count === 1 ? 'learner' : 'learners'}
                </Text>
              </View>

              <View style={styles.barCol}>
                <View style={styles.barBackground}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${Math.min(100, Math.max(3, stage.percentage))}%` },
                      isHighest
                        ? styles.fillSuccess
                        : isMid
                        ? styles.fillPrimary
                        : styles.fillWarning,
                    ]}
                  />
                </View>
              </View>

              <View style={styles.percentCol}>
                <Text style={styles.percentText}>{stage.percentage}%</Text>
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing[3],
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  title: {
    ...typography.subtitle,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  contentTitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
    maxWidth: 220,
  },
  rateBox: {
    alignItems: 'flex-end',
    backgroundColor: themeColors.surfaceActive,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
  },
  rateValue: {
    ...typography.subtitle,
    fontWeight: '800',
    color: themeColors.success,
  },
  rateLabel: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.textSecondary,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
    marginBottom: spacing[3],
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: themeColors.surfaceActive,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  pillText: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textSecondary,
  },
  funnelSection: {
    marginTop: spacing[1],
  },
  funnelHeader: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginBottom: spacing[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 10,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  stageLabelCol: {
    width: 120,
    paddingRight: spacing[1],
  },
  stageName: {
    ...typography.caption,
    fontWeight: '600',
    color: themeColors.textPrimary,
    fontSize: 11,
  },
  stageCount: {
    ...typography.caption,
    fontSize: 9,
    color: themeColors.textMuted,
  },
  barCol: {
    flex: 1,
    paddingHorizontal: spacing[1],
  },
  barBackground: {
    height: 8,
    backgroundColor: themeColors.surfaceActive,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  fillSuccess: {
    backgroundColor: themeColors.success,
  },
  fillPrimary: {
    backgroundColor: themeColors.primary,
  },
  fillWarning: {
    backgroundColor: themeColors.warning,
  },
  percentCol: {
    width: 44,
    alignItems: 'flex-end',
  },
  percentText: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.textPrimary,
    fontSize: 11,
  },
});
