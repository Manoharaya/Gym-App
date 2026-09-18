import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import type { GuidedSessionSummary } from '../services/exerciseService';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
};

interface GuidedSessionCardProps {
  session: GuidedSessionSummary;
  onPress: () => void;
  onContinue?: () => void;
}

export const GuidedSessionCard: React.FC<GuidedSessionCardProps> = ({
  session,
  onPress,
  onContinue,
}) => {
  const isCompleted = session.userProgress?.status === 'COMPLETED';
  const isInProgress = session.userProgress?.status === 'IN_PROGRESS';
  const percent = session.userProgress?.percentComplete || 0;

  return (
    <Card style={styles.card}>
      <TouchableOpacity activeOpacity={0.88} onPress={onPress}>
        {/* Cover Media or Fallback Graphic */}
        <View style={styles.mediaContainer}>
          {session.coverMediaUrl ? (
            <Image
              source={{ uri: session.coverMediaUrl }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderMedia}>
              <Icon name="dumbbell" size={36} color={themeColors.accent} />
            </View>
          )}

          {/* Badges Overlay */}
          <View style={styles.badgeOverlay}>
            <Badge
              label={session.difficulty}
              variant={
                session.difficulty === 'ADVANCED'
                  ? 'danger'
                  : session.difficulty === 'INTERMEDIATE'
                  ? 'warning'
                  : 'success'
              }
            />
            {session.category && (
              <Badge label={session.category} variant="accent" />
            )}
          </View>

          {isCompleted && (
            <View style={styles.completedBadgeOverlay}>
              <Badge label="COMPLETED" variant="success" />
            </View>
          )}
        </View>

        {/* Content Details */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {session.title}
          </Text>

          {session.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {session.description}
            </Text>
          ) : null}

          {/* Metadata Row */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Icon name="clock" size={14} color={themeColors.textMuted} />
              <Text style={styles.metaText}>
                {session.estimatedDurationMinutes} min
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Icon name="activity" size={14} color={themeColors.textMuted} />
              <Text style={styles.metaText}>
                {session.itemCount} steps
              </Text>
            </View>

            {session.exerciseCount > 0 && (
              <View style={styles.metaItem}>
                <Icon name="award" size={14} color={themeColors.textMuted} />
                <Text style={styles.metaText}>
                  {session.exerciseCount} {session.exerciseCount === 1 ? 'exercise' : 'exercises'}
                </Text>
              </View>
            )}
          </View>

          {/* Progress Bar (if started) */}
          {(isInProgress || isCompleted) && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressText}>
                  {isCompleted
                    ? 'Session Completed'
                    : `Step ${((session.userProgress?.currentStepIndex || 0) + 1)} of ${session.itemCount}`}
                </Text>
                <Text style={styles.progressPercent}>{percent}%</Text>
              </View>
              <View style={styles.progressBarBackground}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.max(5, Math.min(100, percent))}%` },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Action CTA */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                isInProgress ? styles.continueButton : styles.startButton,
              ]}
              onPress={onContinue || onPress}
              activeOpacity={0.8}
            >
              <Icon
                name={isCompleted ? 'refresh' : isInProgress ? 'activity' : 'sparkles'}
                size={16}
                color="#FFFFFF"
              />
              <Text style={styles.actionButtonText}>
                {isCompleted
                  ? 'Review Session'
                  : isInProgress
                  ? 'Continue Learning'
                  : 'Start Guided Session'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: sp.md,
    borderRadius: radius.lg,
    backgroundColor: themeColors.cardBackground,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  mediaContainer: {
    width: '100%',
    height: 150,
    backgroundColor: '#0F131C',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderMedia: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#161C28',
  },
  badgeOverlay: {
    position: 'absolute',
    top: sp.sm,
    left: sp.sm,
    flexDirection: 'row',
    gap: sp.xs,
  },
  completedBadgeOverlay: {
    position: 'absolute',
    top: sp.sm,
    right: sp.sm,
  },
  content: {
    padding: sp.md,
  },
  title: {
    ...typography.h3,
    color: themeColors.textPrimary,
    marginBottom: sp.xs,
  },
  description: {
    ...typography.bodySmall,
    color: themeColors.textMuted,
    marginBottom: sp.sm,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    marginBottom: sp.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  progressContainer: {
    marginTop: sp.xs,
    marginBottom: sp.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressText: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  progressPercent: {
    ...typography.caption,
    color: themeColors.accent,
    fontWeight: '700',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#1E2638',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: themeColors.accent,
    borderRadius: 3,
  },
  actionRow: {
    marginTop: sp.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.sm,
    paddingVertical: 10,
    paddingHorizontal: sp.md,
    borderRadius: radius.md,
  },
  startButton: {
    backgroundColor: themeColors.accent,
  },
  continueButton: {
    backgroundColor: '#2563EB',
  },
  actionButtonText: {
    ...typography.button,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
