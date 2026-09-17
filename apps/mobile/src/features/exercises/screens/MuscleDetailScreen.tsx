import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Card, Badge, Icon, Button } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import {
  ExerciseService,
  MuscleDetailData,
} from '../services/exerciseService';

export const MuscleDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { muscleCode, muscleName: fallbackName } = route.params || {};

  const [detail, setDetail] = useState<MuscleDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exerciseTab, setExerciseTab] = useState<'primary' | 'secondary'>('primary');

  const loadMuscleDetail = useCallback(async () => {
    if (!muscleCode) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await ExerciseService.getMuscleDetail(muscleCode);
      setDetail(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load muscle anatomy details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [muscleCode]);

  useEffect(() => {
    loadMuscleDetail();
  }, [loadMuscleDetail]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMuscleDetail();
  };

  const displayName = detail?.name || fallbackName || muscleCode?.replace(/_/g, ' ') || 'Muscle Detail';
  const currentExercises =
    exerciseTab === 'primary'
      ? detail?.exercises.primary || []
      : detail?.exercises.secondary || [];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.navTitleWrap}>
          <Text style={styles.navTitle} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.navSub}>Visual Anatomy & Muscle Education</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Loading muscle anatomy...</Text>
        </View>
      ) : error || !detail ? (
        <View style={styles.centerContainer}>
          <Icon name="alert-circle" size={40} color="#EF4444" />
          <Text style={styles.errorText}>{error || 'Muscle information unavailable'}</Text>
          <Button
            title="Try Again"
            variant="primary"
            size="sm"
            onPress={loadMuscleDetail}
            style={{ marginTop: spacing[3] }}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={themeColors.primary}
            />
          }
        >
          {/* Hero Muscle Header Card */}
          <Card style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroIconCircle}>
                <Icon name="activity" size={20} color={themeColors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroOverline}>ANATOMICAL MUSCLE PROFILE</Text>
                <Text style={styles.heroTitle}>{detail.name}</Text>
              </View>
              <Badge
                label={detail.region}
                variant={detail.region === 'ANTERIOR' ? 'primary' : 'accent'}
              />
            </View>

            <View style={styles.heroMetaStrip}>
              <View style={styles.metaBadge}>
                <Icon name="user" size={12} color={themeColors.textSecondary} />
                <Text style={styles.metaBadgeText}>
                  Region: {detail.group.replace(/_/g, ' ')}
                </Text>
              </View>
              <View style={styles.metaBadge}>
                <Icon name="dumbbell" size={12} color={themeColors.textSecondary} />
                <Text style={styles.metaBadgeText}>
                  {detail.exercises.primary.length} Primary • {detail.exercises.secondary.length} Synergist
                </Text>
              </View>
            </View>

            <Text style={styles.heroDescription}>
              {detail.educationalDescription}
            </Text>
          </Card>

          {/* Biomechanical Joint Actions */}
          {Array.isArray(detail.primaryActions) && detail.primaryActions.length > 0 && (
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <Icon name="bolt" size={16} color={themeColors.accent} />
                <Text style={styles.cardHeading}>PRIMARY FUNCTIONAL ACTIONS</Text>
              </View>
              <View style={styles.actionsList}>
                {detail.primaryActions.map((action, idx) => (
                  <View key={idx} style={styles.actionRow}>
                    <Icon name="check-circle" size={14} color={themeColors.accent} />
                    <Text style={styles.actionText}>{action}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* Synergist Muscles */}
          {Array.isArray(detail.synergistMuscles) && detail.synergistMuscles.length > 0 && (
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <Icon name="users" size={16} color={themeColors.primary} />
                <Text style={styles.cardHeading}>COOPERATING SYNERGIST MUSCLES</Text>
              </View>
              <Text style={styles.synergistExplanation}>
                Muscles that co-contract or assist during complex kinetic chain movements:
              </Text>
              <View style={styles.chipsWrap}>
                {detail.synergistMuscles.map((syn, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.synergistChip}
                    onPress={() =>
                      navigation.push('MuscleDetail', {
                        muscleCode: syn,
                        muscleName: syn.replace(/_/g, ' '),
                      })
                    }
                  >
                    <Text style={styles.synergistChipText}>
                      {syn.replace(/_/g, ' ')}
                    </Text>
                    <Icon name="chevron-right" size={12} color={themeColors.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          )}

          {/* Exercises Section with Tabs: Primary vs Synergist */}
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="dumbbell" size={16} color={themeColors.primary} />
              <Text style={styles.cardHeading}>EXERCISES TARGETING THIS MUSCLE</Text>
            </View>

            {/* Sub-tab pills */}
            <View style={styles.tabsRow}>
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  exerciseTab === 'primary' && styles.tabBtnActive,
                ]}
                onPress={() => setExerciseTab('primary')}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    exerciseTab === 'primary' && styles.tabBtnTextActive,
                  ]}
                >
                  Primary Target ({detail.exercises.primary.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  exerciseTab === 'secondary' && styles.tabBtnActive,
                ]}
                onPress={() => setExerciseTab('secondary')}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    exerciseTab === 'secondary' && styles.tabBtnTextActive,
                  ]}
                >
                  Assisting Synergist ({detail.exercises.secondary.length})
                </Text>
              </TouchableOpacity>
            </View>

            {currentExercises.length === 0 ? (
              <Text style={styles.emptyText}>
                No exercises currently cataloged in this role for {detail.name}.
              </Text>
            ) : (
              <View style={styles.exercisesList}>
                {currentExercises.map((ex) => (
                  <TouchableOpacity
                    key={ex.id}
                    style={styles.exerciseItem}
                    activeOpacity={0.7}
                    onPress={() =>
                      navigation.navigate('ExerciseDetail', {
                        exerciseId: ex.id,
                        exerciseName: ex.name,
                      })
                    }
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exerciseName}>{ex.name}</Text>
                      <Text style={styles.exerciseMeta}>
                        {ex.movementPattern} • {ex.equipment} • {ex.difficulty}
                      </Text>
                    </View>
                    <Icon name="chevron-right" size={16} color={themeColors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card>

          {/* Related Academy Learning */}
          {Array.isArray(detail.relatedLessons) && detail.relatedLessons.length > 0 && (
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <Icon name="award" size={16} color={themeColors.accent} />
                <Text style={styles.cardHeading}>FITNESS ACADEMY LESSONS</Text>
              </View>
              <Text style={styles.cardSub}>
                Learn anatomy fundamentals, muscle contraction, and safe exercise form:
              </Text>
              <View style={styles.lessonsList}>
                {detail.relatedLessons.map((lesson) => (
                  <TouchableOpacity
                    key={lesson.id}
                    style={styles.lessonItem}
                    activeOpacity={0.7}
                    onPress={() =>
                      navigation.navigate('LearningLesson', {
                        pathId: lesson.learningPathId,
                        lessonId: lesson.id,
                        title: lesson.title,
                      })
                    }
                  >
                    <View style={styles.lessonIconCircle}>
                      <Icon name="award" size={14} color={themeColors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lessonTitle}>{lesson.title}</Text>
                      <Text style={styles.lessonPathTitle}>
                        Path: {lesson.learningPathTitle}
                      </Text>
                    </View>
                    <Icon name="chevron-right" size={14} color={themeColors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: themeColors.surface,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginRight: spacing[3],
  },
  navTitleWrap: {
    flex: 1,
  },
  navTitle: {
    ...typography.subtitle1,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  navSub: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  loadingText: {
    ...typography.body2,
    color: themeColors.textSecondary,
    marginTop: spacing[3],
  },
  errorText: {
    ...typography.body2,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: spacing[2],
  },
  contentScroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[12],
    gap: spacing[4],
  },
  heroCard: {
    padding: spacing[4],
    backgroundColor: themeColors.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[2],
  },
  heroIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOverline: {
    ...typography.caption,
    color: themeColors.primary,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  heroTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  heroMetaStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginVertical: spacing[2],
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.xs,
  },
  metaBadgeText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
  },
  heroDescription: {
    ...typography.body1,
    color: themeColors.textPrimary,
    lineHeight: 22,
    marginTop: spacing[2],
  },
  card: {
    padding: spacing[4],
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  cardHeading: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  cardSub: {
    ...typography.body2,
    color: themeColors.textSecondary,
    marginBottom: spacing[3],
  },
  actionsList: {
    gap: spacing[2],
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  actionText: {
    ...typography.body2,
    color: themeColors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  synergistExplanation: {
    ...typography.body2,
    color: themeColors.textSecondary,
    marginBottom: spacing[3],
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  synergistChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
  },
  synergistChipText: {
    ...typography.caption,
    color: themeColors.primary,
    fontWeight: '600',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing[2],
    alignItems: 'center',
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: themeColors.primary,
  },
  tabBtnText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: themeColors.primary,
    fontWeight: '700',
  },
  emptyText: {
    ...typography.body2,
    color: themeColors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: spacing[2],
  },
  exercisesList: {
    gap: spacing[2],
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    backgroundColor: themeColors.surfaceElevated,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  exerciseName: {
    ...typography.subtitle2,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  exerciseMeta: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  lessonsList: {
    gap: spacing[2],
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    backgroundColor: themeColors.surfaceElevated,
    borderRadius: radius.sm,
  },
  lessonIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonTitle: {
    ...typography.body2,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  lessonPathTitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
});
