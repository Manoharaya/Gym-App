import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StyleProp, ViewStyle } from 'react-native';
import { themeColors, typography, radius, spacing } from '../../theme';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  badge?: string | number;
}

export interface TabsProps<T extends string = string> {
  tabs: Array<TabItem<T>>;
  activeTab: T;
  onTabChange: (tabId: T) => void;
  variant?: 'pill' | 'underline';
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Tabs = <T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  variant = 'pill',
  scrollable = false,
  style,
}: TabsProps<T>): React.ReactElement => {
  const renderTab = (tab: TabItem<T>) => {
    const isActive = tab.id === activeTab;

    if (variant === 'underline') {
      return (
        <Pressable
          key={tab.id}
          onPress={() => onTabChange(tab.id)}
          style={[styles.underlineTab, isActive && styles.activeUnderlineTab]}
          accessibilityRole="tab"
          accessibilityState={{ selected: isActive }}
        >
          <Text style={[styles.underlineText, isActive && styles.activeUnderlineText]}>
            {tab.label}
          </Text>
          {tab.badge !== undefined && (
            <View style={[styles.badge, isActive && styles.activeBadge]}>
              <Text style={[styles.badgeText, isActive && styles.activeBadgeText]}>
                {tab.badge}
              </Text>
            </View>
          )}
        </Pressable>
      );
    }

    // Default: 'pill'
    return (
      <Pressable
        key={tab.id}
        onPress={() => onTabChange(tab.id)}
        style={[styles.pillTab, isActive && styles.activePillTab]}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
      >
        <Text style={[styles.pillText, isActive && styles.activePillText]}>
          {tab.label}
        </Text>
        {tab.badge !== undefined && (
          <View style={[styles.badge, isActive && styles.activeBadge]}>
            <Text style={[styles.badgeText, isActive && styles.activeBadgeText]}>
              {tab.badge}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContainer, style]}
      >
        {tabs.map(renderTab)}
      </ScrollView>
    );
  }

  return (
    <View style={[variant === 'pill' ? styles.pillContainer : styles.underlineContainer, style]}>
      {tabs.map(renderTab)}
    </View>
  );
};

const styles = StyleSheet.create({
  pillContainer: {
    flexDirection: 'row',
    backgroundColor: themeColors.surface,
    borderRadius: radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  scrollContainer: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  pillTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.full,
    gap: spacing[1],
  },
  activePillTab: {
    backgroundColor: themeColors.surfaceActive,
  },
  pillText: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  activePillText: {
    color: themeColors.textPrimary,
  },
  underlineContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  underlineTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: spacing[1.5],
  },
  activeUnderlineTab: {
    borderBottomColor: themeColors.primary,
  },
  underlineText: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  activeUnderlineText: {
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: themeColors.surfaceActive,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  activeBadge: {
    backgroundColor: themeColors.primaryLight,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.textSecondary,
  },
  activeBadgeText: {
    color: themeColors.primary,
  },
});
