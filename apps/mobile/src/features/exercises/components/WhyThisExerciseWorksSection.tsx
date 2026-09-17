import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import type { WhyThisExerciseWorksData } from '../services/exerciseService';

interface WhyThisExerciseWorksSectionProps {
  data: WhyThisExerciseWorksData;
  exerciseName?: string;
  movementPattern?: string;
  onExplorePattern?: (pattern: string) => void;
}

export const WhyThisExerciseWorksSection: React.FC<WhyThisExerciseWorksSectionProps> = ({
  data,
  exerciseName,
  movementPattern,
  onExplorePattern,
}) => {
  return (
    <Card style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Icon name="sparkles" size={16} color={themeColors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.overline}>BIOMECHANICAL RATIONALE</Text>
          <Text style={styles.title}>
            {exerciseName ? `Why ${exerciseName} Works` : 'Why This Exercise Works'}
          </Text>
        </View>
        {movementPattern && (
          <Badge
            label={movementPattern}
            variant="accent"
          />
        )}
        {movementPattern && onExplorePattern && (
          <TouchableOpacity
            onPress={() => onExplorePattern(movementPattern)}
            style={{ marginLeft: spacing[1] }}
          >
            <Icon name="chevron-right" size={14} color={themeColors.accent} />
          </TouchableOpacity>
        )}
      </View>

      {/* Overview */}
      <Text style={styles.overviewText}>{data.overview}</Text>

      {/* Mechanics Explanation */}
      {data.mechanicsExplanation ? (
        <View style={styles.calloutBox}>
          <Text style={styles.calloutLabel}>Movement Mechanics:</Text>
          <Text style={styles.calloutText}>{data.mechanicsExplanation}</Text>
        </View>
      ) : null}

      {/* Primary Drivers */}
      {Array.isArray(data.primaryDrivers) && data.primaryDrivers.length > 0 && (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>Primary Force Drivers:</Text>
          <View style={styles.tagsContainer}>
            {data.primaryDrivers.map((driver, idx) => (
              <View key={idx} style={styles.driverPill}>
                <Icon name="dumbbell" size={12} color={themeColors.primary} />
                <Text style={styles.driverPillText}>{driver}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Joint Actions & Stabilization */}
      <View style={styles.specsGrid}>
        {data.jointAction ? (
          <View style={styles.specCard}>
            <Text style={styles.specLabel}>JOINT ACTIONS</Text>
            <Text style={styles.specValue}>{data.jointAction}</Text>
          </View>
        ) : null}

        {data.stabilizationFocus ? (
          <View style={styles.specCard}>
            <Text style={styles.specLabel}>STABILIZATION FOCUS</Text>
            <Text style={styles.specValue}>{data.stabilizationFocus}</Text>
          </View>
        ) : null}
      </View>

      {/* Benefits */}
      {Array.isArray(data.benefits) && data.benefits.length > 0 && (
        <View style={styles.benefitsContainer}>
          <Text style={styles.sectionLabel}>Key Adaptations & Benefits:</Text>
          {data.benefits.map((benefit, idx) => (
            <View key={idx} style={styles.benefitRow}>
              <Icon name="check-circle" size={14} color={themeColors.accent} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Non-Diagnostic Fitness Educational Disclaimer */}
      <View style={styles.disclaimerBox}>
        <Icon name="shield" size={14} color={themeColors.textSecondary} />
        <Text style={styles.disclaimerText}>
          {data.educationalDisclaimer ||
            'Fitness education only. Not intended as medical diagnosis, rehabilitation prescription, or treatment.'}
        </Text>
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
    marginBottom: spacing[3],
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overline: {
    ...typography.caption,
    color: themeColors.accent,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    ...typography.subtitle1,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  overviewText: {
    ...typography.body1,
    color: themeColors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing[3],
  },
  calloutBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: radius.md,
    padding: spacing[3],
    marginBottom: spacing[3],
    borderLeftWidth: 3,
    borderLeftColor: themeColors.accent,
  },
  calloutLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  calloutText: {
    ...typography.body2,
    color: themeColors.textPrimary,
    lineHeight: 20,
  },
  sectionBlock: {
    marginBottom: spacing[3],
  },
  sectionLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  driverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    gap: spacing[1],
  },
  driverPillText: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  specsGrid: {
    flexDirection: 'column',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  specCard: {
    backgroundColor: themeColors.surfaceElevated,
    borderRadius: radius.sm,
    padding: spacing[2],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  specLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  specValue: {
    ...typography.body2,
    color: themeColors.textPrimary,
    marginTop: 2,
    lineHeight: 18,
  },
  benefitsContainer: {
    marginBottom: spacing[3],
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  benefitText: {
    ...typography.body2,
    color: themeColors.textPrimary,
    flex: 1,
    lineHeight: 19,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radius.sm,
    padding: spacing[2],
    gap: spacing[2],
    marginTop: spacing[1],
  },
  disclaimerText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    flex: 1,
    fontSize: 11,
    fontStyle: 'italic',
  },
});
