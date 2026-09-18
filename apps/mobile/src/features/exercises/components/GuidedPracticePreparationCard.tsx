import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { themeColors, typography, radius, spacing } from '../../../theme';
import { Icon } from '../../../components/primitives';

interface GuidedPracticePreparationCardProps {
  setupInstructions?: string | null;
  equipmentRequired: Array<{ id: string; name: string; isRequired: boolean }>;
  safetyGuidelines: Array<{ id: string; title?: string | null; description: string }>;
  checklistState: Record<string, boolean>;
  onToggleCheck: (key: string) => void;
  onReady: () => void;
  onBack: () => void;
}

export const GuidedPracticePreparationCard: React.FC<GuidedPracticePreparationCardProps> = ({
  setupInstructions,
  equipmentRequired,
  safetyGuidelines,
  checklistState,
  onToggleCheck,
  onReady,
  onBack,
}) => {
  const preparationChecks = [
    { key: 'prep_space', label: 'Clear Practice Space', desc: 'Ensure at least 2m radius free of obstacles' },
    { key: 'prep_equipment', label: 'Equipment Inspected', desc: 'Weights securely fastened or mat properly placed' },
    { key: 'prep_posture', label: 'Neutral Starting Posture', desc: 'Feet grounded, core gently braced, shoulders set' },
    { key: 'prep_breathing', label: 'Breathing Prepared', desc: 'Establish rhythmic nasal breathing before load' },
  ];

  const allPrepared = preparationChecks.every((c) => checklistState[c.key]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Icon name="chevron-left" size={20} color={themeColors.textSecondary} />
          <Text style={styles.backText}>Intro</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Preparation & Setup</Text>
        <Text style={styles.subtitle}>
          Verify your setup and environment before entering movement rehearsal.
        </Text>
      </View>

      {/* Setup Instructions */}
      {setupInstructions ? (
        <View style={styles.setupCard}>
          <View style={styles.cardHeaderRow}>
            <Icon name="activity" size={16} color={themeColors.primary} />
            <Text style={styles.cardHeaderTitle}>Starting Setup Instructions</Text>
          </View>
          <Text style={styles.setupText}>{setupInstructions}</Text>
        </View>
      ) : null}

      {/* Equipment Check */}
      {equipmentRequired.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Equipment Needed</Text>
          <View style={styles.equipmentRow}>
            {equipmentRequired.map((eq) => (
              <View key={eq.id} style={styles.equipmentTag}>
                <Icon name="dumbbell" size={14} color={themeColors.primary} />
                <Text style={styles.equipmentTagText}>{eq.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Pre-Movement Checklist */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Readiness Checklist</Text>
        <Text style={styles.sectionDesc}>
          Tap each item to confirm your environment and setup are ready.
        </Text>

        <View style={styles.checklistContainer}>
          {preparationChecks.map((item) => {
            const isChecked = Boolean(checklistState[item.key]);
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.checkItem, isChecked && styles.checkItemChecked]}
                onPress={() => onToggleCheck(item.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                  {isChecked && <Icon name="check" size={14} color="#FFFFFF" />}
                </View>
                <View style={styles.checkTextContainer}>
                  <Text style={[styles.checkLabel, isChecked && styles.checkLabelChecked]}>
                    {item.label}
                  </Text>
                  <Text style={styles.checkDesc}>{item.desc}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Safety Notice */}
      {safetyGuidelines.length > 0 && (
        <View style={styles.safetyBox}>
          <Icon name="shield" size={16} color={themeColors.primary} />
          <View style={styles.safetyTextContainer}>
            <Text style={styles.safetyTitle}>Important Safety Note</Text>
            <Text style={styles.safetyDesc}>
              {safetyGuidelines[0]?.description || ''}
            </Text>
          </View>
        </View>
      )}

      {/* CTA Button */}
      <TouchableOpacity
        style={[styles.readyButton, !allPrepared && styles.readyButtonDimmed]}
        onPress={onReady}
        accessibilityRole="button"
        accessibilityLabel="Start Movement Phases"
      >
        <Text style={styles.readyButtonText}>
          {allPrepared ? "I'm Ready — Start Phases" : 'Confirm All Checklist Items'}
        </Text>
        <Icon name="chevron-right" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: spacing.md,
  },
  header: {
    gap: 4,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
  },
  backText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  title: {
    ...typography.title,
    fontWeight: '800',
    color: themeColors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  setupCard: {
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: spacing.xs,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardHeaderTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.primary,
  },
  setupText: {
    ...typography.body,
    color: themeColors.textPrimary,
    lineHeight: 20,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.subtitle,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  sectionDesc: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  equipmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  equipmentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  equipmentTagText: {
    ...typography.caption,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  checklistContainer: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: themeColors.elevatedBackground,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  checkItemChecked: {
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
  checkTextContainer: {
    flex: 1,
    gap: 2,
  },
  checkLabel: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  checkLabelChecked: {
    color: themeColors.textSecondary,
  },
  checkDesc: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
  },
  safetyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  safetyTextContainer: {
    flex: 1,
    gap: 2,
  },
  safetyTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.danger,
  },
  safetyDesc: {
    ...typography.caption,
    color: themeColors.textSecondary,
    lineHeight: 16,
  },
  readyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  readyButtonDimmed: {
    opacity: 0.7,
  },
  readyButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
