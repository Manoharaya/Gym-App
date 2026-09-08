import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MemberStackParamList } from '../../../navigation/types';
import { Screen, Card, Button, Icon, ProgressRing, Badge } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { dailyCheckInService } from '../services/dailyCheckInService';
import type {
  DailyCheckInDto,
  DailyRecommendationItem,
  DailyCheckInPrivacyViewDto,
} from '@fitcore/types';

type RouteProps = RouteProp<MemberStackParamList, 'DailyCheckInResult'>;
type NavigationProp = NativeStackNavigationProp<MemberStackParamList>;

export const DailyCheckInResultScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const checkInId = route.params?.checkInId;

  const [loading, setLoading] = useState(true);
  const [checkIn, setCheckIn] = useState<DailyCheckInDto | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [privacyData, setPrivacyData] = useState<DailyCheckInPrivacyViewDto | null>(null);
  const [privacyLoading, setPrivacyLoading] = useState(false);

  useEffect(() => {
    loadResult();
  }, [checkInId]);

  const loadResult = async () => {
    try {
      if (checkInId) {
        const data = await dailyCheckInService.getById(checkInId);
        setCheckIn(data);
      } else {
        const todayData = await dailyCheckInService.getTodayCheckIn();
        setCheckIn(todayData);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not load check-in result.');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (rating: 'HELPFUL' | 'NOT_HELPFUL') => {
    if (!checkIn?.id || feedbackSent) return;
    try {
      await dailyCheckInService.submitFeedback(checkIn.id, rating);
      setFeedbackSent(true);
      Alert.alert('Thank You', 'Your feedback helps refine your daily insights.');
    } catch {
      // Gracefully ignore
    }
  };

  const openPrivacyModal = async () => {
    if (!checkIn?.id) return;
    setPrivacyModalVisible(true);
    setPrivacyLoading(true);
    try {
      const data = await dailyCheckInService.getPrivacyView(checkIn.id);
      setPrivacyData(data);
    } catch {
      // Handled in UI
    } finally {
      setPrivacyLoading(false);
    }
  };

  if (loading) {
    return (
      <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={themeColors.accent} />
          <Text style={styles.loadingText}>Generating your personalized daily intelligence...</Text>
        </View>
      </Screen>
    );
  }

  const recommendations = (checkIn?.aiRecommendations as DailyRecommendationItem[]) || [];

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('MemberHome')} style={styles.backButton}>
          <Icon name="chevron-left" size={22} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Today's Intelligence</Text>
        <TouchableOpacity onPress={openPrivacyModal} style={styles.privacyBtn}>
          <Icon name="shield" size={20} color={themeColors.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Safety Alert if flagged */}
        {checkIn?.safetyFlagged ? (
          <Card style={styles.safetyCard}>
            <View style={styles.safetyHeader}>
              <Icon name="alert-circle" size={20} color={themeColors.warning} />
              <Text style={styles.safetyTitle}>Safety & Recovery Priority</Text>
            </View>
            <Text style={styles.safetyBody}>
              {checkIn?.aiCaution ||
                'Symptoms or high fatigue were detected. Strenuous exercise is temporarily scaled back.'}
            </Text>
          </Card>
        ) : null}

        {/* Readiness Hero Card */}
        <Card style={styles.readinessCard}>
          <View style={styles.readinessRow}>
            <ProgressRing
              progress={checkIn?.readinessScore ?? 80}
              size={88}
              strokeWidth={9}
              color={
                checkIn?.readinessCategory === 'OPTIMAL'
                  ? themeColors.success
                  : checkIn?.readinessCategory === 'MODERATE'
                  ? themeColors.accent
                  : themeColors.warning
              }
              valueText={`${checkIn?.readinessScore ?? 80}%`}
              label="SCORE"
            />
            <View style={styles.readinessInfo}>
              <Badge
                label={checkIn?.readinessCategory || 'MODERATE'}
                variant={checkIn?.readinessCategory === 'OPTIMAL' ? 'success' : 'accent'}
              />
              <Text style={styles.readinessTitle}>
                {checkIn?.readinessCategory === 'OPTIMAL'
                  ? 'Optimal Planning Window'
                  : checkIn?.readinessCategory === 'MODERATE'
                  ? 'Moderate Planning Capacity'
                  : 'Recovery-Focused Day'}
              </Text>
              <Text style={styles.disclaimerText}>FitCore training-planning indicator (non-clinical)</Text>
            </View>
          </View>
        </Card>

        {/* Today's Focus Card */}
        {checkIn?.aiTodayFocus ? (
          <Card style={styles.focusCard}>
            <Text style={styles.focusLabel}>TODAY'S FOCUS</Text>
            <Text style={styles.focusHeadline}>{checkIn.aiTodayFocus}</Text>
            {checkIn?.aiSummary ? (
              <Text style={styles.focusSummary}>{checkIn.aiSummary}</Text>
            ) : null}
          </Card>
        ) : null}

        {/* Recommendations Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily Recommendations</Text>
          <Text style={styles.sectionSubtitle}>Conservative and grounded in your recorded data.</Text>
        </View>

        <View style={styles.recommendationsList}>
          {recommendations.map((rec, idx) => (
            <Card key={idx} style={styles.recCard}>
              <View style={styles.recHeaderRow}>
                <Badge label={rec.type} variant="accent" />
                <Badge
                  label={rec.priority}
                  variant={rec.priority === 'HIGH' ? 'primary' : 'neutral'}
                />
              </View>
              <Text style={styles.recTitle}>{rec.title}</Text>
              <Text style={styles.recExplanation}>{rec.explanation}</Text>
            </Card>
          ))}
        </View>

        {/* AI Coach Handoff CTA */}
        <Card style={styles.handoffCard}>
          <View style={styles.handoffHeader}>
            <Icon name="sparkles" size={20} color={themeColors.accent} />
            <Text style={styles.handoffTitle}>Need deeper coaching?</Text>
          </View>
          <Text style={styles.handoffSubtitle}>
            Discuss workout scaling with your AI Fitness Coach or meal planning with your AI Nutrition Coach.
          </Text>
          <View style={styles.handoffBtnRow}>
            <TouchableOpacity
              style={styles.handoffBtn}
              onPress={() => navigation.navigate('AICoach')}
            >
              <Icon name="dumbbell" size={16} color={themeColors.accent} />
              <Text style={styles.handoffBtnText}>AI Fitness Coach</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.handoffBtn}
              onPress={() => navigation.navigate('NutritionCoach')}
            >
              <Icon name="flame" size={16} color={themeColors.accent} />
              <Text style={styles.handoffBtnText}>AI Nutrition Coach</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Feedback Section */}
        <Card style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>Was today's insight helpful?</Text>
          <View style={styles.feedbackBtnRow}>
            <TouchableOpacity
              style={[styles.feedbackPill, feedbackSent && styles.feedbackPillDisabled]}
              onPress={() => handleFeedback('HELPFUL')}
              disabled={feedbackSent}
            >
              <Icon name="check" size={16} color={themeColors.success} />
              <Text style={styles.feedbackPillText}>Helpful</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.feedbackPill, feedbackSent && styles.feedbackPillDisabled]}
              onPress={() => handleFeedback('NOT_HELPFUL')}
              disabled={feedbackSent}
            >
              <Icon name="close" size={16} color={themeColors.textTertiary} />
              <Text style={styles.feedbackPillText}>Not Helpful</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Bottom Done Button */}
        <Button
          title="Done & Return to Dashboard"
          onPress={() => navigation.navigate('MemberHome')}
          variant="accent"
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>

      {/* Transparent Privacy Modal */}
      <Modal
        visible={privacyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Daily Insight Privacy</Text>
              <TouchableOpacity onPress={() => setPrivacyModalVisible(false)}>
                <Icon name="close" size={22} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            {privacyLoading ? (
              <ActivityIndicator size="small" color={themeColors.accent} style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView style={styles.modalScroll}>
                <Text style={styles.modalDesc}>
                  FitCore AI evaluates authorized fitness signals only. It does not access private notes, payment records, or medical records.
                </Text>

                <Text style={styles.sourcesHeader}>Data Used Today:</Text>
                {privacyData?.dataSourcesUsed?.map((src, i) => (
                  <View key={i} style={styles.sourceItem}>
                    <Icon name="check" size={14} color={themeColors.success} />
                    <Text style={styles.sourceText}>{src}</Text>
                  </View>
                ))}

                <Text style={[styles.sourcesHeader, { marginTop: spacing.md }]}>Data Excluded (Never Accessed):</Text>
                {privacyData?.dataSourcesExcluded?.map((src, i) => (
                  <View key={i} style={styles.sourceItem}>
                    <Icon name="close" size={14} color={themeColors.danger} />
                    <Text style={styles.sourceText}>{src}</Text>
                  </View>
                ))}

                <Text style={[styles.disclaimerText, { marginTop: spacing.lg }]}>
                  {privacyData?.dataRetentionPolicy}
                </Text>
              </ScrollView>
            )}

            <Button
              title="Close"
              onPress={() => setPrivacyModalVisible(false)}
              variant="outline"
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  privacyBtn: {
    padding: spacing.xs,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.bodySecondary,
    color: themeColors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  safetyCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: themeColors.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  safetyTitle: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.danger,
  },
  safetyBody: {
    ...typography.bodySecondary,
    color: themeColors.textPrimary,
  },
  readinessCard: {
    padding: spacing.lg,
    backgroundColor: themeColors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  readinessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  readinessInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  readinessTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  disclaimerText: {
    ...typography.caption,
    color: themeColors.textTertiary,
  },
  focusCard: {
    padding: spacing.lg,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: themeColors.accent,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  focusLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.accent,
  },
  focusHeadline: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  focusSummary: {
    ...typography.bodySecondary,
    color: themeColors.textSecondary,
    marginTop: spacing.xs,
  },
  sectionHeader: {
    marginTop: spacing.sm,
    gap: 2,
  },
  sectionTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: themeColors.textTertiary,
  },
  recommendationsList: {
    gap: spacing.md,
  },
  recCard: {
    padding: spacing.md,
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: spacing.xs,
  },
  recHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recTitle: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginTop: spacing.xs,
  },
  recExplanation: {
    ...typography.bodySecondary,
    color: themeColors.textSecondary,
    lineHeight: 18,
  },
  handoffCard: {
    padding: spacing.lg,
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: spacing.sm,
  },
  handoffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  handoffTitle: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  handoffSubtitle: {
    ...typography.bodySecondary,
    color: themeColors.textSecondary,
  },
  handoffBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  handoffBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: themeColors.surfaceHighlight,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  handoffBtnText: {
    ...typography.caption,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  feedbackTitle: {
    ...typography.bodySecondary,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  feedbackBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  feedbackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: themeColors.surfaceHighlight,
    borderRadius: radius.full,
  },
  feedbackPillDisabled: {
    opacity: 0.5,
  },
  feedbackPillText: {
    ...typography.caption,
    color: themeColors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: themeColors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  modalScroll: {
    marginBottom: spacing.md,
  },
  modalDesc: {
    ...typography.bodySecondary,
    color: themeColors.textSecondary,
    marginBottom: spacing.md,
  },
  sourcesHeader: {
    ...typography.caption,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginBottom: spacing.xs,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 3,
  },
  sourceText: {
    ...typography.bodySecondary,
    color: themeColors.textSecondary,
  },
});
