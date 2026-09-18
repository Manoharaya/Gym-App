import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { themeColors, radius, spacing } from '../../../theme';
import { Icon, Badge, BadgeVariant } from '../../../components/primitives';
import { LearningGapItem } from '../services/exerciseService';

interface LearningGapCardProps {
  gap: LearningGapItem;
  onReview?: (gap: LearningGapItem) => void;
  onResolve?: (gap: LearningGapItem) => void;
}

export const LearningGapCard: React.FC<LearningGapCardProps> = ({
  gap,
  onReview,
  onResolve,
}) => {
  const getPriorityVariant = (priority: string): BadgeVariant => {
    switch (priority) {
      case 'HIGH':
        return 'danger';
      case 'MEDIUM':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const getGapTypeLabel = (type: string): string => {
    switch (type) {
      case 'INCOMPLETE':
        return 'Incomplete Lesson';
      case 'UNREVIEWED_PHASE':
        return 'Unreviewed Phase';
      case 'LOW_KNOWLEDGE_CHECK_RESULT':
        return 'Quiz Review';
      case 'MISSED_PREREQUISITE':
        return 'Prerequisite Required';
      case 'REPEATED_REVIEW':
        return 'Targeted Rehearsal';
      case 'ABANDONED':
        return 'Paused Session';
      case 'STALE_LEARNING':
        return 'Refresh Recommended';
      default:
        return 'Review Topic';
    }
  };

  const getActionTitle = (type: string): string => {
    switch (type) {
      case 'UNREVIEWED_PHASE':
        return 'Review Phase';
      case 'INCOMPLETE':
        return 'Continue Tutorial';
      case 'LOW_KNOWLEDGE_CHECK_RESULT':
        return 'Retake Quiz';
      case 'MISSED_PREREQUISITE':
        return 'Learn Prerequisite';
      default:
        return 'Start Practice';
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.cardBackground,
          borderColor: themeColors.border,
          borderRadius: radius.md,
          padding: spacing.md,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <Badge
            label={getGapTypeLabel(gap.gapType)}
            variant="neutral"
          />
          <Badge
            label={`${gap.priority} PRIORITY`}
            variant={getPriorityVariant(gap.priority)}
          />
        </View>
        {onResolve && (
          <TouchableOpacity
            onPress={() => onResolve(gap)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Dismiss review suggestion"
          >
            <Icon name="close" size={16} color={themeColors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: themeColors.textPrimary }]}>
          {gap.phaseName || gap.exerciseName || 'Technique Concept'}
        </Text>
        {gap.exerciseName && gap.phaseName && (
          <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
            {gap.exerciseName}
          </Text>
        )}

        <View style={[styles.reasonContainer, { backgroundColor: themeColors.elevatedBackground, borderRadius: radius.sm }]}>
          <Icon name="sparkles" size={14} color={themeColors.primary} style={styles.reasonIcon} />
          <Text style={[styles.reasonText, { color: themeColors.textSecondary }]}>
            {gap.reason}
          </Text>
        </View>
      </View>

      {onReview && (
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              backgroundColor: themeColors.primary,
              borderRadius: radius.sm,
            },
          ]}
          onPress={() => onReview(gap)}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>
            {getActionTitle(gap.gapType)}
          </Text>
          <Icon name="chevron-right" size={14} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    marginVertical: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  content: {
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 8,
  },
  reasonContainer: {
    flexDirection: 'row',
    padding: 8,
    alignItems: 'flex-start',
    marginTop: 4,
  },
  reasonIcon: {
    marginRight: 6,
    marginTop: 2,
  },
  reasonText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    gap: 6,
    marginTop: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
