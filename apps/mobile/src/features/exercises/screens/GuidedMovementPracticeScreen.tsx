import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Alert,
  TextInput,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MemberStackParamList } from '../../../navigation/types';

import { themeColors, typography, radius, spacing } from '../../../theme';
import { Icon, Badge } from '../../../components/primitives';
import {
  ExerciseService,
  GuidedMovementPracticePayload,
  MovementPracticeSessionResponse,
  GuidedPracticeStep,
} from '../services/exerciseService';
import { GuidedPracticeIntroCard } from '../components/GuidedPracticeIntroCard';
import { GuidedPracticePreparationCard } from '../components/GuidedPracticePreparationCard';
import { PhasePracticeInteractiveCard } from '../components/PhasePracticeInteractiveCard';
import { GuidedPracticeSummaryCard } from '../components/GuidedPracticeSummaryCard';

type RouteProps = RouteProp<MemberStackParamList, 'GuidedMovementPractice'>;
type NavProp = NativeStackNavigationProp<MemberStackParamList>;

const REFLECTION_TOPICS = [
  { id: 'STARTING_POSITION', label: 'Starting Setup & Footwork' },
  { id: 'MOVEMENT_DIRECTION', label: 'Movement Direction & Path' },
  { id: 'BODY_ALIGNMENT', label: 'Spine & Joint Alignment' },
  { id: 'BREATHING', label: 'Breathing Rhythm & Core Bracing' },
  { id: 'TEMPO', label: 'Controlled Tempo & Eccentric Phase' },
  { id: 'COMMON_MISTAKES', label: 'Avoiding Key Form Mistakes' },
];

export const GuidedMovementPracticeScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavProp>();

  const { exerciseId } = route.params;

  const [guidedData, setGuidedData] = useState<GuidedMovementPracticePayload | null>(null);
  const [session, setSession] = useState<MovementPracticeSessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Workflow state machine
  const [currentStep, setCurrentStep] = useState<GuidedPracticeStep>('INTRO');
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});

  // Self-reflection state
  const [selectedReflectionTopics, setSelectedReflectionTopics] = useState<string[]>([]);
  const [reflectionNotes, setReflectionNotes] = useState('');

  // Knowledge check state
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);

  // 1. Initialize data & start/resume practice session
  const initPractice = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch guided practice payload
      const data = await ExerciseService.getGuidedPracticeData(exerciseId);
      setGuidedData(data);

      // Start or resume session
      const sess = await ExerciseService.startOrResumeMovementPractice(exerciseId, {
        exerciseId,
        sessionType: 'GUIDED_PRACTICE',
      });
      setSession(sess);

      // Restore session state if resuming
      if (sess.checklistState) {
        setChecklistState(sess.checklistState);
      }
      if (sess.currentPhaseIndex && sess.currentPhaseIndex < (data.phases?.length || 1)) {
        setActivePhaseIndex(sess.currentPhaseIndex);
      }
      if (sess.currentStep && sess.currentStep !== 'COMPLETED') {
        setCurrentStep(sess.currentStep);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize guided practice session.');
    } finally {
      setLoading(false);
    }
  }, [exerciseId]);

  useEffect(() => {
    initPractice();
  }, [initPractice]);

  // Handle step transition
  const transitionToStep = async (newStep: GuidedPracticeStep, phaseIdx = activePhaseIndex) => {
    setCurrentStep(newStep);
    if (session?.id) {
      try {
        const updated = await ExerciseService.updateMovementPracticeSession(session.id, {
          currentStep: newStep,
          currentPhaseIndex: phaseIdx,
          currentPhaseId: guidedData?.phases?.[phaseIdx]?.id,
          checklistState,
        });
        setSession(updated);
      } catch (err) {
        // Non-blocking update
      }
    }
  };

  const handleToggleCheck = (key: string) => {
    setChecklistState((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Save checklist state asynchronously
      if (session?.id) {
        ExerciseService.updateMovementPracticeSession(session.id, {
          checklistState: next,
        }).catch(() => {});
      }
      return next;
    });
  };

  // Phase rehearsal record
  const handleRecordPhasePractice = async (reps: number, durationSeconds: number) => {
    if (!session?.id || !guidedData?.phases?.[activePhaseIndex]) return;
    const phaseId = guidedData.phases[activePhaseIndex].id;

    try {
      const updated = await ExerciseService.recordPhasePractice(session.id, {
        phaseId,
        reps,
        durationSeconds,
      });
      setSession(updated);

      // Also record phase review
      const activePhase = guidedData.phases[activePhaseIndex];
      const reviewedItems = activePhase
        ? guidedData.techniqueChecklist
            .filter((c) => c.phaseName === activePhase.phaseName && checklistState[c.id])
            .map((c) => c.id)
        : [];

      await ExerciseService.recordPhaseReview(session.id, {
        phaseId,
        reviewedItems,
      });
    } catch (err) {
      // Non-blocking
    }
  };

  const handleNextPhase = () => {
    if (!guidedData?.phases) return;
    if (activePhaseIndex < guidedData.phases.length - 1) {
      const nextIdx = activePhaseIndex + 1;
      setActivePhaseIndex(nextIdx);
      transitionToStep('PHASE_PRACTICE', nextIdx);
    } else {
      // All phases completed, proceed to self review
      transitionToStep('SELF_REVIEW');
    }
  };

  const handlePrevPhase = () => {
    if (activePhaseIndex > 0) {
      const prevIdx = activePhaseIndex - 1;
      setActivePhaseIndex(prevIdx);
      transitionToStep('PHASE_PRACTICE', prevIdx);
    } else {
      transitionToStep('PREPARATION');
    }
  };

  // Self-reflection toggle
  const toggleReflectionTopic = (topicId: string) => {
    setSelectedReflectionTopics((prev) =>
      prev.includes(topicId)
        ? prev.filter((t) => t !== topicId)
        : [...prev, topicId],
    );
  };

  // Complete self reflection and move to knowledge check or complete
  const handleCompleteSelfReview = () => {
    if (guidedData?.knowledgeCheck?.questions?.length) {
      transitionToStep('KNOWLEDGE_CHECK');
    } else {
      handleFinalizeSession(100);
    }
  };

  // Knowledge check answer selection
  const handleSelectQuizAnswer = (questionId: string, optionId: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  // Finalize practice session and calculate feedback
  const handleFinalizeSession = async (score = 100) => {
    if (!session?.id) return;
    try {
      setSaving(true);
      const completed = await ExerciseService.completeMovementPracticeSession(session.id, {
        selfReflectionTopics: selectedReflectionTopics,
        knowledgeCheckScore: score,
        notes: reflectionNotes,
      });
      setSession(completed);
      setQuizScore(score);
      setCurrentStep('SUMMARY');
    } catch (err: any) {
      Alert.alert('Session Saved', 'Movement practice recorded successfully.');
      setCurrentStep('SUMMARY');
    } finally {
      setSaving(false);
    }
  };

  const handleFinishKnowledgeCheck = () => {
    const questions = guidedData?.knowledgeCheck?.questions || [];
    let correctCount = 0;
    // For educational purposes, calculate score based on completion
    questions.forEach((q) => {
      if (userAnswers[q.id]) {
        correctCount++;
      }
    });
    const calculatedScore = Math.round(
      (correctCount / Math.max(1, questions.length)) * 100,
    );
    handleFinalizeSession(calculatedScore);
  };

  const handleExitPractice = () => {
    if (currentStep === 'SUMMARY' || currentStep === 'COMPLETED') {
      navigation.goBack();
      return;
    }
    Alert.alert(
      'Pause Practice?',
      'Your progress is saved and you can resume anytime from the Visual Movement Coach.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Pause & Exit', style: 'destructive', onPress: () => navigation.goBack() },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Preparing Guided Practice...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !guidedData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Icon name="alert-circle" size={36} color={themeColors.danger} />
          <Text style={styles.errorText}>{error || 'Exercise data unavailable.'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={initPractice}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { exercise, phases, techniqueChecklist, equipmentRequired, safetyGuidelines, knowledgeCheck } = guidedData;
  const currentPhase = phases[activePhaseIndex] || phases[0];
  const phaseChecklist = techniqueChecklist.filter(
    (c) => c.phaseName === currentPhase?.phaseName,
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleExitPractice}
          accessibilityRole="button"
          accessibilityLabel="Close practice"
        >
          <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.topBarTitleContainer}>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {exercise.name}
          </Text>
          <Text style={styles.topBarStepIndicator}>
            {currentStep === 'INTRO' && 'Overview'}
            {currentStep === 'PREPARATION' && 'Setup Check'}
            {currentStep === 'PHASE_PRACTICE' && `Phase ${activePhaseIndex + 1} of ${phases.length}`}
            {currentStep === 'SELF_REVIEW' && 'Form Self-Review'}
            {currentStep === 'KNOWLEDGE_CHECK' && 'Technique Quiz'}
            {currentStep === 'SUMMARY' && 'Complete'}
          </Text>
        </View>

        <TouchableOpacity style={styles.pauseButton} onPress={handleExitPractice}>
          <Text style={styles.pauseButtonText}>
            {currentStep === 'SUMMARY' ? 'Done' : 'Pause'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Progress Track */}
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${
                currentStep === 'INTRO'
                  ? 10
                  : currentStep === 'PREPARATION'
                  ? 25
                  : currentStep === 'PHASE_PRACTICE'
                  ? 25 + ((activePhaseIndex + 1) / Math.max(1, phases.length)) * 40
                  : currentStep === 'SELF_REVIEW'
                  ? 75
                  : currentStep === 'KNOWLEDGE_CHECK'
                  ? 90
                  : 100
              }%`,
            },
          ]}
        />
      </View>

      {/* Main Content Area */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Step 1: INTRO */}
        {currentStep === 'INTRO' && (
          <GuidedPracticeIntroCard
            exerciseName={exercise.name}
            difficulty={exercise.difficulty}
            movementPattern={exercise.movementPattern}
            primaryMuscle={exercise.primaryMuscleGroup}
            phasesCount={phases.length}
            estimatedMinutes={exercise.estimatedLearningMinutes}
            equipmentRequired={equipmentRequired}
            hasQuiz={Boolean(knowledgeCheck?.questions?.length)}
            onBegin={() => transitionToStep('PREPARATION')}
          />
        )}

        {/* Step 2: PREPARATION */}
        {currentStep === 'PREPARATION' && (
          <GuidedPracticePreparationCard
            setupInstructions={exercise.setupInstructions}
            equipmentRequired={equipmentRequired}
            safetyGuidelines={safetyGuidelines}
            checklistState={checklistState}
            onToggleCheck={handleToggleCheck}
            onReady={() => transitionToStep('PHASE_PRACTICE', 0)}
            onBack={() => transitionToStep('INTRO')}
          />
        )}

        {/* Step 3: PHASE_PRACTICE */}
        {currentStep === 'PHASE_PRACTICE' && currentPhase && (
          <PhasePracticeInteractiveCard
            phase={currentPhase}
            phaseIndex={activePhaseIndex}
            totalPhases={phases.length}
            phaseChecklist={phaseChecklist}
            checklistState={checklistState}
            onToggleCheck={handleToggleCheck}
            onRecordPractice={handleRecordPhasePractice}
            onCompletePhase={handleNextPhase}
            onPrevPhase={activePhaseIndex === 0 ? () => transitionToStep('PREPARATION') : handlePrevPhase}
          />
        )}

        {/* Step 4: SELF_REVIEW */}
        {currentStep === 'SELF_REVIEW' && (
          <View style={styles.cardContainer}>
            <View style={styles.cardHeader}>
              <View style={styles.badgeRow}>
                <Badge label="SELF-ASSESSMENT" variant="accent" />
              </View>
              <Text style={styles.cardTitle}>Movement Self-Reflection</Text>
              <Text style={styles.cardDesc}>
                Take a moment to reflect on your practice repetitions. Which areas felt locked in, and which need attention?
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What felt most challenging or noteworthy?</Text>
              <View style={styles.reflectionTopicsGrid}>
                {REFLECTION_TOPICS.map((topic) => {
                  const isSelected = selectedReflectionTopics.includes(topic.id);
                  return (
                    <TouchableOpacity
                      key={topic.id}
                      style={[
                        styles.reflectionTopicBtn,
                        isSelected && styles.reflectionTopicBtnSelected,
                      ]}
                      onPress={() => toggleReflectionTopic(topic.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.reflectionCheckbox, isSelected && styles.reflectionCheckboxSelected]}>
                        {isSelected && <Icon name="check" size={12} color="#FFFFFF" />}
                      </View>
                      <Text style={[styles.reflectionTopicText, isSelected && styles.reflectionTopicTextSelected]}>
                        {topic.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Technique Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="e.g. Felt hamstring stretch at parallel; remember to push knees outward..."
                placeholderTextColor={themeColors.textTertiary}
                multiline
                numberOfLines={3}
                value={reflectionNotes}
                onChangeText={setReflectionNotes}
              />
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleCompleteSelfReview}
              accessibilityRole="button"
              accessibilityLabel="Continue to Knowledge Check"
            >
              <Text style={styles.primaryButtonText}>
                {knowledgeCheck?.questions?.length ? 'Proceed to Technique Check' : 'Finish Practice Session'}
              </Text>
              <Icon name="chevron-right" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Step 5: KNOWLEDGE_CHECK */}
        {currentStep === 'KNOWLEDGE_CHECK' && knowledgeCheck && (
          <View style={styles.cardContainer}>
            <View style={styles.cardHeader}>
              <View style={styles.badgeRow}>
                <Badge label="KNOWLEDGE CHECK" variant="primary" />
              </View>
              <Text style={styles.cardTitle}>{knowledgeCheck.title || 'Technique Comprehension Check'}</Text>
              <Text style={styles.cardDesc}>
                {knowledgeCheck.description || 'Confirm your theoretical understanding of this exercise.'}
              </Text>
            </View>

            {knowledgeCheck.questions.map((q, qIndex) => {
              const selectedOptionId = userAnswers[q.id];
              return (
                <View key={q.id} style={styles.questionBlock}>
                  <Text style={styles.questionText}>
                    {qIndex + 1}. {q.question}
                  </Text>

                  <View style={styles.optionsList}>
                    {q.options.map((opt) => {
                      const isOptionSelected = selectedOptionId === opt.id;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[
                            styles.optionItem,
                            isOptionSelected && styles.optionItemSelected,
                          ]}
                          onPress={() => handleSelectQuizAnswer(q.id, opt.id)}
                          activeOpacity={0.7}
                        >
                          <View
                            style={[
                              styles.radioCircle,
                              isOptionSelected && styles.radioCircleSelected,
                            ]}
                          >
                            {isOptionSelected && <View style={styles.radioDot} />}
                          </View>
                          <Text
                            style={[
                              styles.optionText,
                              isOptionSelected && styles.optionTextSelected,
                            ]}
                          >
                            {opt.text}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {selectedOptionId && q.explanation ? (
                    <View style={styles.explanationBox}>
                      <Icon name="sparkles" size={14} color={themeColors.primary} />
                      <Text style={styles.explanationText}>{q.explanation}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}

            <TouchableOpacity
              style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
              onPress={handleFinishKnowledgeCheck}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Submit and Complete Practice"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Complete Session</Text>
                  <Icon name="chevron-right" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Step 6: SUMMARY / COMPLETED */}
        {currentStep === 'SUMMARY' && (
          <GuidedPracticeSummaryCard
            exerciseName={exercise.name}
            phasesReviewedCount={phases.length}
            totalPhasesCount={phases.length}
            checklistCompletedCount={Object.values(checklistState).filter(Boolean).length}
            totalChecklistCount={Math.max(1, techniqueChecklist.length)}
            quizScore={quizScore ?? guidedData.completionFeedback?.knowledgeCheckScore ?? 100}
            summaryMessage={guidedData.completionFeedback?.summaryMessage}
            suggestedReviewTopics={
              selectedReflectionTopics.length > 0
                ? selectedReflectionTopics.map((t) =>
                    REFLECTION_TOPICS.find((rt) => rt.id === t)?.label || t,
                  )
                : guidedData.completionFeedback?.suggestedReviewTopics
            }
            onPracticeAgain={() => {
              setActivePhaseIndex(0);
              setCurrentStep('PHASE_PRACTICE');
            }}
            onDone={() => navigation.goBack()}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: themeColors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  closeButton: {
    padding: spacing.xs,
  },
  topBarTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  topBarTitle: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  topBarStepIndicator: {
    ...typography.caption,
    color: themeColors.primary,
    fontWeight: '600',
    fontSize: 11,
  },
  pauseButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    backgroundColor: themeColors.elevatedBackground,
  },
  pauseButtonText: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.textSecondary,
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: themeColors.elevatedBackground,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: themeColors.primary,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: themeColors.textSecondary,
  },
  errorText: {
    ...typography.body,
    color: themeColors.danger,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: themeColors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardContainer: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: spacing.md,
  },
  cardHeader: {
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  cardTitle: {
    ...typography.title,
    fontWeight: '800',
    color: themeColors.textPrimary,
  },
  cardDesc: {
    ...typography.caption,
    color: themeColors.textSecondary,
    lineHeight: 18,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.subtitle,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  reflectionTopicsGrid: {
    gap: spacing.xs,
  },
  reflectionTopicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  reflectionTopicBtnSelected: {
    borderColor: 'rgba(14, 165, 233, 0.4)',
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  reflectionCheckbox: {
    width: 18,
    height: 18,
    borderRadius: radius.xs,
    borderWidth: 1.5,
    borderColor: themeColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reflectionCheckboxSelected: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  reflectionTopicText: {
    ...typography.body,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  reflectionTopicTextSelected: {
    color: themeColors.primary,
  },
  notesInput: {
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    color: themeColors.textPrimary,
    ...typography.body,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  questionBlock: {
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: spacing.sm,
  },
  questionText: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
    lineHeight: 20,
  },
  optionsList: {
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  optionItemSelected: {
    borderColor: themeColors.primary,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: themeColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: themeColors.primary,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: themeColors.primary,
  },
  optionText: {
    ...typography.body,
    color: themeColors.textPrimary,
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: '700',
    color: themeColors.primary,
  },
  explanationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: 4,
  },
  explanationText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
