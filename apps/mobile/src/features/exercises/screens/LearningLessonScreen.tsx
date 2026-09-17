import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { themeColors, typography, spacing } from '../../../theme';
import { Icon } from '../../../components/primitives';
import { LearningPathPlayer } from '../components/LearningPathPlayer';
import { GlossaryTermModal } from '../components/GlossaryTermModal';
import {
  ExerciseService,
  LearningPathLessonDetail,
  KnowledgeCheckSummary,
} from '../services/exerciseService';
import type { MemberStackParamList } from '../../../navigation/types';

type RouteType = RouteProp<MemberStackParamList, 'LearningLesson'>;
type NavProp = NativeStackNavigationProp<MemberStackParamList>;

export const LearningLessonScreen: React.FC = () => {
  const route = useRoute<RouteType>();
  const navigation = useNavigation<NavProp>();
  const { pathId, lessonId: initialLessonId } = route.params;

  const [activeLessonId, setActiveLessonId] = useState(initialLessonId);
  const [lesson, setLesson] = useState<LearningPathLessonDetail | null>(null);
  const [knowledgeCheck, setKnowledgeCheck] = useState<KnowledgeCheckSummary | null>(null);
  const [activeGlossarySlug, setActiveGlossarySlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadLesson = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const [lessonRes, checkRes] = await Promise.all([
        ExerciseService.getLearningLesson(pathId, id),
        ExerciseService.getLessonKnowledgeCheck(id).catch(() => null),
      ]);
      setLesson(lessonRes);
      setKnowledgeCheck(checkRes);
    } catch (err) {
      console.warn('Failed to load lesson:', err);
    } finally {
      setLoading(false);
    }
  }, [pathId]);

  useEffect(() => {
    loadLesson(activeLessonId);
  }, [activeLessonId, loadLesson]);

  const handleOpenKnowledgeCheck = (checkId: string) => {
    navigation.navigate('KnowledgeCheck', {
      checkId,
      lessonId: activeLessonId,
      pathId,
      title: knowledgeCheck?.title,
    });
  };

  const handleCompleteAndNext = async (notes?: string) => {
    if (!lesson) return;

    // Gating check: if assessment is mandatory and not passed
    if (knowledgeCheck?.isRequiredForLesson && !knowledgeCheck?.isPassed) {
      Alert.alert(
        'Knowledge Check Required',
        'You must complete and pass the knowledge check for this lesson to proceed.',
        [
          { text: 'Start Assessment', onPress: () => handleOpenKnowledgeCheck(knowledgeCheck.id) },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }

    try {
      setSubmitting(true);
      const res = await ExerciseService.completeLearningLesson(pathId, lesson.id, notes);

      if (res.nextLessonId) {
        setActiveLessonId(res.nextLessonId);
      } else {
        // Masterclass completed!
        Alert.alert(
          'Masterclass Completed! 🎉',
          'Congratulations! You have successfully completed all lessons in this learning path.',
          [
            {
              text: 'Return to Path Overview',
              onPress: () => navigation.goBack(),
            },
          ],
        );
      }
    } catch (err) {
      console.warn('Failed to complete lesson:', err);
      Alert.alert('Error', 'Unable to record lesson completion. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrevious = () => {
    if (lesson?.previousLessonId) {
      setActiveLessonId(lesson.previousLessonId);
    }
  };

  const handleNext = () => {
    if (lesson?.nextLessonId) {
      setActiveLessonId(lesson.nextLessonId);
    }
  };

  const handleOpenExerciseDetail = (exerciseId: string) => {
    navigation.navigate('ExerciseDetail', {
      exerciseId,
      exerciseName: lesson?.exercise?.name,
    });
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="close" size={22} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerBarTitle} numberOfLines={1}>
          {lesson?.pathTitle || 'Guided Lesson'}
        </Text>
      </View>

      {loading || !lesson ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Loading lesson content...</Text>
        </View>
      ) : (
        <LearningPathPlayer
          lesson={lesson}
          knowledgeCheck={knowledgeCheck}
          isSubmitting={submitting}
          onCompleteAndNext={handleCompleteAndNext}
          onPreviousLesson={handlePrevious}
          onNextLesson={handleNext}
          onOpenExerciseDetail={handleOpenExerciseDetail}
          onOpenKnowledgeCheck={handleOpenKnowledgeCheck}
          onGlossaryPress={(slug) => setActiveGlossarySlug(slug)}
        />
      )}

      {/* Interactive Glossary Term Modal */}
      <GlossaryTermModal
        visible={!!activeGlossarySlug}
        termSlugOrItem={activeGlossarySlug}
        onClose={() => setActiveGlossarySlug(null)}
        onOpenExercise={handleOpenExerciseDetail}
        onOpenLesson={(pId, lId) => {
          setActiveGlossarySlug(null);
          if (pId === pathId) {
            setActiveLessonId(lId);
          } else {
            navigation.navigate('LearningLesson', { pathId: pId, lessonId: lId });
          }
        }}
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
  headerBarTitle: {
    ...typography.subtitle,
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.textPrimary,
    flex: 1,
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
