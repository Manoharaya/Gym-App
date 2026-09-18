import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Card, Icon, IconName } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import type { LearningMasteryStatus } from '../services/exerciseService';

export interface LearningStageItem {
  id: string;
  key: string;
  title: string;
  shortTitle: string;
  icon: IconName;
  description: string;
  relatedSections: string[];
}

export const LEARNING_JOURNEY_STAGES: LearningStageItem[] = [
  {
    id: 'stage-1',
    key: 'DISCOVERY',
    title: '1. Discovery & Setup',
    shortTitle: 'Setup',
    icon: 'sparkles',
    description: 'Equipment, muscles targeted, stance & initial preparation',
    relatedSections: ['INTRODUCTION', 'EQUIPMENT', 'SETUP'],
  },
  {
    id: 'stage-2',
    key: 'MOVEMENT_BREAKDOWN',
    title: '2. Movement Breakdown',
    shortTitle: 'Phases',
    icon: 'activity',
    description: 'Multi-angle movement phases, trajectory & tempo cues',
    relatedSections: ['MOVEMENT_PHASES'],
  },
  {
    id: 'stage-3',
    key: 'TECHNIQUE_BIOMECHANICS',
    title: '3. Anatomy & Breathing',
    shortTitle: 'Anatomy',
    icon: 'timer',
    description: 'Muscle engagement, mechanics, and breathing rhythm',
    relatedSections: ['BREATHING', 'MUSCLES', 'WHY_IT_WORKS'],
  },
  {
    id: 'stage-4',
    key: 'SAFETY_MISTAKES',
    title: '4. Common Mistakes',
    shortTitle: 'Safety',
    icon: 'alert-circle',
    description: 'Common pitfalls to avoid and safety coaching notes',
    relatedSections: ['COMMON_MISTAKES', 'SAFETY'],
  },
  {
    id: 'stage-5',
    key: 'PRACTICE',
    title: '5. Guided Practice',
    shortTitle: 'Practice',
    icon: 'bolt',
    description: 'Self-paced rehearsal with technique checklist',
    relatedSections: ['PRACTICE'],
  },
  {
    id: 'stage-6',
    key: 'KNOWLEDGE_CHECK',
    title: '6. Knowledge Check',
    shortTitle: 'Quiz',
    icon: 'check-circle',
    description: 'Comprehension questions on movement principles',
    relatedSections: ['KNOWLEDGE_CHECK'],
  },
  {
    id: 'stage-7',
    key: 'MASTERY',
    title: '7. Educational Mastery',
    shortTitle: 'Mastery',
    icon: 'award',
    description: 'All curriculum sections explored and knowledge check >= 80%',
    relatedSections: [],
  },
];

export interface LearningJourneyVisualizerProps {
  currentStatus: LearningMasteryStatus | string;
  completionPercent: number;
  sectionsCompleted?: string[];
  knowledgeCheckScore?: number | null;
  onStagePress?: (stage: LearningStageItem) => void;
  style?: StyleProp<ViewStyle>;
}

export const LearningJourneyVisualizer: React.FC<LearningJourneyVisualizerProps> = ({
  currentStatus,
  completionPercent,
  sectionsCompleted = [],
  knowledgeCheckScore,
  onStagePress,
  style,
}) => {
  const normalizedStatus = (currentStatus || 'NOT_STARTED').toUpperCase();

  const isStageComplete = (stage: LearningStageItem, index: number): boolean => {
    if (normalizedStatus === 'MASTERED') return true;
    if (stage.key === 'MASTERY') {
      return normalizedStatus === 'MASTERED';
    }
    if (stage.key === 'KNOWLEDGE_CHECK') {
      return (
        knowledgeCheckScore !== null &&
        knowledgeCheckScore !== undefined &&
        knowledgeCheckScore >= 80
      );
    }
    // Check if any of the related sections are completed
    if (stage.relatedSections.length > 0) {
      return stage.relatedSections.every((sec) => sectionsCompleted.includes(sec));
    }
    // Fallback based on completion percentage threshold
    const stepThreshold = ((index + 1) / LEARNING_JOURNEY_STAGES.length) * 100;
    return completionPercent >= stepThreshold;
  };

  const getStageState = (stage: LearningStageItem, index: number) => {
    const complete = isStageComplete(stage, index);
    if (complete) return 'COMPLETED';

    if (normalizedStatus === 'REVIEW' && stage.key === 'KNOWLEDGE_CHECK') {
      return 'REVIEW';
    }

    // Is it currently the active stage?
    const prevStage = index > 0 ? LEARNING_JOURNEY_STAGES[index - 1] : undefined;
    const prevComplete = index === 0 || (prevStage ? isStageComplete(prevStage, index - 1) : false);
    if (prevComplete && !complete) {
      return 'ACTIVE';
    }

    return 'UPCOMING';
  };

  return (
    <Card style={[styles.container, style]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Educational Journey Progression</Text>
          <Text style={styles.subtitle}>
            Step-by-step movement learning & mastery pipeline
          </Text>
        </View>
        <View style={styles.percentPill}>
          <Text style={styles.percentText}>{Math.round(completionPercent)}%</Text>
        </View>
      </View>

      {/* Track line & horizontal step indicators */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {LEARNING_JOURNEY_STAGES.map((stage, idx) => {
          const state = getStageState(stage, idx);
          const isLast = idx === LEARNING_JOURNEY_STAGES.length - 1;

          return (
            <React.Fragment key={stage.id}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onStagePress?.(stage)}
                style={styles.stepItem}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`${stage.title}: status ${state}`}
              >
                <View
                  style={[
                    styles.nodeCircle,
                    state === 'COMPLETED' && styles.nodeCompleted,
                    state === 'ACTIVE' && styles.nodeActive,
                    state === 'REVIEW' && styles.nodeReview,
                    state === 'UPCOMING' && styles.nodeUpcoming,
                  ]}
                >
                  <Icon
                    name={state === 'COMPLETED' ? 'check' : stage.icon}
                    size={14}
                    color={
                      state === 'COMPLETED'
                        ? themeColors.background
                        : state === 'ACTIVE'
                        ? themeColors.primary
                        : state === 'REVIEW'
                        ? themeColors.warning
                        : themeColors.textMuted
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.nodeLabel,
                    state === 'COMPLETED' && styles.labelCompleted,
                    state === 'ACTIVE' && styles.labelActive,
                    state === 'REVIEW' && styles.labelReview,
                  ]}
                  numberOfLines={1}
                >
                  {stage.shortTitle}
                </Text>
              </TouchableOpacity>

              {!isLast && (
                <View
                  style={[
                    styles.connectorLine,
                    state === 'COMPLETED' && styles.connectorCompleted,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </ScrollView>

      {/* Educational Notice */}
      <View style={styles.disclaimerRow}>
        <Icon name="award" size={12} color={themeColors.textMuted} />
        <Text style={styles.disclaimerText}>
          Mastery reflects comprehensive educational review and test comprehension, not medical or physical certification.
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing[3],
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  title: {
    ...typography.subtitle,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  percentPill: {
    backgroundColor: themeColors.badgeBackground,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  percentText: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.badgeText,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[1],
  },
  stepItem: {
    alignItems: 'center',
    width: 64,
  },
  nodeCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
    borderWidth: 2,
  },
  nodeCompleted: {
    backgroundColor: themeColors.success,
    borderColor: themeColors.success,
  },
  nodeActive: {
    backgroundColor: themeColors.surfaceActive,
    borderColor: themeColors.primary,
  },
  nodeReview: {
    backgroundColor: themeColors.warningBackground,
    borderColor: themeColors.warning,
  },
  nodeUpcoming: {
    backgroundColor: themeColors.surface,
    borderColor: themeColors.border,
  },
  connectorLine: {
    width: 20,
    height: 2,
    backgroundColor: themeColors.border,
    marginBottom: spacing[3],
  },
  connectorCompleted: {
    backgroundColor: themeColors.success,
  },
  nodeLabel: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.textMuted,
    textAlign: 'center',
  },
  labelCompleted: {
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  labelActive: {
    color: themeColors.primary,
    fontWeight: '700',
  },
  labelReview: {
    color: themeColors.warning,
    fontWeight: '600',
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: themeColors.border,
    gap: spacing[1],
  },
  disclaimerText: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.textMuted,
    flex: 1,
    lineHeight: 14,
  },
});
