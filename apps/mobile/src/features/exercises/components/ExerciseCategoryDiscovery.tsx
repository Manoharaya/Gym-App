import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Icon } from '../../../components/primitives';
import { themeColors, typography, radius, spacing } from '../../../theme';

export interface CategoryItem {
  id: string;
  name: string;
  count?: number;
}

interface ExerciseCategoryDiscoveryProps {
  categories: CategoryItem[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  totalCount?: number;
}

export const ExerciseCategoryDiscovery: React.FC<ExerciseCategoryDiscoveryProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  totalCount,
}) => {
  const getCategoryIcon = (
    id: string,
  ): 'sparkles' | 'dumbbell' | 'flame' | 'activity' | 'shield' | 'bolt' | 'timer' | 'heart' => {
    switch (id.toUpperCase()) {
      case 'ALL':
        return 'sparkles';
      case 'STRENGTH':
        return 'dumbbell';
      case 'CARDIO':
        return 'flame';
      case 'MOBILITY':
        return 'activity';
      case 'CORE':
        return 'shield';
      case 'FUNCTIONAL':
        return 'bolt';
      case 'HIIT':
        return 'timer';
      case 'RECOVERY':
        return 'heart';
      default:
        return 'dumbbell';
    }
  };

  const allItems: CategoryItem[] = [
    { id: 'ALL', name: 'All Exercises', count: totalCount },
    ...categories.filter((c) => c.id !== 'ALL'),
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {allItems.map((item) => {
          const isSelected =
            selectedCategory === item.id ||
            (!selectedCategory && item.id === 'ALL');

          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.categoryChip,
                isSelected && styles.categoryChipActive,
              ]}
              onPress={() => onSelectCategory(item.id === 'ALL' ? '' : item.id)}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.iconWrap,
                  isSelected && styles.iconWrapActive,
                ]}
              >
                <Icon
                  name={getCategoryIcon(item.id)}
                  size={15}
                  color={isSelected ? '#FFFFFF' : themeColors.textSecondary}
                />
              </View>

              <Text
                style={[
                  styles.categoryName,
                  isSelected && styles.categoryNameActive,
                ]}
              >
                {item.name}
              </Text>

              {item.count !== undefined && (
                <View
                  style={[
                    styles.countBadge,
                    isSelected && styles.countBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      isSelected && styles.countTextActive,
                    ]}
                  >
                    {item.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing[3],
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: themeColors.surfaceElevated,
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.full,
  },
  categoryChipActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: themeColors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  categoryName: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: themeColors.textSecondary,
  },
  categoryNameActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: themeColors.cardBackground,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.textMuted,
  },
  countTextActive: {
    color: '#FFFFFF',
  },
});
