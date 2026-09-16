import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, spacing as sp, radius, typography } from '../../../theme';
import type { ExerciseMuscleRelation } from '@fitcore/types';

interface ExerciseMuscleCardProps {
  muscleRelations: ExerciseMuscleRelation[];
  primaryMuscleGroup?: string;
  onManageMuscles?: () => void;
  canEdit?: boolean;
}

export const ExerciseMuscleCard: React.FC<ExerciseMuscleCardProps> = ({
  muscleRelations = [],
  primaryMuscleGroup,
  onManageMuscles,
  canEdit = false,
}) => {
  const primaryMuscles = muscleRelations.filter((m) => m.role === 'PRIMARY');
  const secondaryMuscles = muscleRelations.filter((m) => m.role === 'SECONDARY');
  const stabilizerMuscles = muscleRelations.filter((m) => m.role === 'STABILIZER');

  const getActivationBadgeVariant = (level?: string | null) => {
    switch (level) {
      case 'HIGH':
        return 'accent';
      case 'MODERATE':
        return 'primary';
      case 'LOW':
      default:
        return 'neutral';
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Icon name="activity" size={20} color={themeColors.primary} />
          </View>
          <View>
            <Text style={styles.title}>Target Muscle Engagement</Text>
            <Text style={styles.subtitle}>
              {muscleRelations.length > 0
                ? `${muscleRelations.length} mapped muscle groups & biomechanical activation`
                : primaryMuscleGroup || 'Biomechanics'}
            </Text>
          </View>
        </View>

        {canEdit && onManageMuscles && (
          <TouchableOpacity
            style={styles.manageButton}
            onPress={onManageMuscles}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="settings" size={16} color={themeColors.primary} />
            <Text style={styles.manageButtonText}>Manage</Text>
          </TouchableOpacity>
        )}
      </View>

      {muscleRelations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Primary Focus: <Text style={styles.highlightText}>{primaryMuscleGroup || 'Full Body'}</Text>
          </Text>
          <Text style={styles.emptySubtext}>Detailed muscle activation breakdown has not yet been structured.</Text>
        </View>
      ) : (
        <View style={styles.sectionsContainer}>
          {/* PRIMARY MOVERS */}
          {primaryMuscles.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.indicatorDot, { backgroundColor: themeColors.accent }]} />
                <Text style={styles.sectionTitle}>PRIMARY MOVERS</Text>
                <Text style={styles.sectionCount}>({primaryMuscles.length})</Text>
              </View>
              <View style={styles.chipGrid}>
                {primaryMuscles.map((item) => (
                  <View key={item.id || item.muscle} style={styles.muscleChip}>
                    <Text style={styles.muscleName}>{item.muscle.replace(/_/g, ' ')}</Text>
                    {item.activationLevel && (
                      <Badge
                        label={`${item.activationLevel} LOAD`}
                        variant={getActivationBadgeVariant(item.activationLevel)}
                      />
                    )}
                    {item.notes && <Text style={styles.chipNote}>{item.notes}</Text>}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* SECONDARY MOVERS */}
          {secondaryMuscles.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.indicatorDot, { backgroundColor: themeColors.primary }]} />
                <Text style={styles.sectionTitle}>SECONDARY SYNERGISTS</Text>
                <Text style={styles.sectionCount}>({secondaryMuscles.length})</Text>
              </View>
              <View style={styles.chipGrid}>
                {secondaryMuscles.map((item) => (
                  <View key={item.id || item.muscle} style={styles.muscleChipSecondary}>
                    <Text style={styles.muscleName}>{item.muscle.replace(/_/g, ' ')}</Text>
                    {item.activationLevel && (
                      <Badge
                        label={item.activationLevel}
                        variant={getActivationBadgeVariant(item.activationLevel)}
                      />
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* STABILIZERS */}
          {stabilizerMuscles.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.indicatorDot, { backgroundColor: themeColors.textMuted }]} />
                <Text style={styles.sectionTitle}>STABILIZERS & CORE SUPPORT</Text>
                <Text style={styles.sectionCount}>({stabilizerMuscles.length})</Text>
              </View>
              <View style={styles.chipGrid}>
                {stabilizerMuscles.map((item) => (
                  <View key={item.id || item.muscle} style={styles.muscleChipStabilizer}>
                    <Text style={styles.muscleNameMuted}>{item.muscle.replace(/_/g, ' ')}</Text>
                    {item.activationLevel && (
                      <Badge label={item.activationLevel} variant="neutral" />
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: sp[4],
    backgroundColor: themeColors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginBottom: sp[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp[3],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp[3],
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: themeColors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.subtitle1,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginTop: 1,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: sp[2.5],
    paddingVertical: sp[1],
    backgroundColor: themeColors.surfaceElevated,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  manageButtonText: {
    ...typography.caption,
    color: themeColors.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: sp[3],
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  emptyText: {
    ...typography.body2,
    color: themeColors.textSecondary,
  },
  highlightText: {
    color: themeColors.accent,
    fontWeight: '700',
  },
  emptySubtext: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginTop: 4,
  },
  sectionsContainer: {
    gap: sp[3.5],
    marginTop: sp[1],
  },
  section: {
    gap: sp[2],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp[2],
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  sectionCount: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp[2],
  },
  muscleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp[2],
    backgroundColor: themeColors.surfaceElevated,
    paddingHorizontal: sp[3],
    paddingVertical: sp[1.5],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.accent + '40',
  },
  muscleChipSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp[2],
    backgroundColor: themeColors.surfaceElevated,
    paddingHorizontal: sp[3],
    paddingVertical: sp[1.5],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  muscleChipStabilizer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp[2],
    backgroundColor: themeColors.background,
    paddingHorizontal: sp[2.5],
    paddingVertical: sp[1.5],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  muscleName: {
    ...typography.body2,
    color: themeColors.textPrimary,
    fontWeight: '600',
    fontSize: 13,
  },
  muscleNameMuted: {
    ...typography.body2,
    color: themeColors.textSecondary,
    fontSize: 12,
  },
  chipNote: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontStyle: 'italic',
    fontSize: 11,
  },
});
