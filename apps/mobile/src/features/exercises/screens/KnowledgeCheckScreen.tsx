import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { themeColors, typography, spacing } from '../../../theme';
import {
  ExerciseService,
  KnowledgeCheckPlayerDto,
  KnowledgeCheckAttemptResult,
  KnowledgeAttemptReview,
} from '../services/exerciseService';
import { KnowledgeCheckPlayer } from '../components/KnowledgeCheckPlayer';
import { KnowledgeCheckResultCard } from '../components/KnowledgeCheckResultCard';
import { KnowledgeCheckReviewModal } from '../components/KnowledgeCheckReviewModal';
import type { MemberStackParamList } from '../../../navigation/types';

type RouteType = RouteProp<MemberStackParamList, 'KnowledgeCheck'>;
type NavProp = NativeStackNavigationProp<MemberStackParamList>;

export const KnowledgeCheckScreen: React.FC = () => {
  const route = useRoute<RouteType>();
  const navigation = useNavigation<NavProp>();
  const { checkId, lessonId, pathId } = route.params;

  const [loading, setLoading] = useState(true);
  const [check, setCheck] = useState<KnowledgeCheckPlayerDto | null>(null);
  const [attempt, setAttempt] = useState<KnowledgeCheckAttemptResult | null>(null);
  const [completedResult, setCompletedResult] = useState<KnowledgeCheckAttemptResult | null>(null);

  // Review modal state
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewData, setReviewData] = useState<KnowledgeAttemptReview | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);

  // Timer tracking
  const startTimeRef = useRef<number>(Date.now());

  const initAssessment = useCallback(async () => {
    try {
      setLoading(true);
      // 1. Fetch player sanitized assessment schema
      const checkData = await ExerciseService.getKnowledgeCheckPlayer(checkId);
      setCheck(checkData);

      // 2. Start or resume attempt
      const attemptData = await ExerciseService.startKnowledgeAttempt(checkId, {
        lessonId,
        pathId,
      });
      setAttempt(attemptData);
      startTimeRef.current = Date.now();
    } catch (err: any) {
      console.warn('Failed to initialize knowledge check:', err);
      const message = err.response?.data?.message || err.message || 'Unable to load assessment';
      Alert.alert('Assessment Error', message, [
        { text: 'Go Back', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [checkId, lessonId, pathId, navigation]);

  useEffect(() => {
    initAssessment();
  }, [initAssessment]);

  // Submit individual question response
  const handleAnswerSubmit = async (payload: {
    questionId: string;
    selectedAnswerIds?: string[];
    orderedItemIds?: string[];
    matchingPairs?: Record<string, string>;
    hintsUsed?: boolean;
  }) => {
    if (!attempt) throw new Error('No active attempt');
    return await ExerciseService.submitQuestionResponse(attempt.id, payload);
  };

  // Complete assessment after last question
  const handleCompleteCheck = async () => {
    if (!attempt) return;
    try {
      const elapsedSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
      const result = await ExerciseService.completeKnowledgeAttempt(attempt.id, elapsedSeconds);
      setCompletedResult(result);
    } catch (err) {
      console.warn('Failed to complete knowledge check:', err);
      Alert.alert('Error', 'Unable to calculate final score. Please try again.');
    }
  };

  // Retake check
  const handleRetakeCheck = async () => {
    setCompletedResult(null);
    await initAssessment();
  };

  // Load audit review
  const handleOpenReview = async () => {
    if (!completedResult) return;
    try {
      setReviewModalVisible(true);
      setLoadingReview(true);
      const review = await ExerciseService.getAttemptReview(completedResult.id);
      setReviewData(review);
    } catch (err) {
      console.warn('Failed to load review:', err);
      Alert.alert('Error', 'Unable to retrieve answer review.');
    } finally {
      setLoadingReview(false);
    }
  };

  const handleContinue = () => {
    navigation.goBack();
  };

  const handleOpenExercise = (exerciseId: string) => {
    navigation.navigate('ExerciseDetail', { exerciseId });
  };

  if (loading || !check) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>Loading Knowledge Check...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {completedResult ? (
        <View style={styles.resultContainer}>
          <KnowledgeCheckResultCard
            result={completedResult}
            check={check}
            onReviewAnswers={handleOpenReview}
            onRetakeCheck={handleRetakeCheck}
            onContinue={handleContinue}
            onOpenRecommendedExercise={handleOpenExercise}
          />
        </View>
      ) : (
        <KnowledgeCheckPlayer
          check={check}
          onAnswerSubmit={handleAnswerSubmit}
          onCompleteCheck={handleCompleteCheck}
          onExit={() => navigation.goBack()}
        />
      )}

      {/* Answer Audit Review Modal */}
      <KnowledgeCheckReviewModal
        visible={reviewModalVisible}
        onClose={() => setReviewModalVisible(false)}
        review={reviewData}
        loading={loadingReview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.background,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: themeColors.textSecondary,
  },
  resultContainer: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
});
