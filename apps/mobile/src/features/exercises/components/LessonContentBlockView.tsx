import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Card, Icon } from '../../../components/primitives';
import { themeColors, typography, radius, spacing } from '../../../theme';
import type { ContentBlock } from '../services/exerciseService';

interface LessonContentBlockViewProps {
  block: ContentBlock;
  onGlossaryPress?: (termSlug: string) => void;
  onExercisePress?: (exerciseId: string) => void;
  onMovementPatternPress?: (pattern: string) => void;
}

export const LessonContentBlockView: React.FC<LessonContentBlockViewProps> = ({
  block,
  onGlossaryPress,
  onExercisePress,
  onMovementPatternPress,
}) => {
  switch (block.type) {
    case 'CALLOUT': {
      const type = block.calloutType || 'KEY_POINT';
      const calloutConfig = {
        TIP: {
          icon: 'sparkles' as const,
          color: themeColors.success,
          bg: 'rgba(74, 222, 128, 0.08)',
          border: 'rgba(74, 222, 128, 0.25)',
          defaultTitle: 'Pro Tip',
        },
        SAFETY: {
          icon: 'alert-circle' as const,
          color: themeColors.danger,
          bg: 'rgba(239, 68, 68, 0.08)',
          border: 'rgba(239, 68, 68, 0.25)',
          defaultTitle: 'Safety Precaution',
        },
        KEY_POINT: {
          icon: 'bolt' as const,
          color: themeColors.primary,
          bg: 'rgba(56, 189, 248, 0.08)',
          border: 'rgba(56, 189, 248, 0.25)',
          defaultTitle: 'Key Concept',
        },
        DEFINITION: {
          icon: 'award' as const,
          color: '#a78bfa',
          bg: 'rgba(167, 139, 250, 0.08)',
          border: 'rgba(167, 139, 250, 0.25)',
          defaultTitle: 'Definition',
        },
      }[type];

      return (
        <View
          style={[
            styles.calloutContainer,
            { backgroundColor: calloutConfig.bg, borderColor: calloutConfig.border },
          ]}
        >
          <View style={styles.calloutHeader}>
            <Icon name={calloutConfig.icon} size={16} color={calloutConfig.color} />
            <Text style={[styles.calloutTitle, { color: calloutConfig.color }]}>
              {block.title || calloutConfig.defaultTitle}
            </Text>
          </View>
          {block.content && <Text style={styles.calloutText}>{block.content}</Text>}
        </View>
      );
    }

    case 'EXERCISE_REF': {
      return (
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!block.exerciseId || !onExercisePress}
          onPress={() => block.exerciseId && onExercisePress && onExercisePress(block.exerciseId)}
          style={styles.refContainer}
        >
          <Card style={styles.refCard}>
            <View style={styles.refCardLeft}>
              <View style={styles.refIconCircle}>
                <Icon name="dumbbell" size={16} color={themeColors.primary} />
              </View>
              <View style={styles.refTextGroup}>
                <Text style={styles.refMetaLabel}>REFERENCED EXERCISE</Text>
                <Text style={styles.refTitle}>{block.exerciseName || 'View Exercise'}</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={16} color={themeColors.textSecondary} />
          </Card>
        </TouchableOpacity>
      );
    }

    case 'MOVEMENT_REF': {
      const patternName = block.movementPattern?.replace(/_/g, ' ') || 'Movement Pattern';
      return (
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!onMovementPatternPress}
          onPress={() =>
            block.movementPattern && onMovementPatternPress && onMovementPatternPress(block.movementPattern)
          }
          style={styles.movementRefContainer}
        >
          <View style={styles.movementRefPill}>
            <Icon name="activity" size={14} color="#38bdf8" />
            <Text style={styles.movementRefLabel}>Movement Pattern:</Text>
            <Text style={styles.movementRefValue}>{patternName}</Text>
            <Icon name="chevron-right" size={12} color={themeColors.textTertiary} />
          </View>
        </TouchableOpacity>
      );
    }

    case 'GLOSSARY_REF': {
      const termDisplay = block.termDisplay || block.termSlug?.replace(/-/g, ' ') || 'Term';
      return (
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={!block.termSlug || !onGlossaryPress}
          onPress={() => block.termSlug && onGlossaryPress && onGlossaryPress(block.termSlug)}
          style={styles.glossaryRefContainer}
        >
          <View style={styles.glossaryRefPill}>
            <Icon name="alert-circle" size={14} color="#a78bfa" />
            <Text style={styles.glossaryRefTerm}>{termDisplay}</Text>
            {block.content && (
              <Text style={styles.glossaryRefSnippet} numberOfLines={1}>
                — {block.content}
              </Text>
            )}
            <Icon name="chevron-right" size={11} color="#a78bfa" />
          </View>
        </TouchableOpacity>
      );
    }

    case 'IMAGE': {
      if (!block.mediaUrl) return null;
      return (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: block.mediaUrl }}
            style={styles.image}
            resizeMode="cover"
            accessibilityLabel={block.caption || 'Educational illustration'}
          />
          {block.caption && <Text style={styles.captionText}>{block.caption}</Text>}
        </View>
      );
    }

    case 'VIDEO': {
      if (!block.mediaUrl) return null;
      return (
        <View style={styles.videoPlaceholder}>
          <Icon name="check-circle" size={36} color={themeColors.primary} />
          <Text style={styles.videoTitle}>{block.title || 'Instructional Video Clip'}</Text>
          {block.caption && <Text style={styles.captionText}>{block.caption}</Text>}
        </View>
      );
    }

    case 'TEXT':
    default: {
      return (
        <View style={styles.textContainer}>
          {block.title && <Text style={styles.textBlockHeading}>{block.title}</Text>}
          {block.content && <Text style={styles.textContent}>{block.content}</Text>}
        </View>
      );
    }
  }
};

const styles = StyleSheet.create({
  textContainer: {
    marginVertical: spacing.xs,
  },
  textBlockHeading: {
    ...typography.h3,
    color: themeColors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  textContent: {
    ...typography.body,
    color: themeColors.textPrimary,
    lineHeight: 22,
  },
  calloutContainer: {
    marginVertical: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 6,
  },
  calloutTitle: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calloutText: {
    ...typography.bodySecondary,
    color: themeColors.textPrimary,
    fontSize: 13,
    lineHeight: 19,
  },
  refContainer: {
    marginVertical: spacing.xs,
  },
  refCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  refCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  refIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refTextGroup: {
    flex: 1,
  },
  refMetaLabel: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  refTitle: {
    ...typography.body,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  movementRefContainer: {
    marginVertical: spacing.xs,
  },
  movementRefPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  movementRefLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 12,
  },
  movementRefValue: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  glossaryRefContainer: {
    marginVertical: spacing.xs,
  },
  glossaryRefPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(167, 139, 250, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.25)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  glossaryRefTerm: {
    ...typography.caption,
    color: '#c4b5fd',
    fontWeight: '700',
    fontSize: 12,
  },
  glossaryRefSnippet: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
    maxWidth: 160,
  },
  imageContainer: {
    marginVertical: spacing.sm,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  videoPlaceholder: {
    marginVertical: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  videoTitle: {
    ...typography.caption,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  captionText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
