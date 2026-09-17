import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { themeColors, typography, radius, spacing } from '../../../theme';
import { Card, Icon, Badge, Button } from '../../../components/primitives';
import type { ResumePosition } from '../services/exerciseService';

export interface ContinueLearningHeroProps {
  resume: ResumePosition;
  onContinue: (pathId: string, lessonId: string, lessonTitle: string) => void;
  onViewPath?: (pathId: string, pathTitle: string) => void;
}

export const ContinueLearningHero: React.FC<ContinueLearningHeroProps> = ({
  resume,
  onContinue,
  onViewPath,
}) => {
  return (
    <Card style={styles.card}>
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={styles.headerTagRow}>
          <View style={styles.pulsingDot} />
          <Text style={styles.headerTagText}>CONTINUE LEARNING</Text>
        </View>

        {resume.category && (
          <Badge
            label={resume.category.replace(/_/g, ' ')}
            variant="primary"
          />
        )}
      </View>

      {/* Path Title & Overview */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onViewPath && onViewPath(resume.pathId, resume.pathTitle)}
      >
        <Text style={styles.pathTitle} numberOfLines={2}>
          {resume.pathTitle}
        </Text>
      </TouchableOpacity>

      {/* Progress Bar & Indicators */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.max(6, resume.percentComplete)}%` },
            ]}
          />
        </View>

        <View style={styles.progressLabelRow}>
          <Text style={styles.progressPctText}>{resume.percentComplete}% COMPLETE</Text>
          <Text style={styles.progressFractionText}>
            Lesson {resume.lessonNumber} of {resume.totalLessons}
          </Text>
        </View>
      </View>

      {/* Next Up Lesson Card Box */}
      <View style={styles.nextLessonBox}>
        <View style={styles.nextIconHalo}>
          <Icon name="bolt" size={16} color={themeColors.primary} />
        </View>
        <View style={styles.nextLessonContent}>
          <Text style={styles.nextLessonPre}>NEXT UP</Text>
          <Text style={styles.nextLessonTitle} numberOfLines={1}>
            {resume.lessonTitle}
          </Text>
          {resume.sectionTitle && (
            <Text style={styles.sectionTag} numberOfLines={1}>
              {resume.sectionTitle} · {resume.estimatedMinutes} min
            </Text>
          )}
        </View>
      </View>

      {/* Action Button */}
      <Button
        title={`Continue Lesson ${resume.lessonNumber}`}
        variant="primary"
        size="md"
        onPress={() => onContinue(resume.pathId, resume.lessonId, resume.lessonTitle)}
        rightIcon={<Icon name="chevron-right" size={16} color="#FFFFFF" />}
        style={styles.continueButton}
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: themeColors.cardBackground,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.25)',
    marginBottom: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: themeColors.primary,
  },
  headerTagText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    color: themeColors.primary,
    letterSpacing: 1,
  },
  pathTitle: {
    ...typography.title,
    fontSize: 18,
    fontWeight: '800',
    color: themeColors.textPrimary,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  progressContainer: {
    marginBottom: spacing.sm,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: themeColors.primary,
    borderRadius: radius.full,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressPctText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    color: themeColors.primary,
    letterSpacing: 0.5,
  },
  progressFractionText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: themeColors.textSecondary,
  },
  nextLessonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  nextIconHalo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextLessonContent: {
    flex: 1,
  },
  nextLessonPre: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: themeColors.textSecondary,
    letterSpacing: 0.8,
  },
  nextLessonTitle: {
    ...typography.subtitle,
    fontSize: 14,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  sectionTag: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textSecondary,
    marginTop: 1,
  },
  continueButton: {
    width: '100%',
  },
});
