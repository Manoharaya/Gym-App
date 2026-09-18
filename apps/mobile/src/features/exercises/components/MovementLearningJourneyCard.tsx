import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { themeColors, radius, spacing } from '../../../theme';
import { Icon, Badge } from '../../../components/primitives';

interface JourneyStep {
  key: string;
  label: string;
  isComplete: boolean;
  isCurrent: boolean;
}

interface MovementLearningJourneyCardProps {
  exerciseName: string;
  steps?: JourneyStep[];
  completedAreas?: string[];
}

export const MovementLearningJourneyCard: React.FC<MovementLearningJourneyCardProps> = ({
  exerciseName,
  steps,
  completedAreas = ['Setup', 'Movement Phases'],
}) => {
  const defaultSteps: JourneyStep[] = [
    { key: 'LEARN', label: 'Learn', isComplete: true, isCurrent: false },
    { key: 'UNDERSTAND', label: 'Understand', isComplete: true, isCurrent: false },
    { key: 'PRACTICE', label: 'Practice', isComplete: false, isCurrent: true },
    { key: 'REVIEW', label: 'Review', isComplete: false, isCurrent: false },
    { key: 'QUIZ', label: 'Quiz', isComplete: false, isCurrent: false },
    { key: 'MASTER', label: 'Master', isComplete: false, isCurrent: false },
  ];

  const journeySteps = steps || defaultSteps;

  const conceptChecklist = [
    { name: 'Setup & Stance', done: true },
    { name: 'Movement Phases', done: true },
    { name: 'Breathing Rhythm', done: completedAreas.includes('Breathing') },
    { name: 'Tempo Cadence', done: completedAreas.includes('Tempo') },
    { name: 'Active Muscles', done: completedAreas.includes('Muscles') },
    { name: 'Joint Mechanics', done: completedAreas.includes('Mechanics') },
    { name: 'Common Mistakes', done: completedAreas.includes('Mistakes') },
    { name: 'Safety Notes', done: completedAreas.includes('Safety') },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.cardBackground,
          borderColor: themeColors.border,
          borderRadius: radius.md,
          padding: spacing.md,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.textPrimary }]}>
          Movement Learning Journey
        </Text>
        <Badge label="EDUCATIONAL PROGRESS" variant="neutral" />
      </View>

      <Text style={[styles.exerciseSubtitle, { color: themeColors.textSecondary }]}>
        {exerciseName}
      </Text>

      {/* Stepper Progression */}
      <View style={styles.stepperContainer}>
        {journeySteps.map((step, idx) => {
          const isLast = idx === journeySteps.length - 1;
          return (
            <React.Fragment key={step.key}>
              <View style={styles.stepNode}>
                <View
                  style={[
                    styles.nodeCircle,
                    {
                      backgroundColor: step.isComplete
                        ? themeColors.primary
                        : step.isCurrent
                        ? themeColors.elevatedBackground
                        : themeColors.cardBackground,
                      borderColor: step.isCurrent ? themeColors.primary : themeColors.border,
                    },
                  ]}
                >
                  {step.isComplete ? (
                    <Icon name="check" size={12} color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        styles.nodeIndexText,
                        { color: step.isCurrent ? themeColors.primary : themeColors.textTertiary },
                      ]}
                    >
                      {idx + 1}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.nodeLabel,
                    {
                      color: step.isCurrent
                        ? themeColors.primary
                        : step.isComplete
                        ? themeColors.textPrimary
                        : themeColors.textTertiary,
                      fontWeight: step.isCurrent ? '700' : '500',
                    },
                  ]}
                >
                  {step.label}
                </Text>
              </View>
              {!isLast && (
                <View
                  style={[
                    styles.nodeLine,
                    {
                      backgroundColor: step.isComplete
                        ? themeColors.primary
                        : themeColors.border,
                    },
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Educational Areas Grid */}
      <Text style={[styles.sectionLabel, { color: themeColors.textSecondary }]}>
        Technique Concept Coverage
      </Text>
      <View style={styles.conceptsGrid}>
        {conceptChecklist.map((concept, idx) => (
          <View
            key={idx}
            style={[
              styles.conceptPill,
              {
                backgroundColor: concept.done
                  ? 'rgba(16, 185, 129, 0.1)'
                  : themeColors.elevatedBackground,
                borderColor: concept.done ? '#10B981' : themeColors.border,
              },
            ]}
          >
            <Icon
              name={concept.done ? 'check-circle' : 'activity'}
              size={12}
              color={concept.done ? '#10B981' : themeColors.textTertiary}
            />
            <Text
              style={[
                styles.conceptText,
                { color: concept.done ? themeColors.textPrimary : themeColors.textSecondary },
              ]}
            >
              {concept.name}
            </Text>
          </View>
        ))}
      </View>

      <Text style={[styles.disclaimerNote, { color: themeColors.textTertiary }]}>
        Note: Learning mastery tracks educational comprehension of movement technique, not physical performance or clinical capability.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  exerciseSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  stepNode: {
    alignItems: 'center',
    width: 44,
  },
  nodeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  nodeIndexText: {
    fontSize: 10,
    fontWeight: '700',
  },
  nodeLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  nodeLine: {
    flex: 1,
    height: 2,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  conceptsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  conceptPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
  },
  conceptText: {
    fontSize: 11,
    fontWeight: '500',
  },
  disclaimerNote: {
    fontSize: 11,
    lineHeight: 15,
    fontStyle: 'italic',
  },
});
