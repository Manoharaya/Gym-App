import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import type {
  PersonalizedTutorialPlan,
  LearningDepth,
  PersonalizedTutorialMode,
} from '../services/exerciseService';

interface PersonalizedLearningBannerProps {
  plan: PersonalizedTutorialPlan;
  onOpenSettings?: () => void;
  onSelectDepth?: (depth: LearningDepth) => void;
  onSelectMode?: (mode: PersonalizedTutorialMode) => void;
  onStartTargetedReview?: () => void;
}

export const PersonalizedLearningBanner: React.FC<PersonalizedLearningBannerProps> = ({
  plan,
  onOpenSettings,
  onSelectDepth,
  onSelectMode,
  onStartTargetedReview,
}) => {
  const getDepthColor = (depth: LearningDepth) => {
    switch (depth) {
      case 'BASIC':
        return '#38BDF8';
      case 'STANDARD':
        return '#4ADE80';
      case 'DETAILED':
        return '#FBBF24';
      case 'ADVANCED':
        return '#A855F7';
      default:
        return themeColors.primary;
    }
  };

  const getModeLabel = (mode: PersonalizedTutorialMode) => {
    switch (mode) {
      case 'QUICK_LEARN':
        return 'Quick Learn';
      case 'STEP_BY_STEP':
        return 'Step-by-Step';
      case 'MOVEMENT_BREAKDOWN':
        return 'Movement Breakdown';
      case 'TECHNIQUE_CHECKLIST':
        return 'Technique Checklist';
      case 'PERSONALIZED':
      default:
        return 'Adaptive Path';
    }
  };

  return (
    <Card style={styles.card}>
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <View style={styles.iconContainer}>
            <Icon name="sparkles" size={18} color="#F59E0B" />
          </View>
          <View>
            <Text style={styles.title}>Personalized Learning</Text>
            <Text style={styles.subtitle}>
              {plan.isCustomOverride ? 'Custom Member Preferences' : 'Adaptive Recommendation'}
            </Text>
          </View>
        </View>

        {onOpenSettings && (
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={onOpenSettings}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Customize tutorial personalization"
          >
            <Icon name="settings" size={15} color={themeColors.textSecondary} />
            <Text style={styles.settingsButtonText}>Customize</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Badges & Meta Row */}
      <View style={styles.badgeRow}>
        <TouchableOpacity
          disabled={!onSelectDepth}
          onPress={() => onSelectDepth?.(plan.learningDepth)}
          activeOpacity={0.8}
        >
          <Badge
            label={`Depth: ${plan.learningDepth}`}
            variant="neutral"
            style={[styles.badge, { borderColor: getDepthColor(plan.learningDepth) }]}
          />
        </TouchableOpacity>

        <TouchableOpacity
          disabled={!onSelectMode}
          onPress={() => onSelectMode?.(plan.recommendedMode)}
          activeOpacity={0.8}
        >
          <Badge
            label={`Mode: ${getModeLabel(plan.recommendedMode)}`}
            variant="neutral"
            style={styles.badge}
          />
        </TouchableOpacity>

        {plan.playbackSpeed !== 1 && (
          <Badge
            label={`${plan.playbackSpeed}x Speed`}
            variant="neutral"
            style={styles.badge}
          />
        )}

        {plan.preferredAngle !== 'AUTO' && (
          <Badge
            label={`View: ${plan.preferredAngle}`}
            variant="neutral"
            style={styles.badge}
          />
        )}
      </View>

      {/* Explanation Text */}
      {plan.personalizationReason ? (
        <View style={styles.explanationContainer}>
          <Text style={styles.explanationText}>{plan.personalizationReason}</Text>
        </View>
      ) : null}

      {/* Targeted Review Callout if recommended */}
      {plan.targetedReviewRecommended && (
        <View style={styles.targetedReviewAlert}>
          <View style={styles.alertHeader}>
            <Icon name="alert-circle" size={16} color="#F59E0B" />
            <Text style={styles.alertTitle}>Targeted Review Recommended</Text>
          </View>
          <Text style={styles.alertBody}>
            {plan.personalizationReason ||
              'Based on your previous rehearsal, reviewing specific movement phases and avoidance cues will help solidify proper technique.'}
          </Text>
          {onStartTargetedReview && (
            <TouchableOpacity
              style={styles.reviewActionButton}
              onPress={onStartTargetedReview}
              activeOpacity={0.8}
            >
              <Icon name="refresh" size={14} color="#0F172A" />
              <Text style={styles.reviewActionText}>Open Targeted Review</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E293B',
    borderRadius: radius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.subtitle1,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  settingsButtonText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  explanationContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: spacing[3],
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: themeColors.primary,
  },
  explanationText: {
    ...typography.body2,
    color: '#CBD5E1',
    lineHeight: 20,
  },
  targetedReviewAlert: {
    marginTop: spacing[3],
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: radius.md,
    padding: spacing[3],
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  alertTitle: {
    ...typography.subtitle2,
    color: '#FBBF24',
    fontWeight: '700',
  },
  alertBody: {
    ...typography.body2,
    color: '#E2E8F0',
    marginBottom: spacing[3],
    lineHeight: 18,
  },
  reviewActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: '#F59E0B',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
  },
  reviewActionText: {
    ...typography.button,
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 13,
  },
});
