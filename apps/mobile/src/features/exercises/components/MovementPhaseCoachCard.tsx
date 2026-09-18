import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { themeColors, typography, radius, spacing } from '../../../theme';
import { Icon } from '../../../components/primitives';
import {
  MovementCoachPhase,
  MovementExpectationItem,
} from '../services/exerciseService';

interface MovementPhaseCoachCardProps {
  phases: MovementCoachPhase[];
  activePhaseIndex: number;
  onSelectPhase: (index: number) => void;
  onSelectCue?: (cueId: string) => void;
}

export const MovementPhaseCoachCard: React.FC<MovementPhaseCoachCardProps> = ({
  phases,
  activePhaseIndex,
  onSelectPhase,
  onSelectCue,
}) => {
  if (!phases || phases.length === 0 || !phases[0]) {
    return null;
  }

  const currentPhase = phases[activePhaseIndex] || phases[0];
  if (!currentPhase) {
    return null;
  }

  const formatPhaseName = (name: string) => {
    return name
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <Icon name="activity" size={18} color={themeColors.primary} />
          <Text style={styles.sectionTitle}>Movement Breakdown</Text>
        </View>
        <Text style={styles.phaseIndicator}>
          Phase {activePhaseIndex + 1} of {phases.length}
        </Text>
      </View>

      {/* Horizontal Phase Timeline Scrubber */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.timelineScroller}
        style={styles.timelineContainer}
      >
        {phases.map((phase, idx) => {
          const isActive = idx === activePhaseIndex;
          const isPassed = idx < activePhaseIndex;

          return (
            <TouchableOpacity
              key={phase.id || idx}
              style={[
                styles.phaseChip,
                isActive && styles.phaseChipActive,
                isPassed && styles.phaseChipPassed,
              ]}
              onPress={() => onSelectPhase(idx)}
              accessibilityRole="button"
              accessibilityLabel={`Phase ${idx + 1}: ${formatPhaseName(phase.phaseName)}`}
            >
              <View
                style={[
                  styles.phaseNumberBadge,
                  isActive && styles.phaseNumberBadgeActive,
                  isPassed && styles.phaseNumberBadgePassed,
                ]}
              >
                {isPassed ? (
                  <Icon name="check-circle" size={12} color={themeColors.primary} />
                ) : (
                  <Text
                    style={[
                      styles.phaseNumberText,
                      isActive && styles.phaseNumberTextActive,
                    ]}
                  >
                    {idx + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.phaseChipText,
                  isActive && styles.phaseChipTextActive,
                  isPassed && styles.phaseChipTextPassed,
                ]}
              >
                {formatPhaseName(phase.phaseName)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Active Phase Card */}
      <View style={styles.activePhaseBody}>
        {/* Phase Title & Cue Text */}
        <View style={styles.phaseTitleBox}>
          <Text style={styles.phaseMainTitle}>
            {currentPhase.title || formatPhaseName(currentPhase.phaseName)}
          </Text>
          {currentPhase.cueText && (
            <View style={styles.cueBanner}>
              <Icon name="sparkles" size={15} color={themeColors.primary} />
              <Text style={styles.cueBannerText}>
                &ldquo;{currentPhase.cueText}&rdquo;
              </Text>
            </View>
          )}
        </View>

        {/* Phase Metrics Row: Tempo, Breathing, Body Position */}
        <View style={styles.metricsRow}>
          {currentPhase.tempoSeconds && (
            <View style={styles.metricItem}>
              <Icon name="timer" size={14} color={themeColors.textTertiary} />
              <Text style={styles.metricLabel}>Tempo:</Text>
              <Text style={styles.metricValue}>{currentPhase.tempoSeconds}s</Text>
            </View>
          )}
          {currentPhase.breathingPattern && (
            <View style={styles.metricItem}>
              <Icon name="activity" size={14} color={themeColors.textTertiary} />
              <Text style={styles.metricLabel}>Breath:</Text>
              <Text style={styles.metricValue}>
                {currentPhase.breathingPattern.replace(/_/g, ' ')}
              </Text>
            </View>
          )}
          {currentPhase.bodyPosition && (
            <View style={styles.metricItem}>
              <Icon name="bolt" size={14} color={themeColors.textTertiary} />
              <Text style={styles.metricLabel}>Position:</Text>
              <Text style={styles.metricValue}>
                {currentPhase.bodyPosition.replace(/_/g, ' ')}
              </Text>
            </View>
          )}
        </View>

        {/* Description if present */}
        {currentPhase.description && (
          <Text style={styles.phaseDescription}>{currentPhase.description}</Text>
        )}

        {/* Phase Expectations */}
        {currentPhase.expectations.length > 0 && (
          <View style={styles.phaseExpectationsSection}>
            <Text style={styles.subSectionHeading}>Phase Expectations</Text>
            {currentPhase.expectations.map((exp: MovementExpectationItem) => (
              <View key={exp.id} style={styles.expectationRow}>
                <Icon
                  name="check-circle"
                  size={15}
                  color={
                    exp.priority === 'ESSENTIAL'
                      ? themeColors.danger
                      : themeColors.primary
                  }
                />
                <View style={styles.expectationTextContainer}>
                  <Text style={styles.expectationTitle}>{exp.title}</Text>
                  <Text style={styles.expectationDesc}>{exp.description}</Text>
                  {exp.expectedAlignment && (
                    <Text style={styles.expectationAlignment}>
                      Target: {exp.expectedAlignment}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Visual Cues in Phase */}
        {currentPhase.visualCues.length > 0 && (
          <View style={styles.visualCuesSection}>
            <Text style={styles.subSectionHeading}>Visual Cues & Annotations</Text>
            <View style={styles.visualCuesList}>
              {currentPhase.visualCues.map((cue) => (
                <TouchableOpacity
                  key={cue.id}
                  style={styles.cueChip}
                  onPress={() => onSelectCue?.(cue.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Visual cue: ${cue.label}`}
                >
                  <Icon name="sparkles" size={13} color={themeColors.primary} />
                  <Text style={styles.cueChipLabel}>{cue.label}</Text>
                  <Text style={styles.cueChipCategory}>
                    ({cue.category.toLowerCase()})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Common Mistakes in this phase */}
        {currentPhase.mistakes.length > 0 && (
          <View style={styles.mistakesSection}>
            <Text style={styles.subSectionHeading}>Common Mistakes in this Phase</Text>
            {currentPhase.mistakes.map((mistake, idx) => (
              <View key={idx} style={styles.phaseMistakeCard}>
                <View style={styles.mistakeHeader}>
                  <Icon name="alert-circle" size={14} color={themeColors.danger} />
                  <Text style={styles.phaseMistakeText}>{mistake.mistake}</Text>
                </View>
                <Text style={styles.phaseCorrectionText}>
                  Correction: {mistake.correction}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginVertical: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
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
  phaseIndicator: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  timelineContainer: {
    marginBottom: spacing.md,
  },
  timelineScroller: {
    gap: 8,
    paddingVertical: 2,
  },
  phaseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: 6,
  },
  phaseChipActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.2)',
    borderColor: themeColors.primary,
  },
  phaseChipPassed: {
    borderColor: 'rgba(14, 165, 233, 0.4)',
  },
  phaseNumberBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseNumberBadgeActive: {
    backgroundColor: themeColors.primary,
  },
  phaseNumberBadgePassed: {
    backgroundColor: 'rgba(14, 165, 233, 0.3)',
  },
  phaseNumberText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.textSecondary,
  },
  phaseNumberTextActive: {
    color: '#FFFFFF',
  },
  phaseChipText: {
    ...typography.caption,
    fontWeight: '600',
    color: themeColors.textSecondary,
  },
  phaseChipTextActive: {
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  phaseChipTextPassed: {
    color: themeColors.textSecondary,
  },
  activePhaseBody: {
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: spacing.sm,
  },
  phaseTitleBox: {
    gap: 6,
  },
  phaseMainTitle: {
    ...typography.h4,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  cueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    gap: spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: themeColors.primary,
  },
  cueBannerText: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.badgeText,
    flex: 1,
    fontStyle: 'italic',
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: themeColors.cardBackground,
    padding: spacing.xs + 2,
    borderRadius: radius.sm,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textTertiary,
  },
  metricValue: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  phaseDescription: {
    ...typography.caption,
    color: themeColors.textSecondary,
    lineHeight: 18,
  },
  subSectionHeading: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  phaseExpectationsSection: {
    marginTop: 4,
  },
  expectationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
    backgroundColor: themeColors.cardBackground,
    padding: spacing.xs + 2,
    borderRadius: radius.sm,
  },
  expectationTextContainer: {
    flex: 1,
  },
  expectationTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  expectationDesc: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textSecondary,
    lineHeight: 16,
    marginTop: 1,
  },
  expectationAlignment: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.badgeText,
    fontWeight: '600',
    marginTop: 2,
  },
  visualCuesSection: {
    marginTop: 4,
  },
  visualCuesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.3)',
  },
  cueChipLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: themeColors.badgeText,
  },
  cueChipCategory: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.textTertiary,
  },
  mistakesSection: {
    marginTop: 4,
  },
  phaseMistakeCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    padding: spacing.xs + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    marginBottom: 6,
  },
  mistakeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  phaseMistakeText: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.danger,
    fontSize: 11,
    flex: 1,
  },
  phaseCorrectionText: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.textSecondary,
    marginLeft: 20,
  },
});
