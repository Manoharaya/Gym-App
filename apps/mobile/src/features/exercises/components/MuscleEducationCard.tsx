import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import type { MuscleInvolvedItem, MuscleRole } from '../services/exerciseService';

interface MuscleEducationCardProps {
  muscle: MuscleInvolvedItem;
  onExploreMuscle?: (code: string, name: string) => void;
}

export const MuscleEducationCard: React.FC<MuscleEducationCardProps> = ({
  muscle,
  onExploreMuscle,
}) => {
  const getBadgeVariant = (role: MuscleRole): 'primary' | 'accent' | 'neutral' => {
    switch (role) {
      case 'PRIMARY':
        return 'primary';
      case 'SECONDARY':
        return 'accent';
      case 'STABILIZER':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  const getRoleLabel = (role: MuscleRole): string => {
    switch (role) {
      case 'PRIMARY':
        return 'PRIMARY MOVER';
      case 'SECONDARY':
        return 'SYNERGIST';
      case 'STABILIZER':
        return 'STABILIZER';
      default:
        return role;
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.muscleName}>{muscle.name}</Text>
          <Text style={styles.regionText}>
            {muscle.group.replace(/_/g, ' ')} • {muscle.region}
          </Text>
        </View>
        <Badge
          label={getRoleLabel(muscle.role)}
          variant={getBadgeVariant(muscle.role)}
        />
      </View>

      <View style={styles.roleExplanationBox}>
        <View style={styles.iconHalo}>
          <Icon name="activity" size={14} color={themeColors.primary} />
        </View>
        <Text style={styles.roleExplanationText}>{muscle.roleExplanation}</Text>
      </View>

      <Text style={styles.descriptionText} numberOfLines={3}>
        {muscle.educationalDescription}
      </Text>

      {onExploreMuscle && (
        <TouchableOpacity
          style={styles.exploreBtn}
          accessibilityRole="button"
          accessibilityLabel={`Explore muscle ${muscle.name}`}
          onPress={() => onExploreMuscle(muscle.code, muscle.name)}
          activeOpacity={0.7}
        >
          <Text style={styles.exploreBtnText}>Explore Muscle Anatomy</Text>
          <Icon name="chevron-right" size={14} color={themeColors.primary} />
        </TouchableOpacity>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing[4],
    marginBottom: spacing[3],
    backgroundColor: themeColors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing[2],
  },
  muscleName: {
    ...typography.subtitle1,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  regionText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  roleExplanationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: radius.sm,
    padding: spacing[2],
    marginVertical: spacing[2],
    gap: spacing[2],
  },
  iconHalo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleExplanationText: {
    ...typography.body2,
    color: themeColors.textPrimary,
    flex: 1,
    fontWeight: '500',
  },
  descriptionText: {
    ...typography.body2,
    color: themeColors.textSecondary,
    lineHeight: 20,
    marginTop: spacing[1],
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[3],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  exploreBtnText: {
    ...typography.caption,
    color: themeColors.primary,
    fontWeight: '600',
  },
});
