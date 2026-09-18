import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { themeColors, typography, radius, spacing } from '../../../theme';
import { Icon, Badge, IconName } from '../../../components/primitives';
import {
  WhatToFocusOnGroup,
  MovementExpectationItem,
  MovementExpectationPriority,
} from '../services/exerciseService';

interface WhatToFocusOnCardProps {
  whatToFocusOn: WhatToFocusOnGroup;
  onSelectCue?: (visualCueId: string) => void;
}

export const WhatToFocusOnCard: React.FC<WhatToFocusOnCardProps> = ({
  whatToFocusOn,
  onSelectCue,
}) => {
  const [selectedPriority, setSelectedPriority] =
    useState<MovementExpectationPriority>('ESSENTIAL');

  const getExpectationsList = (): MovementExpectationItem[] => {
    switch (selectedPriority) {
      case 'ESSENTIAL':
        return whatToFocusOn.essential;
      case 'IMPORTANT':
        return whatToFocusOn.important;
      case 'OPTIONAL':
        return whatToFocusOn.optional;
      default:
        return whatToFocusOn.essential;
    }
  };

  const currentList = getExpectationsList();

  const getPriorityBadgeVariant = (priority: MovementExpectationPriority) => {
    switch (priority) {
      case 'ESSENTIAL':
        return 'danger' as const;
      case 'IMPORTANT':
        return 'primary' as const;
      case 'OPTIONAL':
        return 'neutral' as const;
    }
  };

  const getExpectationIcon = (type: string): IconName => {
    switch (type) {
      case 'BREATHING':
        return 'activity';
      case 'TEMPO':
        return 'timer';
      case 'SAFETY':
      case 'STABILITY':
      case 'POSTURE':
      case 'SPINE_POSITION':
        return 'shield';
      case 'ALIGNMENT':
      case 'JOINT_POSITION':
        return 'sparkles';
      default:
        return 'bolt';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <Icon name="sparkles" size={18} color={themeColors.primary} />
          <Text style={styles.sectionTitle}>What to Focus On</Text>
        </View>
        <Text style={styles.sectionSubtitle}>Technique Priorities</Text>
      </View>

      {/* Priority Selector Tabs */}
      <View style={styles.tabsRow}>
        {(['ESSENTIAL', 'IMPORTANT', 'OPTIONAL'] as MovementExpectationPriority[]).map(
          (priority) => {
            const count =
              priority === 'ESSENTIAL'
                ? whatToFocusOn.essential.length
                : priority === 'IMPORTANT'
                ? whatToFocusOn.important.length
                : whatToFocusOn.optional.length;
            const isActive = selectedPriority === priority;

            return (
              <TouchableOpacity
                key={priority}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setSelectedPriority(priority)}
                accessibilityRole="button"
                accessibilityLabel={`${priority} focus expectations, ${count} items`}
              >
                <Text
                  style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}
                >
                  {priority}
                </Text>
                <View
                  style={[
                    styles.countBadge,
                    isActive && styles.countBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.countBadgeText,
                      isActive && styles.countBadgeTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          },
        )}
      </View>

      {/* Current List of Expectations */}
      <View style={styles.itemsContainer}>
        {currentList.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="check-circle" size={24} color={themeColors.textTertiary} />
            <Text style={styles.emptyStateText}>
              No {selectedPriority.toLowerCase()} expectations recorded for this movement.
            </Text>
          </View>
        ) : (
          currentList.map((exp, index) => (
            <View key={exp.id || index} style={styles.expectationCard}>
              <View style={styles.expHeader}>
                <View style={styles.expTitleRow}>
                  <Icon
                    name={getExpectationIcon(exp.expectationType)}
                    size={16}
                    color={themeColors.primary}
                  />
                  <Text style={styles.expTitle}>{exp.title}</Text>
                </View>
                <Badge
                  label={exp.priority}
                  variant={getPriorityBadgeVariant(exp.priority)}
                />
              </View>

              <Text style={styles.expDescription}>{exp.description}</Text>

              {/* Badges for Body Region and Type */}
              <View style={styles.metaRow}>
                <View style={styles.metaPill}>
                  <Text style={styles.metaPillText}>{exp.bodyRegion.replace(/_/g, ' ')}</Text>
                </View>
                <View style={styles.metaPillSecondary}>
                  <Text style={styles.metaPillTextSecondary}>
                    {exp.expectationType.replace(/_/g, ' ')}
                  </Text>
                </View>
                {exp.phaseName && (
                  <View style={styles.metaPillPhase}>
                    <Text style={styles.metaPillTextPhase}>{exp.phaseName}</Text>
                  </View>
                )}
              </View>

              {/* Key Technique Alignment / Breathing details if present */}
              {exp.expectedAlignment && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Alignment:</Text>
                  <Text style={styles.detailValue}>{exp.expectedAlignment}</Text>
                </View>
              )}

              {exp.expectedBreathing && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Breathing:</Text>
                  <Text style={styles.detailValue}>{exp.expectedBreathing}</Text>
                </View>
              )}

              {exp.expectedTempo && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tempo:</Text>
                  <Text style={styles.detailValue}>{exp.expectedTempo}</Text>
                </View>
              )}

              {/* Visual Cue Link if present */}
              {exp.visualCue && (
                <TouchableOpacity
                  style={styles.cueButton}
                  onPress={() => onSelectCue?.(exp.visualCue!.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`View cue: ${exp.visualCue.label}`}
                >
                  <Icon name="sparkles" size={13} color={themeColors.primary} />
                  <Text style={styles.cueButtonText}>
                    Visual Cue: {exp.visualCue.label}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Common Mistake Warning if attached */}
              {exp.commonMistake && (
                <View style={styles.mistakeCallout}>
                  <Icon name="alert-circle" size={14} color={themeColors.danger} />
                  <View style={styles.mistakeTextContainer}>
                    <Text style={styles.mistakeTitle}>
                      Avoid: {exp.commonMistake.mistake}
                    </Text>
                    <Text style={styles.mistakeCorrection}>
                      Fix: {exp.commonMistake.correction}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          ))
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
  sectionSubtitle: {
    ...typography.caption,
    color: themeColors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.md,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: themeColors.cardBackground,
  },
  tabButtonText: {
    ...typography.caption,
    fontWeight: '600',
    color: themeColors.textSecondary,
  },
  tabButtonTextActive: {
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.2)',
  },
  countBadgeText: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.textTertiary,
    fontWeight: '700',
  },
  countBadgeTextActive: {
    color: themeColors.primary,
  },
  itemsContainer: {
    gap: spacing.sm,
  },
  expectationCard: {
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  expHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  expTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    paddingRight: spacing.xs,
  },
  expTitle: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
    flexShrink: 1,
  },
  expDescription: {
    ...typography.caption,
    color: themeColors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 4,
  },
  metaPill: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  metaPillText: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.badgeText,
    fontWeight: '700',
  },
  metaPillSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  metaPillTextSecondary: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.textSecondary,
  },
  metaPillPhase: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  metaPillTextPhase: {
    ...typography.caption,
    fontSize: 10,
    color: '#C4B5FD',
  },
  detailRow: {
    flexDirection: 'row',
    marginTop: 3,
    gap: 4,
  },
  detailLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.textSecondary,
    fontSize: 11,
  },
  detailValue: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontSize: 11,
    flex: 1,
  },
  cueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 4,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.3)',
  },
  cueButtonText: {
    ...typography.caption,
    color: themeColors.badgeText,
    fontWeight: '600',
    fontSize: 11,
  },
  mistakeCallout: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: radius.sm,
    padding: spacing.xs,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    gap: 6,
  },
  mistakeTextContainer: {
    flex: 1,
  },
  mistakeTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.danger,
    fontSize: 11,
  },
  mistakeCorrection: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 10,
    marginTop: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  emptyStateText: {
    ...typography.caption,
    color: themeColors.textTertiary,
    textAlign: 'center',
  },
});
