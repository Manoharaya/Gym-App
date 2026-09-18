import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card, Badge, Icon, EmptyState } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import {
  ExerciseService,
  GuidedSessionSummary,
  ResumeGuidedSessionResponse,
} from '../services/exerciseService';
import { GuidedSessionCard } from '../components/GuidedSessionCard';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
};

const CATEGORIES = [
  'ALL',
  'FUNDAMENTALS',
  'SKILL_MASTERY',
  'STRENGTH',
  'MOBILITY',
  'POSTURE',
];

const DIFFICULTIES = ['ALL', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

export const GuidedSessionsScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState<GuidedSessionSummary[]>([]);
  const [resumeSession, setResumeSession] = useState<ResumeGuidedSessionResponse | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [sessionsRes, resumeRes] = await Promise.all([
        ExerciseService.getGuidedSessions({
          search: search.trim() || undefined,
          category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
          difficulty: selectedDifficulty !== 'ALL' ? selectedDifficulty : undefined,
        }),
        ExerciseService.getResumeGuidedSession().catch(() => null),
      ]);

      setSessions(sessionsRes.items || []);
      setResumeSession(resumeRes || null);
    } catch (err) {
      // Graceful fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedCategory, selectedDifficulty]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleOpenSession = (sessionId: string, title: string) => {
    navigation.navigate('GuidedSessionDetail', { sessionId, title });
  };

  const handleContinueSession = (sessionId: string) => {
    navigation.navigate('GuidedExerciseSession', { sessionId });
  };

  const handleCreateSession = () => {
    navigation.navigate('GuidedSessionAuthoring');
  };

  return (
    <View style={styles.container}>
      {/* Top Search & Filter Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBox}>
          <Icon name="search" size={18} color={themeColors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search guided programs & sessions..."
            placeholderTextColor={themeColors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Icon name="close" size={16} color={themeColors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Category Pills */}
      <View style={styles.pillsScrollContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsContent}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.pill, isSelected && styles.pillActive]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.pillText,
                    isSelected && styles.pillTextActive,
                  ]}
                >
                  {cat.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Difficulty Filter */}
      <View style={styles.difficultyFilterRow}>
        <Text style={styles.filterLabel}>Difficulty:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {DIFFICULTIES.map((diff) => {
            const isSelected = selectedDifficulty === diff;
            return (
              <TouchableOpacity
                key={diff}
                style={[
                  styles.diffPill,
                  isSelected && styles.diffPillActive,
                ]}
                onPress={() => setSelectedDifficulty(diff)}
              >
                <Text
                  style={[
                    styles.diffText,
                    isSelected && styles.diffTextActive,
                  ]}
                >
                  {diff}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={themeColors.accent} />
          <Text style={styles.loadingText}>Loading guided programs...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Resume In-Progress Card (if available) */}
          {resumeSession && (
            <Card style={styles.resumeCard}>
              <View style={styles.resumeHeader}>
                <View style={styles.resumeIconBox}>
                  <Icon name="activity" size={18} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resumeSubtitle}>CONTINUE LEARNING</Text>
                  <Text style={styles.resumeTitle}>
                    {resumeSession.sessionTitle}
                  </Text>
                </View>
                <Badge
                  label={`${resumeSession.percentComplete}%`}
                  variant="accent"
                />
              </View>

              <Text style={styles.resumeStep}>
                Step {(resumeSession.currentStepIndex || 0) + 1} of{' '}
                {resumeSession.totalItems}:{' '}
                <Text style={{ fontWeight: '600', color: themeColors.textPrimary }}>
                  {resumeSession.currentItem?.title || 'Next Exercise'}
                </Text>
              </Text>

              <TouchableOpacity
                style={styles.resumeButton}
                onPress={() => handleContinueSession(resumeSession.sessionId)}
                activeOpacity={0.8}
              >
                <Icon name="chevron-right" size={16} color="#FFFFFF" />
                <Text style={styles.resumeButtonText}>Resume Session</Text>
              </TouchableOpacity>
            </Card>
          )}

          {/* Header Title & Count */}
          <View style={styles.listHeaderRow}>
            <Text style={styles.sectionHeading}>
              {selectedCategory === 'ALL'
                ? 'All Guided Sessions'
                : `${selectedCategory.replace('_', ' ')} Sessions`}
            </Text>
            <Text style={styles.countText}>
              {sessions.length} {sessions.length === 1 ? 'program' : 'programs'}
            </Text>
          </View>

          {/* Session Cards */}
          {sessions.length > 0 ? (
            sessions.map((item) => (
              <GuidedSessionCard
                key={item.id}
                session={item}
                onPress={() => handleOpenSession(item.id, item.title)}
                onContinue={() => handleContinueSession(item.id)}
              />
            ))
          ) : (
            <EmptyState
              icon={<Icon name="activity" size={36} color={themeColors.textTertiary} />}
              title="No Guided Sessions Found"
              description="Try adjusting your search query or filter tags to discover other programs."
            />
          )}
        </ScrollView>
      )}

      {/* Trainer Authoring FAB (if trainer/admin route available) */}
      <TouchableOpacity
        style={styles.authoringFab}
        onPress={handleCreateSession}
        activeOpacity={0.85}
        accessibilityLabel="Create guided session"
      >
        <Icon name="plus" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  searchBarContainer: {
    paddingHorizontal: sp.md,
    paddingTop: sp.sm,
    paddingBottom: sp.xs,
    backgroundColor: themeColors.elevatedBackground,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2638',
    borderRadius: radius.md,
    paddingHorizontal: sp.sm,
    height: 44,
    gap: sp.xs,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: themeColors.textPrimary,
  },
  pillsScrollContainer: {
    backgroundColor: themeColors.elevatedBackground,
    paddingVertical: sp.xs,
  },
  pillsContent: {
    paddingHorizontal: sp.md,
    gap: sp.xs,
  },
  pill: {
    paddingHorizontal: sp.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: '#1E2638',
  },
  pillActive: {
    backgroundColor: themeColors.accent,
  },
  pillText: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  difficultyFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp.md,
    paddingVertical: 6,
    backgroundColor: themeColors.elevatedBackground,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    gap: sp.sm,
  },
  filterLabel: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  diffPill: {
    paddingHorizontal: sp.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    marginRight: sp.xs,
    backgroundColor: 'transparent',
  },
  diffPillActive: {
    backgroundColor: '#27334D',
  },
  diffText: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  diffTextActive: {
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: sp.md,
    paddingBottom: 80,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: sp.lg,
  },
  loadingText: {
    ...typography.bodySmall,
    color: themeColors.textMuted,
    marginTop: sp.sm,
  },
  resumeCard: {
    backgroundColor: '#141E33',
    borderRadius: radius.lg,
    padding: sp.md,
    marginBottom: sp.lg,
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  resumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    marginBottom: sp.xs,
  },
  resumeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resumeSubtitle: {
    ...typography.caption,
    color: '#93C5FD',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  resumeTitle: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resumeStep: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginVertical: sp.xs,
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.xs,
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    borderRadius: radius.md,
    marginTop: sp.xs,
  },
  resumeButtonText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp.sm,
  },
  sectionHeading: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  countText: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  authoringFab: {
    position: 'absolute',
    bottom: sp.lg,
    right: sp.lg,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: themeColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
