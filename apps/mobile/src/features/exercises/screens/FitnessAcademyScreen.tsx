import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MemberStackParamList } from '../../../navigation/types';

import { themeColors, typography, radius, spacing } from '../../../theme';
import { Icon, Badge, Card } from '../../../components/primitives';
import {
  ExerciseService,
  CurriculumSummary,
  AcademyOverview,
  GlossaryTermItem,
} from '../services/exerciseService';
import { CurriculumCard } from '../components/CurriculumCard';
import { GlossaryTermModal } from '../components/GlossaryTermModal';

type NavProp = NativeStackNavigationProp<MemberStackParamList>;

const CATEGORY_TABS = [
  { key: 'ALL', label: 'All Curricula' },
  { key: 'FITNESS_FUNDAMENTALS', label: 'Fitness Fundamentals' },
  { key: 'MOVEMENT_FUNDAMENTALS', label: 'Movement Fundamentals' },
  { key: 'EXERCISE_FUNDAMENTALS', label: 'Exercise Fundamentals' },
  { key: 'TRAINING_PRINCIPLES', label: 'Training Principles' },
  { key: 'WARMUP_COOLDOWN', label: 'Warm-Up & Cool-Down' },
  { key: 'STRENGTH_TRAINING', label: 'Strength Training' },
  { key: 'RECOVERY', label: 'Recovery & Reset' },
];

export const FitnessAcademyScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();

  const [overview, setOverview] = useState<AcademyOverview | null>(null);
  const [curricula, setCurricula] = useState<CurriculumSummary[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGlossaryTerm, setSelectedGlossaryTerm] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [ov, list] = await Promise.all([
        ExerciseService.getAcademyOverview(),
        ExerciseService.getCurricula({
          category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
          search: searchQuery.trim() || undefined,
        }),
      ]);
      setOverview(ov);
      setCurricula(list);
    } catch (err) {
      console.warn('Failed to load Fitness Academy data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleOpenCurriculum = (curriculum: CurriculumSummary) => {
    navigation.navigate('CurriculumDetail', {
      curriculumId: curriculum.id,
      title: curriculum.title,
    });
  };

  const handleOpenGlossary = () => {
    navigation.navigate('Glossary');
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Fitness Academy</Text>
          <Text style={styles.headerSubtitle}>Structured Education & Mastery</Text>
        </View>

        <TouchableOpacity
          style={styles.glossaryNavButton}
          onPress={handleOpenGlossary}
          accessibilityRole="button"
          accessibilityLabel="Open Fitness Glossary"
        >
          <Icon name="award" size={16} color="#a78bfa" />
          <Text style={styles.glossaryNavText}>Glossary</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
          />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={16} color={themeColors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search curricula or topics..."
            placeholderTextColor={themeColors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close" size={16} color={themeColors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Category Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {CATEGORY_TABS.map((tab) => {
            const isSelected = selectedCategory === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setSelectedCategory(tab.key)}
                style={[
                  styles.categoryPill,
                  isSelected && styles.categoryPillSelected,
                ]}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.categoryPillTextSelected,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Featured / Continue Curriculum Track Banner */}
        {overview?.resumePosition && (
          <Card style={styles.resumeCard}>
            <View style={styles.resumeHeader}>
              <Badge label="IN PROGRESS" variant="primary" />
              <Text style={styles.resumeTime}>Active Track</Text>
            </View>
            <Text style={styles.resumeTitle}>{overview.resumePosition.pathTitle}</Text>
            <Text style={styles.resumeLesson}>
              Lesson {overview.resumePosition.lessonNumber} of {overview.resumePosition.totalLessons}:{' '}
              {overview.resumePosition.lessonTitle}
            </Text>
            <TouchableOpacity
              style={styles.resumeButton}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('LearningLesson', {
                  pathId: overview.resumePosition.pathId,
                  lessonId: overview.resumePosition.lessonId,
                })
              }
            >
              <Text style={styles.resumeButtonText}>Resume Learning</Text>
              <Icon name="chevron-right" size={14} color="#FFF" />
            </TouchableOpacity>
          </Card>
        )}

        {/* Curricula Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {selectedCategory === 'ALL' ? 'Core Curricula' : 'Category Curricula'}
          </Text>
          <Text style={styles.curriculumCount}>
            {curricula.length} {curricula.length === 1 ? 'Curriculum' : 'Curricula'}
          </Text>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
            <Text style={styles.loadingText}>Loading academy curricula...</Text>
          </View>
        ) : curricula.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Icon name="award" size={32} color={themeColors.textTertiary} />
            <Text style={styles.emptyTitle}>No Curricula Found</Text>
            <Text style={styles.emptySubtitle}>
              Try selecting a different category or adjusting your search term.
            </Text>
          </Card>
        ) : (
          curricula.map((curriculum) => (
            <CurriculumCard
              key={curriculum.id}
              curriculum={curriculum}
              onPress={handleOpenCurriculum}
            />
          ))
        )}

        {/* Glossary Highlights Carousel / Row */}
        {overview?.glossaryHighlights && overview.glossaryHighlights.length > 0 && (
          <View style={styles.glossarySection}>
            <View style={styles.glossarySectionHeader}>
              <View style={styles.glossarySectionTitleRow}>
                <Icon name="award" size={16} color="#a78bfa" />
                <Text style={styles.glossarySectionTitle}>Fitness Terminology & Concepts</Text>
              </View>
              <TouchableOpacity onPress={handleOpenGlossary}>
                <Text style={styles.seeAllGlossaryText}>View All →</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.glossaryChipsScroll}
            >
              {overview.glossaryHighlights.map((term: GlossaryTermItem) => (
                <TouchableOpacity
                  key={term.id}
                  style={styles.glossaryChip}
                  activeOpacity={0.8}
                  onPress={() => setSelectedGlossaryTerm(term.slug)}
                >
                  <Text style={styles.glossaryChipTerm}>{term.term}</Text>
                  {term.shortExplanation && (
                    <Text style={styles.glossaryChipDesc} numberOfLines={2}>
                      {term.shortExplanation}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Glossary Modal */}
      <GlossaryTermModal
        visible={!!selectedGlossaryTerm}
        termSlugOrItem={selectedGlossaryTerm}
        onClose={() => setSelectedGlossaryTerm(null)}
        onOpenExercise={(exerciseId) =>
          navigation.navigate('ExerciseDetail', { exerciseId })
        }
        onOpenLesson={(pathId, lessonId) =>
          navigation.navigate('LearningLesson', { pathId, lessonId })
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: themeColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h2,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  glossaryNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  glossaryNavText: {
    ...typography.caption,
    color: '#c4b5fd',
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...typography.bodySecondary,
    color: themeColors.textPrimary,
    fontSize: 14,
    paddingVertical: 2,
  },
  categoriesScroll: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  categoryPill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  categoryPillSelected: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  categoryPillText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  categoryPillTextSelected: {
    color: '#000',
    fontWeight: '700',
  },
  resumeCard: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  resumeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  resumeTime: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  resumeTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
    fontWeight: '700',
    marginBottom: 2,
  },
  resumeLesson: {
    ...typography.bodySecondary,
    color: themeColors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: themeColors.primary,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
  },
  resumeButtonText: {
    ...typography.caption,
    color: '#000',
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  curriculumCount: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: themeColors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  emptyTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  emptySubtitle: {
    ...typography.bodySecondary,
    color: themeColors.textSecondary,
    textAlign: 'center',
  },
  glossarySection: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  glossarySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  glossarySectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  glossarySectionTitle: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seeAllGlossaryText: {
    ...typography.caption,
    color: '#a78bfa',
    fontWeight: '600',
  },
  glossaryChipsScroll: {
    gap: spacing.sm,
  },
  glossaryChip: {
    width: 200,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(167, 139, 250, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
    gap: 4,
  },
  glossaryChipTerm: {
    ...typography.bodySecondary,
    color: '#c4b5fd',
    fontWeight: '700',
    fontSize: 13,
  },
  glossaryChipDesc: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
});
