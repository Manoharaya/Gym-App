import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, radius, spacing } from '../../../theme';
import type { RelatedMetadataCountItem } from '../services/exerciseService';

interface CrossDiscoveryFilterBarProps {
  relatedEquipment?: RelatedMetadataCountItem[];
  relatedMovements?: RelatedMetadataCountItem[];
  relatedMuscles?: RelatedMetadataCountItem[];
  difficultyDistribution?: RelatedMetadataCountItem[];
  selectedEquipment?: string;
  selectedMovement?: string;
  selectedDifficulty?: string;
  onSelectEquipment?: (equipment: string) => void;
  onSelectMovement?: (movement: string) => void;
  onSelectDifficulty?: (difficulty: string) => void;
  onResetFilters?: () => void;
}

export const CrossDiscoveryFilterBar: React.FC<CrossDiscoveryFilterBarProps> = ({
  relatedEquipment = [],
  relatedMovements = [],
  relatedMuscles: _relatedMuscles = [],
  difficultyDistribution = [],
  selectedEquipment,
  selectedMovement,
  selectedDifficulty,
  onSelectEquipment,
  onSelectMovement,
  onSelectDifficulty,
  onResetFilters,
}) => {
  const hasActiveFilter = Boolean(selectedEquipment || selectedMovement || selectedDifficulty);

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>Filter & Cross-Explore</Text>
        {hasActiveFilter && onResetFilters && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Reset active filters"
            onPress={onResetFilters}
            style={styles.resetBtn}
          >
            <Icon name="close" size={14} color={themeColors.primary} />
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Equipment Filter Chips */}
        {relatedEquipment.map((eq) => {
          const isSelected = selectedEquipment === eq.id;
          return (
            <TouchableOpacity
              key={`eq-${eq.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Equipment filter: ${eq.name}, ${eq.count} exercises`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelectEquipment?.(isSelected ? '' : eq.id)}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
              ]}
            >
              <Icon
                name="dumbbell"
                size={14}
                color={isSelected ? '#000000' : themeColors.textSecondary}
              />
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected,
                ]}
              >
                {eq.name}
              </Text>
              <Badge
                label={String(eq.count)}
                variant={isSelected ? 'neutral' : 'neutral'}
              />
            </TouchableOpacity>
          );
        })}

        {/* Movement Pattern Filter Chips */}
        {relatedMovements.map((mov) => {
          const isSelected = selectedMovement === mov.id;
          return (
            <TouchableOpacity
              key={`mov-${mov.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Movement pattern filter: ${mov.name}, ${mov.count} exercises`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelectMovement?.(isSelected ? '' : mov.id)}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
              ]}
            >
              <Icon
                name="bolt"
                size={14}
                color={isSelected ? '#000000' : themeColors.textSecondary}
              />
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected,
                ]}
              >
                {mov.name}
              </Text>
              <Badge
                label={String(mov.count)}
                variant={isSelected ? 'neutral' : 'neutral'}
              />
            </TouchableOpacity>
          );
        })}

        {/* Difficulty Distribution Chips */}
        {difficultyDistribution.map((diff) => {
          if (diff.count === 0) return null;
          const isSelected = selectedDifficulty === diff.id;
          return (
            <TouchableOpacity
              key={`diff-${diff.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Difficulty filter: ${diff.name}, ${diff.count} exercises`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelectDifficulty?.(isSelected ? '' : diff.id)}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
              ]}
            >
              <Icon
                name="award"
                size={14}
                color={isSelected ? '#000000' : themeColors.textSecondary}
              />
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected,
                ]}
              >
                {diff.name}
              </Text>
              <Badge
                label={String(diff.count)}
                variant={isSelected ? 'neutral' : 'neutral'}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resetText: {
    ...typography.caption,
    color: themeColors.primary,
    fontWeight: '600',
  },
  scrollContent: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: themeColors.cardBackground,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: radius.full,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
  },
  chipSelected: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  chipText: {
    ...typography.caption,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  chipTextSelected: {
    color: '#000000',
    fontWeight: '700',
  },
});
