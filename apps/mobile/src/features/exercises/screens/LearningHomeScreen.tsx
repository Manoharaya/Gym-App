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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MemberStackParamList } from '../../../navigation/types';

import { themeColors, typography, radius, spacing } from '../../../theme';
import { Icon, Badge, Card } from '../../../components/primitives';
import {
  ExerciseService,
  LearningDashboardResponse,
} from '../services/exerciseService';
import {
  ContinueLearningHero,
  LearningStatCard,
  LearningStreakCard,
  LearningActivityTimeline,
} from '../components';

type NavProp = NativeStackNavigationProp<MemberStackParamList>;

export const LearningHomeScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();

  const [dashboard, setDashboard] = useState<LearningDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ExerciseService.getLearningDashboard();
      setDashboard(res);
    } catch (err) {
      console.warn('Failed to load learning dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const handleContinueLesson = (pathId: string, lessonId: string, lessonTitle?: string) => {
    navigation.navigate('LearningLesson', {
      pathId,
      lessonId,
      title: lessonTitle,
    });
  };

  const handleOpenPathOverview = (pathId: string, title?: string) => {
    navigation.navigate('LearningPathOverview', {
      pathId,
      title,
    });
  };

  const handleOpenExercise = (exerciseId: string, exerciseName?: string) => {
    navigation.navigate('ExerciseDetail', {
      exerciseId,
      exerciseName,
    });
  };

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>My Learning Hub</Text>
          <Text style={styles.headerSubtitle}>Mastery, Curriculum & Progress</Text>
        </View>

        <TouchableOpacity
          style={styles.progressNavButton}
          onPress={() => navigation.navigate('LearningProgress')}
        >
          <Icon name="activity" size={16} color={themeColors.primary} />
          <Text style={styles.progressNavText}>Progress</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Loading your learning dashboard...</Text>
        </View>
      ) : dashboard ? (
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
          {/* 1. Continue Learning Hero (if active pointer exists) */}
          {dashboard.continueLearning && (
            <ContinueLearningHero
              resume={dashboard.continueLearning}
              onContinue={handleContinueLesson}
              onViewPath={handleOpenPathOverview}
            />
          )}

          {/* 2. Streak Card */}
          <LearningStreakCard
            streakDays={dashboard.summary.currentStreakDays}
            lastActivityAt={dashboard.summary.lastActivityAt}
          />

          {/* 3. Overall Learning Progress Statistics */}
          <LearningStatCard summary={dashboard.summary} />

          {/* 4. Fitness Education Academy Hero Banner */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => navigation.navigate('FitnessAcademy')}
            style={styles.academyBanner}
          >
            <View style={styles.academyBannerLeft}>
              <View style={styles.academyIconHalo}>
                <Icon name="award" size={20} color="#38bdf8" />
              </View>
              <View style={styles.academyTextGroup}>
                <View style={styles.academyBadgeRow}>
                  <Badge label="ACADEMY" variant="primary" />
                  <Badge label="STRUCTURED" variant="neutral" />
                </View>
                <Text style={styles.academyBannerTitle}>Fitness Education Academy</Text>
                <Text style={styles.academyBannerSubtitle}>
                  Foundations, biomechanics, equipment & glossary
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={18} color={themeColors.textSecondary} />
          </TouchableOpacity>

          {/* 5. Cross-Navigation Discovery Tiles */}
          <View style={styles.discoveryTilesRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('LearningPaths')}
              style={styles.discoveryTile}
            >
              <View style={[styles.tileIconHalo, { backgroundColor: 'rgba(255, 107, 0, 0.12)' }]}>
                <Icon name="award" size={18} color={themeColors.primary} />
              </View>
              <View style={styles.tileContent}>
                <Text style={styles.tileTitle}>All Masterclasses</Text>
                <Text style={styles.tileSubtitle}>Structured courses & paths</Text>
              </View>
              <Icon name="chevron-right" size={14} color={themeColors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('ExerciseCollections')}
              style={styles.discoveryTile}
            >
              <View style={[styles.tileIconHalo, { backgroundColor: 'rgba(0, 200, 180, 0.12)' }]}>
                <Icon name="activity" size={18} color={themeColors.accent} />
              </View>
              <View style={styles.tileContent}>
                <Text style={styles.tileTitle}>Curated Collections</Text>
                <Text style={styles.tileSubtitle}>Workout packs & warmups</Text>
              </View>
              <Icon name="chevron-right" size={14} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* 5. In-Progress Paths Carousel */}
          {dashboard.activePaths && dashboard.activePaths.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <Icon name="activity" size={14} color={themeColors.primary} />
                  <Text style={styles.sectionHeaderTitle}>ACTIVE LEARNING PATHS</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('LearningProgress')}>
                  <Text style={styles.sectionSeeAll}>View All →</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScrollContent}
              >
                {dashboard.activePaths.map((path) => (
                  <TouchableOpacity
                    key={path.pathId}
                    activeOpacity={0.85}
                    onPress={() => handleOpenPathOverview(path.pathId, path.title)}
                    style={styles.activePathCard}
                  >
                    <View style={styles.activePathHeader}>
                      {path.category && (
                        <Badge
                          label={path.category.replace(/_/g, ' ')}
                          variant="primary"
                        />
                      )}
                      <Badge label={`${path.percentComplete}%`} variant="neutral" />
                    </View>

                    <Text style={styles.activePathTitle} numberOfLines={2}>
                      {path.title}
                    </Text>

                    <View style={styles.miniProgressBar}>
                      <View
                        style={[
                          styles.miniProgressFill,
                          { width: `${Math.max(6, path.percentComplete)}%` },
                        ]}
                      />
                    </View>

                    <Text style={styles.activePathMeta}>
                      {path.completedLessons} of {path.totalLessons} lessons done
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* 6. "Next to Learn" Deterministic Recommendations */}
          {dashboard.recommendations && dashboard.recommendations.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <Icon name="sparkles" size={14} color={themeColors.accent} />
                  <Text style={[styles.sectionHeaderTitle, { color: themeColors.accent }]}>
                    RECOMMENDED NEXT TO LEARN
                  </Text>
                </View>
              </View>

              {dashboard.recommendations.map((rec) => (
                <TouchableOpacity
                  key={rec.pathId}
                  activeOpacity={0.85}
                  onPress={() => handleOpenPathOverview(rec.pathId, rec.title)}
                  style={styles.recCardContainer}
                >
                  <Card style={styles.recCard}>
                    <View style={styles.recIconHalo}>
                      <Icon name="award" size={18} color={themeColors.accent} />
                    </View>
                    <View style={styles.recContent}>
                      <View style={styles.recBadgeRow}>
                        {rec.category && (
                          <Badge
                            label={rec.category.replace(/_/g, ' ')}
                            variant="primary"
                          />
                        )}
                        <Badge label={rec.difficulty} variant="neutral" />
                      </View>
                      <Text style={styles.recTitle} numberOfLines={1}>
                        {rec.title}
                      </Text>
                      <Text style={styles.recReason} numberOfLines={1}>
                        💡 {rec.reason}
                      </Text>
                    </View>
                    <Icon name="chevron-right" size={16} color={themeColors.textSecondary} />
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 7. Recently Learned Exercises */}
          {dashboard.recentExercises && dashboard.recentExercises.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <Icon name="check-circle" size={14} color={themeColors.success} />
                  <Text style={[styles.sectionHeaderTitle, { color: themeColors.success }]}>
                    RECENTLY LEARNED EXERCISES
                  </Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScrollContent}
              >
                {dashboard.recentExercises.map((ex) => (
                  <TouchableOpacity
                    key={ex.exerciseId}
                    activeOpacity={0.85}
                    onPress={() => handleOpenExercise(ex.exerciseId, ex.name)}
                    style={styles.recentExCard}
                  >
                    <View style={styles.recentExIconCircle}>
                      <Icon name="dumbbell" size={16} color={themeColors.primary} />
                    </View>
                    <Text style={styles.recentExName} numberOfLines={1}>
                      {ex.name}
                    </Text>
                    <Text style={styles.recentExMeta}>
                      {ex.primaryMuscleGroup} · {ex.difficulty}
                    </Text>
                    <View style={styles.recentExBadge}>
                      <Icon name="check" size={11} color={themeColors.success} />
                      <Text style={styles.recentExBadgeText}>Mastered</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* 8. Recent Learning Activity Timeline */}
          <LearningActivityTimeline activities={dashboard.recentActivity} />
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: themeColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    ...typography.title,
    fontSize: 18,
    fontWeight: '800',
    color: themeColors.textPrimary,
  },
  headerSubtitle: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textSecondary,
  },
  progressNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.25)',
  },
  progressNavText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: themeColors.primary,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  discoveryTilesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  academyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  academyBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.xs,
  },
  academyIconHalo: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  academyTextGroup: {
    flex: 1,
  },
  academyBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  academyBannerTitle: {
    ...typography.subtitle,
    fontSize: 15,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  academyBannerSubtitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  discoveryTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.surface,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: 8,
  },
  tileIconHalo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileContent: {
    flex: 1,
  },
  tileTitle: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  tileSubtitle: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.textSecondary,
  },
  sectionContainer: {
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeaderTitle: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    color: themeColors.primary,
    letterSpacing: 1,
  },
  sectionSeeAll: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: themeColors.primary,
  },
  horizontalScrollContent: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  activePathCard: {
    width: 220,
    backgroundColor: themeColors.surface,
    padding: spacing.sm + 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  activePathHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  activePathTitle: {
    ...typography.subtitle,
    fontSize: 14,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginBottom: 8,
    minHeight: 38,
  },
  miniProgressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: 4,
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: themeColors.primary,
    borderRadius: radius.full,
  },
  activePathMeta: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.textSecondary,
  },
  recCardContainer: {
    marginVertical: 3,
  },
  recCard: {
    backgroundColor: themeColors.surface,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recIconHalo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 200, 180, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recContent: {
    flex: 1,
  },
  recBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  recTitle: {
    ...typography.subtitle,
    fontSize: 14,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  recReason: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.accent,
    marginTop: 1,
  },
  recentExCard: {
    width: 140,
    backgroundColor: themeColors.surface,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    alignItems: 'center',
  },
  recentExIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  recentExName: {
    ...typography.subtitle,
    fontSize: 12,
    fontWeight: '700',
    color: themeColors.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  recentExMeta: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.textSecondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  recentExBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  recentExBadgeText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    color: themeColors.success,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.body,
    fontSize: 14,
    color: themeColors.textSecondary,
  },
});
