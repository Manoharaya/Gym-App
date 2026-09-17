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
  GlossaryTermItem,
} from '../services/exerciseService';
import { GlossaryTermModal } from '../components/GlossaryTermModal';

type NavProp = NativeStackNavigationProp<MemberStackParamList>;

const ALPHABET = ['ALL', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

const GLOSSARY_CATEGORIES = [
  { key: 'ALL', label: 'All Categories' },
  { key: 'MOVEMENT_BIOMECHANICS', label: 'Movement & Biomechanics' },
  { key: 'EXERCISE_PHYSIOLOGY', label: 'Physiology & Muscle Action' },
  { key: 'TRAINING_PRINCIPLES', label: 'Training Principles' },
  { key: 'WARMUP_RECOVERY', label: 'Warm-Up & Recovery' },
  { key: 'EQUIPMENT_IMPLEMENTS', label: 'Equipment & Implements' },
];

export const GlossaryScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();

  const [terms, setTerms] = useState<GlossaryTermItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedLetter, setSelectedLetter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeModalTerm, setActiveModalTerm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTerms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ExerciseService.getGlossaryTerms({
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        letter: selectedLetter !== 'ALL' ? selectedLetter : undefined,
        search: searchQuery.trim() || undefined,
      });
      setTerms(res);
    } catch (err) {
      console.warn('Failed to load glossary terms:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, selectedLetter, searchQuery]);

  useEffect(() => {
    loadTerms();
  }, [loadTerms]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTerms();
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
          <Text style={styles.headerTitle}>Fitness Glossary</Text>
          <Text style={styles.headerSubtitle}>Terminology, Anatomy & Science</Text>
        </View>
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
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={16} color={themeColors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search definitions, terms, cues..."
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

        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryChipsScroll}
        >
          {GLOSSARY_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                onPress={() => setSelectedCategory(cat.key)}
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextSelected,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* A-Z Alphabet Filter Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.alphabetScroll}
        >
          {ALPHABET.map((char) => {
            const isSelected = selectedLetter === char;
            return (
              <TouchableOpacity
                key={char}
                onPress={() => setSelectedLetter(char)}
                style={[
                  styles.letterButton,
                  isSelected && styles.letterButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.letterText,
                    isSelected && styles.letterTextSelected,
                  ]}
                >
                  {char}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Results Counter */}
        <View style={styles.counterRow}>
          <Text style={styles.counterText}>
            {terms.length} {terms.length === 1 ? 'definition' : 'definitions'} available
          </Text>
        </View>

        {/* Glossary Terms List */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
            <Text style={styles.loadingText}>Searching glossary...</Text>
          </View>
        ) : terms.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Icon name="award" size={32} color={themeColors.textTertiary} />
            <Text style={styles.emptyTitle}>No Matching Terms</Text>
            <Text style={styles.emptySubtitle}>
              Try searching with another keyword or resetting the letter filter.
            </Text>
          </Card>
        ) : (
          <View style={styles.termList}>
            {terms.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.85}
                onPress={() => setActiveModalTerm(item.slug)}
              >
                <Card style={styles.termCard}>
                  <View style={styles.termCardHeader}>
                    <View style={styles.termCardTitleWrap}>
                      <Text style={styles.termCardTitle}>{item.term}</Text>
                      {item.category && (
                        <Badge
                          label={item.category.replace(/_/g, ' ')}
                          variant="neutral"
                        />
                      )}
                    </View>
                    <Icon name="chevron-right" size={16} color={themeColors.textTertiary} />
                  </View>

                  <Text style={styles.termCardSummary} numberOfLines={2}>
                    {item.shortExplanation || item.definition}
                  </Text>

                  {/* Related Tags Preview */}
                  <View style={styles.termMetaRow}>
                    {item.relatedMovementPatterns && item.relatedMovementPatterns.length > 0 && item.relatedMovementPatterns[0] && (
                      <View style={styles.termTag}>
                        <Icon name="activity" size={10} color="#38bdf8" />
                        <Text style={styles.termTagText}>
                          {item.relatedMovementPatterns[0].replace(/_/g, ' ')}
                        </Text>
                      </View>
                    )}
                    {item.relatedExerciseIds && item.relatedExerciseIds.length > 0 && (
                      <View style={styles.termTag}>
                        <Icon name="dumbbell" size={10} color={themeColors.primary} />
                        <Text style={styles.termTagText}>
                          {item.relatedExerciseIds.length} {item.relatedExerciseIds.length === 1 ? 'exercise' : 'exercises'}
                        </Text>
                      </View>
                    )}
                    {item.relatedLessonIds && item.relatedLessonIds.length > 0 && (
                      <View style={styles.termTag}>
                        <Icon name="award" size={10} color="#a78bfa" />
                        <Text style={styles.termTagText}>
                          {item.relatedLessonIds.length} {item.relatedLessonIds.length === 1 ? 'lesson' : 'lessons'}
                        </Text>
                      </View>
                    )}
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Interactive Glossary Modal */}
      <GlossaryTermModal
        visible={!!activeModalTerm}
        termSlugOrItem={activeModalTerm}
        onClose={() => setActiveModalTerm(null)}
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
  categoryChipsScroll: {
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  categoryChipSelected: {
    backgroundColor: '#a78bfa',
    borderColor: '#a78bfa',
  },
  categoryChipText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  categoryChipTextSelected: {
    color: '#000',
    fontWeight: '700',
  },
  alphabetScroll: {
    gap: 4,
    paddingVertical: spacing.xs,
  },
  letterButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterButtonSelected: {
    backgroundColor: themeColors.primary,
  },
  letterText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  letterTextSelected: {
    color: '#000',
    fontWeight: '800',
  },
  counterRow: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  counterText: {
    ...typography.caption,
    color: themeColors.textTertiary,
    fontSize: 12,
  },
  termList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  termCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  termCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  termCardTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
    flex: 1,
  },
  termCardTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  termCardSummary: {
    ...typography.bodySecondary,
    color: themeColors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  termMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  termTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  termTagText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
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
});
