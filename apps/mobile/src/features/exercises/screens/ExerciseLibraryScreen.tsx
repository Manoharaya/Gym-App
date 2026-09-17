import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Icon, Badge } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import {
  ExerciseService,
  ExerciseFilterMetadata,
  ExerciseDiscoveryOverview,
} from '../services/exerciseService';
import {
  ExerciseCard,
  ExerciseCategoryDiscovery,
  ExerciseFilterModal,
  ExerciseFiltersState,
  ExerciseQuickPreviewModal,
  ContinueLearningCard,
  PersonalizedExerciseSection,
  PersonalizationSettingsModal,
  BodyMapVisualizer,
  DimensionExplorerCard,
} from '../components';
import type {
  PersonalizedDiscoveryResponse,
  MemberExercisePreference,
  PersonalizedExerciseItem,
} from '../services/exerciseService';
import type { Exercise } from '@fitcore/types';

export const ExerciseLibraryScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  // Active Discovery Tab: 'for_you' (Personalized) vs 'explore' (Full Catalog)
  const [activeTab, setActiveTab] = useState<'for_you' | 'explore'>('for_you');

  // Day 68: Personalized Discovery State
  const [discoveryData, setDiscoveryData] = useState<PersonalizedDiscoveryResponse | null>(null);
  const [memberPreferences, setMemberPreferences] = useState<MemberExercisePreference | null>(null);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [loadingPersonalized, setLoadingPersonalized] = useState(true);

  // Search & Filters State
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [filters, setFilters] = useState<ExerciseFiltersState>({
    sortBy: 'RECOMMENDED',
    category: '',
    muscleGroup: '',
    equipment: '',
    difficulty: '',
    movementPattern: '',
    environment: '',
    isFavorite: false,
    noEquipment: false,
  });

  // Data State
  const [exercises, setExercises] = useState<(Exercise & { isFavorite?: boolean })[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<(Exercise & { isFavorite?: boolean })[]>([]);
  const [filterMetadata, setFilterMetadata] = useState<ExerciseFilterMetadata | null>(null);
  const [discoveryOverview, setDiscoveryOverview] = useState<ExerciseDiscoveryOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Modals State
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [previewExercise, setPreviewExercise] = useState<(Exercise & { isFavorite?: boolean }) | null>(null);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // 0. Fetch Personalized Discovery Data & Preferences
  const loadPersonalized = useCallback(async () => {
    try {
      setLoadingPersonalized(true);
      const [disc, prefs] = await Promise.all([
        ExerciseService.getPersonalizedSections(),
        ExerciseService.getPreferences(),
      ]);
      setDiscoveryData(disc);
      setMemberPreferences(prefs);
    } catch (err) {
      console.warn('Failed to load personalized discovery:', err);
    } finally {
      setLoadingPersonalized(false);
    }
  }, []);

  // 1. Fetch Filter Metadata & Visual Discovery Overview on Mount
  const loadMetadata = useCallback(async () => {
    try {
      const [meta, disc] = await Promise.all([
        ExerciseService.getFilterMetadata(),
        ExerciseService.getDiscoveryOverview(),
      ]);
      setFilterMetadata(meta);
      setDiscoveryOverview(disc);
    } catch (err) {
      console.warn('Failed to load filter metadata or discovery overview:', err);
    }
  }, []);

  // Open Discovery Dimension Detail Screen
  const handleOpenDimension = (
    dimension: 'category' | 'muscle' | 'equipment' | 'movement' | 'goal' | 'difficulty',
    value: string,
    initialTitle?: string
  ) => {
    navigation.navigate('ExerciseDimensionDetail', { dimension, value, initialTitle });
  };

  // 2. Fetch Recently Viewed Exercises
  const loadRecentlyViewed = useCallback(async () => {
    try {
      const recents = await ExerciseService.getRecentlyViewed(8);
      setRecentlyViewed(recents.items || []);
    } catch (err) {
      console.warn('Failed to load recently viewed exercises:', err);
    }
  }, []);

  // 3. Fetch Exercises with Active Search & Multi-Filters
  const fetchExercises = useCallback(async () => {
    try {
      setLoading(true);
      const categoryToUse = selectedCategory || filters.category || undefined;
      const res = await ExerciseService.getExercises({
        search: search.trim() || undefined,
        exerciseCategory: categoryToUse,
        muscleGroup: (filters.muscleGroup as any) || undefined,
        equipmentType: (filters.equipment as any) || undefined,
        difficulty: (filters.difficulty as any) || undefined,
        movementPattern: (filters.movementPattern as any) || undefined,
        environment: filters.environment && filters.environment !== 'ALL' ? filters.environment : undefined,
        sortBy: filters.sortBy,
        isFavorite: filters.isFavorite || undefined,
        noEquipment: filters.noEquipment || undefined,
        limit: 50,
      });

      setExercises(res.items || []);
      setTotalCount(res.meta?.total || (res.items || []).length);
    } catch (err) {
      console.warn('Failed to load exercises:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedCategory, filters]);

  // Initial Load
  useEffect(() => {
    loadPersonalized();
    loadMetadata();
    loadRecentlyViewed();
  }, [loadPersonalized, loadMetadata, loadRecentlyViewed]);

  // Debounced Search & Filter Triggers
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      fetchExercises();
    }, 200);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [fetchExercises]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPersonalized();
    loadMetadata();
    loadRecentlyViewed();
    fetchExercises();
  };

  // Toggle Favorite Bookmark
  const handleToggleFavorite = async (exerciseId: string) => {
    // Optimistic UI update in main exercises list
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId ? { ...ex, isFavorite: !ex.isFavorite } : ex,
      ),
    );

    // Also update personalized discovery sections optimistically
    setDiscoveryData((prev) => {
      if (!prev) return prev;
      const mapItem = (item: PersonalizedExerciseItem) =>
        item.id === exerciseId ? { ...item, isFavorite: !item.isFavorite } : item;
      return {
        ...prev,
        forYou: prev.forYou.map(mapItem),
        continueLearning: prev.continueLearning.map(mapItem),
        favorites: prev.favorites.some((f) => f.id === exerciseId)
          ? prev.favorites.filter((f) => f.id !== exerciseId)
          : prev.favorites.map(mapItem),
        basedOnGoals: prev.basedOnGoals.map(mapItem),
        basedOnEquipment: prev.basedOnEquipment.map(mapItem),
        recentlyViewed: prev.recentlyViewed.map(mapItem),
        usedInWorkouts: prev.usedInWorkouts.map(mapItem),
        exploreNew: prev.exploreNew.map(mapItem),
      };
    });

    // Also update preview modal if open
    if (previewExercise?.id === exerciseId) {
      setPreviewExercise((prev) =>
        prev ? { ...prev, isFavorite: !prev.isFavorite } : null,
      );
    }

    // Also update recently viewed list
    setRecentlyViewed((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId ? { ...ex, isFavorite: !ex.isFavorite } : ex,
      ),
    );

    try {
      await ExerciseService.toggleFavorite(exerciseId);
      // Reload metadata to update counts if needed
      loadMetadata();
    } catch (err) {
      console.warn('Failed to toggle favorite:', err);
      // Revert optimistic update
      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === exerciseId ? { ...ex, isFavorite: !ex.isFavorite } : ex,
        ),
      );
      loadPersonalized();
    }
  };

  // Open Full Exercise Detail Screen (Day 66)
  const handleOpenDetail = (exercise: Exercise) => {
    // Record recent view in background
    ExerciseService.recordRecentView(exercise.id)
      .then(() => loadRecentlyViewed())
      .catch(() => {});

    navigation.navigate('ExerciseDetail', {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
    });
  };

  // Active filters count (excluding category handled by discovery carousel)
  const activeFiltersCount = () => {
    let count = 0;
    if (filters.muscleGroup) count++;
    if (filters.equipment) count++;
    if (filters.difficulty) count++;
    if (filters.movementPattern) count++;
    if (filters.environment && filters.environment !== 'ALL') count++;
    if (filters.sortBy !== 'RECOMMENDED') count++;
    if (filters.isFavorite) count++;
    if (filters.noEquipment) count++;
    return count;
  };

  const handleResetFilters = () => {
    setSelectedCategory('');
    setSearch('');
    setFilters({
      sortBy: 'RECOMMENDED',
      category: '',
      muscleGroup: '',
      equipment: '',
      difficulty: '',
      movementPattern: '',
      environment: '',
      isFavorite: false,
      noEquipment: false,
    });
  };

  const renderHeader = () => (
    <View>
      {/* Category Discovery Carousel */}
      <ExerciseCategoryDiscovery
        categories={filterMetadata?.categories || []}
        selectedCategory={selectedCategory}
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
          setFilters((p) => ({ ...p, category: catId }));
        }}
        totalCount={filterMetadata?.totalCount}
      />

      {/* Quick Filter Bar */}
      <View style={styles.quickFilterBar}>
        <TouchableOpacity
          onPress={() => setFilterModalVisible(true)}
          style={[
            styles.filterModalButton,
            activeFiltersCount() > 0 && styles.filterModalButtonActive,
          ]}
        >
          <Icon
            name="filter"
            size={14}
            color={activeFiltersCount() > 0 ? '#FFFFFF' : themeColors.textPrimary}
          />
          <Text
            style={[
              styles.filterModalButtonText,
              activeFiltersCount() > 0 && styles.filterModalButtonTextActive,
            ]}
          >
            Filters
          </Text>
          {activeFiltersCount() > 0 && (
            <View style={styles.filterCounterBadge}>
              <Text style={styles.filterCounterText}>{activeFiltersCount()}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.quickPill,
            filters.isFavorite && styles.quickPillActiveFavorite,
          ]}
          onPress={() =>
            setFilters((p) => ({ ...p, isFavorite: !p.isFavorite }))
          }
        >
          <Icon
            name="heart"
            size={13}
            color={filters.isFavorite ? '#FFFFFF' : themeColors.textSecondary}
          />
          <Text
            style={[
              styles.quickPillText,
              filters.isFavorite && styles.quickPillTextActive,
            ]}
          >
            Favorites
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.quickPill,
            filters.noEquipment && styles.quickPillActive,
          ]}
          onPress={() =>
            setFilters((p) => ({ ...p, noEquipment: !p.noEquipment }))
          }
        >
          <Icon
            name="bolt"
            size={13}
            color={filters.noEquipment ? '#FFFFFF' : themeColors.textSecondary}
          />
          <Text
            style={[
              styles.quickPillText,
              filters.noEquipment && styles.quickPillTextActive,
            ]}
          >
            Bodyweight
          </Text>
        </TouchableOpacity>
      </View>

      {/* Active Filter Tags Row (Dismissible) */}
      {(activeFiltersCount() > 0 || selectedCategory) && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.activeFiltersScroll}
        >
          {selectedCategory ? (
            <View style={styles.activeFilterChip}>
              <Text style={styles.activeFilterChipText}>
                Category: {selectedCategory}
              </Text>
              <TouchableOpacity onPress={() => setSelectedCategory('')}>
                <Icon name="close" size={12} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
          ) : null}

          {filters.muscleGroup ? (
            <View style={styles.activeFilterChip}>
              <Text style={styles.activeFilterChipText}>
                Muscle: {filters.muscleGroup}
              </Text>
              <TouchableOpacity
                onPress={() => setFilters((p) => ({ ...p, muscleGroup: undefined }))}
              >
                <Icon name="close" size={12} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
          ) : null}

          {filters.equipment ? (
            <View style={styles.activeFilterChip}>
              <Text style={styles.activeFilterChipText}>
                Equipment: {filters.equipment}
              </Text>
              <TouchableOpacity
                onPress={() => setFilters((p) => ({ ...p, equipment: undefined }))}
              >
                <Icon name="close" size={12} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
          ) : null}

          {filters.difficulty ? (
            <View style={styles.activeFilterChip}>
              <Text style={styles.activeFilterChipText}>
                Level: {filters.difficulty}
              </Text>
              <TouchableOpacity
                onPress={() => setFilters((p) => ({ ...p, difficulty: undefined }))}
              >
                <Icon name="close" size={12} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
          ) : null}

          {filters.sortBy !== 'RECOMMENDED' ? (
            <View style={styles.activeFilterChip}>
              <Text style={styles.activeFilterChipText}>
                Sort: {filters.sortBy}
              </Text>
              <TouchableOpacity
                onPress={() => setFilters((p) => ({ ...p, sortBy: 'RECOMMENDED' }))}
              >
                <Icon name="close" size={12} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity onPress={handleResetFilters} style={styles.clearAllBtn}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Day 69: Visual Discovery — Muscle Explorer with Body Map */}
      {!search && discoveryOverview?.muscles && (
        <View style={styles.discoverySection}>
          <View style={styles.discoverySectionHeader}>
            <View style={styles.discoveryHeaderTitleRow}>
              <View style={styles.discoveryIconBadge}>
                <Icon name="activity" size={16} color={themeColors.primary} />
              </View>
              <View>
                <Text style={styles.discoverySectionTitle}>Muscle Group Explorer</Text>
                <Text style={styles.discoverySectionSubtitle}>
                  Interactive anterior & posterior anatomical discovery
                </Text>
              </View>
            </View>
          </View>

          <BodyMapVisualizer
            muscles={discoveryOverview.muscles}
            selectedMuscle={filters.muscleGroup}
            onSelectMuscle={(muscleCode) => {
              setFilters((p) => ({
                ...p,
                muscleGroup: p.muscleGroup === muscleCode ? undefined : muscleCode,
              }));
            }}
            onExploreMuscle={(muscleCode) => {
              const m = discoveryOverview.muscles.find((x) => x.code === muscleCode);
              handleOpenDimension('muscle', muscleCode, m?.name);
            }}
          />
        </View>
      )}

      {/* Day 69: Visual Discovery — Equipment Explorer */}
      {!search && discoveryOverview?.equipment && (
        <View style={styles.discoverySection}>
          <View style={styles.discoverySectionHeader}>
            <View style={styles.discoveryHeaderTitleRow}>
              <View style={styles.discoveryIconBadge}>
                <Icon name="dumbbell" size={16} color={themeColors.primary} />
              </View>
              <View>
                <Text style={styles.discoverySectionTitle}>Browse by Equipment</Text>
                <Text style={styles.discoverySectionSubtitle}>
                  Free weights, machines, accessories, and bodyweight
                </Text>
              </View>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dimensionCardsScroll}
          >
            {discoveryOverview.equipment.map((eq) => (
              <DimensionExplorerCard
                key={`equip-${eq.code}`}
                title={eq.name}
                count={eq.count}
                isHighlighted={eq.isNoEquipment}
                icon={eq.isNoEquipment ? 'bolt' : 'dumbbell'}
                thumbnailUrl={eq.representativeExercise?.thumbnailUrl}
                description={eq.isNoEquipment ? 'Zero gear required' : eq.group.replace('_', ' ')}
                onPress={() => handleOpenDimension('equipment', eq.code, eq.name)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Day 69: Visual Discovery — Movement Patterns */}
      {!search && discoveryOverview?.movementPatterns && (
        <View style={styles.discoverySection}>
          <View style={styles.discoverySectionHeader}>
            <View style={styles.discoveryHeaderTitleRow}>
              <View style={styles.discoveryIconBadge}>
                <Icon name="bolt" size={16} color={themeColors.primary} />
              </View>
              <View>
                <Text style={styles.discoverySectionTitle}>Browse Movement Patterns</Text>
                <Text style={styles.discoverySectionSubtitle}>
                  Biomechanics: squat, hinge, push, pull, lunge, carry
                </Text>
              </View>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dimensionCardsScroll}
          >
            {discoveryOverview.movementPatterns.map((mov) => (
              <DimensionExplorerCard
                key={`mov-${mov.code}`}
                title={mov.name}
                count={mov.count}
                icon="bolt"
                thumbnailUrl={mov.representativeExercise?.thumbnailUrl}
                description={mov.description}
                onPress={() => handleOpenDimension('movement', mov.code, mov.name)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Day 69: Visual Discovery — Training Goals & Levels */}
      {!search && discoveryOverview?.goals && (
        <View style={styles.discoverySection}>
          <View style={styles.discoverySectionHeader}>
            <View style={styles.discoveryHeaderTitleRow}>
              <View style={styles.discoveryIconBadge}>
                <Icon name="trophy" size={16} color={themeColors.primary} />
              </View>
              <View>
                <Text style={styles.discoverySectionTitle}>Explore by Training Goal</Text>
                <Text style={styles.discoverySectionSubtitle}>
                  Strength, hypertrophy, endurance, or mobility
                </Text>
              </View>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dimensionCardsScroll}
          >
            {discoveryOverview.goals.map((g) => (
              <DimensionExplorerCard
                key={`goal-${g.code}`}
                title={g.name}
                count={g.count}
                icon="trophy"
                description={g.description}
                onPress={() => handleOpenDimension('goal', g.code, g.name)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recently Viewed Shelf */}
      {recentlyViewed.length > 0 && !search && (
        <View style={styles.recentsSection}>
          <View style={styles.recentsHeader}>
            <View style={styles.recentsTitleRow}>
              <Icon name="clock" size={15} color={themeColors.primary} />
              <Text style={styles.recentsTitle}>Recently Viewed</Text>
            </View>
            <Text style={styles.recentsCount}>{recentlyViewed.length} items</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentsScroll}
          >
            {recentlyViewed.map((item) => (
              <ExerciseCard
                key={`recent-${item.id}`}
                exercise={item}
                onPress={handleOpenDetail}
                onToggleFavorite={handleToggleFavorite}
                isCompact
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {totalCount} {totalCount === 1 ? 'Exercise' : 'Exercises'} Available
        </Text>
        <Text style={styles.sortIndicator}>
          Sort: {filters.sortBy === 'ALPHABETICAL' ? 'A–Z' : filters.sortBy === 'DIFFICULTY' ? 'Difficulty' : filters.sortBy === 'NEWEST' ? 'Newest' : 'Recommended'}
        </Text>
      </View>
    </View>
  );

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      {/* Top Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Exercise Library</Text>
          <Text style={styles.headerSubtitle}>Discover & Master Technique</Text>
        </View>
        <TouchableOpacity
          onPress={() => setFilterModalVisible(true)}
          style={styles.headerFilterBtn}
        >
          <Icon name="filter" size={18} color={themeColors.textPrimary} />
          {activeFiltersCount() > 0 && <View style={styles.headerFilterDot} />}
        </TouchableOpacity>
      </View>

      {/* Top Segmented Tab Switcher */}
      <View style={styles.tabBarContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'for_you' && styles.tabButtonActive]}
          onPress={() => setActiveTab('for_you')}
          activeOpacity={0.8}
        >
          <Icon
            name="sparkles"
            size={14}
            color={activeTab === 'for_you' ? '#FFFFFF' : themeColors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'for_you' && styles.tabTextActive]}>
            For You
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'explore' && styles.tabButtonActive]}
          onPress={() => setActiveTab('explore')}
          activeOpacity={0.8}
        >
          <Icon
            name="search"
            size={14}
            color={activeTab === 'explore' ? '#FFFFFF' : themeColors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'explore' && styles.tabTextActive]}>
            Explore All
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'for_you' ? (
        loadingPersonalized && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
            <Text style={styles.loadingText}>Personalizing exercise hub...</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.personalizedScroll}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={themeColors.primary}
              />
            }
          >
            {/* Personalization Profile Summary Banner */}
            <View style={styles.personalizationBanner}>
              <View style={styles.bannerInfo}>
                <View style={styles.bannerBadgeRow}>
                  <Badge label="PERSONALIZED" variant="accent" />
                  {memberPreferences?.preferredDifficulty && (
                    <Badge label={memberPreferences.preferredDifficulty} variant="neutral" />
                  )}
                </View>
                <Text style={styles.bannerTitle}>
                  {memberPreferences?.fitnessGoals?.[0]
                    ? `Tailored for ${memberPreferences.fitnessGoals[0].replace(/_/g, ' ').toLowerCase()}`
                    : 'Tailored for your fitness journey'}
                </Text>
                <Text style={styles.bannerSubtitle}>
                  {memberPreferences?.availableEquipment && memberPreferences.availableEquipment.length > 0
                    ? `Equipment: ${memberPreferences.availableEquipment.slice(0, 3).join(', ').toLowerCase()}`
                    : 'Adapted to your equipment and learning pace'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setSettingsModalVisible(true)}
                style={styles.personalizeButton}
                activeOpacity={0.7}
              >
                <Icon name="sparkles" size={13} color={themeColors.primary} />
                <Text style={styles.personalizeButtonText}>Edit Goals</Text>
              </TouchableOpacity>
            </View>

            {/* Day 70: Collections & Learning Paths Discovery Tiles */}
            <View style={styles.hubTilesRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('ExerciseCollections')}
                style={styles.hubTile}
              >
                <View style={[styles.hubTileIcon, { backgroundColor: 'rgba(0, 200, 180, 0.12)' }]}>
                  <Icon name="activity" size={18} color={themeColors.accent} />
                </View>
                <View style={styles.hubTileContent}>
                  <Text style={styles.hubTileTitle}>Collections</Text>
                  <Text style={styles.hubTileSubtitle}>Curated Programs</Text>
                </View>
                <Icon name="chevron-right" size={14} color={themeColors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('LearningPaths')}
                style={styles.hubTile}
              >
                <View style={[styles.hubTileIcon, { backgroundColor: 'rgba(255, 107, 0, 0.12)' }]}>
                  <Icon name="award" size={18} color={themeColors.primary} />
                </View>
                <View style={styles.hubTileContent}>
                  <Text style={styles.hubTileTitle}>Learning Paths</Text>
                  <Text style={styles.hubTileSubtitle}>Guided Lessons</Text>
                </View>
                <Icon name="chevron-right" size={14} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Continue Learning Section */}
            {discoveryData?.continueLearning && discoveryData.continueLearning.length > 0 && (
              <View style={styles.continueLearningSection}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionTitleWithIcon}>
                    <View style={styles.clockIconHalo}>
                      <Icon name="clock" size={15} color={themeColors.primary} />
                    </View>
                    <View>
                      <Text style={styles.sectionTitleText}>Continue Learning</Text>
                      <Text style={styles.sectionSubtitleText}>
                        Resume movement breakdown and technique guides
                      </Text>
                    </View>
                  </View>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.continueLearningScroll}
                >
                  {discoveryData.continueLearning.map((item) => (
                    <ContinueLearningCard
                      key={`continue-${item.id}`}
                      item={item}
                      onPress={handleOpenDetail}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Recommended For You Section */}
            <PersonalizedExerciseSection
              title="Recommended For You"
              subtitle="Scored and ranked based on your fitness goals and activity"
              badge="TOP MATCH"
              iconName="sparkles"
              items={discoveryData?.forYou || []}
              onPressItem={handleOpenDetail}
              onToggleFavorite={handleToggleFavorite}
            />

            {/* Based on Your Goals */}
            <PersonalizedExerciseSection
              title="Based on Your Goals"
              subtitle="Directly aligned with your target training outcomes"
              iconName="bolt"
              items={discoveryData?.basedOnGoals || []}
              onPressItem={handleOpenDetail}
              onToggleFavorite={handleToggleFavorite}
            />

            {/* Based on Available Equipment */}
            <PersonalizedExerciseSection
              title="Matching Your Equipment"
              subtitle="Movements executable with your designated gear"
              iconName="dumbbell"
              items={discoveryData?.basedOnEquipment || []}
              onPressItem={handleOpenDetail}
              onToggleFavorite={handleToggleFavorite}
            />

            {/* Used in Your Workouts */}
            {discoveryData?.usedInWorkouts && discoveryData.usedInWorkouts.length > 0 && (
              <PersonalizedExerciseSection
                title="From Your Workout History"
                subtitle="Exercises programmed in your sessions"
                iconName="activity"
                items={discoveryData.usedInWorkouts}
                onPressItem={handleOpenDetail}
                onToggleFavorite={handleToggleFavorite}
              />
            )}

            {/* Saved Favorites */}
            {discoveryData?.favorites && discoveryData.favorites.length > 0 && (
              <PersonalizedExerciseSection
                title="Your Favorites"
                subtitle="Movements you have bookmarked"
                iconName="heart"
                items={discoveryData.favorites}
                onPressItem={handleOpenDetail}
                onToggleFavorite={handleToggleFavorite}
              />
            )}

            {/* Explore New Movements */}
            <PersonalizedExerciseSection
              title="Explore New Movements"
              subtitle="Expand your training repertoire with fresh exercises"
              iconName="sparkles"
              items={discoveryData?.exploreNew || []}
              onPressItem={handleOpenDetail}
              onToggleFavorite={handleToggleFavorite}
              onSeeAll={() => setActiveTab('explore')}
            />
          </ScrollView>
        )
      ) : (
        <>
          {/* Live Search Input */}
          <View style={styles.searchWrap}>
            <View style={styles.searchContainer}>
              <Icon name="search" size={17} color={themeColors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search exercises, muscles, equipment..."
                placeholderTextColor={themeColors.textMuted}
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} style={styles.clearSearchBtn}>
                  <Icon name="close" size={14} color={themeColors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Main Exercise Feed */}
          {loading && !refreshing ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={themeColors.primary} />
              <Text style={styles.loadingText}>Finding exercises...</Text>
            </View>
          ) : (
            <FlatList
              data={exercises}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ExerciseCard
                  exercise={item}
                  onPress={handleOpenDetail}
                  onQuickPreview={(ex) => setPreviewExercise(ex)}
                  onToggleFavorite={handleToggleFavorite}
                />
              )}
              ListHeaderComponent={renderHeader}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={themeColors.primary}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconHalo}>
                    <Icon
                      name={filters.isFavorite ? 'heart' : 'dumbbell'}
                      size={36}
                      color={themeColors.primary}
                    />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {filters.isFavorite
                      ? 'No Favorite Exercises Yet'
                      : 'No Exercises Found'}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {filters.isFavorite
                      ? 'Tap the heart icon on any exercise card to bookmark it for quick access anytime.'
                      : 'Try loosening your filter criteria or searching for different keywords.'}
                  </Text>
                  <TouchableOpacity
                    onPress={handleResetFilters}
                    style={styles.emptyResetBtn}
                  >
                    <Text style={styles.emptyResetText}>Reset All Filters</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </>
      )}

      {/* Comprehensive Filter Modal */}
      <ExerciseFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filters={filters}
        filterMetadata={filterMetadata || undefined}
        onApplyFilters={(newFilters) => {
          setFilters(newFilters);
          if (newFilters.category) {
            setSelectedCategory(newFilters.category);
          }
        }}
        onResetFilters={handleResetFilters}
      />

      {/* Quick Preview Modal */}
      <ExerciseQuickPreviewModal
        visible={Boolean(previewExercise)}
        exercise={previewExercise}
        onClose={() => setPreviewExercise(null)}
        onOpenFullDetail={handleOpenDetail}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* Day 68: Personalization Settings Modal */}
      <PersonalizationSettingsModal
        visible={settingsModalVisible}
        preferences={memberPreferences}
        onClose={() => setSettingsModalVisible(false)}
        onSave={async (payload) => {
          const updated = await ExerciseService.updatePreferences(payload);
          setMemberPreferences(updated);
          await loadPersonalized();
        }}
        onReset={async () => {
          const reset = await ExerciseService.resetPreferences();
          setMemberPreferences(reset);
          await loadPersonalized();
        }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: themeColors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
    fontSize: 17,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  headerSubtitle: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textMuted,
    marginTop: 1,
  },
  headerFilterBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: themeColors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
    position: 'relative',
  },
  headerFilterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: themeColors.primary,
  },
  searchWrap: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[1],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.surfaceElevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    height: 44,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing[2],
    color: themeColors.textPrimary,
    ...typography.body,
    fontSize: 14,
  },
  clearSearchBtn: {
    padding: spacing[1],
  },
  quickFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  filterModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: spacing[3],
    borderRadius: radius.full,
    backgroundColor: themeColors.surfaceElevated,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  filterModalButtonActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  filterModalButtonText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  filterModalButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterCounterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCounterText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: spacing[3],
    borderRadius: radius.full,
    backgroundColor: themeColors.surfaceElevated,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  quickPillActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  quickPillActiveFavorite: {
    backgroundColor: themeColors.danger,
    borderColor: themeColors.danger,
  },
  quickPillText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.textSecondary,
  },
  quickPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  activeFiltersScroll: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: themeColors.cardBackground,
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingVertical: 4,
    paddingHorizontal: spacing[3],
    borderRadius: radius.full,
  },
  activeFilterChipText: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textSecondary,
  },
  clearAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: spacing[2],
    justifyContent: 'center',
  },
  clearAllText: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.primary,
    fontWeight: '700',
  },
  recentsSection: {
    marginBottom: spacing[4],
  },
  recentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
  },
  recentsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentsTitle: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  recentsCount: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textMuted,
  },
  recentsScroll: {
    paddingHorizontal: spacing[4],
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
  },
  resultsCount: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: themeColors.textSecondary,
  },
  sortIndicator: {
    ...typography.caption,
    fontSize: 11,
    color: themeColors.textMuted,
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
  },
  loadingText: {
    ...typography.body,
    fontSize: 13,
    color: themeColors.textMuted,
    marginTop: spacing[3],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[10],
    paddingHorizontal: spacing[6],
  },
  emptyIconHalo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  emptyTitle: {
    ...typography.h3,
    fontSize: 18,
    color: themeColors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    fontSize: 13,
    color: themeColors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing[5],
  },
  emptyResetBtn: {
    backgroundColor: themeColors.surfaceElevated,
    borderWidth: 1,
    borderColor: themeColors.primary,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    borderRadius: radius.md,
  },
  emptyResetText: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '700',
    color: themeColors.primary,
  },
  // Day 68: Tab Bar & Personalization Styles
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#121417',
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    padding: 3,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radius.sm,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
    borderWidth: 1,
    borderColor: themeColors.primary,
  },
  tabText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: themeColors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  personalizedScroll: {
    paddingBottom: spacing[8],
  },
  personalizationBanner: {
    marginHorizontal: spacing[4],
    marginTop: spacing[2],
    marginBottom: spacing[3],
    padding: spacing[4],
    backgroundColor: themeColors.cardBackground || '#1A1C20',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerInfo: {
    flex: 1,
    marginRight: spacing[3],
  },
  bannerBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  bannerTitle: {
    ...typography.subtitle,
    fontSize: 15,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  bannerSubtitle: {
    ...typography.caption,
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  personalizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  personalizeButtonText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: themeColors.primary,
  },
  hubTilesRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
  },
  hubTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.cardBackground || '#1A1C20',
    padding: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: spacing[2],
  },
  hubTileIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubTileContent: {
    flex: 1,
  },
  hubTileTitle: {
    ...typography.subtitle,
    fontSize: 13,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  hubTileSubtitle: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.textSecondary,
    marginTop: 1,
  },
  continueLearningSection: {
    marginVertical: spacing[3],
  },
  sectionHeaderRow: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
  },
  sectionTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  clockIconHalo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitleText: {
    ...typography.subtitle,
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  sectionSubtitleText: {
    ...typography.caption,
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 1,
  },
  continueLearningScroll: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1],
  },
  discoverySection: {
    marginBottom: spacing[4],
  },
  discoverySectionHeader: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
  },
  discoveryHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  discoveryIconBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  discoverySectionTitle: {
    ...typography.subtitle,
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  discoverySectionSubtitle: {
    ...typography.caption,
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 1,
  },
  dimensionCardsScroll: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1],
  },
});
