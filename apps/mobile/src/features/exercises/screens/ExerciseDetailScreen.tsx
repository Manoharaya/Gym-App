import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { MemberStackParamList } from '../../../navigation/types';
import { Screen, Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing } from '../../../theme';
import { ExerciseService } from '../services/exerciseService';
import type { Exercise } from '@fitcore/types';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
  xl: spacing[8],
  xxl: spacing[12],
};

const colors = {
  ...themeColors,
  primary: themeColors.primary,
  accent: themeColors.accent,
  textTertiary: themeColors.textMuted,
  surfaceHighlight: themeColors.surfaceElevated,
};

type RouteProps = RouteProp<MemberStackParamList, 'ExerciseDetail'>;

export const ExerciseDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { exerciseId, exerciseName: fallbackName } = route.params || {};

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (exerciseId) {
      ExerciseService.getExerciseById(exerciseId)
        .then((data) => {
          if (isMounted) setExercise(data);
        })
        .catch((err) => {
          console.warn('Failed to load exercise details:', err);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    } else {
      setLoading(false);
    }
    return () => {
      isMounted = false;
    };
  }, [exerciseId]);

  const name = exercise?.name || fallbackName || 'Exercise';
  const instructionsList: string[] = exercise?.instructions
    ? exercise.instructions.split('\n').filter((s) => s.trim().length > 0)
    : [];
  const cues: string[] = Array.isArray(exercise?.coachingCues)
    ? (exercise.coachingCues as string[])
    : [];

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Exercise Detail</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading exercise details...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* Title & Taxonomy Badges */}
          <View style={styles.titleSection}>
            <Text style={styles.exerciseTitle}>{name}</Text>
            <View style={styles.badgeRow}>
              {exercise?.primaryMuscleGroup && (
                <Badge label={exercise.primaryMuscleGroup} variant="accent" />
              )}
              {exercise?.difficulty && (
                <Badge label={exercise.difficulty} variant="primary" />
              )}
              {exercise?.equipment && (
                <Badge label={exercise.equipment} variant="neutral" />
              )}
              {exercise?.movementPattern && (
                <Badge label={exercise.movementPattern} variant="neutral" />
              )}
            </View>
          </View>

          {/* Description */}
          {exercise?.description ? (
            <Card style={styles.card}>
              <Text style={styles.sectionHeading}>OVERVIEW</Text>
              <Text style={styles.bodyText}>{exercise.description}</Text>
            </Card>
          ) : null}

          {/* Coaching Cues */}
          {cues.length > 0 ? (
            <Card style={styles.cueCard}>
              <View style={styles.cueHeader}>
                <Icon name="sparkles" size={16} color={colors.accent} />
                <Text style={styles.cueHeaderTitle}>COACHING CUES</Text>
              </View>
              {cues.map((cue, index) => (
                <View key={index} style={styles.cueItem}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.cueText}>{cue}</Text>
                </View>
              ))}
            </Card>
          ) : null}

          {/* Execution Steps */}
          {instructionsList.length > 0 ? (
            <Card style={styles.card}>
              <Text style={styles.sectionHeading}>EXECUTION STEPS</Text>
              <View style={styles.stepsList}>
                {instructionsList.map((step, index) => (
                  <View key={index} style={styles.stepItem}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          {/* Safety Notes */}
          {exercise?.safetyNotes ? (
            <Card style={styles.safetyCard}>
              <View style={styles.safetyHeader}>
                <Icon name="alert-circle" size={16} color={colors.warning} />
                <Text style={styles.safetyHeaderTitle}>SAFETY & FORM CHECK</Text>
              </View>
              <Text style={styles.safetyText}>{exercise.safetyNotes}</Text>
            </Card>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp.lg,
    paddingVertical: sp.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  container: {
    paddingHorizontal: sp.lg,
    paddingBottom: sp.xxl,
    gap: sp.lg,
  },
  titleSection: {
    gap: sp.sm,
  },
  exerciseTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.xs,
  },
  card: {
    padding: sp.lg,
    gap: sp.sm,
  },
  sectionHeading: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 1,
  },
  bodyText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  cueCard: {
    padding: sp.lg,
    backgroundColor: colors.surface,
    borderColor: colors.accent,
    borderWidth: 1,
    gap: sp.sm,
  },
  cueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
  },
  cueHeaderTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1,
  },
  cueItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: sp.xs,
  },
  bulletPoint: {
    color: colors.accent,
    fontSize: 16,
    lineHeight: 20,
  },
  cueText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  stepsList: {
    gap: sp.md,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: sp.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  safetyCard: {
    padding: sp.lg,
    backgroundColor: colors.surface,
    borderColor: colors.warning,
    borderWidth: 1,
    gap: sp.xs,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
  },
  safetyHeaderTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.warning,
    letterSpacing: 1,
  },
  safetyText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: sp.sm,
  },
});
