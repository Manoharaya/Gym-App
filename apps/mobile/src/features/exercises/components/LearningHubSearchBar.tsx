import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  SafeAreaView,
  Keyboard,
} from 'react-native';
import { themeColors, typography, radius, spacing } from '../../../theme';
import { Icon, Badge, IconName } from '../../../components/primitives';
import {
  ExerciseService,
  LearningHubSearchResults,
  UnifiedSearchResultItem,
} from '../services/exerciseService';

interface LearningHubSearchBarProps {
  onSelectItem?: (item: UnifiedSearchResultItem) => void;
  placeholder?: string;
}

export const LearningHubSearchBar: React.FC<LearningHubSearchBarProps> = ({
  onSelectItem,
  placeholder = 'Search movements, muscles, tutorials, paths...',
}) => {
  const [query, setQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LearningHubSearchResults | null>(null);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        const data = await ExerciseService.searchLearningHub({ q: query.trim(), limit: 8 });
        setResults(data);
      } catch (err) {
        console.warn('Learning hub search error:', err);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  const handleOpenSearch = () => {
    setIsModalVisible(true);
  };

  const handleCloseSearch = () => {
    setIsModalVisible(false);
    setQuery('');
    setResults(null);
    Keyboard.dismiss();
  };

  const handleItemPress = (item: UnifiedSearchResultItem) => {
    handleCloseSearch();
    if (onSelectItem) {
      onSelectItem(item);
    }
  };

  const renderResultSection = (
    title: string,
    items: UnifiedSearchResultItem[],
    iconName: IconName,
    badgeVariant: 'primary' | 'accent' | 'neutral' | 'success' = 'primary',
  ) => {
    if (!items || items.length === 0) return null;

    return (
      <View style={styles.sectionContainer} key={title}>
        <View style={styles.sectionHeader}>
          <Icon name={iconName} size={14} color={themeColors.primary} />
          <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
          <Badge label={`${items.length}`} variant={badgeVariant} />
        </View>

        {items.map((item) => (
          <TouchableOpacity
            key={`${item.type}-${item.id}`}
            style={styles.resultItem}
            activeOpacity={0.7}
            onPress={() => handleItemPress(item)}
          >
            <View style={styles.resultItemLeft}>
              <View style={styles.itemIconContainer}>
                <Icon name={iconName} size={16} color={themeColors.textSecondary} />
              </View>
              <View style={styles.resultTextGroup}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.subtitle && (
                  <Text style={styles.itemSubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.resultItemRight}>
              {item.difficulty && (
                <Badge label={item.difficulty} variant="neutral" />
              )}
              <Icon name="chevron-right" size={14} color={themeColors.textTertiary} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <>
      {/* Trigger bar on screen */}
      <TouchableOpacity
        style={styles.triggerBar}
        activeOpacity={0.85}
        onPress={handleOpenSearch}
      >
        <Icon name="search" size={16} color={themeColors.textSecondary} />
        <Text style={styles.triggerPlaceholder} numberOfLines={1}>
          {placeholder}
        </Text>
        <View style={styles.searchPill}>
          <Text style={styles.searchPillText}>Search Hub</Text>
        </View>
      </TouchableOpacity>

      {/* Full-screen Search Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        onRequestClose={handleCloseSearch}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <View style={styles.inputContainer}>
              <Icon name="search" size={18} color={themeColors.textSecondary} />
              <TextInput
                style={styles.textInput}
                value={query}
                onChangeText={setQuery}
                placeholder={placeholder}
                placeholderTextColor={themeColors.textTertiary}
                autoFocus
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {query.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setQuery('')}
                >
                  <Icon name="close" size={14} color={themeColors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCloseSearch}
            >
              <Text style={styles.cancelButtonText}>Done</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color={themeColors.primary} />
              <Text style={styles.statusText}>Searching learning resources...</Text>
            </View>
          ) : query.trim() && (!results || results.totalCount === 0) ? (
            <View style={styles.centerContainer}>
              <Icon name="alert-circle" size={32} color={themeColors.textTertiary} />
              <Text style={styles.emptyTitle}>No educational content found</Text>
              <Text style={styles.emptySubtitle}>
                Try searching for a movement pattern (e.g. &ldquo;Squat&rdquo;, &ldquo;Hinge&rdquo;),
                a muscle (&ldquo;Quadriceps&rdquo;, &ldquo;Back&rdquo;), or an exercise name.
              </Text>
            </View>
          ) : !query.trim() ? (
            <ScrollView style={styles.resultsScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsHeader}>QUICK DISCOVERY SUGGESTIONS</Text>
                <View style={styles.tagRow}>
                  {['Squat', 'Hinge', 'Chest', 'Back', 'Barbell', 'Dumbbell', 'Warmup', 'Mobility'].map(
                    (tag) => (
                      <TouchableOpacity
                        key={tag}
                        style={styles.suggestionTag}
                        onPress={() => setQuery(tag)}
                      >
                        <Text style={styles.suggestionTagText}>{tag}</Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
              </View>
            </ScrollView>
          ) : (
            <ScrollView
              style={styles.resultsScroll}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.resultsContent}
            >
              {renderResultSection('Exercises', results?.exercises || [], 'activity', 'primary')}
              {renderResultSection('Movement Patterns', results?.movementPatterns || [], 'activity', 'accent')}
              {renderResultSection('Target Muscles', results?.muscles || [], 'shield', 'neutral')}
              {renderResultSection('Equipment', results?.equipment || [], 'dumbbell', 'neutral')}
              {renderResultSection('Learning Paths', results?.learningPaths || [], 'award', 'primary')}
              {renderResultSection('Guided Sessions', results?.tutorials || [], 'timer', 'accent')}
              {renderResultSection('Curated Collections', results?.collections || [], 'trophy', 'neutral')}
              {renderResultSection('Academy Tracks', results?.curricula || [], 'award', 'primary')}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  triggerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  triggerPlaceholder: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.body2.fontSize,
    color: themeColors.textTertiary,
  },
  searchPill: {
    backgroundColor: 'rgba(255, 107, 0, 0.16)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  searchPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: themeColors.primary,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 42,
  },
  textInput: {
    flex: 1,
    color: themeColors.textPrimary,
    fontSize: typography.body1.fontSize,
    marginLeft: spacing.xs,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  cancelButton: {
    marginLeft: spacing.md,
    paddingVertical: spacing.xs,
  },
  cancelButtonText: {
    color: themeColors.primary,
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  statusText: {
    color: themeColors.textSecondary,
    fontSize: typography.body2.fontSize,
    marginTop: spacing.sm,
  },
  emptyTitle: {
    color: themeColors.textPrimary,
    fontSize: typography.h3.fontSize,
    fontWeight: '700',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: themeColors.textTertiary,
    fontSize: typography.body2.fontSize,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 20,
    maxWidth: 280,
  },
  suggestionsContainer: {
    padding: spacing.lg,
  },
  suggestionsHeader: {
    color: themeColors.textTertiary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  suggestionTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  suggestionTagText: {
    color: themeColors.textSecondary,
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContent: {
    paddingBottom: spacing.xxl,
  },
  sectionContainer: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: themeColors.textTertiary,
    flex: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginBottom: 4,
  },
  resultItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  itemIconContainer: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  resultTextGroup: {
    flex: 1,
  },
  itemTitle: {
    color: themeColors.textPrimary,
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
  },
  itemSubtitle: {
    color: themeColors.textTertiary,
    fontSize: typography.caption.fontSize,
    marginTop: 2,
  },
  resultItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
