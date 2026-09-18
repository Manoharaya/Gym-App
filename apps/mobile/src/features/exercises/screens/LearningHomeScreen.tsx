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
import { Icon, Badge, IconName } from '../../../components/primitives';
import {
  ExerciseService,
  LearningHubData,
  LearningPreferencesResponse,
  UnifiedSearchResultItem,
  LearningHubTaxonomyItem,
  UpdateLearningPreferencesPayload,
  MovementLearningDashboardData,
  LearningGapItem,
} from '../services/exerciseService';
import {
  LearningHubSearchBar,
  LearningHubExploreGrid,
  RecommendedLearningCard,
  ContentMasteryBadge,
  PersonalizeLearningModal,
  LearningGapCard,
} from '../components';

type NavProp = NativeStackNavigationProp<MemberStackParamList>;
type FilterPill = 'ALL' | 'CONTINUE' | 'EXPLORE' | 'GUIDED' | 'ACADEMY' | 'REVIEW';

const FILTER_PILLS: Array<{ id: FilterPill; label: string; icon: IconName }> = [
  { id: 'ALL', label: 'All', icon: 'trophy' },
  { id: 'CONTINUE', label: 'Continue', icon: 'activity' },
  { id: 'EXPLORE', label: 'Explore', icon: 'search' },
  { id: 'GUIDED', label: 'Guided', icon: 'award' },
  { id: 'ACADEMY', label: 'Academy', icon: 'award' },
  { id: 'REVIEW', label: 'Review', icon: 'alert-circle' },
];

export const LearningHomeScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();

  const [hubData, setHubData] = useState<LearningHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterPill>('ALL');

  // Personalization Modal state
  const [isPreferencesModalVisible, setIsPreferencesModalVisible] = useState(false);
  const [preferences, setPreferences] = useState<LearningPreferencesResponse | null>(null);
  const [movementDashboard, setMovementDashboard] =
    useState<MovementLearningDashboardData | null>(null);

  const loadHubData = useCallback(async () => {
    try {
      setLoading(true);
      const [hub, prefs, movement] = await Promise.all([
        ExerciseService.getLearningHubData(),
        ExerciseService.getLearningPreferences().catch(() => null),
        ExerciseService.getMovementLearningDashboard().catch(() => null),
      ]);
      setHubData(hub);
      if (prefs) setPreferences(prefs);
      if (movement) setMovementDashboard(movement);
    } catch (err) {
      console.warn('Failed to load learning hub data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleReviewGap = (gap: LearningGapItem) => {
    if (gap.exerciseId) {
      navigation.navigate('VisualMovementCoach', {
        exerciseId: gap.exerciseId,
        exerciseName: gap.exerciseName,
      });
    }
  };

  const handleResolveGap = async (gap: LearningGapItem) => {
    try {
      await ExerciseService.resolveLearningGap(gap.id, 'RESOLVED');
      setMovementDashboard((prev) =>
        prev
          ? {
              ...prev,
              needsReview: prev.needsReview.filter((g) => g.id !== gap.id),
            }
          : null,
      );
    } catch (err) {
      console.warn('Failed to resolve gap:', err);
    }
  };

  useEffect(() => {
    loadHubData();
  }, [loadHubData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadHubData();
  };

  const handleSavePreferences = async (payload: UpdateLearningPreferencesPayload) => {
    try {
      const updated = await ExerciseService.updateLearningPreferences(payload);
      setPreferences(updated);
      setIsPreferencesModalVisible(false);
      // Reload recommendations
      loadHubData();
    } catch (err) {
      console.warn('Failed to save learning preferences:', err);
    }
  };

  const handleResetPreferences = async () => {
    try {
      const reset = await ExerciseService.resetLearningPreferences();
      setPreferences(reset);
      setIsPreferencesModalVisible(false);
      loadHubData();
    } catch (err) {
      console.warn('Failed to reset learning preferences:', err);
    }
  };

  // Search selection handler
  const handleSelectSearchResult = (item: UnifiedSearchResultItem) => {
    switch (item.type) {
      case 'EXERCISE':
        navigation.navigate('ExerciseDetail', {
          exerciseId: item.id,
          exerciseName: item.title,
        });
        break;
      case 'TUTORIAL':
        navigation.navigate('ExerciseTutorial', {
          exerciseId: item.id,
        });
        break;
      case 'LEARNING_PATH':
        navigation.navigate('LearningPathOverview', {
          pathId: item.id,
          title: item.title,
        });
        break;
      case 'GUIDED_SESSION':
        navigation.navigate('GuidedSessionDetail', {
          sessionId: item.id,
        });
        break;
      case 'COLLECTION':
        navigation.navigate('ExerciseCollectionDetail', {
          collectionId: item.id,
          title: item.title,
        });
        break;
      case 'CURRICULUM':
        navigation.navigate('CurriculumDetail', {
          curriculumId: item.id,
          title: item.title,
        });
        break;
      case 'MOVEMENT':
        navigation.navigate('MovementPatternDetail', {
          pattern: item.id as any,
          patternName: item.title,
        });
        break;
      case 'MUSCLE':
        navigation.navigate('MuscleDetail', {
          muscleCode: item.id,
          muscleName: item.title,
        });
        break;
      case 'EQUIPMENT':
        navigation.navigate('ExerciseDimensionDetail', {
          dimension: 'equipment',
          value: item.id,
          initialTitle: item.title,
        });
        break;
      default:
        navigation.navigate('ExerciseDetail', { exerciseId: item.id });
    }
  };

  // Dimension Explorer selection handler
  const handleSelectDimension = (
    type: 'MOVEMENT' | 'MUSCLE' | 'EQUIPMENT' | 'CATEGORY',
    item: LearningHubTaxonomyItem,
  ) => {
    if (type === 'MOVEMENT') {
      navigation.navigate('MovementPatternDetail', {
        pattern: item.code as any,
        patternName: item.name,
      });
    } else if (type === 'MUSCLE') {
      navigation.navigate('MuscleDetail', {
        muscleCode: item.code || item.id,
        muscleName: item.name,
      });
    } else if (type === 'EQUIPMENT') {
      navigation.navigate('ExerciseDimensionDetail', {
        dimension: 'equipment',
        value: item.code || item.id,
        initialTitle: item.name,
      });
    } else {
      navigation.navigate('ExerciseDimensionDetail', {
        dimension: 'category',
        value: item.code || item.id,
        initialTitle: item.name,
      });
    }
  };

  const handleResumeContinueItem = (item: {
    contentType: string;
    contentId: string;
    title: string;
    currentStepIndex: number;
  }) => {
    if (item.contentType === 'LEARNING_PATH') {
      navigation.navigate('LearningPathOverview', {
        pathId: item.contentId,
        title: item.title,
      });
    } else if (item.contentType === 'TUTORIAL') {
      navigation.navigate('ExerciseTutorial', {
        exerciseId: item.contentId,
      });
    } else if (item.contentType === 'GUIDED_SESSION') {
      navigation.navigate('GuidedSessionDetail', {
        sessionId: item.contentId,
      });
    }
  };

  const showContinueSection =
    (activeFilter === 'ALL' || activeFilter === 'CONTINUE') &&
    hubData?.continueLearning &&
    hubData.continueLearning.length > 0;

  const showRecommendedSection =
    (activeFilter === 'ALL' || activeFilter === 'CONTINUE') &&
    hubData?.recommendedLearning &&
    hubData.recommendedLearning.length > 0;

  const showExploreSection =
    (activeFilter === 'ALL' || activeFilter === 'EXPLORE') && !!hubData?.explore;

  const showFeaturedSection =
    (activeFilter === 'ALL' || activeFilter === 'EXPLORE') &&
    hubData?.featuredExercises &&
    hubData.featuredExercises.length > 0;

  const showGuidedSection =
    (activeFilter === 'ALL' || activeFilter === 'GUIDED') && !!hubData?.guidedLearning;

  const showAcademySection =
    (activeFilter === 'ALL' || activeFilter === 'ACADEMY') && !!hubData?.academy;

  const showReviewSection =
    (activeFilter === 'ALL' || activeFilter === 'REVIEW') &&
    hubData?.reviewQueue &&
    hubData.reviewQueue.length > 0;

  return (
    <View style={styles.container}>
      {/* 1. Header Bar with Personalization Trigger */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Learning Hub</Text>
          <Text style={styles.headerSubtitle}>Discover • Learn • Master</Text>
        </View>

        <View style={styles.headerRightGroup}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setIsPreferencesModalVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="settings" size={18} color={themeColors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.progressBadgeBtn}
            onPress={() => navigation.navigate('LearningProgress')}
          >
            <Icon name="activity" size={14} color={themeColors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Unified Learning Search Bar */}
      <LearningHubSearchBar onSelectItem={handleSelectSearchResult} />

      {/* 3. Section Filter Pills */}
      <View style={styles.filterPillsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsScroll}
        >
          {FILTER_PILLS.map((pill) => {
            const isActive = activeFilter === pill.id;
            return (
              <TouchableOpacity
                key={pill.id}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                activeOpacity={0.8}
                onPress={() => setActiveFilter(pill.id)}
              >
                <Icon
                  name={pill.icon}
                  size={12}
                  color={isActive ? themeColors.primary : themeColors.textSecondary}
                />
                <Text
                  style={[
                    styles.filterPillText,
                    isActive && styles.filterPillTextActive,
                  ]}
                >
                  {pill.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Synthesizing your Learning Hub...</Text>
        </View>
      ) : (
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
          {/* 4. Targeted Review Queue Banner (High Priority if present) */}
          {showReviewSection && hubData?.reviewQueue && (
            <View style={styles.reviewSection}>
              <View style={styles.reviewHeaderRow}>
                <View style={styles.reviewHeaderLeft}>
                  <View style={styles.reviewAlertIcon}>
                    <Icon name="alert-circle" size={14} color="#ef4444" />
                  </View>
                  <Text style={styles.reviewSectionTitle}>TARGETED REVIEW QUEUE</Text>
                </View>
                <Badge label={`${hubData.reviewQueue.length} Pending`} variant="accent" />
              </View>

              {hubData.reviewQueue.map((item) => (
                <View key={item.contentId} style={styles.reviewCard}>
                  <View style={styles.reviewCardBody}>
                    <Text style={styles.reviewCardTitle}>{item.title}</Text>
                    <Text style={styles.reviewCardReason}>{item.reason}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.reviewActionButton}
                    activeOpacity={0.8}
                    onPress={() =>
                      navigation.navigate('ExerciseTutorial', {
                        exerciseId: item.contentId,
                      })
                    }
                  >
                    <Text style={styles.reviewActionText}>Review Now</Text>
                    <Icon name="chevron-right" size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Movement Learning Intelligence: Needs Review (Active Gaps) */}
          {movementDashboard?.needsReview && movementDashboard.needsReview.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <Icon name="alert-circle" size={16} color={themeColors.primary} />
                  <Text style={styles.sectionHeaderTitle}>NEEDS REVIEW & TECHNIQUE FOCUS</Text>
                </View>
                <Badge label={`${movementDashboard.needsReview.length} Identified`} variant="accent" />
              </View>

              {movementDashboard.needsReview.slice(0, 4).map((gap) => (
                <LearningGapCard
                  key={gap.id}
                  gap={gap}
                  onReview={() => handleReviewGap(gap)}
                  onResolve={handleResolveGap}
                />
              ))}
            </View>
          )}

          {/* Movement Learning Intelligence: Quick Refresh */}
          {movementDashboard?.quickRefresh && movementDashboard.quickRefresh.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <Icon name="bolt" size={16} color={themeColors.primary} />
                  <Text style={styles.sectionHeaderTitle}>QUICK REFRESH (30–60S)</Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScrollContent}
              >
                {movementDashboard.quickRefresh.map((qr) => (
                  <TouchableOpacity
                    key={qr.exerciseId}
                    style={styles.quickRefreshCard}
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.navigate('VisualMovementCoach', {
                        exerciseId: qr.exerciseId,
                        exerciseName: qr.exerciseName,
                      })
                    }
                  >
                    <View style={styles.quickRefreshBadgeRow}>
                      <Badge label={`${qr.estimatedDurationSeconds}s`} variant="primary" />
                    </View>
                    <Text style={styles.quickRefreshTitle} numberOfLines={1}>
                      {qr.exerciseName}
                    </Text>
                    <Text style={styles.quickRefreshReason} numberOfLines={2}>
                      {qr.reason}
                    </Text>
                    <View style={styles.quickRefreshAction}>
                      <Text style={styles.quickRefreshActionText}>Start Refresher →</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* 5. Continue Learning Pipeline */}
          {showContinueSection && hubData?.continueLearning && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <Icon name="activity" size={16} color={themeColors.primary} />
                  <Text style={styles.sectionHeaderTitle}>CONTINUE LEARNING</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('LearningProgress')}>
                  <Text style={styles.sectionSeeAll}>History →</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScrollContent}
              >
                {hubData.continueLearning.map((item) => (
                  <TouchableOpacity
                    key={`${item.contentType}-${item.contentId}`}
                    style={styles.continueCard}
                    activeOpacity={0.85}
                    onPress={() => handleResumeContinueItem(item)}
                  >
                    <View style={styles.continueHeader}>
                      <Badge
                        label={item.contentType.replace(/_/g, ' ')}
                        variant="primary"
                      />
                      <Badge label={`${item.progressPercent}%`} variant="neutral" />
                    </View>

                    <Text style={styles.continueTitle} numberOfLines={2}>
                      {item.title}
                    </Text>

                    {item.parentTitle && (
                      <Text style={styles.continueParentTitle} numberOfLines={1}>
                        {item.parentTitle}
                      </Text>
                    )}

                    {/* Progress Bar */}
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.max(6, item.progressPercent)}%` },
                        ]}
                      />
                    </View>

                    <View style={styles.resumeActionRow}>
                      <Text style={styles.resumeActionTitle} numberOfLines={1}>
                        {item.resumeActionTitle}
                      </Text>
                      <Icon name="chevron-right" size={14} color={themeColors.primary} />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* 6. Recommended For You Section */}
          {showRecommendedSection && hubData?.recommendedLearning && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <Icon name="sparkles" size={16} color="#f59e0b" />
                  <Text style={styles.sectionHeaderTitle}>RECOMMENDED FOR YOU</Text>
                </View>
                <TouchableOpacity onPress={() => setIsPreferencesModalVisible(true)}>
                  <Text style={styles.sectionSeeAll}>Adjust Goals ⚙</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScrollContent}
              >
                {hubData.recommendedLearning.map((rec) => (
                  <RecommendedLearningCard
                    key={`${rec.contentType}-${rec.contentId}`}
                    item={rec}
                    onPress={() =>
                      handleSelectSearchResult({
                        id: rec.contentId,
                        title: rec.title,
                        type: rec.contentType,
                      })
                    }
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* 7. Explore Visual Dimensions */}
          {showExploreSection && hubData?.explore && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <Icon name="search" size={16} color={themeColors.primary} />
                  <Text style={styles.sectionHeaderTitle}>EXPLORE FITNESS DIMENSIONS</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('ExerciseLibrary')}>
                  <Text style={styles.sectionSeeAll}>All Exercises →</Text>
                </TouchableOpacity>
              </View>

              <LearningHubExploreGrid
                explore={hubData.explore}
                onSelectDimension={handleSelectDimension}
              />
            </View>
          )}

          {/* 8. Featured Exercises with Mastery Badges */}
          {showFeaturedSection && hubData?.featuredExercises && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <Icon name="activity" size={16} color={themeColors.primary} />
                  <Text style={styles.sectionHeaderTitle}>FEATURED EXERCISES & MASTERY</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('ExerciseLibrary')}>
                  <Text style={styles.sectionSeeAll}>Explore All →</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScrollContent}
              >
                {hubData.featuredExercises.map((ex) => (
                  <TouchableOpacity
                    key={ex.id}
                    style={styles.featuredExCard}
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.navigate('ExerciseDetail', {
                        exerciseId: ex.id,
                        exerciseName: ex.name,
                      })
                    }
                  >
                    <View style={styles.featuredExHeader}>
                      <Badge label={ex.difficulty} variant="neutral" />
                      <ContentMasteryBadge
                        status={ex.masteryStatus as any}
                        size="sm"
                      />
                    </View>

                    <Text style={styles.featuredExName} numberOfLines={2}>
                      {ex.name}
                    </Text>

                    <View style={styles.featuredExTags}>
                      <Text style={styles.featuredExTagText}>{ex.primaryMuscleGroup}</Text>
                      <Text style={styles.featuredExTagDot}>•</Text>
                      <Text style={styles.featuredExTagText}>{ex.equipment}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.tutorialBtn}
                      activeOpacity={0.8}
                      onPress={() =>
                        navigation.navigate('ExerciseTutorial', {
                          exerciseId: ex.id,
                        })
                      }
                    >
                      <Text style={styles.tutorialBtnText}>Interactive Guide</Text>
                      <Icon name="chevron-right" size={12} color={themeColors.primary} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* 9. Guided Learning Section */}
          {showGuidedSection && hubData?.guidedLearning && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <Icon name="award" size={16} color={themeColors.accent} />
                  <Text style={styles.sectionHeaderTitle}>STRUCTURED GUIDED LEARNING</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('LearningPaths')}>
                  <Text style={styles.sectionSeeAll}>All Paths →</Text>
                </TouchableOpacity>
              </View>

              {/* Guided Paths */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScrollContent}
              >
                {hubData.guidedLearning.paths.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.guidedPathCard}
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.navigate('LearningPathOverview', {
                        pathId: p.id,
                        title: p.title,
                      })
                    }
                  >
                    <View style={styles.guidedPathTop}>
                      <Badge label={p.difficulty} variant="neutral" />
                      {p.isEnrolled && (
                        <Badge label={`${p.percentComplete}% Complete`} variant="accent" />
                      )}
                    </View>
                    <Text style={styles.guidedPathTitle} numberOfLines={2}>
                      {p.title}
                    </Text>
                    <Text style={styles.guidedPathLessons}>
                      {p.lessonCount} lessons • {p.exerciseCount} exercises
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Curated Collections & Guided Sessions quick row */}
              <View style={styles.quickAccessRow}>
                <TouchableOpacity
                  style={styles.quickAccessTile}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('ExerciseCollections')}
                >
                  <Icon name="trophy" size={18} color={themeColors.accent} />
                  <View style={styles.quickAccessText}>
                    <Text style={styles.quickAccessTitle}>Curated Collections</Text>
                    <Text style={styles.quickAccessSub}>
                      {hubData.guidedLearning.collections.length} collections available
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={14} color={themeColors.textTertiary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickAccessTile}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('GuidedSessions')}
                >
                  <Icon name="activity" size={18} color={themeColors.primary} />
                  <View style={styles.quickAccessText}>
                    <Text style={styles.quickAccessTitle}>Guided Practice</Text>
                    <Text style={styles.quickAccessSub}>
                      {hubData.guidedLearning.sessions.length} sessions available
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={14} color={themeColors.textTertiary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 10. Fitness Academy Preview */}
          {showAcademySection && hubData?.academy && (
            <View style={styles.sectionContainer}>
              <TouchableOpacity
                style={styles.academyHeroCard}
                activeOpacity={0.88}
                onPress={() => navigation.navigate('FitnessAcademy')}
              >
                <View style={styles.academyHeroLeft}>
                  <View style={styles.academyIconCircle}>
                    <Icon name="award" size={22} color="#38bdf8" />
                  </View>
                  <View style={styles.academyHeroText}>
                    <View style={styles.academyPillRow}>
                      <Badge label="FITNESS ACADEMY" variant="primary" />
                      <Badge
                        label={`${hubData.academy.totalGlossaryTerms} Glossary Terms`}
                        variant="neutral"
                      />
                    </View>
                    <Text style={styles.academyHeroTitle}>Structured Fitness Curricula</Text>
                    <Text style={styles.academyHeroDesc}>
                      Master movement fundamentals, biomechanics, recovery, and gym principles.
                    </Text>
                  </View>
                </View>
                <Icon name="chevron-right" size={18} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* 11. My Learning & Mastery Summary Card */}
          {hubData?.myLearningSummary && (
            <View style={styles.summaryContainer}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeaderRow}>
                  <View style={styles.summaryHeaderLeft}>
                    <Icon name="award" size={16} color={themeColors.primary} />
                    <Text style={styles.summaryTitle}>MY LEARNING & MASTERY</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('LearningProgress')}
                  >
                    <Text style={styles.summaryLink}>Full Analytics →</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.metricsGrid}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricValue}>
                      {hubData.myLearningSummary.learningStreakDays}
                    </Text>
                    <Text style={styles.metricLabel}>Day Streak</Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Text style={styles.metricValue}>
                      {Math.round(hubData.myLearningSummary.totalTimeSpentMinutes / 60)}h
                    </Text>
                    <Text style={styles.metricLabel}>Time Learned</Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Text style={styles.metricValue}>
                      {hubData.myLearningSummary.masteredExercisesCount}
                    </Text>
                    <Text style={styles.metricLabel}>Mastered</Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Text style={styles.metricValue}>
                      {hubData.myLearningSummary.completedPathsCount}
                    </Text>
                    <Text style={styles.metricLabel}>Paths Done</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* 12. Personalize Learning Preferences Modal (Day 78 Integration) */}
      <PersonalizeLearningModal
        visible={isPreferencesModalVisible}
        preferences={preferences}
        onClose={() => setIsPreferencesModalVisible(false)}
        onSave={handleSavePreferences}
        onReset={handleResetPreferences}
      />
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
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: '800',
    color: themeColors.textPrimary,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: themeColors.textTertiary,
    marginTop: 2,
    fontWeight: '500',
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBadgeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0, 200, 180, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillsContainer: {
    marginBottom: spacing.xs,
  },
  filterPillsScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  filterPillActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderColor: themeColors.primary,
  },
  filterPillText: {
    fontSize: typography.caption.fontSize,
    color: themeColors.textSecondary,
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: themeColors.primary,
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl * 1.5,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    color: themeColors.textSecondary,
    fontSize: typography.body2.fontSize,
    marginTop: spacing.md,
  },
  reviewSection: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  reviewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reviewAlertIcon: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#ef4444',
  },
  reviewCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewCardBody: {
    flex: 1,
    marginRight: spacing.sm,
  },
  reviewCardTitle: {
    color: themeColors.textPrimary,
    fontSize: typography.body2.fontSize,
    fontWeight: '700',
  },
  reviewCardReason: {
    color: themeColors.textTertiary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  reviewActionButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewActionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionContainer: {
    marginTop: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: themeColors.textSecondary,
  },
  sectionSeeAll: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    color: themeColors.primary,
  },
  horizontalScrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  continueCard: {
    width: 250,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  continueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  continueTitle: {
    color: themeColors.textPrimary,
    fontSize: typography.body2.fontSize,
    fontWeight: '700',
    lineHeight: 20,
  },
  continueParentTitle: {
    color: themeColors.textTertiary,
    fontSize: typography.caption.fontSize,
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.full,
    marginVertical: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: themeColors.primary,
    borderRadius: radius.full,
  },
  resumeActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resumeActionTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: themeColors.primary,
    marginRight: 4,
  },
  featuredExCard: {
    width: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.lg,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  featuredExHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  featuredExName: {
    color: themeColors.textPrimary,
    fontSize: typography.body2.fontSize,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  featuredExTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.md,
  },
  featuredExTagText: {
    color: themeColors.textTertiary,
    fontSize: 10,
    fontWeight: '500',
  },
  featuredExTagDot: {
    color: themeColors.textTertiary,
    fontSize: 10,
  },
  tutorialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  tutorialBtnText: {
    color: themeColors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  guidedPathCard: {
    width: 220,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  guidedPathTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  guidedPathTitle: {
    color: themeColors.textPrimary,
    fontSize: typography.body2.fontSize,
    fontWeight: '700',
    lineHeight: 20,
  },
  guidedPathLessons: {
    color: themeColors.textTertiary,
    fontSize: typography.caption.fontSize,
    marginTop: spacing.xs,
  },
  quickAccessRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  quickAccessTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    gap: spacing.xs + 2,
  },
  quickAccessText: {
    flex: 1,
  },
  quickAccessTitle: {
    color: themeColors.textPrimary,
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
  },
  quickAccessSub: {
    color: themeColors.textTertiary,
    fontSize: 10,
    marginTop: 2,
  },
  academyHeroCard: {
    marginHorizontal: spacing.md,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  academyHeroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
    gap: spacing.sm,
  },
  academyIconCircle: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  academyHeroText: {
    flex: 1,
  },
  academyPillRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  academyHeroTitle: {
    color: themeColors.textPrimary,
    fontSize: typography.body1.fontSize,
    fontWeight: '700',
  },
  academyHeroDesc: {
    color: themeColors.textTertiary,
    fontSize: typography.caption.fontSize,
    marginTop: 2,
    lineHeight: 16,
  },
  summaryContainer: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  summaryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: themeColors.textSecondary,
  },
  summaryLink: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    color: themeColors.primary,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: typography.h2.fontSize,
    fontWeight: '800',
    color: themeColors.textPrimary,
  },
  metricLabel: {
    fontSize: 10,
    color: themeColors.textTertiary,
    marginTop: 2,
    fontWeight: '500',
  },
  quickRefreshCard: {
    width: 200,
    backgroundColor: themeColors.cardBackground,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginRight: spacing.sm,
    justifyContent: 'space-between',
  },
  quickRefreshBadgeRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  quickRefreshTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginBottom: 4,
  },
  quickRefreshReason: {
    fontSize: 12,
    color: themeColors.textSecondary,
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  quickRefreshAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  quickRefreshActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.primary,
  },
});
