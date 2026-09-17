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
import { LearningPathCard } from '../components/LearningPathCard';
import {
  ExerciseService,
  LearningPathSummary,
} from '../services/exerciseService';
import type { MemberStackParamList } from '../../../navigation/types';

type NavProp = NativeStackNavigationProp<MemberStackParamList>;

const FILTER_TABS = [
  { key: 'ALL', label: 'All Paths' },
  { key: 'IN_PROGRESS', label: 'My In-Progress' },
  { key: 'FUNDAMENTALS', label: 'Fundamentals' },
  { key: 'SKILL_MASTERY', label: 'Skill Mastery' },
  { key: 'MOBILITY', label: 'Mobility & Joints' },
  { key: 'POSTURE', label: 'Posture & Alignment' },
  { key: 'HYPERTROPHY', label: 'Hypertrophy Cues' },
];

export const LearningPathsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();

  const [paths, setPaths] = useState<LearningPathSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadPaths = useCallback(async () => {
    try {
      setLoading(true);
      const isProgressStatus = selectedFilter === 'IN_PROGRESS';
      const categoryParam =
        selectedFilter !== 'ALL' && !isProgressStatus ? selectedFilter : undefined;
      const progressStatusParam = isProgressStatus ? 'IN_PROGRESS' : undefined;

      const res = await ExerciseService.getLearningPaths({
        category: categoryParam,
        progressStatus: progressStatusParam,
        search: searchQuery.trim() ? searchQuery.trim() : undefined,
        limit: 50,
      });
      setPaths(res.items || []);
    } catch (err) {
      console.warn('Failed to load learning paths:', err);
      setPaths([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFilter, searchQuery]);

  useEffect(() => {
    loadPaths();
  }, [loadPaths]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadPaths();
  };

  const handleSelectPath = (path: LearningPathSummary) => {
    navigation.navigate('LearningPathOverview', {
      pathId: path.id,
      title: path.title,
    });
  };

  const handleResumeLesson = (pathId: string, lessonId: string) => {
    navigation.navigate('LearningLesson', {
      pathId,
      lessonId,
    });
  };

  const activePaths = paths.filter((p) => p.progress?.status === 'IN_PROGRESS');
  const featuredPath = paths.find((p) => p.featured);
  const regularPaths = featuredPath ? paths.filter((p) => p.id !== featuredPath.id) : paths;

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
            <Text style={styles.headerTitle}>Guided Learning Paths</Text>
            <Text style={styles.headerSubtitle}>Master Technique, Mechanics & Safety</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Icon name="search" size={16} color={themeColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search learning paths, skills, lifts..."
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

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsScroll}
        >
          {FILTER_TABS.map((tab) => {
            const isSelected = selectedFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.7}
                onPress={() => setSelectedFilter(tab.key)}
                style={[styles.filterPill, isSelected && styles.filterPillActive]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isSelected && styles.filterPillTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Cross-Link Banner to Exercise Collections */}
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => navigation.navigate('ExerciseCollections')}
        style={styles.collectionsBanner}
      >
        <View style={styles.bannerIconCircle}>
          <Icon name="activity" size={18} color={themeColors.accent} />
        </View>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerTitle}>Explore Exercise Collections</Text>
          <Text style={styles.bannerSubtitle}>
            Curated workout groupings, compound routines & muscle focus packs
          </Text>
        </View>
        <Icon name="chevron-right" size={16} color={themeColors.accent} />
      </TouchableOpacity>

      {/* Main Content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Loading guided learning paths...</Text>
        </View>
      ) : (
        <FlatList
          data={regularPaths}
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
            <>
              {/* Active Learning Section if present */}
              {selectedFilter === 'ALL' && activePaths.length > 0 && (
                <View style={styles.activeSection}>
                  <View style={styles.sectionHeaderRow}>
                    <Icon name="activity" size={14} color={themeColors.primary} />
                    <Text style={styles.sectionHeaderLabel}>CONTINUE YOUR ACTIVE PATHS</Text>
                  </View>
                  {activePaths.map((p) => (
                    <LearningPathCard
                      key={`active-${p.id}`}
                      path={p}
                      onPress={handleSelectPath}
                      onResumeLesson={handleResumeLesson}
                    />
                  ))}
                  <Text style={styles.sectionDividerLabel}>ALL MASTERCLASS PATHS</Text>
                </View>
              )}

              {/* Featured Path Highlight */}
              {featuredPath && selectedFilter === 'ALL' ? (
                <View style={styles.featuredSection}>
                  <View style={styles.sectionHeaderRow}>
                    <Icon name="award" size={14} color={themeColors.accent} />
                    <Text style={styles.featuredSectionLabel}>FEATURED MASTERCLASS</Text>
                  </View>
                  <LearningPathCard
                    path={featuredPath}
                    onPress={handleSelectPath}
                    onResumeLesson={handleResumeLesson}
                  />
                </View>
              ) : null}
            </>
          }
          renderItem={({ item }) => (
            <LearningPathCard
              path={item}
              onPress={handleSelectPath}
              onResumeLesson={handleResumeLesson}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="award" size={40} color={themeColors.textSecondary} />
              <Text style={styles.emptyTitle}>No Learning Paths Found</Text>
              <Text style={styles.emptySubtitle}>
                No learning paths match the selected filter. Try exploring all paths.
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
  filterPillsScroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterPillActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderColor: themeColors.primary,
  },
  filterPillText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.textSecondary,
  },
  filterPillTextActive: {
    color: themeColors.primary,
    fontWeight: '700',
  },
  collectionsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 200, 180, 0.08)',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 200, 180, 0.25)',
    gap: spacing.sm,
  },
  bannerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 200, 180, 0.15)',
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
    color: themeColors.accent,
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
  activeSection: {
    marginBottom: spacing.md,
  },
  featuredSection: {
    marginBottom: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  sectionHeaderLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    color: themeColors.primary,
    letterSpacing: 0.8,
  },
  featuredSectionLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    color: themeColors.accent,
    letterSpacing: 0.8,
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
