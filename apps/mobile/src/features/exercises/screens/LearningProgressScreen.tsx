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
import { Icon, Badge, Button, Card } from '../../../components/primitives';
import {
  ExerciseService,
  LearningProgressOverview,
  LearningRecommendationsResponse,
  LearningPreferencesResponse,
  UpdateLearningPreferencesPayload,
  LearningMasterySummary,
  LearningMasteryRecord,
} from '../services/exerciseService';
import { PersonalizeLearningModal } from '../components/PersonalizeLearningModal';
import {
  ContentMasteryBadge,
  LearningJourneyVisualizer,
  LearningAnalyticsCard,
} from '../components';

type NavProp = NativeStackNavigationProp<MemberStackParamList>;
type TabKey = 'MASTERY' | 'ACTIVE' | 'COMPLETED' | 'COLLECTIONS' | 'HISTORY';

export const LearningProgressScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();

  const [activeTab, setActiveTab] = useState<TabKey>('MASTERY');
  const [overview, setOverview] = useState<LearningProgressOverview | null>(null);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<LearningRecommendationsResponse | null>(null);
  const [preferences, setPreferences] = useState<LearningPreferencesResponse | null>(null);
  const [masterySummary, setMasterySummary] = useState<LearningMasterySummary | null>(null);
  const [masteryList, setMasteryList] = useState<LearningMasteryRecord[]>([]);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [ovRes, histRes, recsRes, prefsRes, summaryRes, masteryRes] = await Promise.all([
        ExerciseService.getLearningProgressOverview(),
        ExerciseService.getLearningHistory({ page: 1, limit: 30 }),
        ExerciseService.getPersonalizedLearningRecommendations().catch(() => null),
        ExerciseService.getLearningPreferences().catch(() => null),
        ExerciseService.getLearningMasterySummary().catch(() => null),
        ExerciseService.getLearningMasteryList({ limit: 30 }).catch(() => null),
      ]);
      setOverview(ovRes);
      setHistoryItems(histRes.items || []);
      setRecommendations(recsRes);
      setPreferences(prefsRes);
      setMasterySummary(summaryRes);
      setMasteryList(masteryRes?.items || []);
    } catch (err) {
      console.warn('Failed to load learning progress data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdatePreferences = async (payload: UpdateLearningPreferencesPayload) => {
    try {
      const updated = await ExerciseService.updateLearningPreferences(payload);
      setPreferences(updated);
      loadData();
    } catch (err) {
      console.warn('Failed to update learning preferences:', err);
    }
  };

  const handleResetPreferences = async () => {
    try {
      const reset = await ExerciseService.resetLearningPreferences();
      setPreferences(reset);
      loadData();
    } catch (err) {
      console.warn('Failed to reset learning preferences:', err);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleOpenPathOverview = (pathId: string, title?: string) => {
    navigation.navigate('LearningPathOverview', {
      pathId,
      title,
    });
  };

  const handleOpenCollection = (collectionId: string, title?: string) => {
    navigation.navigate('ExerciseCollectionDetail', {
      collectionId,
      title,
    });
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Curriculum Progress</Text>
          <Text style={styles.headerSubtitle}>Active Courses & Completed History</Text>
        </View>

        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setShowPreferencesModal(true)}
          accessibilityRole="button"
          accessibilityLabel="Learning Preferences"
        >
          <Icon name="settings" size={20} color={themeColors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'MASTERY' && styles.tabBtnActive]}
          onPress={() => setActiveTab('MASTERY')}
        >
          <Text style={[styles.tabText, activeTab === 'MASTERY' && styles.tabTextActive]}>
            Mastery ({masterySummary?.totalMastered || 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'ACTIVE' && styles.tabBtnActive]}
          onPress={() => setActiveTab('ACTIVE')}
        >
          <Text style={[styles.tabText, activeTab === 'ACTIVE' && styles.tabTextActive]}>
            Active ({overview?.activePaths.length || 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'COMPLETED' && styles.tabBtnActive]}
          onPress={() => setActiveTab('COMPLETED')}
        >
          <Text style={[styles.tabText, activeTab === 'COMPLETED' && styles.tabTextActive]}>
            Paths ({overview?.completedPaths.length || 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'COLLECTIONS' && styles.tabBtnActive]}
          onPress={() => setActiveTab('COLLECTIONS')}
        >
          <Text style={[styles.tabText, activeTab === 'COLLECTIONS' && styles.tabTextActive]}>
            Packs ({overview?.exploredCollections.length || 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'HISTORY' && styles.tabBtnActive]}
          onPress={() => setActiveTab('HISTORY')}
        >
          <Text style={[styles.tabText, activeTab === 'HISTORY' && styles.tabTextActive]}>
            Log ({historyItems.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Loading curriculum records...</Text>
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
          {/* TAB 0: MASTERY INTELLIGENCE OVERVIEW */}
          {activeTab === 'MASTERY' && (
            <View>
              {masterySummary && (
                <LearningAnalyticsCard
                  summary={masterySummary}
                  onReviewPress={() => {
                    const firstReview = masterySummary.reviewItems[0];
                    if (firstReview?.contentId) {
                      navigation.navigate('ExerciseTutorial', {
                        exerciseId: firstReview.contentId,
                        initialMode: 'MOVEMENT_BREAKDOWN',
                      });
                    }
                  }}
                  style={{ marginBottom: spacing.md }}
                />
              )}

              {/* Continue Learning Queue with LearningJourneyVisualizer */}
              {masterySummary?.continueLearning && masterySummary.continueLearning.length > 0 && (
                <View style={styles.masterySection}>
                  <Text style={styles.sectionHeading}>Continue Learning Focus</Text>
                  <LearningJourneyVisualizer
                    currentStatus="PROGRESSING"
                    completionPercent={masterySummary.continueLearning[0]?.progressPercent || 0}
                    style={{ marginBottom: spacing.sm }}
                  />

                  {masterySummary.continueLearning.map((item) => (
                    <Card key={`${item.contentType}-${item.contentId}`} style={styles.masteryItemCard}>
                      <View style={styles.masteryItemHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.masteryItemTitle}>{item.title}</Text>
                          <Text style={styles.masteryItemSubtitle}>
                            Last active: {formatDate(item.lastActivityAt)}
                          </Text>
                        </View>
                        <ContentMasteryBadge
                          status="PROGRESSING"
                          completionPercent={item.progressPercent}
                          showPercent
                          size="sm"
                        />
                      </View>

                      {/* Progress Bar */}
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${Math.max(8, item.progressPercent)}%` },
                          ]}
                        />
                      </View>

                      <View style={styles.masteryItemFooter}>
                        <Text style={styles.masteryActionPrompt}>{item.resumeActionTitle}</Text>
                        <Button
                          title="Resume"
                          variant="primary"
                          size="sm"
                          rightIcon={<Icon name="chevron-right" size={14} color="#FFFFFF" />}
                          onPress={() => {
                            if (item.contentType === 'EXERCISE' || item.contentType === 'TUTORIAL') {
                              navigation.navigate('ExerciseTutorial', {
                                exerciseId: item.contentId,
                                initialMode: 'MOVEMENT_BREAKDOWN',
                              });
                            }
                          }}
                        />
                      </View>
                    </Card>
                  ))}
                </View>
              )}

              {/* Mastered Content */}
              {masterySummary?.recentlyLearned && masterySummary.recentlyLearned.length > 0 && (
                <View style={styles.masterySection}>
                  <Text style={styles.sectionHeading}>Recently Mastered & Completed</Text>
                  {masterySummary.recentlyLearned.map((item) => (
                    <Card key={`${item.contentType}-${item.contentId}`} style={styles.masteryDoneCard}>
                      <View style={styles.masteryItemHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.masteryItemTitle}>{item.title}</Text>
                          <Text style={styles.masteryItemSubtitle}>
                            Completed {formatDate(item.completedAt)}
                          </Text>
                        </View>
                        <ContentMasteryBadge status={item.status} size="sm" />
                      </View>
                    </Card>
                  ))}
                </View>
              )}

              {/* Review Queue if any */}
              {masterySummary?.reviewItems && masterySummary.reviewItems.length > 0 && (
                <View style={styles.masterySection}>
                  <View style={styles.reviewSectionHeader}>
                    <Icon name="alert-circle" size={16} color="#F59E0B" />
                    <Text style={styles.reviewSectionTitle}>Technique & Concept Review</Text>
                  </View>
                  {masterySummary.reviewItems.map((item) => (
                    <Card key={`${item.contentType}-${item.contentId}`} style={styles.reviewCard}>
                      <View style={styles.reviewCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reviewTitle}>{item.title}</Text>
                          <Text style={styles.reviewReason}>{item.reason}</Text>
                        </View>
                        <ContentMasteryBadge status="REVIEW" score={item.score} size="sm" />
                      </View>
                      <Button
                        title="Start Targeted Review"
                        variant="primary"
                        size="sm"
                        onPress={() =>
                          navigation.navigate('ExerciseTutorial', {
                            exerciseId: item.contentId,
                            initialMode: 'MOVEMENT_BREAKDOWN',
                          })
                        }
                        style={styles.reviewStartBtn}
                      />
                    </Card>
                  ))}
                </View>
              )}

              {/* All Mastery Checkpoints if present */}
              {masteryList && masteryList.length > 0 && (
                <View style={styles.masterySection}>
                  <Text style={styles.sectionHeading}>All Curriculum Checkpoints ({masteryList.length})</Text>
                  {masteryList.map((rec) => (
                    <Card key={rec.id} style={styles.masteryItemCard}>
                      <View style={styles.masteryItemHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.masteryItemTitle}>{rec.contentTitle || rec.contentId}</Text>
                          <Text style={styles.masteryItemSubtitle}>
                            {rec.sectionsCompleted.length} sections done • {rec.contentType}
                          </Text>
                        </View>
                        <ContentMasteryBadge
                          status={rec.status}
                          completionPercent={rec.completionPercent}
                          score={rec.knowledgeCheckScore}
                          showPercent
                          size="sm"
                        />
                      </View>
                    </Card>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* TAB 1: ACTIVE LEARNING PATHS */}
          {activeTab === 'ACTIVE' && (
            <View>
              {/* Day 78: Review Recommended Section */}
              {recommendations?.reviewRecommended && recommendations.reviewRecommended.length > 0 && (
                <View style={styles.reviewSection}>
                  <View style={styles.reviewSectionHeader}>
                    <Icon name="alert-circle" size={16} color="#F59E0B" />
                    <Text style={styles.reviewSectionTitle}>Technique Review Recommended</Text>
                  </View>
                  {recommendations.reviewRecommended.map((rec) => (
                    <Card key={rec.exerciseId} style={styles.reviewCard}>
                      <View style={styles.reviewCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reviewTitle}>{rec.name}</Text>
                          <Text style={styles.reviewReason}>{rec.reason}</Text>
                        </View>
                        {rec.lastScore !== undefined && rec.lastScore !== null && (
                          <Badge
                            label={`Score: ${rec.lastScore}%`}
                            variant={rec.lastScore < 70 ? 'danger' : 'warning'}
                          />
                        )}
                      </View>
                      <Button
                        title="Start Targeted Review"
                        variant="primary"
                        size="sm"
                        onPress={() =>
                          navigation.navigate('ExerciseTutorial', {
                            exerciseId: rec.exerciseId,
                            initialMode: 'MOVEMENT_BREAKDOWN',
                          })
                        }
                        style={styles.reviewStartBtn}
                      />
                    </Card>
                  ))}
                </View>
              )}

              {overview?.activePaths && overview.activePaths.length > 0 ? (
                overview.activePaths.map((path) => (
                  <Card key={path.id} style={styles.pathCard}>
                    <View style={styles.pathHeader}>
                      <View style={styles.badgeRow}>
                        {path.category && (
                          <Badge
                            label={path.category.replace(/_/g, ' ')}
                            variant="primary"
                          />
                        )}
                        <Badge label={path.difficulty} variant="neutral" />
                      </View>
                      <Text style={styles.pctBadge}>{path.percentComplete}%</Text>
                    </View>

                    <Text style={styles.pathTitle}>{path.title}</Text>
                    {path.description ? (
                      <Text style={styles.pathDesc} numberOfLines={2}>
                        {path.description}
                      </Text>
                    ) : null}

                    {/* Progress Bar */}
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${Math.max(6, path.percentComplete)}%` },
                        ]}
                      />
                    </View>

                    <View style={styles.pathFooter}>
                      <Text style={styles.lessonMetaText}>
                        {path.completedLessons} of {path.totalLessons} Lessons Finished
                      </Text>

                      <Button
                        title="Continue"
                        variant="primary"
                        size="sm"
                        rightIcon={<Icon name="chevron-right" size={14} color="#FFFFFF" />}
                        onPress={() => handleOpenPathOverview(path.id, path.title)}
                      />
                    </View>
                  </Card>
                ))
              ) : (
                <Card style={styles.emptyCard}>
                  <Icon name="award" size={32} color={themeColors.textSecondary} />
                  <Text style={styles.emptyTitle}>No Active Learning Paths</Text>
                  <Text style={styles.emptyDesc}>
                    You haven't started a learning path yet. Explore our masterclasses to begin!
                  </Text>
                  <Button
                    title="Browse Masterclasses"
                    variant="primary"
                    size="sm"
                    onPress={() => navigation.navigate('LearningPaths')}
                    style={{ marginTop: spacing.sm }}
                  />
                </Card>
              )}
            </View>
          )}

          {/* TAB 2: COMPLETED LEARNING PATHS */}
          {activeTab === 'COMPLETED' && (
            <View>
              {overview?.completedPaths && overview.completedPaths.length > 0 ? (
                overview.completedPaths.map((path) => (
                  <Card key={path.id} style={[styles.pathCard, styles.pathCardDone]}>
                    <View style={styles.pathHeader}>
                      <View style={styles.badgeRow}>
                        <Badge label="COMPLETED" variant="success" />
                        {path.category && (
                          <Badge
                            label={path.category.replace(/_/g, ' ')}
                            variant="primary"
                          />
                        )}
                      </View>
                      <Text style={styles.completedDateText}>
                        {formatDate(path.completedAt)}
                      </Text>
                    </View>

                    <Text style={styles.pathTitle}>{path.title}</Text>
                    {path.description ? (
                      <Text style={styles.pathDesc} numberOfLines={2}>
                        {path.description}
                      </Text>
                    ) : null}

                    <View style={styles.pathFooter}>
                      <View style={styles.masteryInfo}>
                        <Icon name="check-circle" size={14} color={themeColors.success} />
                        <Text style={styles.masteryText}>
                          All {path.totalLessons} lessons mastered
                        </Text>
                      </View>

                      <Button
                        title="Review Course"
                        variant="outline"
                        size="sm"
                        onPress={() => handleOpenPathOverview(path.id, path.title)}
                      />
                    </View>
                  </Card>
                ))
              ) : (
                <Card style={styles.emptyCard}>
                  <Icon name="award" size={32} color={themeColors.textSecondary} />
                  <Text style={styles.emptyTitle}>No Completed Masterclasses</Text>
                  <Text style={styles.emptyDesc}>
                    Finish all lessons in a guided path to earn your course completion badge here.
                  </Text>
                </Card>
              )}
            </View>
          )}

          {/* TAB 3: EXPLORED COLLECTIONS */}
          {activeTab === 'COLLECTIONS' && (
            <View>
              {overview?.exploredCollections && overview.exploredCollections.length > 0 ? (
                overview.exploredCollections.map((col) => (
                  <TouchableOpacity
                    key={col.id}
                    activeOpacity={0.85}
                    onPress={() => handleOpenCollection(col.id, col.title)}
                    style={{ marginBottom: spacing.sm }}
                  >
                    <Card style={styles.collectionCard}>
                      <View style={styles.collectionIconHalo}>
                        <Icon name="activity" size={18} color={themeColors.accent} />
                      </View>
                      <View style={styles.collectionInfo}>
                        <Text style={styles.collectionTitle}>{col.title}</Text>
                        <Text style={styles.collectionMeta}>
                          {col.exerciseCount} Exercises · {col.category || 'Curated'}
                        </Text>
                      </View>
                      <Icon name="chevron-right" size={16} color={themeColors.textSecondary} />
                    </Card>
                  </TouchableOpacity>
                ))
              ) : (
                <Card style={styles.emptyCard}>
                  <Icon name="activity" size={32} color={themeColors.textSecondary} />
                  <Text style={styles.emptyTitle}>No Collections Explored</Text>
                  <Text style={styles.emptyDesc}>
                    Workout packs, mobility series, and warmups you explore will be saved here.
                  </Text>
                  <Button
                    title="Browse Collections"
                    variant="accent"
                    size="sm"
                    onPress={() => navigation.navigate('ExerciseCollections')}
                    style={{ marginTop: spacing.sm }}
                  />
                </Card>
              )}
            </View>
          )}

          {/* TAB 4: HISTORY LOG */}
          {activeTab === 'HISTORY' && (
            <View>
              {historyItems.length > 0 ? (
                historyItems.map((item) => (
                  <Card key={item.id} style={styles.historyCard}>
                    <View style={styles.historyTopRow}>
                      <View style={styles.historyIconCircle}>
                        <Icon name="check" size={12} color={themeColors.success} />
                      </View>
                      <View style={styles.historyMain}>
                        <Text style={styles.historyLessonTitle}>{item.lessonTitle}</Text>
                        <Text style={styles.historyPathTitle}>{item.pathTitle}</Text>
                      </View>
                      <Text style={styles.historyDate}>{formatDate(item.completedAt)}</Text>
                    </View>

                    {item.exerciseName && (
                      <View style={styles.historyExRow}>
                        <Icon name="dumbbell" size={12} color={themeColors.primary} />
                        <Text style={styles.historyExText}>
                          Taught Movement: {item.exerciseName}
                        </Text>
                      </View>
                    )}
                  </Card>
                ))
              ) : (
                <Card style={styles.emptyCard}>
                  <Icon name="clock" size={32} color={themeColors.textSecondary} />
                  <Text style={styles.emptyTitle}>No Lesson History</Text>
                  <Text style={styles.emptyDesc}>
                    Every time you complete a guided movement lesson, it will be logged here.
                  </Text>
                </Card>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Day 78: Personalization Settings Modal */}
      <PersonalizeLearningModal
        visible={showPreferencesModal}
        preferences={preferences}
        onClose={() => setShowPreferencesModal(false)}
        onSave={handleUpdatePreferences}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: themeColors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    borderBottomWidth: 2,
    borderBottomColor: themeColors.primary,
  },
  tabText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: themeColors.textSecondary,
  },
  tabTextActive: {
    color: themeColors.primary,
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  pathCard: {
    backgroundColor: themeColors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginBottom: spacing.md,
  },
  pathCardDone: {
    borderColor: 'rgba(76, 175, 80, 0.25)',
  },
  pathHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pctBadge: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '800',
    color: themeColors.primary,
  },
  completedDateText: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.success,
    fontWeight: '600',
  },
  pathTitle: {
    ...typography.subtitle,
    fontSize: 16,
    fontWeight: '800',
    color: themeColors.textPrimary,
    marginBottom: 4,
  },
  pathDesc: {
    ...typography.body,
    fontSize: 12,
    color: themeColors.textSecondary,
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: themeColors.primary,
    borderRadius: radius.full,
  },
  pathFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  lessonMetaText: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textSecondary,
  },
  masteryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  masteryText: {
    ...typography.caption,
    fontSize: 12,
    color: themeColors.success,
    fontWeight: '600',
  },
  collectionCard: {
    backgroundColor: themeColors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  collectionIconHalo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 200, 180, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionInfo: {
    flex: 1,
  },
  collectionTitle: {
    ...typography.subtitle,
    fontSize: 14,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  collectionMeta: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  historyCard: {
    backgroundColor: themeColors.surface,
    padding: spacing.sm + 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginBottom: spacing.xs + 2,
  },
  historyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  historyIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyMain: {
    flex: 1,
  },
  historyLessonTitle: {
    ...typography.subtitle,
    fontSize: 13,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  historyPathTitle: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textSecondary,
  },
  historyDate: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textSecondary,
  },
  historyExRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  historyExText: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.primary,
  },
  emptyCard: {
    backgroundColor: themeColors.surface,
    padding: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typography.subtitle,
    fontSize: 15,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginTop: spacing.xs,
  },
  emptyDesc: {
    ...typography.body,
    fontSize: 12,
    color: themeColors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
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
  settingsButton: {
    padding: spacing.xs,
  },
  reviewSection: {
    marginBottom: spacing.md,
  },
  reviewSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  reviewSectionTitle: {
    ...typography.subtitle,
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '700',
  },
  reviewCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
    gap: 8,
  },
  reviewTitle: {
    ...typography.body,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  reviewReason: {
    ...typography.caption,
    color: '#CBD5E1',
    marginTop: 2,
  },
  reviewStartBtn: {
    marginTop: spacing.xs,
  },
  sectionHeading: {
    ...typography.subtitle,
    fontSize: 14,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginBottom: spacing.xs,
  },
  masterySection: {
    marginBottom: spacing.md,
  },
  masteryItemCard: {
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginBottom: spacing.xs,
  },
  masteryDoneCard: {
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    marginBottom: spacing.xs,
  },
  masteryItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  masteryItemTitle: {
    ...typography.subtitle,
    fontSize: 14,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  masteryItemSubtitle: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  masteryItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  masteryActionPrompt: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textMuted,
  },
});
