import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Card, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import type { LearningMasterySummary } from '../services/exerciseService';

export interface LearningAnalyticsCardProps {
  summary: LearningMasterySummary;
  onReviewPress?: () => void;
  onViewAllPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const LearningAnalyticsCard: React.FC<LearningAnalyticsCardProps> = ({
  summary,
  onReviewPress,
  onViewAllPress,
  style,
}) => {
  const hasReviewItems = summary.reviewItems && summary.reviewItems.length > 0;

  return (
    <Card style={[styles.container, style]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Icon name="award" size={18} color={themeColors.accent} />
          </View>
          <View>
            <Text style={styles.title}>Learning Mastery Analytics</Text>
            <Text style={styles.subtitle}>Educational curriculum progression</Text>
          </View>
        </View>

        {onViewAllPress && (
          <TouchableOpacity
            onPress={onViewAllPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.linkText}>View Details</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Grid of Key Metrics */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>{summary.totalMastered}</Text>
          <Text style={styles.metricLabel}>Mastered</Text>
          <Text style={styles.metricSubtext}>Score &ge; 80%</Text>
        </View>

        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>{summary.totalLearned}</Text>
          <Text style={styles.metricLabel}>Completed</Text>
          <Text style={styles.metricSubtext}>All phases done</Text>
        </View>

        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>{summary.totalHoursLearned}h</Text>
          <Text style={styles.metricLabel}>Time Learned</Text>
          <Text style={styles.metricSubtext}>Tutorial hours</Text>
        </View>

        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>
            {summary.completedLearningPathsCount}/{summary.activeLearningPathsCount + summary.completedLearningPathsCount}
          </Text>
          <Text style={styles.metricLabel}>Paths Done</Text>
          <Text style={styles.metricSubtext}>Structured tracks</Text>
        </View>
      </View>

      {/* Review Queue Banner if items need review */}
      {hasReviewItems && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onReviewPress}
          style={styles.reviewBanner}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`${summary.reviewItems.length} exercises recommended for technique review`}
        >
          <View style={styles.reviewBannerLeft}>
            <Icon name="alert-circle" size={16} color={themeColors.warning} />
            <Text style={styles.reviewText}>
              <Text style={styles.reviewCountBold}>
                {summary.reviewItems.length}{' '}
                {summary.reviewItems.length === 1 ? 'item' : 'items'}
              </Text>{' '}
              recommended for concept review
            </Text>
          </View>
          <Icon name="chevron-right" size={14} color={themeColors.warning} />
        </TouchableOpacity>
      )}
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
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: themeColors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.subtitle,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
  },
  linkText: {
    ...typography.caption,
    fontWeight: '600',
    color: themeColors.primary,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  metricBox: {
    flex: 1,
    backgroundColor: themeColors.surfaceActive,
    borderRadius: radius.sm,
    padding: spacing[2],
    alignItems: 'center',
  },
  metricValue: {
    ...typography.title,
    fontWeight: '800',
    color: themeColors.textPrimary,
    fontSize: 18,
    lineHeight: 22,
  },
  metricLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: themeColors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  metricSubtext: {
    ...typography.caption,
    fontSize: 9,
    color: themeColors.textMuted,
    marginTop: 1,
  },
  reviewBanner: {
    marginTop: spacing[3],
    padding: spacing[2],
    backgroundColor: themeColors.warningBackground,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: themeColors.warning,
  },
  reviewBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  reviewText: {
    ...typography.caption,
    color: themeColors.warning,
    fontSize: 12,
    flex: 1,
  },
  reviewCountBold: {
    fontWeight: '700',
  },
});
