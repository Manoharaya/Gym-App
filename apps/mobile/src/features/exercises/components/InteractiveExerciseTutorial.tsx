import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import type {
  ExerciseTutorialResponse,
  TutorialMode,
  TutorialUserProgress,
  PersonalizedTutorialPlan,
  TargetedReviewResponse,
  LearningPreferencesResponse,
  UpdateLearningPreferencesPayload,
} from '../services/exerciseService';
import { InteractiveVisualPlayer } from './InteractiveVisualPlayer';
import { ExerciseAngleViewer } from './ExerciseAngleViewer';
import { TechniqueComparison } from './TechniqueComparison';
import { TechniqueCoachingPanel } from './TechniqueCoachingPanel';
import { VisualCuesBanner } from './VisualCuesBanner';
import { TechniqueChecklistCard } from './TechniqueChecklistCard';
import { PracticeModeCard } from './PracticeModeCard';
import { CommonMistakesSection } from './CommonMistakesSection';
import { SafetyGuidanceSection } from './SafetyGuidanceSection';
import { WhyThisExerciseWorksSection } from './WhyThisExerciseWorksSection';
import { PersonalizedLearningBanner } from './PersonalizedLearningBanner';
import { TargetedReviewPanel } from './TargetedReviewPanel';
import { PersonalizeLearningModal } from './PersonalizeLearningModal';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
};

export type TutorialProgressionStep =
  | 'WATCH'
  | 'LEARN'
  | 'PRACTICE'
  | 'CHECK'
  | 'COMPLETE';

export interface InteractiveExerciseTutorialProps {
  tutorial: ExerciseTutorialResponse;
  initialMode?: TutorialMode;
  userProgress?: TutorialUserProgress | null;
  personalizedPlan?: PersonalizedTutorialPlan;
  targetedReview?: TargetedReviewResponse | null;
  learningPreferences?: LearningPreferencesResponse | null;
  onUpdatePreferences?: (payload: UpdateLearningPreferencesPayload) => Promise<void>;
  onResetPreferences?: () => Promise<void>;
  onUpdateProgress: (payload: {
    mode?: TutorialMode;
    phaseIndex?: number;
    stepIndex?: number;
    section?: any;
    checklistState?: Record<string, boolean>;
    practiceCompleted?: boolean;
    timeSpentSeconds?: number;
  }) => void;
  onCompleteTutorial: (score?: number) => void;
  onNavigateToMuscle?: (muscleCode: string) => void;
  onNavigateToMovementPattern?: (pattern: string) => void;
  onLaunchKnowledgeCheck?: (checkId: string) => void;
  onExitTutorial?: () => void;
}

export const InteractiveExerciseTutorial: React.FC<InteractiveExerciseTutorialProps> = ({
  tutorial,
  initialMode = 'STEP_BY_STEP',
  userProgress,
  personalizedPlan,
  targetedReview,
  learningPreferences,
  onUpdatePreferences,
  onResetPreferences,
  onUpdateProgress,
  onCompleteTutorial,
  onNavigateToMuscle,
  onNavigateToMovementPattern,
  onLaunchKnowledgeCheck,
  onExitTutorial,
}) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTargetedReview, setShowTargetedReview] = useState(false);
  const [currentMode, setCurrentMode] = useState<TutorialMode>(
    (userProgress?.currentMode as TutorialMode) || initialMode,
  );
  const [currentProgression, setCurrentProgression] = useState<TutorialProgressionStep>(
    userProgress?.status === 'COMPLETED' ? 'COMPLETE' : 'WATCH',
  );
  const [activePhaseIndex, setActivePhaseIndex] = useState(
    userProgress?.currentPhaseIndex ?? 0,
  );
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>(
    userProgress?.checklistState || {},
  );
  const [isPracticeCompleted, setIsPracticeCompleted] = useState(
    !!userProgress?.practiceCompleted,
  );
  const [viewMode, setViewMode] = useState<'MULTI_ANGLE' | 'CLASSIC'>('MULTI_ANGLE');

  const activePhase =
    tutorial.phases && tutorial.phases.length > 0
      ? tutorial.phases[activePhaseIndex] || tutorial.phases[0]
      : null;
  const activeStep =
    tutorial.steps && tutorial.steps.length > 0 ? tutorial.steps[0] : null;

  // Handle Mode Change
  const handleSelectMode = (mode: TutorialMode) => {
    setCurrentMode(mode);
    onUpdateProgress({ mode });
  };

  // Handle Checklist Item Toggle
  const handleChecklistToggle = (item: string, checked: boolean) => {
    const next = { ...checklistState, [item]: checked };
    setChecklistState(next);
    onUpdateProgress({ checklistState: next });
  };

  // Handle Finish Practice
  const handleFinishPractice = (nextChecklist: Record<string, boolean>) => {
    setIsPracticeCompleted(true);
    setChecklistState(nextChecklist);
    onUpdateProgress({
      practiceCompleted: true,
      checklistState: nextChecklist,
      section: 'PRACTICE',
    });
    if (tutorial.knowledgeCheck) {
      setCurrentProgression('CHECK');
    } else {
      setCurrentProgression('COMPLETE');
      onCompleteTutorial();
    }
  };

  // Phase navigation in Step-by-Step
  const handlePrevPhase = () => {
    if (activePhaseIndex > 0) {
      const nextIdx = activePhaseIndex - 1;
      setActivePhaseIndex(nextIdx);
      onUpdateProgress({ phaseIndex: nextIdx });
    }
  };

  const handleNextPhase = () => {
    if (activePhaseIndex < tutorial.phases.length - 1) {
      const nextIdx = activePhaseIndex + 1;
      setActivePhaseIndex(nextIdx);
      onUpdateProgress({ phaseIndex: nextIdx });
    } else {
      setCurrentProgression('PRACTICE');
    }
  };

  // Format visual cues from phase or steps
  const combinedCues: Array<{ category: string; cue: string }> = [];
  if (activePhase?.visualCues && Array.isArray(activePhase.visualCues)) {
    for (const vc of activePhase.visualCues) {
      combinedCues.push({ category: vc.category || 'FOCUS', cue: vc.cue || vc.text });
    }
  }
  if (activeStep?.visualCue) {
    combinedCues.push({
      category: activeStep.visualCueCategory || 'ALIGNMENT',
      cue: activeStep.visualCue,
    });
  }
  if (combinedCues.length === 0) {
    combinedCues.push(
      { category: 'ALIGNMENT', cue: 'Track knees in line with feet throughout the movement.' },
      { category: 'BREATHING', cue: 'Breathe diaphragmatically into the lower abdomen.' },
    );
  }

  const progressionSteps: Array<{ id: TutorialProgressionStep; label: string }> = [
    { id: 'WATCH', label: '1. Watch' },
    { id: 'LEARN', label: '2. Learn' },
    { id: 'PRACTICE', label: '3. Practice' },
    { id: 'CHECK', label: '4. Check' },
    { id: 'COMPLETE', label: '5. Done' },
  ];

  const modes: Array<{ id: TutorialMode; label: string }> = [
    { id: 'QUICK_LEARN', label: 'Quick Learn' },
    { id: 'STEP_BY_STEP', label: 'Step-by-Step' },
    { id: 'MOVEMENT_BREAKDOWN', label: 'Movement Breakdown' },
    { id: 'TECHNIQUE_CHECKLIST', label: 'Technique Checklist' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Top Bar with Exercise Title & Exit */}
      <View style={styles.topBar}>
        <View style={styles.titleArea}>
          <Text style={styles.exerciseName}>{tutorial.exercise.name}</Text>
          <View style={styles.tagsRow}>
            <Badge label={tutorial.exercise.difficulty} variant="accent" />
            <Badge label={tutorial.exercise.equipment} variant="neutral" />
            <TouchableOpacity
              onPress={() =>
                onNavigateToMovementPattern?.(tutorial.exercise.movementPattern)
              }
            >
              <Badge label={tutorial.exercise.movementPattern} variant="info" />
            </TouchableOpacity>
          </View>
        </View>

        {onExitTutorial && (
          <TouchableOpacity style={styles.exitBtn} onPress={onExitTutorial}>
            <Icon name="close" size={18} color={themeColors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Day 78: Personalized Learning Banner & Targeted Review */}
      {personalizedPlan && (
        <PersonalizedLearningBanner
          plan={personalizedPlan}
          onOpenSettings={() => setShowSettingsModal(true)}
          onSelectMode={(m) => handleSelectMode(m as TutorialMode)}
          onStartTargetedReview={() => setShowTargetedReview((prev) => !prev)}
        />
      )}

      {showTargetedReview && targetedReview && (
        <TargetedReviewPanel
          reviewData={targetedReview}
          onClose={() => setShowTargetedReview(false)}
          onStartRehearsal={() => {
            setShowTargetedReview(false);
            setCurrentProgression('PRACTICE');
          }}
        />
      )}

      {/* 5-Step Progression Tracker */}
      <View style={styles.progressionBar}>
        {progressionSteps.map((step) => (
          <TouchableOpacity
            key={step.id}
            style={[
              styles.progressionItem,
              currentProgression === step.id && styles.progressionItemActive,
            ]}
            onPress={() => setCurrentProgression(step.id)}
          >
            <Text
              style={[
                styles.progressionLabel,
                currentProgression === step.id && styles.progressionLabelActive,
              ]}
            >
              {step.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Learning Mode Selector */}
      <View style={styles.modePillContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {modes.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.modePill, currentMode === m.id && styles.modePillActive]}
              onPress={() => handleSelectMode(m.id)}
            >
              <Text
                style={[
                  styles.modePillText,
                  currentMode === m.id && styles.modePillTextActive,
                ]}
              >
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Multi-Angle vs Classic Mode Switcher */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 6 }}>
        <TouchableOpacity
          onPress={() => setViewMode(viewMode === 'MULTI_ANGLE' ? 'CLASSIC' : 'MULTI_ANGLE')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
            backgroundColor: themeColors.background,
            borderWidth: 1,
            borderColor: themeColors.border,
          }}
        >
          <Icon
            name={viewMode === 'MULTI_ANGLE' ? 'activity' : 'bolt'}
            size={12}
            color={themeColors.primary}
          />
          <Text style={{ fontSize: 11, color: themeColors.primary, fontWeight: '700' }}>
            {viewMode === 'MULTI_ANGLE' ? '360° Multi-Angle Active' : 'Switch to Multi-Angle'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Interactive Visual Player */}
      {viewMode === 'MULTI_ANGLE' ? (
        <ExerciseAngleViewer
          exerciseId={tutorial.exercise.id}
          exerciseName={tutorial.exercise.name}
          mediaList={tutorial.demonstrations as any}
          activePhase={activePhase}
          onAngleChange={(angle) => console.log('Tutorial angle switched:', angle)}
        />
      ) : (
        <InteractiveVisualPlayer
          demonstrations={tutorial.demonstrations}
          activePhase={activePhase}
          exerciseName={tutorial.exercise.name}
          audioGuidanceUrl={tutorial.tutorialConfig.audioGuidanceUrl}
          audioGuidanceTranscript={tutorial.tutorialConfig.audioGuidanceTranscript}
          onSeekTimestamp={(sec) => console.log('Seek:', sec)}
        />
      )}

      {/* ================================================================= */}
      {/* PROGRESSION STEP: PRACTICE */}
      {/* ================================================================= */}
      {currentProgression === 'PRACTICE' && (
        <PracticeModeCard
          exerciseName={tutorial.exercise.name}
          checklist={tutorial.tutorialConfig.checklist}
          initialChecklistState={checklistState}
          isPracticeCompleted={isPracticeCompleted}
          onFinishPractice={handleFinishPractice}
        />
      )}

      {/* ================================================================= */}
      {/* PROGRESSION STEP: CHECK (Knowledge Check) */}
      {/* ================================================================= */}
      {currentProgression === 'CHECK' && (
        <Card style={styles.checkCard}>
          <View style={styles.checkHeader}>
            <Icon name="award" size={24} color={themeColors.accent} />
            <Text style={styles.checkTitle}>Technique Knowledge Check</Text>
          </View>
          <Text style={styles.checkDesc}>
            {tutorial.knowledgeCheck
              ? `Complete the assessment "${tutorial.knowledgeCheck.title}" (${tutorial.knowledgeCheck.questionCount} questions) to test your biomechanical comprehension.`
              : 'Test your understanding of the starting posture, active phases, breathing, and prime mover muscles.'}
          </Text>

          {tutorial.knowledgeCheck ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onLaunchKnowledgeCheck?.(tutorial.knowledgeCheck!.id)}
            >
              <Icon name="bolt" size={16} color="#000000" />
              <Text style={styles.actionBtnText}>Launch Knowledge Check</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                setCurrentProgression('COMPLETE');
                onCompleteTutorial();
              }}
            >
              <Icon name="check-circle" size={16} color="#000000" />
              <Text style={styles.actionBtnText}>Mark Assessment Complete</Text>
            </TouchableOpacity>
          )}
        </Card>
      )}

      {/* ================================================================= */}
      {/* PROGRESSION STEP: COMPLETE (Celebration & Recommendations) */}
      {/* ================================================================= */}
      {currentProgression === 'COMPLETE' && (
        <Card style={styles.completeCard}>
          <View style={styles.celebrationIconBox}>
            <Icon name="trophy" size={32} color="#F59E0B" />
          </View>
          <Text style={styles.completeTitle}>Tutorial Completed! 🎉</Text>
          <Text style={styles.completeSubtitle}>
            You have mastered the technique, phases, breathing, and movement mechanics for {tutorial.exercise.name}.
          </Text>

          {/* Learned Checklist Summary */}
          <View style={styles.summaryList}>
            <View style={styles.summaryRow}>
              <Icon name="check-circle" size={14} color={themeColors.accent} />
              <Text style={styles.summaryText}>Starting Position & Alignment</Text>
            </View>
            <View style={styles.summaryRow}>
              <Icon name="check-circle" size={14} color={themeColors.accent} />
              <Text style={styles.summaryText}>Controlled Movement Phases & Tempo</Text>
            </View>
            <View style={styles.summaryRow}>
              <Icon name="check-circle" size={14} color={themeColors.accent} />
              <Text style={styles.summaryText}>Diaphragmatic Breathing Sync</Text>
            </View>
            <View style={styles.summaryRow}>
              <Icon name="check-circle" size={14} color={themeColors.accent} />
              <Text style={styles.summaryText}>Common Mistakes Avoidance</Text>
            </View>
          </View>

          {/* Related Recommendations */}
          <Text style={styles.relatedHeader}>Continue Your Learning</Text>
          <View style={styles.relatedExercisesGrid}>
            {tutorial.relatedLearning.relatedExercises.map((rel) => (
              <View key={rel.id} style={styles.relatedItem}>
                <Text style={styles.relatedName}>{rel.name}</Text>
                <Text style={styles.relatedMeta}>
                  {rel.difficulty} • {rel.equipment}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.reviewBtn}
            onPress={() => setCurrentProgression('WATCH')}
          >
            <Icon name="refresh" size={14} color={themeColors.textPrimary} />
            <Text style={styles.reviewBtnText}>Review Tutorial</Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* ================================================================= */}
      {/* MODE 1: QUICK LEARN */}
      {/* ================================================================= */}
      {currentMode === 'QUICK_LEARN' && (
        <View style={styles.modeSection}>
          <Card style={styles.quickFactsCard}>
            <Text style={styles.sectionHeader}>Key Technique Points</Text>
            {tutorial.tutorialConfig.keyTechniquePoints.map((pt, idx) => (
              <View key={idx} style={styles.quickFactRow}>
                <Icon name="check" size={14} color={themeColors.accent} />
                <Text style={styles.quickFactText}>{pt}</Text>
              </View>
            ))}
          </Card>

          {/* Muscles Involved Chips */}
          <Card style={styles.quickFactsCard}>
            <Text style={styles.sectionHeader}>Primary Muscle Drivers</Text>
            <View style={styles.musclePillsRow}>
              {tutorial.muscles.primary.map((m, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.musclePill}
                  onPress={() => onNavigateToMuscle?.(m)}
                >
                  <Icon name="dumbbell" size={12} color={themeColors.accent} />
                  <Text style={styles.musclePillText}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        </View>
      )}

      {/* ================================================================= */}
      {/* MODE 2: STEP-BY-STEP */}
      {/* ================================================================= */}
      {currentMode === 'STEP_BY_STEP' && activePhase && (
        <View style={styles.modeSection}>
          {/* Phase Carousel Card */}
          <Card style={styles.phaseCard}>
            <View style={styles.phaseCardHeader}>
              <View>
                <Text style={styles.phaseIndexLabel}>
                  Phase {activePhaseIndex + 1} of {tutorial.phases.length}
                </Text>
                <Text style={styles.phaseTitle}>
                  {activePhase.title || activePhase.phaseName}
                </Text>
              </View>
              <Badge label={activePhase.phaseType} variant="accent" />
            </View>

            <Text style={styles.phaseDesc}>
              {activePhase.description || activeStep?.description || ''}
            </Text>

            {activePhase.cueText && (
              <View style={styles.cueBox}>
                <Icon name="sparkles" size={14} color={themeColors.accent} />
                <Text style={styles.cueBoxText}>{activePhase.cueText}</Text>
              </View>
            )}

            {/* Navigation Buttons */}
            <View style={styles.phaseNavRow}>
              <TouchableOpacity
                style={[
                  styles.navBtn,
                  activePhaseIndex === 0 && styles.navBtnDisabled,
                ]}
                onPress={handlePrevPhase}
                disabled={activePhaseIndex === 0}
              >
                <Icon name="chevron-left" size={16} color={themeColors.textPrimary} />
                <Text style={styles.navBtnText}>Previous</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.navBtnActive} onPress={handleNextPhase}>
                <Text style={styles.navBtnActiveText}>
                  {activePhaseIndex === tutorial.phases.length - 1
                    ? 'Go to Practice'
                    : 'Next Phase'}
                </Text>
                <Icon name="chevron-right" size={16} color="#000000" />
              </TouchableOpacity>
            </View>
          </Card>

          {/* Technique Coaching Panel */}
          <TechniqueCoachingPanel coaching={tutorial.coaching} />
        </View>
      )}

      {/* ================================================================= */}
      {/* MODE 3: MOVEMENT BREAKDOWN */}
      {/* ================================================================= */}
      {currentMode === 'MOVEMENT_BREAKDOWN' && (
        <View style={styles.modeSection}>
          <VisualCuesBanner cues={combinedCues} />
          <WhyThisExerciseWorksSection
            data={tutorial.whyItWorks}
            exerciseName={tutorial.exercise.name}
            movementPattern={tutorial.exercise.movementPattern}
            onExplorePattern={onNavigateToMovementPattern}
          />
          <CommonMistakesSection mistakes={tutorial.commonMistakes} />
        </View>
      )}

      {/* ================================================================= */}
      {/* MODE 4: TECHNIQUE CHECKLIST */}
      {/* ================================================================= */}
      {currentMode === 'TECHNIQUE_CHECKLIST' && (
        <View style={styles.modeSection}>
          <TechniqueChecklistCard
            checklist={tutorial.tutorialConfig.checklist}
            checkedState={checklistState}
            onToggleItem={handleChecklistToggle}
          />
        </View>
      )}

      {/* Cross-Angle Analysis & Visual Comparison */}
      <TechniqueComparison
        exerciseName={tutorial.exercise.name}
        movementPattern={tutorial.exercise.movementPattern}
      />

      <SafetyGuidanceSection guidelines={tutorial.safetyGuidelines} />

      {/* Day 78: Personalization Settings Modal */}
      {onUpdatePreferences && onResetPreferences && (
        <PersonalizeLearningModal
          visible={showSettingsModal}
          preferences={learningPreferences || null}
          onClose={() => setShowSettingsModal(false)}
          onSave={onUpdatePreferences}
          onReset={onResetPreferences}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  contentContainer: {
    padding: sp.md,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: sp.sm,
  },
  titleArea: {
    flex: 1,
  },
  exerciseName: {
    ...typography.h2,
    color: themeColors.textPrimary,
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  exitBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: sp.sm,
  },
  progressionBar: {
    flexDirection: 'row',
    backgroundColor: '#0F141F',
    borderRadius: radius.md,
    padding: 3,
    marginBottom: sp.sm,
    justifyContent: 'space-between',
  },
  progressionItem: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  progressionItemActive: {
    backgroundColor: themeColors.cardBackground,
  },
  progressionLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 10,
  },
  progressionLabelActive: {
    color: themeColors.accent,
    fontWeight: '700',
  },
  modePillContainer: {
    marginBottom: sp.sm,
  },
  modePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: themeColors.cardBackground,
    borderWidth: 1,
    borderColor: themeColors.cardBorder,
    marginRight: 6,
  },
  modePillActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: themeColors.accent,
  },
  modePillText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  modePillTextActive: {
    color: themeColors.accent,
    fontWeight: '700',
  },
  modeSection: {
    marginBottom: sp.sm,
  },
  quickFactsCard: {
    padding: sp.md,
    marginBottom: sp.sm,
  },
  sectionHeader: {
    ...typography.caption,
    color: themeColors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: sp.sm,
  },
  quickFactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  quickFactText: {
    ...typography.bodySm,
    color: themeColors.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
  musclePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  musclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: '#0F141F',
    borderWidth: 1,
    borderColor: themeColors.cardBorder,
  },
  musclePillText: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  phaseCard: {
    padding: sp.md,
    marginBottom: sp.md,
  },
  phaseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  phaseIndexLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  phaseTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  phaseDesc: {
    ...typography.bodySm,
    color: themeColors.textPrimary,
    lineHeight: 20,
    marginBottom: sp.sm,
  },
  cueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    padding: sp.sm,
    borderRadius: radius.md,
    marginBottom: sp.md,
  },
  cueBoxText: {
    ...typography.bodySm,
    color: themeColors.accent,
    flex: 1,
    fontWeight: '600',
  },
  phaseNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: sp.sm,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  navBtnActive: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: themeColors.accent,
    gap: 6,
  },
  navBtnActiveText: {
    ...typography.caption,
    color: '#000000',
    fontWeight: '800',
  },
  checkCard: {
    padding: sp.lg,
    marginBottom: sp.md,
    alignItems: 'center',
  },
  checkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: sp.sm,
  },
  checkTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  checkDesc: {
    ...typography.bodySm,
    color: themeColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: sp.lg,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    gap: 8,
    width: '100%',
  },
  actionBtnText: {
    ...typography.button,
    color: '#000000',
    fontWeight: '800',
  },
  completeCard: {
    padding: sp.lg,
    marginBottom: sp.md,
    alignItems: 'center',
  },
  celebrationIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: sp.sm,
  },
  completeTitle: {
    ...typography.h2,
    color: themeColors.textPrimary,
    marginBottom: 4,
  },
  completeSubtitle: {
    ...typography.bodySm,
    color: themeColors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: sp.md,
  },
  summaryList: {
    width: '100%',
    backgroundColor: '#0F141F',
    borderRadius: radius.md,
    padding: sp.sm,
    gap: 8,
    marginBottom: sp.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryText: {
    ...typography.bodySm,
    color: themeColors.textPrimary,
  },
  relatedHeader: {
    ...typography.caption,
    color: themeColors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '700',
    alignSelf: 'flex-start',
    marginBottom: sp.sm,
  },
  relatedExercisesGrid: {
    width: '100%',
    gap: 8,
    marginBottom: sp.md,
  },
  relatedItem: {
    backgroundColor: '#0F141F',
    padding: sp.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.cardBorder,
  },
  relatedName: {
    ...typography.bodySm,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  relatedMeta: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    gap: 6,
    width: '100%',
  },
  reviewBtnText: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
});
