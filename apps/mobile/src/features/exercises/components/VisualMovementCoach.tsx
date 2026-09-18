import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { themeColors, typography, radius, spacing } from '../../../theme';
import { Icon, Badge } from '../../../components/primitives';
import {
  VisualMovementCoachData,
  TechniqueChecklistItem,
  ExerciseLearningIntelligenceData,
  QuickRefreshData,
  LearningGapItem,
  ExerciseService,
} from '../services/exerciseService';
import { WhatToFocusOnCard } from './WhatToFocusOnCard';
import { MovementPhaseCoachCard } from './MovementPhaseCoachCard';
import { LearningGapCard } from './LearningGapCard';
import { QuickRefreshCard } from './QuickRefreshCard';
import { AdaptivePracticePlanCard } from './AdaptivePracticePlanCard';
import { MovementLearningJourneyCard } from './MovementLearningJourneyCard';

interface VisualMovementCoachProps {
  coachData: VisualMovementCoachData;
  onStartPractice?: () => void;
  onOpenTutorial?: () => void;
  onSelectCue?: (cueId: string) => void;
}

export const VisualMovementCoach: React.FC<VisualMovementCoachProps> = ({
  coachData,
  onStartPractice,
  onOpenTutorial,
  onSelectCue,
}) => {
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [learningIntelligence, setLearningIntelligence] =
    useState<ExerciseLearningIntelligenceData | null>(null);
  const [quickRefresh, setQuickRefresh] = useState<QuickRefreshData | null>(null);
  const [loadingAdaptive, setLoadingAdaptive] = useState(false);

  React.useEffect(() => {
    let isMounted = true;
    Promise.all([
      ExerciseService.getExerciseLearningIntelligence(coachData.exercise.id).catch(() => null),
      ExerciseService.getQuickRefresh(coachData.exercise.id).catch(() => null),
    ]).then(([intel, refresh]) => {
      if (isMounted) {
        if (intel) setLearningIntelligence(intel);
        if (refresh) setQuickRefresh(refresh);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [coachData.exercise.id]);

  const handleStartAdaptivePractice = async () => {
    try {
      setLoadingAdaptive(true);
      if (learningIntelligence?.activeGaps && learningIntelligence.activeGaps.length > 0) {
        await ExerciseService.createTargetedPracticeSession({
          exerciseId: coachData.exercise.id,
          gapIds: learningIntelligence.activeGaps.map((g) => g.id),
        });
      }
      if (onStartPractice) {
        onStartPractice();
      }
    } catch (err) {
      console.warn('Failed to start adaptive practice:', err);
      if (onStartPractice) onStartPractice();
    } finally {
      setLoadingAdaptive(false);
    }
  };

  const handleResolveGap = async (gap: LearningGapItem) => {
    try {
      await ExerciseService.resolveLearningGap(gap.id, 'RESOLVED');
      setLearningIntelligence((prev) =>
        prev
          ? {
              ...prev,
              activeGaps: prev.activeGaps.filter((g) => g.id !== gap.id),
            }
          : null,
      );
    } catch (err) {
      console.warn('Failed to resolve gap:', err);
    }
  };

  const toggleChecklistItem = (id: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const totalChecklist = coachData.techniqueChecklist.length;
  const completedChecklist =
    coachData.techniqueChecklist.filter((c) => checkedItems[c.id]).length;
  const isChecklistComplete =
    totalChecklist > 0 && completedChecklist === totalChecklist;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Header & Badges */}
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <Badge
            label={coachData.exercise.difficulty}
            variant="neutral"
          />
          <Badge
            label={coachData.exercise.movementPattern}
            variant="primary"
          />
          <Badge
            label={coachData.exercise.equipment}
            variant="accent"
          />
        </View>
        <Text style={styles.exerciseName}>{coachData.exercise.name}</Text>
        <View style={styles.coachSubtitleRow}>
          <Icon name="sparkles" size={16} color={themeColors.primary} />
          <Text style={styles.coachSubtitle}>Visual Movement Coach</Text>
        </View>
      </View>

      {/* 2. Visual Demonstration Media Viewport */}
      <View style={styles.mediaViewport}>
        {coachData.media.heroMediaUrl ? (
          <Image
            source={{ uri: coachData.media.heroMediaUrl }}
            style={styles.heroMedia}
            resizeMode="cover"
            accessibilityLabel={`Demonstration for ${coachData.exercise.name}`}
          />
        ) : (
          <View style={styles.mediaPlaceholder}>
            <Icon name="activity" size={40} color={themeColors.primary} />
            <Text style={styles.mediaPlaceholderTitle}>Visual Movement Demonstration</Text>
            <Text style={styles.mediaPlaceholderSubtitle}>
              Observe expected body position, alignment, and movement paths
            </Text>
          </View>
        )}

        {/* Overlay Overlay Pill */}
        <View style={styles.mediaOverlayBadge}>
          <Icon name="bolt" size={12} color="#FFFFFF" />
          <Text style={styles.mediaOverlayText}>
            Phase {activePhaseIndex + 1}:{' '}
            {coachData.phases[activePhaseIndex]?.phaseName || 'PREPARATION'}
          </Text>
        </View>
      </View>

      {/* 3. Phase Timeline & Breakdown */}
      <MovementPhaseCoachCard
        phases={coachData.phases}
        activePhaseIndex={activePhaseIndex}
        onSelectPhase={setActivePhaseIndex}
        onSelectCue={onSelectCue}
      />

      {/* 4. What To Focus On (Prioritized Expectations) */}
      <WhatToFocusOnCard
        whatToFocusOn={coachData.whatToFocusOn}
        onSelectCue={onSelectCue}
      />

      {/* 5. Interactive Technique Checklist */}
      <View style={styles.checklistSection}>
        <View style={styles.checklistHeader}>
          <View style={styles.titleWithIcon}>
            <Icon name="check-circle" size={18} color={themeColors.primary} />
            <Text style={styles.sectionTitle}>Technique Checklist</Text>
          </View>
          <Text style={styles.checklistProgressText}>
            {completedChecklist} of {totalChecklist} reviewed
          </Text>
        </View>

        <Text style={styles.checklistInstructions}>
          Rehearse these technique checkpoints mentally before beginning your practice.
        </Text>

        <View style={styles.checklistItems}>
          {coachData.techniqueChecklist.map((item: TechniqueChecklistItem) => {
            const isChecked = !!checkedItems[item.id];
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.checklistItem,
                  isChecked && styles.checklistItemChecked,
                ]}
                onPress={() => toggleChecklistItem(item.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isChecked }}
                accessibilityLabel={`${item.title}, ${isChecked ? 'completed' : 'not completed'}`}
              >
                <View
                  style={[
                    styles.checkbox,
                    isChecked && styles.checkboxChecked,
                  ]}
                >
                  {isChecked && (
                    <Icon name="check-circle" size={14} color="#FFFFFF" />
                  )}
                </View>
                <View style={styles.checklistTextContainer}>
                  <View style={styles.checklistTitleRow}>
                    <Text
                      style={[
                        styles.checklistTitle,
                        isChecked && styles.checklistTitleChecked,
                      ]}
                    >
                      {item.title}
                    </Text>
                    <View style={styles.categoryPill}>
                      <Text style={styles.categoryPillText}>{item.category}</Text>
                    </View>
                  </View>
                  {item.description && (
                    <Text style={styles.checklistDesc}>{item.description}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {isChecklistComplete && (
          <View style={styles.checklistCompletedBanner}>
            <Icon name="sparkles" size={16} color={themeColors.success} />
            <Text style={styles.checklistCompletedText}>
              All key technique checkpoints reviewed! Ready to practice.
            </Text>
          </View>
        )}
      </View>

      {/* 6. Authored Common Mistakes & Fixes */}
      {coachData.commonMistakes.length > 0 && (
        <View style={styles.mistakesSection}>
          <View style={styles.titleWithIcon}>
            <Icon name="alert-circle" size={18} color={themeColors.danger} />
            <Text style={styles.sectionTitle}>Common Mistakes to Avoid</Text>
          </View>

          <View style={styles.mistakesList}>
            {coachData.commonMistakes.map((m, idx) => (
              <View key={idx} style={styles.globalMistakeCard}>
                <Text style={styles.globalMistakeTitle}>{m.mistake}</Text>
                {m.consequence && (
                  <Text style={styles.globalMistakeConsequence}>
                    Why it matters: {m.consequence}
                  </Text>
                )}
                <View style={styles.globalCorrectionRow}>
                  <Icon name="check-circle" size={14} color={themeColors.primary} />
                  <Text style={styles.globalCorrectionText}>Fix: {m.correction}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 7. Safety Guidance */}
      {coachData.safetyGuidance.length > 0 && (
        <View style={styles.safetySection}>
          <View style={styles.titleWithIcon}>
            <Icon name="shield" size={18} color={themeColors.primary} />
            <Text style={styles.safetySectionTitle}>Safety Guidance</Text>
          </View>
          {coachData.safetyGuidance.map((s) => (
            <View key={s.id} style={styles.safetyCard}>
              {s.title && <Text style={styles.safetyTitle}>{s.title}</Text>}
              <Text style={styles.safetyDesc}>{s.description}</Text>
            </View>
          ))}
          <Text style={styles.disclaimerText}>
            Educational technique guidance only. Discontinue immediately if you experience pain or discomfort.
          </Text>
        </View>
      )}

      {/* Quick Refresh Mode */}
      {quickRefresh && (
        <QuickRefreshCard data={quickRefresh} />
      )}

      {/* Movement Learning Journey */}
      <MovementLearningJourneyCard
        exerciseName={coachData.exercise.name}
      />

      {/* Needs Review & Active Gaps */}
      {learningIntelligence?.activeGaps && learningIntelligence.activeGaps.length > 0 && (
        <View style={styles.reviewSection}>
          <View style={styles.titleWithIcon}>
            <Icon name="alert-circle" size={18} color={themeColors.primary} />
            <Text style={styles.reviewSectionTitle}>Needs Review & Technique Focus</Text>
          </View>
          <Text style={styles.reviewSectionSubtitle}>
            Specific movement areas suggested for rehearsal based on your learning data.
          </Text>
          {learningIntelligence.activeGaps.map((gap) => (
            <LearningGapCard
              key={gap.id}
              gap={gap}
              onReview={() => onStartPractice && onStartPractice()}
              onResolve={handleResolveGap}
            />
          ))}

          {/* Adaptive Practice Plan Card */}
          <AdaptivePracticePlanCard
            exerciseName={coachData.exercise.name}
            suggestedSequence={[
              'Review Baseline Setup',
              ...learningIntelligence.activeGaps.map(
                (g) => g.phaseName || 'Targeted Phase Practice',
              ),
              'Review Breathing Rhythm & Cadence',
              'Self-Reflection & Feedback',
            ]}
            gapsCount={learningIntelligence.activeGaps.length}
            onStartPractice={handleStartAdaptivePractice}
            loading={loadingAdaptive}
          />
        </View>
      )}

      {/* 8. Action Buttons */}
      <View style={styles.actionButtonsRow}>
        {onStartPractice && (
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={onStartPractice}
            accessibilityRole="button"
            accessibilityLabel="Start Practice Mode"
          >
            <Icon name="dumbbell" size={18} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>Start Practice Mode</Text>
          </TouchableOpacity>
        )}

        {onOpenTutorial && (
          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={onOpenTutorial}
            accessibilityRole="button"
            accessibilityLabel="Open Interactive Tutorial"
          >
            <Icon name="bolt" size={16} color={themeColors.primary} />
            <Text style={styles.secondaryActionText}>Interactive Tutorial</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  exerciseName: {
    ...typography.h2,
    color: themeColors.textPrimary,
    fontWeight: '800',
    marginTop: 2,
  },
  coachSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coachSubtitle: {
    ...typography.subtitle,
    color: themeColors.primary,
    fontWeight: '700',
  },
  reviewSection: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  reviewSectionTitle: {
    ...typography.subtitle,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  reviewSectionSubtitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginBottom: 4,
  },
  mediaViewport: {
    height: 220,
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: themeColors.border,
    position: 'relative',
  },
  heroMedia: {
    width: '100%',
    height: '100%',
  },
  mediaPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.elevatedBackground,
    padding: spacing.md,
    gap: spacing.xs,
  },
  mediaPlaceholderTitle: {
    ...typography.subtitle,
    color: themeColors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
  mediaPlaceholderSubtitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  mediaOverlayBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mediaOverlayText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  checklistSection: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: spacing.sm,
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checklistProgressText: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.primary,
  },
  checklistInstructions: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  checklistItems: {
    gap: 8,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  checklistItemChecked: {
    borderColor: 'rgba(14, 165, 233, 0.35)',
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.xs,
    borderWidth: 1.5,
    borderColor: themeColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  checklistTextContainer: {
    flex: 1,
    gap: 2,
  },
  checklistTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  checklistTitle: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
    flex: 1,
  },
  checklistTitleChecked: {
    color: themeColors.textSecondary,
    textDecorationLine: 'line-through',
  },
  categoryPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  categoryPillText: {
    ...typography.caption,
    fontSize: 9,
    color: themeColors.textTertiary,
    fontWeight: '700',
  },
  checklistDesc: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  checklistCompletedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginTop: 4,
  },
  checklistCompletedText: {
    ...typography.caption,
    color: themeColors.success,
    fontWeight: '700',
    flex: 1,
  },
  mistakesSection: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: spacing.sm,
  },
  mistakesList: {
    gap: 8,
  },
  globalMistakeCard: {
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    gap: 4,
  },
  globalMistakeTitle: {
    ...typography.subtitle,
    color: themeColors.danger,
    fontWeight: '700',
  },
  globalMistakeConsequence: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  globalCorrectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  globalCorrectionText: {
    ...typography.caption,
    color: themeColors.badgeText,
    fontWeight: '600',
    fontSize: 11,
    flex: 1,
  },
  safetySection: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: spacing.xs,
  },
  safetySectionTitle: {
    ...typography.subtitle,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  safetyCard: {
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginVertical: 2,
  },
  safetyTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.primary,
  },
  safetyDesc: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  disclaimerText: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.textTertiary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  actionButtonsRow: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: themeColors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  primaryActionText: {
    ...typography.button,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  secondaryActionText: {
    ...typography.button,
    color: themeColors.textPrimary,
  },
});
