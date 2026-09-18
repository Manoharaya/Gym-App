import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MemberStackParamList } from '../../../navigation/types';

import { themeColors, typography, radius, spacing } from '../../../theme';
import { Icon } from '../../../components/primitives';
import {
  ExerciseService,
  VisualMovementCoachData,
} from '../services/exerciseService';
import { VisualMovementCoach } from '../components/VisualMovementCoach';

type RouteProps = RouteProp<MemberStackParamList, 'VisualMovementCoach'>;
type NavProp = NativeStackNavigationProp<MemberStackParamList>;

export const VisualMovementCoachScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavProp>();

  const { exerciseId, exerciseName } = route.params;

  const [coachData, setCoachData] = useState<VisualMovementCoachData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCoachData = useCallback(async () => {
    try {
      setError(null);
      const data = await ExerciseService.getVisualMovementCoach(exerciseId);
      setCoachData(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load visual movement coach data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [exerciseId]);

  useEffect(() => {
    loadCoachData();
  }, [loadCoachData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadCoachData();
  };

  const handleStartPractice = () => {
    navigation.navigate('GuidedMovementPractice', {
      exerciseId,
      exerciseName: coachData?.exercise.name || exerciseName,
    });
  };

  const handleOpenTutorial = () => {
    navigation.navigate('ExerciseTutorial', {
      exerciseId,
      initialMode: 'STEP_BY_STEP',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top App Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.barTitleContainer}>
          <Text style={styles.barTitle} numberOfLines={1}>
            {coachData?.exercise.name || exerciseName || 'Movement Coach'}
          </Text>
          <Text style={styles.barSubtitle}>Structured Movement Guidance</Text>
        </View>
        <View style={styles.topBarActionPlaceholder} />
      </View>

      {/* Loading State */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Loading Movement Structure...</Text>
        </View>
      ) : error ? (
        <ScrollView
          contentContainerStyle={styles.centerContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={themeColors.primary}
            />
          }
        >
          <Icon name="alert-circle" size={40} color={themeColors.danger} />
          <Text style={styles.errorTitle}>Unable to Load Movement Coach</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadCoachData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : coachData ? (
        <VisualMovementCoach
          coachData={coachData}
          onStartPractice={handleStartPractice}
          onOpenTutorial={handleOpenTutorial}
        />
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: themeColors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: themeColors.elevatedBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  barTitle: {
    ...typography.subtitle,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  barSubtitle: {
    ...typography.caption,
    fontSize: 10,
    color: themeColors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  topBarActionPlaceholder: {
    width: 36,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.body,
    color: themeColors.textSecondary,
    marginTop: spacing.sm,
  },
  errorTitle: {
    ...typography.subtitle,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  errorSubtitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  retryButton: {
    backgroundColor: themeColors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  retryButtonText: {
    ...typography.button,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
