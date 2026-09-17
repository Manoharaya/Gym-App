import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { themeColors, typography, radius, spacing } from '../../../theme';
import { Icon } from '../../../components/primitives';
import { CollectionCard } from '../components/CollectionCard';
import {
  ExerciseService,
  ExerciseCollectionSummary,
} from '../services/exerciseService';
import type { MemberStackParamList } from '../../../navigation/types';

type NavProp = NativeStackNavigationProp<MemberStackParamList>;

const CATEGORY_TABS = [
  { key: 'ALL', label: 'All Collections' },
  { key: 'ESSENTIALS', label: 'Essentials' },
  { key: 'POSTURE', label: 'Posture & Alignment' },
  { key: 'STRENGTH', label: 'Foundational Strength' },
  { key: 'MOBILITY', label: 'Joint Mobility' },
  { key: 'HYPERTROPHY', label: 'Hypertrophy & Growth' },
  { key: 'WARMUP', label: 'Warmup & Priming' },
  { key: 'CORE', label: 'Core & Stability' },
];

export const ExerciseCollectionsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();

  const [collections, setCollections] = useState<ExerciseCollectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadCollections = useCallback(async () => {
    try {
      setLoading(true);
      const categoryParam = selectedCategory === 'ALL' ? undefined : selectedCategory;
      const res = await ExerciseService.getCollections({
        category: categoryParam,
        search: searchQuery.trim() ? searchQuery.trim() : undefined,
        limit: 50,
      });
      setCollections(res.items || []);
    } catch (err) {
      console.warn('Failed to load collections:', err);
      setCollections([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadCollections();
  };

  const handleSelectCollection = (col: ExerciseCollectionSummary) => {
    navigation.navigate('ExerciseCollectionDetail', {
      collectionId: col.id,
      title: col.title,
    });
  };

  const featuredCollection = collections.find((c) => c.featured);
  const regularCollections = featuredCollection
    ? collections.filter((c) => c.id !== featuredCollection.id)
    : collections;

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTextGroup}>
            <Text style={styles.headerTitle}>Exercise Collections</Text>
            <Text style={styles.headerSubtitle}>Curated Movement Programs & Groupings</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Icon name="search" size={16} color={themeColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search collections, exercises, goals..."
            placeholderTextColor={themeColors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close" size={16} color={themeColors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Horizontal Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryPillsScroll}
        >
          {CATEGORY_TABS.map((tab) => {
            const isSelected = selectedCategory === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.7}
                onPress={() => setSelectedCategory(tab.key)}
                style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.categoryPillTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Cross-Link Banner to Guided Learning Paths */}
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => navigation.navigate('LearningPaths')}
        style={styles.learningPathsBanner}
      >
        <View style={styles.bannerIconCircle}>
          <Icon name="award" size={18} color={themeColors.primary} />
        </View>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerTitle}>Guided Learning Paths</Text>
          <Text style={styles.bannerSubtitle}>
            Step-by-step masterclasses with progressive lessons & technique guidance
          </Text>
        </View>
        <Icon name="chevron-right" size={16} color={themeColors.primary} />
      </TouchableOpacity>

      {/* Main List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Loading curated collections...</Text>
        </View>
      ) : (
        <FlatList
          data={regularCollections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={themeColors.primary}
            />
          }
          ListHeaderComponent={
            featuredCollection ? (
              <View style={styles.featuredSection}>
                <View style={styles.featuredSectionHeader}>
                  <Icon name="sparkles" size={14} color={themeColors.accent} />
                  <Text style={styles.featuredSectionLabel}>FEATURED CURATION</Text>
                </View>
                <CollectionCard
                  collection={featuredCollection}
                  onPress={handleSelectCollection}
                />
                <Text style={styles.sectionDividerLabel}>ALL CURATED COLLECTIONS</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <CollectionCard
              collection={item}
              onPress={handleSelectCollection}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="activity" size={40} color={themeColors.textSecondary} />
              <Text style={styles.emptyTitle}>No Collections Found</Text>
              <Text style={styles.emptySubtitle}>
                No exercise collections match the selected category or search query.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  header: {
    paddingTop: spacing.md,
    backgroundColor: themeColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    ...typography.title,
    fontSize: 20,
    fontWeight: '800',
    color: themeColors.textPrimary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    color: themeColors.textPrimary,
    padding: 0,
  },
  categoryPillsScroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryPillActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderColor: themeColors.primary,
  },
  categoryPillText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.textSecondary,
  },
  categoryPillTextActive: {
    color: themeColors.primary,
    fontWeight: '700',
  },
  learningPathsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.25)',
    gap: spacing.sm,
  },
  bannerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    ...typography.subtitle,
    fontSize: 14,
    fontWeight: '700',
    color: themeColors.primary,
  },
  bannerSubtitle: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textSecondary,
    lineHeight: 15,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  featuredSection: {
    marginBottom: spacing.sm,
  },
  featuredSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  featuredSectionLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    color: themeColors.accent,
    letterSpacing: 1,
  },
  sectionDividerLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    color: themeColors.textSecondary,
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.body,
    fontSize: 14,
    color: themeColors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.subtitle,
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  emptySubtitle: {
    ...typography.body,
    fontSize: 13,
    color: themeColors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
});
