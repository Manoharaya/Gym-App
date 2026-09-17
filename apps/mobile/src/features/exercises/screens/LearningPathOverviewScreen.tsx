import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { themeColors, typography, radius, spacing } from '../../../theme';
import { Card, Icon, Badge, Button } from '../../../components/primitives';
import {
  ExerciseService,
  LearningPathDetail,
} from '../services/exerciseService';
import type { MemberStackParamList } from '../../../navigation/types';

type RouteType = RouteProp<MemberStackParamList, 'LearningPathOverview'>;
type NavProp = NativeStackNavigationProp<MemberStackParamList>;

export const LearningPathOverviewScreen: React.FC = () => {
  const route = useRoute<RouteType>();
  const navigation = useNavigation<NavProp>();
  const { pathId } = route.params;

  const [path, setPath] = useState<LearningPathDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  const loadPath = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ExerciseService.getLearningPathById(pathId);
      setPath(res);
    } catch (err) {
      console.warn('Failed to load learning path detail:', err);
    } finally {
      setLoading(false);
    }
  }, [pathId]);

  useEffect(() => {
    loadPath();
  }, [loadPath]);

  const handleOpenLesson = (lessonId: string, lessonTitle?: string) => {
    navigation.navigate('LearningLesson', {
      pathId,
      lessonId,
      title: lessonTitle,
    });
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Path Progress',
      'Are you sure you want to clear your completed lessons and start this masterclass from the beginning?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Progress',
          style: 'destructive',
          onPress: async () => {
            try {
              setResetting(true);
              await ExerciseService.resetLearningPath(pathId);
              await loadPath();
            } catch (err) {
              console.warn('Failed to reset path:', err);
            } finally {
              setResetting(false);
            }
          },
        },
      ],
    );
  };

  if (loading || !path) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>Loading masterclass curriculum...</Text>
      </View>
    );
  }

  const isCompleted = path.progress?.status === 'COMPLETED';
  const isInProgress = path.progress?.status === 'IN_PROGRESS';
  const percentComplete = path.progress?.percentComplete || 0;
  const completedLessons = path.progress?.completedLessons || 0;
  const totalLessons = path.lessonCount || path.lessons.length;
  const nextLessonId = path.nextLessonId || path.lessons[0]?.id;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerBarTitle} numberOfLines={1}>
          {path.title}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Masterclass Hero Header */}
        <View style={styles.heroCard}>
          <View style={styles.badgeRow}>
            {path.category && (
              <Badge
                label={path.category.replace(/_/g, ' ')}
                variant="primary"
              />
            )}
            <Badge label={path.difficulty.replace(/_/g, ' ')} variant="neutral" />
            {path.primaryGoal && (
              <Badge label={path.primaryGoal.replace(/_/g, ' ')} variant="neutral" />
            )}
          </View>

          <Text style={styles.heroTitle}>{path.title}</Text>

          {path.description ? (
            <Text style={styles.heroDescription}>{path.description}</Text>
          ) : null}

          {/* Progress Overview Card */}
          <View style={styles.progressOverviewBox}>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.max(4, percentComplete)}%` },
                  isCompleted && styles.progressBarFillCompleted,
                ]}
              />
            </View>

            <View style={styles.progressStatRow}>
              <View style={styles.statusIndicator}>
                {isCompleted ? (
                  <>
                    <Icon name="check-circle" size={14} color={themeColors.success} />
                    <Text style={[styles.statusText, { color: themeColors.success }]}>
                      Mastery Complete (100%)
                    </Text>
                  </>
                ) : isInProgress ? (
                  <>
                    <Icon name="activity" size={14} color={themeColors.primary} />
                    <Text style={[styles.statusText, { color: themeColors.primary }]}>
                      {completedLessons} of {totalLessons} Lessons Finished
                    </Text>
                  </>
                ) : (
                  <>
                    <Icon name="award" size={14} color={themeColors.textSecondary} />
                    <Text style={styles.statusText}>{totalLessons} Lessons in Path</Text>
                  </>
                )}
              </View>

              {(isInProgress || isCompleted) && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleReset}
                  disabled={resetting}
                  style={styles.resetButton}
                >
                  <Icon name="refresh" size={12} color={themeColors.textSecondary} />
                  <Text style={styles.resetText}>Reset Progress</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.metaStatRow}>
            <View style={styles.statBox}>
              <Icon name="clock" size={14} color={themeColors.textSecondary} />
              <Text style={styles.statLabel}>{path.estimatedDurationMinutes} Minutes Total</Text>
            </View>
            <View style={styles.statBox}>
              <Icon name="activity" size={14} color={themeColors.accent} />
              <Text style={styles.statLabel}>{path.exerciseCount} Exercises Taught</Text>
            </View>
          </View>
        </View>

        {/* Structured Syllabus by Section */}
        <View style={styles.syllabusContainer}>
          <Text style={styles.syllabusHeading}>PATH SYLLABUS</Text>

          {path.sections && path.sections.length > 0 ? (
            path.sections.map((section, sIdx) => (
              <View key={section.id || sIdx} style={styles.sectionGroup}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
                  {section.description ? (
                    <Text style={styles.sectionDesc}>{section.description}</Text>
                  ) : null}
                </View>

                {section.lessons.map((lesson, lIdx) => (
                  <TouchableOpacity
                    key={lesson.id || lIdx}
                    activeOpacity={0.8}
                    onPress={() => handleOpenLesson(lesson.id, lesson.title)}
                    style={styles.lessonCardContainer}
                  >
                    <Card style={[styles.lessonCard, lesson.isCompleted && styles.lessonCardDone]}>
                      <View style={styles.lessonLeftBox}>
                        {lesson.isCompleted ? (
                          <View style={styles.doneCircle}>
                            <Icon name="check" size={14} color="#FFFFFF" />
                          </View>
                        ) : lesson.id === nextLessonId ? (
                          <View style={styles.nextCircle}>
                            <Icon name="activity" size={12} color={themeColors.primary} />
                          </View>
                        ) : (
                          <View style={styles.pendingCircle}>
                            <Text style={styles.orderNumber}>{lesson.sortOrder + 1}</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.lessonMainContent}>
                        <View style={styles.lessonTypeRow}>
                          <Text style={styles.lessonTypeBadge}>
                            {lesson.lessonType.replace(/_/g, ' ')}
                          </Text>
                          <Text style={styles.lessonEstTime}>{lesson.estimatedMinutes}m</Text>
                        </View>
                        <Text style={styles.lessonTitle} numberOfLines={2}>
                          {lesson.title}
                        </Text>
                        {lesson.exercise && (
                          <Text style={styles.lessonExerciseTag} numberOfLines={1}>
                            Taught Lift: {lesson.exercise.name}
                          </Text>
                        )}
                      </View>

                      <Icon name="chevron-right" size={16} color={themeColors.textSecondary} />
                    </Card>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          ) : (
            // Flat lessons fallback
            <View style={styles.sectionGroup}>
              {path.lessons.map((lesson, lIdx) => (
                <TouchableOpacity
                  key={lesson.id || lIdx}
                  activeOpacity={0.8}
                  onPress={() => handleOpenLesson(lesson.id, lesson.title)}
                  style={styles.lessonCardContainer}
                >
                  <Card style={[styles.lessonCard, lesson.isCompleted && styles.lessonCardDone]}>
                    <View style={styles.lessonLeftBox}>
                      {lesson.isCompleted ? (
                        <View style={styles.doneCircle}>
                          <Icon name="check" size={14} color="#FFFFFF" />
                        </View>
                      ) : (
                        <View style={styles.pendingCircle}>
                          <Text style={styles.orderNumber}>{lIdx + 1}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.lessonMainContent}>
                      <Text style={styles.lessonTitle} numberOfLines={2}>
                        {lesson.title}
                      </Text>
                      <Text style={styles.lessonEstTime}>{lesson.estimatedMinutes} min</Text>
                    </View>

                    <Icon name="chevron-right" size={16} color={themeColors.textSecondary} />
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Button */}
      {nextLessonId && (
        <View style={styles.bottomBar}>
          <Button
            title={
              isCompleted
                ? 'Review From Beginning'
                : isInProgress
                ? 'Continue Learning'
                : 'Start Guided Masterclass'
            }
            variant="primary"
            size="lg"
            onPress={() => {
              const targetLessonId = isCompleted ? (path.lessons[0]?.id || nextLessonId) : nextLessonId;
              const targetLessonTitle = isCompleted ? path.lessons[0]?.title : undefined;
              if (targetLessonId) {
                handleOpenLesson(targetLessonId, targetLessonTitle);
              }
            }}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: themeColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerBarTitle: {
    ...typography.subtitle,
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.textPrimary,
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + 40,
  },
  heroCard: {
    backgroundColor: themeColors.cardBackground,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginBottom: spacing.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  heroTitle: {
    ...typography.title,
    fontSize: 22,
    fontWeight: '800',
    color: themeColors.textPrimary,
    marginBottom: spacing.xs,
  },
  heroDescription: {
    ...typography.body,
    fontSize: 14,
    color: themeColors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  progressOverviewBox: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: themeColors.primary,
    borderRadius: radius.full,
  },
  progressBarFillCompleted: {
    backgroundColor: themeColors.success,
  },
  progressStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: themeColors.textSecondary,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  resetText: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textSecondary,
  },
  metaStatRow: {
    flexDirection: 'row',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: spacing.sm,
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 12,
    color: themeColors.textSecondary,
  },
  syllabusContainer: {
    marginBottom: spacing.lg,
  },
  syllabusHeading: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    color: themeColors.textSecondary,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  sectionGroup: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: themeColors.primary,
    letterSpacing: 0.8,
  },
  sectionDesc: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  lessonCardContainer: {
    marginVertical: 4,
  },
  lessonCard: {
    backgroundColor: themeColors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lessonCardDone: {
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  lessonLeftBox: {
    marginRight: spacing.sm,
  },
  doneCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: themeColors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderWidth: 1,
    borderColor: themeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderNumber: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: themeColors.textSecondary,
  },
  lessonMainContent: {
    flex: 1,
  },
  lessonTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  lessonTypeBadge: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.accent,
    letterSpacing: 0.5,
  },
  lessonEstTime: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.textSecondary,
  },
  lessonTitle: {
    ...typography.subtitle,
    fontSize: 15,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  lessonExerciseTag: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.primary,
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: themeColors.surface,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.background,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.body,
    fontSize: 14,
    color: themeColors.textSecondary,
  },
});
