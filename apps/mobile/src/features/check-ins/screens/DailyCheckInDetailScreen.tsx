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

type RouteProps = RouteProp<MemberStackParamList, 'DailyCheckInDetail'>;
type NavigationProp = NativeStackNavigationProp<MemberStackParamList>;

export const DailyCheckInDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const checkInId = route.params?.checkInId;

  const [loading, setLoading] = useState(true);
  const [checkIn, setCheckIn] = useState<DailyCheckInDto | null>(null);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [privacyData, setPrivacyData] = useState<DailyCheckInPrivacyViewDto | null>(null);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  useEffect(() => {
    if (checkInId) {
      loadDetail(checkInId);
    }
  }, [checkInId]);

  const loadDetail = async (id: string) => {
    try {
      const data = await dailyCheckInService.getById(id);
      setCheckIn(data);
      if (data.feedbackRating) {
        setFeedbackSent(true);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not load check-in details.');
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
          <Text style={styles.loadingText}>Loading check-in archive...</Text>
        </View>
      </Screen>
    );
  }

  if (!checkIn) {
    return (
      <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="chevron-left" size={22} color={themeColors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Check-In Record</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Check-in record not found.</Text>
          <Button
            title="Return to History"
            onPress={() => navigation.goBack()}
            style={styles.returnBtn}
          />
        </View>
      </Screen>
    );
  }

  const recommendations = (checkIn.aiRecommendations as DailyRecommendationItem[]) || [];
  const readinessScore = checkIn.readinessScore ?? 70;
  const ringColor =
    checkIn.readinessCategory === 'OPTIMAL'
      ? themeColors.success
      : checkIn.readinessCategory === 'RECOVERY_FOCUSED'
      ? themeColors.warning
      : themeColors.accent;

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={22} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{checkIn.checkInDate || 'Check-In Details'}</Text>
        <TouchableOpacity onPress={openPrivacyModal} style={styles.privacyBtn}>
          <Icon name="shield" size={20} color={themeColors.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Safety Alert if flagged */}
        {checkIn.safetyFlagged ? (
          <Card style={styles.safetyCard}>
            <View style={styles.safetyHeader}>
              <Icon name="alert-circle" size={20} color={themeColors.warning} />
              <Text style={styles.safetyTitle}>Safety & Recovery Alert</Text>
            </View>
            <Text style={styles.safetyBody}>
              {checkIn.aiCaution ||
                'Elevated soreness or fatigue flagged during this check-in. Workout scaled down.'}
            </Text>
          </Card>
        ) : null}

        {/* Readiness Card */}
        <Card style={styles.readinessCard}>
          <View style={styles.readinessRow}>
            <ProgressRing
              progress={readinessScore}
              size={88}
              strokeWidth={8}
              color={ringColor}
              valueText={`${readinessScore}%`}
              label="READINESS"
            />
            <View style={styles.readinessInfo}>
              <View style={styles.categoryBadgeRow}>
                <Badge
                  label={checkIn.readinessCategory?.replace(/_/g, ' ') || 'MODERATE'}
                  variant={checkIn.readinessCategory === 'OPTIMAL' ? 'success' : 'accent'}
                />
              </View>
              <Text style={styles.readinessTitle}>
                {checkIn.readinessCategory === 'OPTIMAL'
                  ? 'High Physiological Capacity'
                  : checkIn.readinessCategory === 'RECOVERY_FOCUSED'
                  ? 'Recovery-First Day'
                  : 'Moderate Capacity'}
              </Text>
              <Text style={styles.readinessDesc}>
                {checkIn.readinessRationale ||
                  'Based on your reported sleep, energy, muscle soreness, and stress.'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Member Reported Signals Card */}
        <Card style={styles.signalsCard}>
          <Text style={styles.sectionHeader}>Your Logged Responses</Text>
          <View style={styles.signalsGrid}>
            <View style={styles.signalItem}>
              <Text style={styles.signalLabel}>Energy</Text>
              <Text style={styles.signalValue}>{checkIn.energyLevel || 'MODERATE'}</Text>
            </View>
            <View style={styles.signalItem}>
              <Text style={styles.signalLabel}>Sleep</Text>
              <Text style={styles.signalValue}>{checkIn.sleepQuality || 'FAIR'}</Text>
            </View>
            <View style={styles.signalItem}>
              <Text style={styles.signalLabel}>Soreness</Text>
              <Text style={styles.signalValue}>{checkIn.sorenessLevel || 'MILD'}</Text>
            </View>
            <View style={styles.signalItem}>
              <Text style={styles.signalLabel}>Stress</Text>
              <Text style={styles.signalValue}>{checkIn.stressLevel || 'LOW'}</Text>
            </View>
            <View style={styles.signalItem}>
              <Text style={styles.signalLabel}>Motivation</Text>
              <Text style={styles.signalValue}>{checkIn.motivationLevel || 'MODERATE'}</Text>
            </View>
            <View style={styles.signalItem}>
              <Text style={styles.signalLabel}>Yesterday</Text>
              <Text style={styles.signalValue}>
                {checkIn.yesterdayWorkoutCompleted === true
                  ? 'Completed'
                  : checkIn.yesterdayWorkoutCompleted === false
                  ? 'Rest / Missed'
                  : 'N/A'}
              </Text>
            </View>
          </View>

          {checkIn.notes ? (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Notes:</Text>
              <Text style={styles.notesValue}>{checkIn.notes}</Text>
            </View>
          ) : null}
        </Card>

        {/* Today's Focus Card */}
        {checkIn.todayFocus ? (
          <Card style={styles.focusCard}>
            <View style={styles.focusHeader}>
              <Icon name="award" size={20} color={themeColors.accent} />
              <Text style={styles.focusLabel}>Primary Daily Focus</Text>
            </View>
            <Text style={styles.focusTitle}>{checkIn.todayFocus}</Text>
            {checkIn.aiSummary ? (
              <Text style={styles.focusSummary}>{checkIn.aiSummary}</Text>
            ) : null}
          </Card>
        ) : null}

        {/* Actionable Recommendations */}
        {recommendations.length > 0 ? (
          <View style={styles.recommendationsSection}>
            <Text style={styles.sectionHeader}>Prescribed Adjustments</Text>
            {recommendations.map((rec, index) => (
              <Card key={index} style={styles.recCard}>
                <View style={styles.recHeader}>
                  <Badge label={rec.type} variant="accent" />
                  <Text style={styles.recPriority}>{rec.priority} Priority</Text>
                </View>
                <Text style={styles.recTitle}>{rec.title}</Text>
                <Text style={styles.recDesc}>{rec.explanation}</Text>
                {rec.suggestedAction ? (
                  <View style={styles.recActionRow}>
                    <Icon name="check-circle" size={16} color={themeColors.accent} />
                    <Text style={styles.recActionText}>Action: {rec.suggestedAction.label}</Text>
                  </View>
                ) : null}
              </Card>
            ))}
          </View>
        ) : null}

        {/* Feedback Section */}
        <Card style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>Was this insight helpful?</Text>
          <Text style={styles.feedbackSubtitle}>
            Feedback is used to refine future daily check-in recommendations.
          </Text>
          {feedbackSent ? (
            <View style={styles.feedbackSentRow}>
              <Icon name="check-circle" size={18} color={themeColors.success} />
              <Text style={styles.feedbackSentText}>
                {checkIn.feedbackRating
                  ? `Feedback logged: ${checkIn.feedbackRating}`
                  : 'Thank you for your feedback!'}
              </Text>
            </View>
          ) : (
            <View style={styles.feedbackBtnRow}>
              <TouchableOpacity
                style={styles.feedbackBtn}
                onPress={() => handleFeedback('HELPFUL')}
              >
                <Icon name="check" size={18} color={themeColors.success} />
                <Text style={styles.feedbackBtnText}>Helpful</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.feedbackBtn}
                onPress={() => handleFeedback('NOT_HELPFUL')}
              >
                <Icon name="close" size={18} color={themeColors.textSecondary} />
                <Text style={styles.feedbackBtnText}>Not Relevant</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Privacy Transparency Modal */}
      <Modal
        visible={privacyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Data Privacy & Sources</Text>
              <TouchableOpacity onPress={() => setPrivacyModalVisible(false)}>
                <Icon name="close" size={22} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            {privacyLoading ? (
              <ActivityIndicator size="small" color={themeColors.accent} style={{ marginVertical: 20 }} />
            ) : privacyData ? (
              <ScrollView style={styles.modalScroll}>
                <Text style={styles.modalSectionTitle}>Data Sources Used</Text>
                {privacyData.dataSourcesUsed.map((source, i) => (
                  <View key={i} style={styles.sourceRow}>
                    <Icon name="check" size={14} color={themeColors.success} />
                    <Text style={styles.sourceText}>{source}</Text>
                  </View>
                ))}

                <Text style={[styles.modalSectionTitle, { marginTop: 16 }]}>Data Excluded (Never Processed)</Text>
                {privacyData.dataSourcesExcluded.map((source, i) => (
                  <View key={i} style={styles.sourceRow}>
                    <Icon name="close" size={14} color={themeColors.warning} />
                    <Text style={styles.sourceText}>{source}</Text>
                  </View>
                ))}

                <Text style={[styles.modalSectionTitle, { marginTop: 16 }]}>Trainer Visibility Scope</Text>
                <Text style={styles.privacyNote}>{privacyData.trainerVisibilityScope}</Text>

                <Text style={[styles.modalSectionTitle, { marginTop: 16 }]}>Consent Status</Text>
                <Text style={styles.privacyNote}>{privacyData.consentStatus}</Text>
              </ScrollView>
            ) : (
              <Text style={styles.privacyNote}>No privacy metadata available.</Text>
            )}

            <Button
              title="Close"
              onPress={() => setPrivacyModalVisible(false)}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body2,
    color: themeColors.textSecondary,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.body1,
    color: themeColors.textSecondary,
    marginBottom: spacing.lg,
  },
  returnBtn: {
    minWidth: 160,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
  safetyCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: themeColors.warning,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  safetyTitle: {
    ...typography.h4,
    color: themeColors.warning,
    marginLeft: spacing.xs,
  },
  safetyBody: {
    ...typography.body2,
    color: themeColors.textSecondary,
  },
  readinessCard: {
    marginBottom: spacing.md,
  },
  readinessRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readinessInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  categoryBadgeRow: {
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  readinessTitle: {
    ...typography.h4,
    color: themeColors.textPrimary,
  },
  readinessDesc: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  signalsCard: {
    marginBottom: spacing.md,
  },
  signalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  signalItem: {
    width: '48%',
    backgroundColor: themeColors.surfaceLight,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  signalLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    textTransform: 'uppercase',
  },
  signalValue: {
    ...typography.body2,
    color: themeColors.textPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
  notesContainer: {
    marginTop: spacing.xs,
    padding: spacing.sm,
    backgroundColor: themeColors.surfaceLight,
    borderRadius: radius.sm,
  },
  notesLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginBottom: 2,
  },
  notesValue: {
    ...typography.body2,
    color: themeColors.textPrimary,
  },
  focusCard: {
    marginBottom: spacing.md,
    borderColor: themeColors.accent,
    borderWidth: 1,
  },
  focusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  focusLabel: {
    ...typography.caption,
    color: themeColors.accent,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  focusTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
    marginBottom: spacing.xs,
  },
  focusSummary: {
    ...typography.body2,
    color: themeColors.textSecondary,
  },
  sectionHeader: {
    ...typography.h4,
    color: themeColors.textPrimary,
    marginBottom: spacing.sm,
  },
  recommendationsSection: {
    marginBottom: spacing.md,
  },
  recCard: {
    marginBottom: spacing.sm,
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  recPriority: {
    ...typography.caption,
    color: themeColors.textSecondary,
    textTransform: 'uppercase',
  },
  recTitle: {
    ...typography.body1,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 4,
  },
  recDesc: {
    ...typography.body2,
    color: themeColors.textSecondary,
  },
  recActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  recActionText: {
    ...typography.caption,
    color: themeColors.accent,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  feedbackCard: {
    marginBottom: spacing.md,
  },
  feedbackTitle: {
    ...typography.body1,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  feedbackSubtitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  feedbackBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.xs,
  },
  feedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  feedbackBtnText: {
    ...typography.body2,
    color: themeColors.textPrimary,
    marginLeft: spacing.xs,
  },
  feedbackSentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  feedbackSentText: {
    ...typography.body2,
    color: themeColors.success,
    marginLeft: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: themeColors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
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
    marginVertical: spacing.xs,
  },
  modalSectionTitle: {
    ...typography.body1,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: spacing.xs,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sourceText: {
    ...typography.body2,
    color: themeColors.textSecondary,
    marginLeft: spacing.xs,
  },
  privacyNote: {
    ...typography.body2,
    color: themeColors.textSecondary,
    lineHeight: 20,
  },
});
