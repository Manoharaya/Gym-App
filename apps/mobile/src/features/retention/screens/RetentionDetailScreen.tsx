import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { RetentionService } from '../services/retentionService';
import type {
  RetentionIntelligenceResponse,
  RetentionRiskLevel,
  RetentionInterventionType,
  RetentionFeedbackRating,
  RetentionRiskFactor,
  RetentionPositiveSignal,
} from '@fitcore/types';

interface Props {
  route?: {
    params?: {
      memberId?: string;
      memberName?: string;
    };
  };
  navigation?: any;
}

export const RetentionDetailScreen: React.FC<Props> = ({ route, navigation: _navigation }) => {
  const memberId = route?.params?.memberId || '';
  const memberName = route?.params?.memberName || '';

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<RetentionIntelligenceResponse | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal for Follow-up Task Creation
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [taskIntervention, setTaskIntervention] = useState<RetentionInterventionType>('TRAINER_CHECK_IN');
  const [taskPriority, setTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [taskNotes, setTaskNotes] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  // Feedback State
  const [feedbackRating, setFeedbackRating] = useState<RetentionFeedbackRating | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const fetchAnalysis = async (forceRecalculate = false) => {
    if (!memberId) {
      setError('Member ID is required to view retention intelligence.');
      setLoading(false);
      return;
    }

    try {
      if (forceRecalculate) setAnalyzing(true);
      else setLoading(true);
      setError(null);

      const res = await RetentionService.analyze(memberId, undefined, forceRecalculate);
      setAnalysis(res.analysis);
      setAnalysisId(res.analysisId);

      if (res.analysis.recommendedInterventions.length > 0) {
        const topIntervention = res.analysis.recommendedInterventions[0];
        if (topIntervention) {
          setTaskIntervention(topIntervention.type);
          setTaskPriority(topIntervention.priority);
        }
        if (res.analysis.suggestedStaffNote) {
          setTaskNotes(res.analysis.suggestedStaffNote);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load retention analysis');
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [memberId]);

  const handleCreateTask = async () => {
    try {
      setCreatingTask(true);
      await RetentionService.createFollowUpTask({
        memberId,
        interventionType: taskIntervention,
        priority: taskPriority,
        notes: taskNotes,
      });
      Alert.alert('Success', 'Retention follow-up task created successfully.');
      setTaskModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create follow-up task');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleSubmitFeedback = async (rating: RetentionFeedbackRating) => {
    try {
      setSubmittingFeedback(true);
      setFeedbackRating(rating);
      await RetentionService.submitFeedback({
        memberId,
        analysisId: analysisId || undefined,
        rating,
        comment: feedbackComment || undefined,
      });
      setFeedbackSubmitted(true);
      Alert.alert('Thank You', 'Your feedback helps improve retention recommendations.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const getRiskColor = (risk?: RetentionRiskLevel) => {
    switch (risk) {
      case 'HIGH':
        return '#EF4444';
      case 'ELEVATED':
        return '#F59E0B';
      case 'MODERATE':
        return '#EAB308';
      case 'LOW':
        return '#10B981';
      default:
        return '#94A3B8';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Loading retention intelligence...</Text>
      </View>
    );
  }

  if (error || !analysis) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'No analysis available'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchAnalysis(true)}>
          <Text style={styles.retryButtonText}>Retry Analysis</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const primaryIntervention = analysis.recommendedInterventions[0];
  const riskColor = getRiskColor(analysis.risk?.level);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Top Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerInfo}>
          <Text style={styles.memberName}>{memberName || 'Member Retention Details'}</Text>
          <Text style={styles.memberIdText}>ID: {memberId}</Text>
        </View>

        <View style={[styles.riskBadge, { backgroundColor: `${riskColor}20`, borderColor: riskColor }]}>
          <Text style={[styles.riskBadgeText, { color: riskColor }]}>{analysis.risk?.level || 'UNKNOWN'}</Text>
          <Text style={styles.confidenceText}>{analysis.confidence} confidence</Text>
        </View>
      </View>

      {/* Recalculate / Refresh Bar */}
      <View style={styles.actionToolbar}>
        <TouchableOpacity
          style={styles.recalcButton}
          onPress={() => fetchAnalysis(true)}
          disabled={analyzing}
        >
          {analyzing ? (
            <ActivityIndicator size="small" color="#38BDF8" />
          ) : (
            <Text style={styles.recalcButtonText}>🔄 Recalculate AI Analysis</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.taskTriggerButton}
          onPress={() => setTaskModalVisible(true)}
        >
          <Text style={styles.taskTriggerButtonText}>+ New Follow-Up Task</Text>
        </TouchableOpacity>
      </View>

      {/* Executive Summary & Assessment */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Staff Executive Summary</Text>
        <Text style={styles.summaryText}>{analysis.summary}</Text>
        <View style={styles.divider} />
        <View style={styles.trendRow}>
          <Text style={styles.trendLabel}>Risk Trend:</Text>
          <Text
            style={[
              styles.trendValue,
              {
                color:
                  analysis.risk?.trend === 'IMPROVING'
                    ? '#10B981'
                    : analysis.risk?.trend === 'WORSENING'
                    ? '#EF4444'
                    : '#E2E8F0',
              },
            ]}
          >
            {analysis.risk?.trend || 'UNKNOWN'}
          </Text>
        </View>
      </View>

      {/* Structured Risk Factors with Evidence */}
      {analysis.primaryFactors.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Contributing Risk Signals</Text>
          {analysis.primaryFactors.map((factor: RetentionRiskFactor, idx: number) => (
            <View key={`factor-${idx}`} style={styles.factorCard}>
              <View style={styles.factorHeaderRow}>
                <Text style={styles.factorCategory}>[{factor.type}]</Text>
                <Text style={styles.factorSeverity}>{factor.severity} SEVERITY</Text>
              </View>
              <Text style={styles.factorObservation}>{factor.observation}</Text>
              {factor.timeframe && (
                <Text style={styles.timeframeText}>Timeframe: {factor.timeframe}</Text>
              )}
              {factor.evidence && factor.evidence.length > 0 && (
                <View style={styles.evidenceContainer}>
                  {factor.evidence.map((ev: string, evIdx: number) => (
                    <Text key={`ev-${evIdx}`} style={styles.evidenceLine}>
                      • {ev}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Positive Signals (Re-engagement) */}
      {analysis.positiveSignals && analysis.positiveSignals.length > 0 && (
        <View style={[styles.card, styles.positiveCard]}>
          <Text style={styles.positiveHeader}>Positive Signals & Momentum</Text>
          {analysis.positiveSignals.map((pos: RetentionPositiveSignal, idx: number) => (
            <View key={`pos-${idx}`} style={styles.positiveItem}>
              <Text style={styles.checkIcon}>✓</Text>
              <View style={styles.positiveContent}>
                <Text style={styles.positiveObs}>{pos.observation}</Text>
                {pos.evidence && pos.evidence.length > 0 && (
                  <Text style={styles.positiveEvidence}>{pos.evidence.join(' | ')}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Recommended Interventions */}
      {primaryIntervention && (
        <View style={styles.card}>
          <View style={styles.recTitleRow}>
            <Text style={styles.sectionHeader}>Recommended Intervention</Text>
            <View style={styles.priorityPill}>
              <Text style={styles.priorityPillText}>{primaryIntervention.priority} PRIORITY</Text>
            </View>
          </View>

          <Text style={styles.recType}>{primaryIntervention.type.replace(/_/g, ' ')}</Text>
          <Text style={styles.recReason}>{primaryIntervention.reason}</Text>

          {primaryIntervention.suggestedActionPlan && (
            <View style={styles.talkingPointsBox}>
              <Text style={styles.talkingPointsHeader}>Suggested Action Plan:</Text>
              <Text style={styles.talkingPoint}>
                💬 "{primaryIntervention.suggestedActionPlan}"
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Suggested Staff Note */}
      {analysis.suggestedStaffNote && (
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Staff Note Draft</Text>
          <Text style={styles.staffNoteText}>"{analysis.suggestedStaffNote}"</Text>
        </View>
      )}

      {/* Staff Feedback Section */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Staff Recommendation Feedback</Text>
        <Text style={styles.feedbackHint}>
          Is this retention insight helpful and grounded in member activity?
        </Text>

        <View style={styles.ratingButtonsRow}>
          {(['HELPFUL', 'NOT_HELPFUL', 'INCORRECT', 'NOT_RELEVANT'] as const).map((rating) => (
            <TouchableOpacity
              key={rating}
              style={[
                styles.feedbackRatingButton,
                feedbackRating === rating && styles.feedbackRatingButtonSelected,
              ]}
              onPress={() => handleSubmitFeedback(rating)}
              disabled={submittingFeedback}
            >
              <Text
                style={[
                  styles.feedbackRatingText,
                  feedbackRating === rating && styles.feedbackRatingTextSelected,
                ]}
              >
                {rating === 'HELPFUL' ? '👍 Helpful' : rating === 'NOT_HELPFUL' ? '👎 Not Helpful' : rating === 'INCORRECT' ? '⚠️ Incorrect' : '⚪ Not Relevant'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.feedbackInput}
          placeholder="Optional staff notes on recommendation..."
          placeholderTextColor="#64748B"
          value={feedbackComment}
          onChangeText={setFeedbackComment}
          multiline
        />

        {feedbackSubmitted && (
          <Text style={styles.feedbackSuccessText}>✓ Feedback recorded successfully</Text>
        )}
      </View>

      {/* Create Task Modal */}
      <Modal visible={taskModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Retention Follow-Up Task</Text>

            <Text style={styles.modalLabel}>Intervention Type</Text>
            <View style={styles.pillRow}>
              {(
                [
                  'TRAINER_CHECK_IN',
                  'GOAL_REVIEW',
                  'TRAINING_RESTART',
                  'CLASS_RECOMMENDATION',
                  'RECOVERY_SUPPORT',
                  'MEMBERSHIP_CONVERSATION',
                ] as const
              ).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typePill,
                    taskIntervention === type && styles.typePillSelected,
                  ]}
                  onPress={() => setTaskIntervention(type)}
                >
                  <Text
                    style={[
                      styles.typePillText,
                      taskIntervention === type && styles.typePillTextSelected,
                    ]}
                  >
                    {type.replace(/_/g, ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Priority</Text>
            <View style={styles.priorityRow}>
              {(['LOW', 'MEDIUM', 'HIGH'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityChoice,
                    taskPriority === p && styles.priorityChoiceSelected,
                  ]}
                  onPress={() => setTaskPriority(p)}
                >
                  <Text
                    style={[
                      styles.priorityChoiceText,
                      taskPriority === p && styles.priorityChoiceTextSelected,
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Action Notes</Text>
            <TextInput
              style={styles.modalTextInput}
              multiline
              numberOfLines={4}
              value={taskNotes}
              onChangeText={setTaskNotes}
              placeholder="Staff notes for this follow-up..."
              placeholderTextColor="#64748B"
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setTaskModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleCreateTask}
                disabled={creatingTask}
              >
                {creatingTask ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>Create Task</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0D14',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0D14',
    padding: 20,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#38BDF8',
    fontWeight: '600',
  },
  headerCard: {
    backgroundColor: '#141824',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#232B3E',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerInfo: {
    flex: 1,
    marginRight: 12,
  },
  memberName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  memberIdText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  riskBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  confidenceText: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },
  actionToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  recalcButton: {
    flex: 1,
    backgroundColor: '#1C2234',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D3748',
  },
  recalcButtonText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
  },
  taskTriggerButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  taskTriggerButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#141824',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#232B3E',
    marginBottom: 12,
  },
  sectionHeader: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  summaryText: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#232B3E',
    marginVertical: 10,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendLabel: {
    color: '#94A3B8',
    fontSize: 13,
    marginRight: 8,
  },
  trendValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  factorCard: {
    backgroundColor: '#10141F',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  factorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  factorCategory: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  factorSeverity: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  factorObservation: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
  },
  timeframeText: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
  },
  evidenceContainer: {
    backgroundColor: '#0B0E16',
    borderRadius: 6,
    padding: 8,
    marginTop: 6,
  },
  evidenceLine: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
  },
  positiveCard: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: '#0F1A1B',
  },
  positiveHeader: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  positiveItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  checkIcon: {
    color: '#10B981',
    fontWeight: '800',
    marginRight: 6,
  },
  positiveContent: {
    flex: 1,
  },
  positiveObs: {
    color: '#D1FAE5',
    fontSize: 13,
    lineHeight: 18,
  },
  positiveEvidence: {
    color: '#6EE7B7',
    fontSize: 11,
    marginTop: 2,
  },
  recTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityPill: {
    backgroundColor: '#4F46E520',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityPillText: {
    color: '#818CF8',
    fontSize: 10,
    fontWeight: '700',
  },
  recType: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  recReason: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  talkingPointsBox: {
    backgroundColor: '#0E131E',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  talkingPointsHeader: {
    color: '#818CF8',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  talkingPoint: {
    color: '#C7D2FE',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  staffNoteText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  feedbackHint: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 10,
  },
  ratingButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  feedbackRatingButton: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  feedbackRatingButtonSelected: {
    backgroundColor: '#4F46E5',
  },
  feedbackRatingText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  feedbackRatingTextSelected: {
    color: '#FFFFFF',
  },
  feedbackInput: {
    backgroundColor: '#0F131C',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#232B3E',
    color: '#FFFFFF',
    padding: 10,
    fontSize: 12,
    minHeight: 60,
  },
  feedbackSuccessText: {
    color: '#10B981',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#141824',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2D3748',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 6,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typePill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  typePillSelected: {
    backgroundColor: '#4F46E5',
  },
  typePillText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  typePillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityChoice: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  priorityChoiceSelected: {
    backgroundColor: '#4F46E5',
  },
  priorityChoiceText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  priorityChoiceTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalTextInput: {
    backgroundColor: '#0F131C',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#232B3E',
    color: '#FFFFFF',
    padding: 10,
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  modalCancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modalCancelText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  modalSaveButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
