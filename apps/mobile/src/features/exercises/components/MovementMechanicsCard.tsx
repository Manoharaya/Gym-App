import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import type { ExerciseAnatomyData } from '../services/exerciseService';

interface MovementMechanicsCardProps {
  mechanics: ExerciseAnatomyData['movementMechanics'];
  onExplorePattern?: (pattern: string) => void;
}

export const MovementMechanicsCard: React.FC<MovementMechanicsCardProps> = ({
  mechanics,
  onExplorePattern,
}) => {
  const [expandedPhaseIndex, setExpandedPhaseIndex] = useState<number>(0);

  const getPhaseTypeVariant = (type: string): 'primary' | 'accent' | 'warning' | 'neutral' => {
    switch (type) {
      case 'SETUP':
        return 'neutral';
      case 'ECCENTRIC':
        return 'warning';
      case 'TRANSITION_BOTTOM':
        return 'accent';
      case 'CONCENTRIC':
        return 'primary';
      case 'LOCKOUT_FINISH':
        return 'accent';
      default:
        return 'neutral';
    }
  };

  return (
    <Card style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Icon name="bolt" size={16} color={themeColors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.overline}>BIOMECHANICAL BREAKDOWN</Text>
          <Text style={styles.title}>{mechanics.pattern.name}</Text>
        </View>
        {onExplorePattern && (
          <TouchableOpacity
            style={styles.explorePatternBtn}
            accessibilityRole="button"
            accessibilityLabel={`Explore ${mechanics.pattern.name}`}
            onPress={() => onExplorePattern(mechanics.pattern.code)}
          >
            <Text style={styles.explorePatternBtnText}>Learn Pattern</Text>
            <Icon name="chevron-right" size={12} color={themeColors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Pattern Definition */}
      <Text style={styles.definitionText}>{mechanics.pattern.definition}</Text>

      {/* Tempo & Breathing Quick Strip */}
      <View style={styles.metricsStrip}>
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Icon name="timer" size={12} color={themeColors.accent} />
            <Text style={styles.metricLabel}>TEMPO TIMING</Text>
          </View>
          <Text style={styles.metricValue}>
            {mechanics.tempoSummary.tempoString || '3-1-2-0'}
          </Text>
          <Text style={styles.metricSub}>
            {mechanics.tempoSummary.eccentricSeconds}s down • {mechanics.tempoSummary.bottomHoldSeconds}s hold • {mechanics.tempoSummary.concentricSeconds}s up
          </Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Icon name="activity" size={12} color={themeColors.primary} />
            <Text style={styles.metricLabel}>BREATHING</Text>
          </View>
          <Text style={styles.metricValue}>Inhale ↓ / Exhale ↑</Text>
          <Text style={styles.metricSub} numberOfLines={2}>
            {mechanics.breathingSummary.guidance}
          </Text>
        </View>
      </View>

      {/* Movement Phases Stepper / Accordion */}
      <Text style={styles.sectionLabel}>
        Phases of Movement ({mechanics.phases.length})
      </Text>

      <View style={styles.phasesContainer}>
        {mechanics.phases.map((phase, idx) => {
          const isExpanded = expandedPhaseIndex === idx;

          return (
            <TouchableOpacity
              key={phase.id || idx}
              style={[
                styles.phaseItem,
                isExpanded && styles.phaseItemExpanded,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Phase ${idx + 1}: ${phase.phaseName}`}
              onPress={() => setExpandedPhaseIndex(isExpanded ? -1 : idx)}
              activeOpacity={0.7}
            >
              <View style={styles.phaseHeader}>
                <View style={styles.phaseNumberCircle}>
                  <Text style={styles.phaseNumberText}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.phaseName}>{phase.phaseName}</Text>
                  {phase.title && (
                    <Text style={styles.phaseTitle} numberOfLines={1}>
                      {phase.title}
                    </Text>
                  )}
                </View>
                <Badge
                  label={phase.phaseType.replace(/_/g, ' ')}
                  variant={getPhaseTypeVariant(phase.phaseType)}
                />
                <Icon
                  name={isExpanded ? 'chevron-down' : 'chevron-right'}
                  size={14}
                  color={themeColors.textSecondary}
                />
              </View>

              {isExpanded && (
                <View style={styles.phaseDetails}>
                  {phase.description ? (
                    <Text style={styles.phaseDesc}>{phase.description}</Text>
                  ) : null}

                  {phase.cueText ? (
                    <View style={styles.cueBox}>
                      <Icon name="award" size={14} color={themeColors.accent} />
                      <Text style={styles.cueText}>{phase.cueText}</Text>
                    </View>
                  ) : null}

                  {/* Phase specific metrics */}
                  <View style={styles.phaseMetaRow}>
                    {phase.tempoSeconds ? (
                      <View style={styles.metaChip}>
                        <Icon name="timer" size={11} color={themeColors.textSecondary} />
                        <Text style={styles.metaChipText}>{phase.tempoSeconds}s duration</Text>
                      </View>
                    ) : null}

                    {phase.breathingPattern ? (
                      <View style={styles.metaChip}>
                        <Icon name="activity" size={11} color={themeColors.textSecondary} />
                        <Text style={styles.metaChipText}>
                          {phase.breathingPattern.replace(/_/g, ' ')}
                        </Text>
                      </View>
                    ) : null}

                    {phase.bodyPosition ? (
                      <View style={styles.metaChip}>
                        <Icon name="user" size={11} color={themeColors.textSecondary} />
                        <Text style={styles.metaChipText}>{phase.bodyPosition}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing[4],
    marginBottom: spacing[4],
    backgroundColor: themeColors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[2],
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overline: {
    ...typography.caption,
    color: themeColors.primary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    ...typography.subtitle1,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  explorePatternBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: radius.full,
  },
  explorePatternBtnText: {
    ...typography.caption,
    color: themeColors.primary,
    fontWeight: '600',
  },
  definitionText: {
    ...typography.body2,
    color: themeColors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing[3],
  },
  metricsStrip: {
    flexDirection: 'column',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  metricCard: {
    backgroundColor: themeColors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: spacing[1],
  },
  metricLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metricValue: {
    ...typography.subtitle2,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  metricSub: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  sectionLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing[2],
  },
  phasesContainer: {
    gap: spacing[2],
  },
  phaseItem: {
    backgroundColor: themeColors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  phaseItemExpanded: {
    borderColor: 'rgba(59, 130, 246, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  phaseNumberCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseNumberText: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '700',
    fontSize: 11,
  },
  phaseName: {
    ...typography.subtitle2,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  phaseTitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  phaseDetails: {
    marginTop: spacing[3],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  phaseDesc: {
    ...typography.body2,
    color: themeColors.textPrimary,
    lineHeight: 20,
    marginBottom: spacing[2],
  },
  cueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderRadius: radius.sm,
    padding: spacing[2],
    marginBottom: spacing[2],
  },
  cueText: {
    ...typography.caption,
    color: themeColors.textPrimary,
    flex: 1,
    fontWeight: '600',
  },
  phaseMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  metaChipText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 10,
  },
});
