import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type {
  RecoveryState,
  ReactivationStrategyType,
  ReactivationBarrierItem,
  ReactivationPositiveSignalItem,
  MemberRecoveryPlanDto,
} from '@fitcore/types';

interface Props {
  memberId: string;
  memberName: string;
  daysInactive: number;
  recoveryState: RecoveryState;
  recommendedStrategy?: ReactivationStrategyType | null;
  activePlan?: MemberRecoveryPlanDto | null;
  primaryBarriers?: ReactivationBarrierItem[];
  positiveSignals?: ReactivationPositiveSignalItem[];
  suggestedAction?: string;
  draftMessage?: string | null;
  onViewPlan?: (planId: string) => void;
  onCreatePlan?: () => void;
}

export const MemberRecoveryCard: React.FC<Props> = ({
  memberId,
  memberName,
  daysInactive,
  recoveryState,
  recommendedStrategy = 'GENERAL_SUPPORT',
  activePlan,
  primaryBarriers = [],
  positiveSignals = [],
  suggestedAction,
  draftMessage,
  onViewPlan,
  onCreatePlan,
}) => {
  const [expanded, setExpanded] = useState(false);

  const getRecoveryStateBadge = (state: RecoveryState) => {
    switch (state) {
      case 'REENGAGED':
        return { label: 'Re-engaged', bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', border: '#10B981' };
      case 'STABLE_REENGAGEMENT':
        return { label: 'Stable Return', bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6', border: '#3B82F6' };
      case 'PARTIAL_REENGAGEMENT':
        return { label: 'Partial Return', bg: 'rgba(139, 92, 246, 0.15)', text: '#8B5CF6', border: '#8B5CF6' };
      case 'EARLY_REENGAGEMENT':
        return { label: 'Early Signal', bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', border: '#F59E0B' };
      case 'NO_RECOVERY_SIGNAL':
      default:
        return { label: 'Inactive', bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', border: '#EF4444' };
    }
  };

  const badge = getRecoveryStateBadge(recoveryState);

  return (
    <View style={styles.card} testID={`member-recovery-card-${memberId}`}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.nameBlock}>
          <Text style={styles.memberName}>{memberName}</Text>
          <Text style={styles.inactivityLabel}>
            {daysInactive > 0 ? `${daysInactive} days inactive` : 'Active recently'}
          </Text>
        </View>
        <View style={[styles.stateBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
          <Text style={[styles.stateBadgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
      </View>

      {/* Recommended Strategy Pill */}
      {recommendedStrategy && (
        <View style={styles.strategyRow}>
          <Text style={styles.strategyTag}>RECOMMENDED STRATEGY</Text>
          <Text style={styles.strategyName}>
            {recommendedStrategy.replace(/_/g, ' ')}
          </Text>
        </View>
      )}

      {/* Suggested Action Preview */}
      {suggestedAction && (
        <View style={styles.actionBlock}>
          <Text style={styles.actionLabel}>Suggested Next Step:</Text>
          <Text style={styles.actionText}>{suggestedAction}</Text>
        </View>
      )}

      {/* Draft Message Preview */}
      {draftMessage && (
        <View style={styles.messageBox}>
          <Text style={styles.messageHeading}>Draft Message (Staff Review Required):</Text>
          <Text style={styles.messageContent}>"{draftMessage}"</Text>
        </View>
      )}

      {/* Active Plan Indicator */}
      {activePlan && (
        <View style={styles.planStatusRow}>
          <Text style={styles.planStatusText}>
            Plan Status: <Text style={styles.planStatusValue}>{activePlan.status}</Text>
          </Text>
        </View>
      )}

      {/* Toggle Evidence */}
      {(primaryBarriers.length > 0 || positiveSignals.length > 0) && (
        <TouchableOpacity
          style={styles.expandToggle}
          onPress={() => setExpanded(!expanded)}
          testID="toggle-recovery-details"
        >
          <Text style={styles.expandToggleText}>
            {expanded ? '▲ Hide Analysis & Signals' : '▼ View Barriers & Signals'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Expanded Analysis */}
      {expanded && (
        <View style={styles.expandedSection}>
          {positiveSignals.length > 0 && (
            <View style={styles.signalsList}>
              <Text style={styles.sectionHeading}>Positive Recovery Signals:</Text>
              {positiveSignals.map((s, idx) => (
                <View key={idx} style={styles.signalItem}>
                  <Text style={styles.signalIcon}>✨</Text>
                  <Text style={styles.signalText}>{s.observation}</Text>
                </View>
              ))}
            </View>
          )}

          {primaryBarriers.length > 0 && (
            <View style={styles.signalsList}>
              <Text style={styles.sectionHeading}>Observed Barriers:</Text>
              {primaryBarriers.map((b, idx) => (
                <View key={idx} style={styles.barrierItem}>
                  <Text style={styles.barrierIcon}>⚠️</Text>
                  <Text style={styles.barrierText}>{b.observation}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Footer Actions */}
      <View style={styles.footerRow}>
        {activePlan ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => onViewPlan && onViewPlan(activePlan.id)}
            testID="view-recovery-plan-btn"
          >
            <Text style={styles.primaryButtonText}>View Recovery Plan</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onCreatePlan}
            testID="create-recovery-plan-btn"
          >
            <Text style={styles.primaryButtonText}>Create Recovery Plan</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  nameBlock: {
    flex: 1,
  },
  memberName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  inactivityLabel: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
  stateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  stateBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  strategyRow: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  strategyTag: {
    color: '#818CF8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  strategyName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  actionBlock: {
    marginBottom: 10,
  },
  actionLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  actionText: {
    color: '#E2E8F0',
    fontSize: 14,
    marginTop: 2,
    lineHeight: 20,
  },
  messageBox: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
    padding: 10,
    marginBottom: 10,
  },
  messageHeading: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageContent: {
    color: '#F1F5F9',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  planStatusRow: {
    marginBottom: 8,
  },
  planStatusText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  planStatusValue: {
    color: '#38BDF8',
    fontWeight: '600',
  },
  expandToggle: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  expandToggleText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '500',
  },
  expandedSection: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
  },
  signalsList: {
    marginBottom: 8,
  },
  sectionHeading: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  signalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  signalIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  signalText: {
    color: '#86EFAC',
    fontSize: 12,
    flex: 1,
  },
  barrierItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  barrierIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  barrierText: {
    color: '#FCA5A5',
    fontSize: 12,
    flex: 1,
  },
  footerRow: {
    marginTop: 10,
  },
  primaryButton: {
    backgroundColor: '#6366F1',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
