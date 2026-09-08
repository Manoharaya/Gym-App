import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ReactivationService } from '../services/reactivationService';
import type {
  MemberRecoveryPlanDto,
  ReactivationStrategyType,
  RecoveryPlanStatus,
} from '@fitcore/types';

interface Props {
  route?: {
    params?: {
      planId?: string;
      memberId?: string;
      memberName?: string;
      strategy?: ReactivationStrategyType;
    };
  };
  navigation?: any;
}

export const RecoveryPlanDetailScreen: React.FC<Props> = ({ route, navigation: _navigation }) => {
  const planId = route?.params?.planId;
  const memberId = route?.params?.memberId;
  const memberName = route?.params?.memberName;
  const strategy = route?.params?.strategy;

  const [loading, setLoading] = useState(Boolean(planId));
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState<MemberRecoveryPlanDto | null>(null);

  // Form State
  const [selectedStrategy, setSelectedStrategy] = useState<ReactivationStrategyType>(
    strategy || 'GENERAL_SUPPORT',
  );
  const [actionNotes, setActionNotes] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [dismissalReason, setDismissalReason] = useState('');
  const [showDismissInput, setShowDismissInput] = useState(false);

  useEffect(() => {
    if (planId) {
      ReactivationService.getRecoveryPlan(planId)
        .then((data) => {
          setPlan(data);
          setSelectedStrategy(data.strategy);
          setActionNotes(data.reason || '');
          setDraftMessage(data.suggestedStaffMessage || '');
        })
        .catch((err) => {
          Alert.alert('Error', 'Failed to load recovery plan: ' + err.message);
        })
        .finally(() => setLoading(false));
    } else {
      // Defaults for new plan
      setActionNotes('Personal check-in and routine reintroduction plan');
      setDraftMessage(
        "Hi! We noticed it's been a little while since your last visit. Let us know how we can help you get back into your groove!",
      );
    }
  }, [planId]);

  const handleCreatePlan = async () => {
    if (!memberId) return;
    setSaving(true);
    try {
      const created = await ReactivationService.createRecoveryPlan({
        memberId,
        strategy: selectedStrategy,
        reason: actionNotes,
        suggestedStaffMessage: draftMessage,
        suggestedNextStep: actionNotes,
      });
      setPlan(created);
      Alert.alert('Success', 'Recovery plan created successfully.');
    } catch (err: any) {
      Alert.alert('Error', 'Failed to create plan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTransition = async (status: RecoveryPlanStatus) => {
    const targetPlanId = plan?.id || planId;
    if (!targetPlanId) return;

    if (status === 'DISMISSED' && !dismissalReason.trim()) {
      Alert.alert('Validation', 'A dismissal reason is required to dismiss a recovery plan.');
      return;
    }

    setSaving(true);
    try {
      const updated = await ReactivationService.transitionPlan(
        targetPlanId,
        status,
        status === 'DISMISSED' ? dismissalReason : undefined,
      );
      setPlan(updated);
      setShowDismissInput(false);
      Alert.alert('Updated', `Plan status changed to ${status}.`);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to transition plan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFeedback = async (rating: 'HELPFUL' | 'NOT_HELPFUL') => {
    try {
      await ReactivationService.submitFeedback({
        memberId: plan?.memberId || memberId || '',
        planId: plan?.id || planId,
        rating,
        submittedAt: new Date().toISOString(),
      });
      Alert.alert('Thank you', 'Your feedback on this recovery plan has been recorded.');
    } catch (err: any) {
      console.warn('Failed to submit feedback:', err.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} testID="recovery-plan-detail-screen">
      {/* Header Info */}
      <View style={styles.headerBox}>
        <Text style={styles.headerMemberName}>{memberName || plan?.memberName || 'Member Recovery'}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{plan?.status || 'NEW PLAN'}</Text>
        </View>
      </View>

      {/* Strategy Selection / View */}
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Recovery Strategy</Text>
        <View style={styles.strategyPill}>
          <Text style={styles.strategyPillText}>{selectedStrategy.replace(/_/g, ' ')}</Text>
        </View>

        {/* Action Notes */}
        <Text style={styles.fieldLabel}>Recommended Staff Action</Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={3}
          value={actionNotes}
          onChangeText={setActionNotes}
          editable={!plan || plan.status === 'PENDING_APPROVAL' || plan.status === 'DRAFT'}
          placeholder="Describe recommended recovery approach..."
          placeholderTextColor="#64748B"
          testID="recovery-action-notes-input"
        />

        {/* Draft Message */}
        <Text style={styles.fieldLabel}>Draft Outreach Message (Personalize Before Sending)</Text>
        <TextInput
          style={[styles.textArea, { minHeight: 90 }]}
          multiline
          numberOfLines={4}
          value={draftMessage}
          onChangeText={setDraftMessage}
          editable={!plan || plan.status === 'PENDING_APPROVAL' || plan.status === 'APPROVED'}
          placeholder="Draft message to member..."
          placeholderTextColor="#64748B"
          testID="recovery-draft-message-input"
        />
      </View>

      {/* Dismissal Reason Section */}
      {showDismissInput && (
        <View style={[styles.card, { borderColor: '#EF4444' }]}>
          <Text style={[styles.fieldLabel, { color: '#EF4444' }]}>Dismissal Reason (Required)</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={2}
            value={dismissalReason}
            onChangeText={setDismissalReason}
            placeholder="e.g. Member moved away, contacted through other channel, or paused by request..."
            placeholderTextColor="#64748B"
            testID="dismissal-reason-input"
          />
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#EF4444', marginTop: 10 }]}
            onPress={() => handleTransition('DISMISSED')}
            disabled={saving}
            testID="confirm-dismiss-btn"
          >
            <Text style={styles.buttonText}>Confirm Dismissal</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action Buttons based on Workflow Status */}
      <View style={styles.actionsContainer}>
        {!plan ? (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleCreatePlan}
            disabled={saving}
            testID="save-plan-btn"
          >
            <Text style={styles.buttonText}>{saving ? 'Creating...' : 'Create Recovery Plan'}</Text>
          </TouchableOpacity>
        ) : (
          <>
            {plan.status === 'PENDING_APPROVAL' && (
              <TouchableOpacity
                style={[styles.button, styles.approveButton]}
                onPress={() => handleTransition('APPROVED')}
                disabled={saving}
                testID="approve-plan-btn"
              >
                <Text style={styles.buttonText}>Approve Plan</Text>
              </TouchableOpacity>
            )}

            {plan.status === 'APPROVED' && (
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={() => handleTransition('IN_PROGRESS')}
                disabled={saving}
                testID="start-plan-btn"
              >
                <Text style={styles.buttonText}>Start Follow-Up (In Progress)</Text>
              </TouchableOpacity>
            )}

            {plan.status === 'IN_PROGRESS' && (
              <TouchableOpacity
                style={[styles.button, styles.successButton]}
                onPress={() => handleTransition('COMPLETED')}
                disabled={saving}
                testID="complete-plan-btn"
              >
                <Text style={styles.buttonText}>Mark Completed</Text>
              </TouchableOpacity>
            )}

            {['PENDING_APPROVAL', 'APPROVED', 'IN_PROGRESS'].includes(plan.status) && (
              <TouchableOpacity
                style={[styles.button, styles.dismissButton]}
                onPress={() => setShowDismissInput(!showDismissInput)}
                testID="dismiss-plan-btn"
              >
                <Text style={styles.dismissButtonText}>
                  {showDismissInput ? 'Cancel Dismissal' : 'Dismiss Plan...'}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* AI Accuracy Feedback Widget */}
      {plan && (
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>Was this AI recovery strategy helpful?</Text>
          <View style={styles.feedbackButtonsRow}>
            <TouchableOpacity
              style={styles.feedbackButton}
              onPress={() => handleFeedback('HELPFUL')}
              testID="feedback-helpful-btn"
            >
              <Text style={styles.feedbackButtonText}>👍 Helpful</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.feedbackButton}
              onPress={() => handleFeedback('NOT_HELPFUL')}
              testID="feedback-not-helpful-btn"
            >
              <Text style={styles.feedbackButtonText}>👎 Not Helpful</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1D',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0A0F1D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerMemberName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  statusBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  statusBadgeText: {
    color: '#818CF8',
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  fieldLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  strategyPill: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
    marginBottom: 8,
  },
  strategyPillText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
    lineHeight: 18,
    textAlignVertical: 'top',
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#6366F1',
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  successButton: {
    backgroundColor: '#059669',
  },
  dismissButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#475569',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  dismissButtonText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  feedbackCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  feedbackTitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 10,
  },
  feedbackButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  feedbackButton: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  feedbackButtonText: {
    color: '#CBD5E1',
    fontSize: 13,
  },
});
