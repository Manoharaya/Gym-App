import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { themeColors, typography, spacing } from '../../../theme';
import { Card, Icon } from '../../../components/primitives';
import {
  ExerciseService,
  ExerciseTutorialResponse,
  TutorialUserProgress,
  TutorialMode,
  TutorialSection,
  PersonalizedTutorialPlan,
  TargetedReviewResponse,
  LearningPreferencesResponse,
  UpdateLearningPreferencesPayload,
} from '../services/exerciseService';
import { InteractiveExerciseTutorial } from '../components/InteractiveExerciseTutorial';
import type { MemberStackParamList } from '../../../navigation/types';

type TutorialScreenRouteProp = RouteProp<MemberStackParamList, 'ExerciseTutorial'>;
type TutorialScreenNavProp = NativeStackNavigationProp<MemberStackParamList>;

export const ExerciseTutorialScreen: React.FC = () => {
  const route = useRoute<TutorialScreenRouteProp>();
  const navigation = useNavigation<TutorialScreenNavProp>();
  const { exerciseId, initialMode } = route.params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tutorialData, setTutorialData] = useState<ExerciseTutorialResponse | null>(null);
  const [userProgress, setUserProgress] = useState<TutorialUserProgress | null>(null);
  const [personalizedPlan, setPersonalizedPlan] = useState<PersonalizedTutorialPlan | null>(null);
  const [targetedReview, setTargetedReview] = useState<TargetedReviewResponse | null>(null);
  const [preferences, setPreferences] = useState<LearningPreferencesResponse | null>(null);

  const fetchTutorial = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [personalizedData, reviewData, prefsData] = await Promise.all([
        ExerciseService.getPersonalizedTutorial(exerciseId).catch(async () => {
          const fallback = await ExerciseService.getExerciseTutorial(exerciseId);
          return {
            exerciseId,
            tutorial: fallback,
            plan: null as any,
            learningContext: null as any,
          };
        }),
        ExerciseService.getTargetedReview(exerciseId).catch(() => null),
        ExerciseService.getLearningPreferences().catch(() => null),
      ]);

      if (personalizedData?.tutorial) {
        setTutorialData(personalizedData.tutorial);
        setPersonalizedPlan(personalizedData.plan || null);
        if (personalizedData.tutorial.userProgress) {
          setUserProgress(personalizedData.tutorial.userProgress);
        }
      }
      setTargetedReview(reviewData);
      setPreferences(prefsData);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to load exercise tutorial. Please check your connection.',
      );
    } finally {
      setLoading(false);
    }
  }, [exerciseId]);

  useEffect(() => {
    fetchTutorial();
  }, [fetchTutorial]);

  const handleUpdateProgress = async (payload: {
    mode?: TutorialMode;
    phaseIndex?: number;
    stepIndex?: number;
    section?: TutorialSection;
    checklistState?: Record<string, boolean>;
    practiceCompleted?: boolean;
    timeSpentSeconds?: number;
  }) => {
    try {
      const updated = await ExerciseService.recordTutorialProgress(exerciseId, payload);
      setUserProgress(updated);
    } catch (err) {
      console.warn('Silent progress sync error:', err);
    }
  };

  const handleCompleteTutorial = async (score?: number) => {
    try {
      const completed = await ExerciseService.completeTutorial(exerciseId, {
        knowledgeCheckScore: score,
        timeSpentSeconds: 60,
      });
      setUserProgress(completed);
    } catch (err) {
      console.warn('Failed to record completion:', err);
    }
  };

  const handleNavigateToMuscle = (muscleCode: string) => {
    navigation.navigate('MuscleDetail', { muscleCode });
  };

  const handleNavigateToMovement = (pattern: string) => {
    navigation.navigate('MovementPatternDetail', { pattern });
  };

  const handleLaunchKnowledgeCheck = (checkId: string) => {
    navigation.navigate('KnowledgeCheck', { checkId });
  };

  const handleUpdatePreferences = async (payload: UpdateLearningPreferencesPayload) => {
    try {
      const updated = await ExerciseService.updateLearningPreferences(payload);
      setPreferences(updated);
      await fetchTutorial();
    } catch (err) {
      console.warn('Failed to update preferences:', err);
    }
  };

  const handleResetPreferences = async () => {
    try {
      const reset = await ExerciseService.resetLearningPreferences();
      setPreferences(reset);
      await fetchTutorial();
    } catch (err) {
      console.warn('Failed to reset preferences:', err);
    }
  };

  const handleExit = () => {
    navigation.goBack();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={themeColors.accent} />
        <Text style={styles.loadingText}>Preparing Interactive Tutorial...</Text>
      </View>
    );
  }

  if (error || !tutorialData) {
    return (
      <View style={styles.centerContainer}>
        <Card style={styles.errorCard}>
          <Icon name="alert-circle" size={32} color="#EF4444" />
          <Text style={styles.errorTitle}>Tutorial Unavailable</Text>
          <Text style={styles.errorMsg}>{error || 'Could not find exercise'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchTutorial}>
            <Text style={styles.retryBtnText}>Retry Loading</Text>
          </TouchableOpacity>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <InteractiveExerciseTutorial
        tutorial={tutorialData}
        initialMode={(initialMode as TutorialMode) || 'STEP_BY_STEP'}
        userProgress={userProgress}
        personalizedPlan={personalizedPlan || undefined}
        targetedReview={targetedReview}
        learningPreferences={preferences}
        onUpdatePreferences={handleUpdatePreferences}
        onResetPreferences={handleResetPreferences}
        onUpdateProgress={handleUpdateProgress}
        onCompleteTutorial={handleCompleteTutorial}
        onNavigateToMuscle={handleNavigateToMuscle}
        onNavigateToMovementPattern={handleNavigateToMovement}
        onLaunchKnowledgeCheck={handleLaunchKnowledgeCheck}
        onExitTutorial={handleExit}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeColors.background,
    padding: spacing[4],
  },
  loadingText: {
    ...typography.bodySm,
    color: themeColors.textSecondary,
    marginTop: spacing[3],
  },
  errorCard: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    padding: spacing[6],
    backgroundColor: themeColors.cardBackground,
  },
  errorTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
    marginTop: spacing[3],
    marginBottom: spacing[1],
  },
  errorMsg: {
    ...typography.bodySm,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  retryBtn: {
    backgroundColor: themeColors.accent,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: 8,
  },
  retryBtnText: {
    ...typography.button,
    color: '#000000',
    fontWeight: '700',
  },
});
