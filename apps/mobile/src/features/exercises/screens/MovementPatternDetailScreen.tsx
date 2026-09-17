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
  MovementPatternDetailData,
} from '../services/exerciseService';

export const MovementPatternDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { pattern, patternName: fallbackName } = route.params || {};

  const [detail, setDetail] = useState<MovementPatternDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPatternDetail = useCallback(async () => {
    if (!pattern) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await ExerciseService.getMovementPatternDetail(pattern);
      setDetail(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load movement pattern details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pattern]);

  useEffect(() => {
    loadPatternDetail();
  }, [loadPatternDetail]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPatternDetail();
  };

  const displayName = detail?.name || fallbackName || pattern?.replace(/_/g, ' ') || 'Movement Pattern';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Navigation Bar */}
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
          <Text style={styles.navSub}>Movement Biomechanics & Fundamentals</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Loading movement pattern biomechanics...</Text>
        </View>
      ) : error || !detail ? (
        <View style={styles.centerContainer}>
          <Icon name="alert-circle" size={40} color="#EF4444" />
          <Text style={styles.errorText}>{error || 'Movement pattern information unavailable'}</Text>
          <Button
            title="Try Again"
            variant="primary"
            size="sm"
            onPress={loadPatternDetail}
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
          {/* Hero Movement Pattern Header */}
          <Card style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroIconCircle}>
                <Icon name="bolt" size={20} color={themeColors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroOverline}>FOUNDATIONAL MOVEMENT PATTERN</Text>
                <Text style={styles.heroTitle}>{detail.name}</Text>
              </View>
              <Badge label={detail.code} variant="primary" />
            </View>

            <Text style={styles.definitionText}>{detail.definition}</Text>
            <Text style={styles.descriptionText}>{detail.description}</Text>
          </Card>

          {/* Joint Actions & Mechanics */}
          {Array.isArray(detail.primaryJointActions) && detail.primaryJointActions.length > 0 && (
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <Icon name="activity" size={16} color={themeColors.accent} />
                <Text style={styles.cardHeading}>PRIMARY JOINT ACTIONS</Text>
              </View>
              <View style={styles.actionsList}>
                {detail.primaryJointActions.map((action, idx) => (
                  <View key={idx} style={styles.actionRow}>
                    <Icon name="check-circle" size={14} color={themeColors.accent} />
                    <Text style={styles.actionText}>{action}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* Common Body Positions */}
          {Array.isArray(detail.commonBodyPositions) && detail.commonBodyPositions.length > 0 && (
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <Icon name="user" size={16} color={themeColors.primary} />
                <Text style={styles.cardHeading}>COMMON BODY POSITIONS</Text>
              </View>
              <View style={styles.tagsWrap}>
                {detail.commonBodyPositions.map((pos, idx) => (
                  <View key={idx} style={styles.positionTag}>
                    <Text style={styles.positionTagText}>{pos}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* Common Exercises using this Pattern */}
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="dumbbell" size={16} color={themeColors.primary} />
              <Text style={styles.cardHeading}>
                COMMON EXERCISES ({detail.exercises.length})
              </Text>
            </View>
            <Text style={styles.cardSub}>
              Exercises built upon this fundamental kinetic pattern:
            </Text>

            {detail.exercises.length === 0 ? (
              <Text style={styles.emptyText}>No exercises currently cataloged for this pattern.</Text>
            ) : (
              <View style={styles.exercisesList}>
                {detail.exercises.map((ex) => (
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
                        {ex.primaryMuscleGroup.replace(/_/g, ' ')} • {ex.equipment} • {ex.difficulty}
                      </Text>
                    </View>
                    <Icon name="chevron-right" size={16} color={themeColors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card>

          {/* Related Academy Curricula */}
          {Array.isArray(detail.relatedCurricula) && detail.relatedCurricula.length > 0 && (
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <Icon name="award" size={16} color={themeColors.accent} />
                <Text style={styles.cardHeading}>FITNESS ACADEMY CURRICULUM</Text>
              </View>
              <View style={styles.curriculaList}>
                {detail.relatedCurricula.map((curr) => (
                  <TouchableOpacity
                    key={curr.id}
                    style={styles.currItem}
                    activeOpacity={0.7}
                    onPress={() =>
                      navigation.navigate('CurriculumDetail', {
                        curriculumId: curr.id,
                        title: curr.title,
                      })
                    }
                  >
                    <View style={styles.currIconCircle}>
                      <Icon name="award" size={14} color={themeColors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.currTitle}>{curr.title}</Text>
                      <Text style={styles.currCat}>{curr.category.replace(/_/g, ' ')}</Text>
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
  definitionText: {
    ...typography.body1,
    color: themeColors.textPrimary,
    lineHeight: 22,
    marginTop: spacing[2],
    fontWeight: '500',
  },
  descriptionText: {
    ...typography.body2,
    color: themeColors.textSecondary,
    lineHeight: 20,
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
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  positionTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
  },
  positionTagText: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '600',
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
  curriculaList: {
    gap: spacing[2],
  },
  currItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    backgroundColor: themeColors.surfaceElevated,
    borderRadius: radius.sm,
  },
  currIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currTitle: {
    ...typography.body2,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  currCat: {
    ...typography.caption,
    color: themeColors.accent,
    marginTop: 2,
  },
});
