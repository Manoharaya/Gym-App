import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { themeColors, typography, radius, spacing } from '../../../theme';
import { Icon, Badge, IconName } from '../../../components/primitives';
import { RecommendedLearningHubItem } from '../services/exerciseService';

interface RecommendedLearningCardProps {
  item: RecommendedLearningHubItem;
  onPress: () => void;
}

export const RecommendedLearningCard: React.FC<RecommendedLearningCardProps> = ({
  item,
  onPress,
}) => {
  const getContentTypeLabel = () => {
    switch (item.contentType) {
      case 'LEARNING_PATH':
        return 'MASTERCLASS COURSE';
      case 'COLLECTION':
        return 'CURATED COLLECTION';
      case 'GUIDED_SESSION':
        return 'GUIDED PRACTICE SESSION';
      case 'EXERCISE':
        return 'INTERACTIVE TUTORIAL';
      default:
        return 'EDUCATIONAL MODULE';
    }
  };

  const getContentTypeIcon = (): IconName => {
    switch (item.contentType) {
      case 'LEARNING_PATH':
        return 'award';
      case 'COLLECTION':
        return 'trophy';
      case 'GUIDED_SESSION':
        return 'timer';
      case 'EXERCISE':
        return 'activity';
      default:
        return 'award';
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={onPress}
    >
      {/* Top Meta Row */}
      <View style={styles.topRow}>
        <View style={styles.typeContainer}>
          <Icon name={getContentTypeIcon()} size={12} color={themeColors.primary} />
          <Text style={styles.typeText}>{getContentTypeLabel()}</Text>
        </View>

        {item.difficulty && (
          <Badge label={item.difficulty} variant="neutral" />
        )}
      </View>

      {/* Main Title & Description */}
      <Text style={styles.title} numberOfLines={2}>
        {item.title}
      </Text>

      {item.description && (
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      {/* Transparent Recommendation Reason Banner */}
      <View style={styles.reasonBanner}>
        <View style={styles.reasonHalo}>
          <Icon name="bolt" size={12} color="#f59e0b" />
        </View>
        <Text style={styles.reasonText} numberOfLines={1}>
          {item.reasonText}
        </Text>
      </View>

      {/* Footer / Action */}
      <View style={styles.footerRow}>
        {item.estimatedMinutes ? (
          <View style={styles.durationRow}>
            <Icon name="clock" size={13} color={themeColors.textTertiary} />
            <Text style={styles.durationText}>{item.estimatedMinutes} mins</Text>
          </View>
        ) : (
          <View />
        )}

        <View style={styles.actionPrompt}>
          <Text style={styles.actionText}>Start Learning</Text>
          <Icon name="chevron-right" size={14} color={themeColors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 280,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginRight: spacing.md,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs + 2,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: themeColors.primary,
  },
  title: {
    color: themeColors.textPrimary,
    fontSize: typography.body1.fontSize,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 22,
  },
  description: {
    color: themeColors.textTertiary,
    fontSize: typography.caption.fontSize,
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  reasonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    marginVertical: spacing.xs,
  },
  reasonHalo: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fbbf24',
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: typography.caption.fontSize,
    color: themeColors.textTertiary,
  },
  actionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
    color: themeColors.primary,
  },
});
