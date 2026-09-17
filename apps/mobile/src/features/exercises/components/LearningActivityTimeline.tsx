import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { themeColors, typography, radius, spacing } from '../../../theme';
import { Card, Icon } from '../../../components/primitives';
import type { LearningActivityItem } from '../services/exerciseService';

export interface LearningActivityTimelineProps {
  activities: LearningActivityItem[];
}

export const LearningActivityTimeline: React.FC<LearningActivityTimelineProps> = ({
  activities,
}) => {
  const formatTimeAgo = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / 3600000);
        if (diffHours === 0) {
          const diffMins = Math.max(1, Math.floor(diffMs / 60000));
          return `${diffMins}m ago`;
        }
        return `${diffHours}h ago`;
      }
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'LESSON_COMPLETED':
        return { name: 'check-circle' as const, color: themeColors.success };
      case 'PATH_COMPLETED':
        return { name: 'award' as const, color: themeColors.primary };
      case 'PATH_STARTED':
        return { name: 'activity' as const, color: themeColors.accent };
      case 'EXERCISE_LEARNED':
        return { name: 'dumbbell' as const, color: themeColors.primary };
      default:
        return { name: 'bolt' as const, color: themeColors.textSecondary };
    }
  };

  if (!activities || activities.length === 0) {
    return (
      <Card style={styles.card}>
        <View style={styles.emptyContainer}>
          <Icon name="clock" size={20} color={themeColors.textSecondary} />
          <Text style={styles.emptyText}>No learning activity recorded yet.</Text>
          <Text style={styles.emptySubtext}>
            Complete your first guided lesson to start your timeline.
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.headerTitle}>RECENT LEARNING ACTIVITY</Text>

      <View style={styles.timelineList}>
        {activities.map((item, index) => {
          const isLast = index === activities.length - 1;
          const iconMeta = getActivityIcon(item.type);

          return (
            <View key={item.id || index} style={styles.timelineRow}>
              {/* Left Column with Icon and Vertical Line */}
              <View style={styles.indicatorCol}>
                <View style={styles.iconCircle}>
                  <Icon name={iconMeta.name} size={14} color={iconMeta.color} />
                </View>
                {!isLast && <View style={styles.verticalLine} />}
              </View>

              {/* Right Column with Content */}
              <View style={[styles.contentCol, !isLast && styles.contentColBorder]}>
                <View style={styles.contentHeader}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.timestampText}>{formatTimeAgo(item.timestamp)}</Text>
                </View>
                <Text style={styles.itemSubtitle} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: themeColors.cardBackground,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    color: themeColors.textSecondary,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  timelineList: {
    paddingLeft: 4,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  indicatorCol: {
    alignItems: 'center',
    width: 28,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalLine: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 4,
  },
  contentCol: {
    flex: 1,
    paddingLeft: spacing.sm,
    paddingBottom: spacing.md,
  },
  contentColBorder: {
    paddingBottom: spacing.md,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs,
  },
  itemTitle: {
    ...typography.subtitle,
    fontSize: 14,
    fontWeight: '700',
    color: themeColors.textPrimary,
    flex: 1,
  },
  timestampText: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textSecondary,
  },
  itemSubtitle: {
    ...typography.caption,
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: 4,
  },
  emptyText: {
    ...typography.subtitle,
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginTop: spacing.xs,
  },
  emptySubtext: {
    ...typography.caption,
    fontSize: 12,
    color: themeColors.textSecondary,
    textAlign: 'center',
  },
});
