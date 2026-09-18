import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { themeColors, typography, radius, spacing } from '../../../theme';
import { Icon, Badge, IconName } from '../../../components/primitives';
import {
  LearningHubExploreSection,
  LearningHubTaxonomyItem,
} from '../services/exerciseService';

type DimensionTab = 'movements' | 'muscles' | 'equipment' | 'categories';

interface LearningHubExploreGridProps {
  explore: LearningHubExploreSection;
  onSelectDimension: (type: 'MOVEMENT' | 'MUSCLE' | 'EQUIPMENT' | 'CATEGORY', item: LearningHubTaxonomyItem) => void;
}

const TAB_CONFIG: Array<{ key: DimensionTab; label: string; icon: IconName; type: 'MOVEMENT' | 'MUSCLE' | 'EQUIPMENT' | 'CATEGORY' }> = [
  { key: 'movements', label: 'Movement', icon: 'activity', type: 'MOVEMENT' },
  { key: 'muscles', label: 'Muscles', icon: 'shield', type: 'MUSCLE' },
  { key: 'equipment', label: 'Equipment', icon: 'dumbbell', type: 'EQUIPMENT' },
  { key: 'categories', label: 'Categories', icon: 'award', type: 'CATEGORY' },
];

export const LearningHubExploreGrid: React.FC<LearningHubExploreGridProps> = ({
  explore,
  onSelectDimension,
}) => {
  const [activeTab, setActiveTab] = useState<DimensionTab>('movements');

  const currentTabConfig = (TAB_CONFIG.find((t) => t.key === activeTab) || TAB_CONFIG[0]) as (typeof TAB_CONFIG)[0];
  const items: LearningHubTaxonomyItem[] = explore ? explore[activeTab] || [] : [];

  return (
    <View style={styles.container}>
      {/* Dimension Switcher Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsScrollContent}
      >
        {TAB_CONFIG.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              activeOpacity={0.8}
              onPress={() => setActiveTab(tab.key)}
            >
              <Icon
                name={tab.icon}
                size={14}
                color={isActive ? themeColors.primary : themeColors.textSecondary}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  isActive && styles.tabButtonTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Grid of Dimensions */}
      <View style={styles.gridContainer}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.code || item.id}
            style={styles.gridCard}
            activeOpacity={0.82}
            onPress={() => onSelectDimension(currentTabConfig.type, item)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Icon
                  name={currentTabConfig.icon}
                  size={15}
                  color={themeColors.primary}
                />
              </View>
              {item.exerciseCount > 0 && (
                <Badge label={`${item.exerciseCount}`} variant="neutral" />
              )}
            </View>

            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.name}
            </Text>

            {item.description ? (
              <Text style={styles.cardDescription} numberOfLines={2}>
                {item.description}
              </Text>
            ) : (
              <Text style={styles.cardPrompt}>Explore tutorials & paths →</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  tabsScrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderColor: themeColors.primary,
  },
  tabButtonText: {
    fontSize: typography.body2.fontSize,
    color: themeColors.textSecondary,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: themeColors.primary,
    fontWeight: '700',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  gridCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: themeColors.textPrimary,
    fontSize: typography.body1.fontSize,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDescription: {
    color: themeColors.textTertiary,
    fontSize: typography.caption.fontSize,
    lineHeight: 16,
  },
  cardPrompt: {
    color: themeColors.primary,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    marginTop: 4,
  },
});
