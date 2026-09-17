import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MemberStackParamList } from '../../../navigation/types';

import { themeColors, typography, radius, spacing } from '../../../theme';
import { Icon, Badge, Card } from '../../../components/primitives';
import {
  ExerciseService,
  CurriculumDetail,
} from '../services/exerciseService';

type RouteType = RouteProp<MemberStackParamList, 'CurriculumDetail'>;
type NavProp = NativeStackNavigationProp<MemberStackParamList>;

export const CurriculumDetailScreen: React.FC = () => {
  const route = useRoute<RouteType>();
  const navigation = useNavigation<NavProp>();
  const { curriculumId, title: initialTitle } = route.params;

  const [curriculum, setCurriculum] = useState<CurriculumDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ExerciseService.getCurriculumById(curriculumId);
      setCurriculum(res);
    } catch (err) {
      console.warn('Failed to load curriculum details:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [curriculumId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleOpenPath = (pathId: string, pathTitle: string) => {
    navigation.navigate('LearningPathOverview', {
      pathId,
      title: pathTitle,
    });
  };

  const handleOpenLesson = (pathId: string, lessonId: string, lessonTitle?: string) => {
    navigation.navigate('LearningLesson', {
      pathId,
      lessonId,
      title: lessonTitle,
    });
  };

  const percentComplete = curriculum?.percentComplete || 0;
  const isCompleted = percentComplete >= 100;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {curriculum?.title || initialTitle || 'Curriculum Syllabus'}
          </Text>
          <Text style={styles.headerSubtitle}>Academy Syllabus & Tracks</Text>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Loading syllabus...</Text>
        </View>
      ) : curriculum ? (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={themeColors.primary}
            />
          }
        >
          {/* Overview Hero Card */}
          <Card style={styles.heroCard}>
            <View style={styles.badgeRow}>
              <Badge
                label={curriculum.category?.replace(/_/g, ' ') || 'FUNDAMENTALS'}
                variant={isCompleted ? 'success' : 'primary'}
              />
              <Badge label={curriculum.difficulty || 'ALL LEVELS'} variant="neutral" />
            </View>

            <Text style={styles.heroTitle}>{curriculum.title}</Text>
            {curriculum.description && (
              <Text style={styles.heroDescription}>{curriculum.description}</Text>
            )}

            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Icon name="award" size={16} color={themeColors.primary} />
                <Text style={styles.metricValue}>{curriculum.pathCount}</Text>
                <Text style={styles.metricLabel}>Tracks</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <Icon name="award" size={16} color={themeColors.primary} />
                <Text style={styles.metricValue}>{curriculum.lessonCount}</Text>
                <Text style={styles.metricLabel}>Lessons</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <Icon
                  name={isCompleted ? 'check-circle' : 'activity'}
                  size={16}
                  color={isCompleted ? themeColors.success : themeColors.primary}
                />
                <Text style={styles.metricValue}>{percentComplete}%</Text>
                <Text style={styles.metricLabel}>Progress</Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${percentComplete}%` },
                  isCompleted && styles.progressBarFillCompleted,
                ]}
              />
            </View>
          </Card>

          {/* Tracks / Learning Paths List */}
          <View style={styles.syllabusSection}>
            <Text style={styles.syllabusHeading}>Curriculum Learning Tracks</Text>

            {curriculum.paths && curriculum.paths.length > 0 ? (
              curriculum.paths.map((path, pIdx) => (
                <Card key={path.id} style={styles.pathCard}>
                  <View style={styles.pathHeader}>
                    <View style={styles.pathStepIndicator}>
                      <Text style={styles.pathStepNumber}>{pIdx + 1}</Text>
                    </View>
                    <View style={styles.pathInfo}>
                      <Text style={styles.pathTitle}>{path.title}</Text>
                      {path.description && (
                        <Text style={styles.pathDesc} numberOfLines={2}>
                          {path.description}
                        </Text>
                      )}
                      <View style={styles.pathMetaRow}>
                        <Text style={styles.pathMeta}>
                          {path.estimatedMinutes} min • {path.difficulty}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Sections and Lessons Preview */}
                  {path.sections && path.sections.length > 0 && (
                    <View style={styles.sectionsList}>
                      {path.sections.map((sec) => (
                        <View key={sec.id} style={styles.sectionBlock}>
                          <Text style={styles.sectionTitle}>{sec.title}</Text>
                          {sec.lessons.map((les) => (
                            <TouchableOpacity
                              key={les.id}
                              style={styles.lessonRow}
                              activeOpacity={0.8}
                              onPress={() => handleOpenLesson(path.id, les.id, les.title)}
                            >
                              <View style={styles.lessonLeft}>
                                <Icon
                                  name={les.isCompleted ? 'check-circle' : 'activity'}
                                  size={16}
                                  color={les.isCompleted ? themeColors.success : themeColors.textSecondary}
                                />
                                <Text
                                  style={[
                                    styles.lessonTitle,
                                    les.isCompleted && styles.lessonTitleCompleted,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {les.title}
                                </Text>
                              </View>
                              <View style={styles.lessonRight}>
                                {les.hasKnowledgeCheck && (
                                  <Badge label="CHECK" variant="neutral" />
                                )}
                                <Text style={styles.lessonDuration}>{les.estimatedMinutes}m</Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Action Button */}
                  <TouchableOpacity
                    style={styles.openPathBtn}
                    activeOpacity={0.85}
                    onPress={() => handleOpenPath(path.id, path.title)}
                  >
                    <Text style={styles.openPathBtnText}>Explore Track Overview</Text>
                    <Icon name="chevron-right" size={14} color={themeColors.primary} />
                  </TouchableOpacity>
                </Card>
              ))
            ) : (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No Tracks Published Yet</Text>
              </Card>
            )}
          </View>
        </ScrollView>
      ) : null}
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
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h2,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  heroCard: {
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  heroTitle: {
    ...typography.h1,
    color: themeColors.textPrimary,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  heroDescription: {
    ...typography.bodySecondary,
    color: themeColors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  metricItem: {
    alignItems: 'center',
    gap: 2,
  },
  metricValue: {
    ...typography.h3,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  metricLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: themeColors.primary,
    borderRadius: radius.full,
  },
  progressBarFillCompleted: {
    backgroundColor: themeColors.success,
  },
  syllabusSection: {
    gap: spacing.md,
  },
  syllabusHeading: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pathCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: spacing.sm,
  },
  pathHeader: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pathStepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pathStepNumber: {
    ...typography.caption,
    color: themeColors.primary,
    fontWeight: '800',
  },
  pathInfo: {
    flex: 1,
  },
  pathTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  pathDesc: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  pathMetaRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  pathMeta: {
    ...typography.caption,
    color: themeColors.textTertiary,
    fontSize: 11,
  },
  sectionsList: {
    marginTop: spacing.xs,
    gap: spacing.xs + 2,
  },
  sectionBlock: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: spacing.xs + 2,
    borderRadius: radius.md,
    gap: 4,
  },
  sectionTitle: {
    ...typography.caption,
    color: themeColors.textTertiary,
    fontWeight: '700',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  lessonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  lessonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    flex: 1,
  },
  lessonTitle: {
    ...typography.bodySecondary,
    color: themeColors.textPrimary,
    fontSize: 13,
    flex: 1,
  },
  lessonTitleCompleted: {
    color: themeColors.textSecondary,
  },
  lessonRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lessonDuration: {
    ...typography.caption,
    color: themeColors.textTertiary,
    fontSize: 11,
  },
  openPathBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  openPathBtnText: {
    ...typography.caption,
    color: themeColors.primary,
    fontWeight: '700',
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    ...typography.bodySecondary,
    color: themeColors.textSecondary,
  },
});
