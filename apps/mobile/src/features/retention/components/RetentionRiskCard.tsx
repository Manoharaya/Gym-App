import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type {
  RetentionRiskLevel,
  RetentionRiskTrend,
  RetentionRiskFactor,
  RetentionPositiveSignal,
  RetentionInterventionRecommendation,
} from '@fitcore/types';

interface Props {
  memberId?: string;
  memberName?: string;
  riskLevel: RetentionRiskLevel;
  riskTrend: RetentionRiskTrend;
  primaryFactors?: RetentionRiskFactor[];
  positiveSignals?: RetentionPositiveSignal[];
  recommendedInterventions?: RetentionInterventionRecommendation[];
  suggestedStaffNote?: string;
  onCreateTask?: () => void;
}

export const RetentionRiskCard: React.FC<Props> = ({
  memberId: _memberId,
  memberName: _memberName,
  riskLevel,
  riskTrend,
  primaryFactors = [],
  positiveSignals = [],
  recommendedInterventions = [],
  suggestedStaffNote,
  onCreateTask,
}) => {
  const [expanded, setExpanded] = useState(false);

  const getRiskColor = (level: RetentionRiskLevel) => {
    switch (level) {
      case 'HIGH':
        return '#EF4444'; // Red
      case 'ELEVATED':
        return '#F59E0B'; // Amber
      case 'MODERATE':
        return '#EAB308'; // Yellow
      case 'LOW':
        return '#10B981'; // Green
      default:
        return '#94A3B8'; // Slate
    }
  };

  const getTrendIcon = (trend: RetentionRiskTrend) => {
    switch (trend) {
      case 'IMPROVING':
        return '↗ Improving';
      case 'STABLE':
        return '→ Stable';
      case 'WORSENING':
        return '↘ Worsening';
      default:
        return '—';
    }
  };

  const primaryIntervention = recommendedInterventions[0];

  return (
    <View style={styles.card} testID="retention-risk-card">
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.cardTitle}>Retention Risk</Text>
          <Text style={styles.trendText}>{getTrendIcon(riskTrend)}</Text>
        </View>

        <View
          style={[
            styles.riskBadge,
            { backgroundColor: `${getRiskColor(riskLevel)}20`, borderColor: getRiskColor(riskLevel) },
          ]}
        >
          <Text style={[styles.riskBadgeText, { color: getRiskColor(riskLevel) }]}>
            {riskLevel.replace('_', ' ')}
          </Text>
        </View>
      </View>

      {/* Primary Contributing Factors */}
      {primaryFactors.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Why / Contributing Signals</Text>
          {primaryFactors.slice(0, expanded ? primaryFactors.length : 2).map((factor, idx) => (
            <View key={`factor-${idx}`} style={styles.factorItem}>
              <Text style={styles.bullet}>•</Text>
              <View style={styles.factorContent}>
                <Text style={styles.factorObs}>{factor.observation}</Text>
                {factor.timeframe && (
                  <Text style={styles.timeframeText}>Timeframe: {factor.timeframe}</Text>
                )}
                {expanded && factor.evidence && factor.evidence.length > 0 && (
                  <View style={styles.evidenceBox}>
                    {factor.evidence.map((ev, evIdx) => (
                      <Text key={`ev-${evIdx}`} style={styles.evidenceText}>
                        - {ev}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ))}

          {primaryFactors.length > 2 && (
            <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.expandButton}>
              <Text style={styles.expandButtonText}>
                {expanded ? 'Show Less' : `+${primaryFactors.length - 2} more signals`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Positive Signals (Balances negative observations) */}
      {positiveSignals.length > 0 && (
        <View style={styles.positiveBox}>
          <Text style={styles.positiveHeader}>Positive Signals</Text>
          {positiveSignals.map((pos, idx) => (
            <View key={`pos-${idx}`} style={styles.positiveRow}>
              <Text style={styles.positiveCheck}>✓</Text>
              <Text style={styles.positiveText}>{pos.observation}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recommended Follow-up Intervention */}
      {primaryIntervention && (
        <View style={styles.recommendationContainer}>
          <View style={styles.recHeaderRow}>
            <Text style={styles.recTitle}>Recommended Intervention</Text>
            <View
              style={[
                styles.priorityBadge,
                primaryIntervention.priority === 'HIGH'
                  ? styles.priorityHigh
                  : primaryIntervention.priority === 'MEDIUM'
                  ? styles.priorityMedium
                  : styles.priorityLow,
              ]}
            >
              <Text style={styles.priorityText}>{primaryIntervention.priority} PRIORITY</Text>
            </View>
          </View>

          <Text style={styles.actionType}>
            {primaryIntervention.type.replace(/_/g, ' ')}
          </Text>
          <Text style={styles.reasonText}>{primaryIntervention.reason}</Text>
        </View>
      )}

      {/* Suggested Staff Note Draft */}
      {suggestedStaffNote && (
        <View style={styles.noteDraftBox}>
          <Text style={styles.noteDraftLabel}>Suggested Staff Note (Draft)</Text>
          <Text style={styles.noteDraftText}>"{suggestedStaffNote}"</Text>
        </View>
      )}

      {/* Action Footer */}
      {onCreateTask && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onCreateTask}
          testID="create-follow-up-task-button"
        >
          <Text style={styles.actionButtonText}>Create Follow-Up Task</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#141824',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#232B3E',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'column',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  trendText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  riskBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  section: {
    marginTop: 8,
    marginBottom: 10,
  },
  sectionHeader: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bullet: {
    color: '#F59E0B',
    fontSize: 14,
    marginRight: 6,
    marginTop: 1,
  },
  factorContent: {
    flex: 1,
  },
  factorObs: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
  },
  timeframeText: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  evidenceBox: {
    backgroundColor: '#0F131C',
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#38BDF8',
  },
  evidenceText: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
  },
  expandButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  expandButtonText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  positiveBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    marginBottom: 12,
  },
  positiveHeader: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  positiveRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 2,
  },
  positiveCheck: {
    color: '#10B981',
    fontWeight: '700',
    marginRight: 6,
  },
  positiveText: {
    color: '#D1FAE5',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  recommendationContainer: {
    backgroundColor: '#1C2234',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
    marginBottom: 12,
  },
  recHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityHigh: {
    backgroundColor: '#EF444420',
  },
  priorityMedium: {
    backgroundColor: '#F59E0B20',
  },
  priorityLow: {
    backgroundColor: '#38BDF820',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionType: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  reasonText: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 17,
  },
  noteDraftBox: {
    backgroundColor: '#111520',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#2B354C',
    marginBottom: 12,
  },
  noteDraftLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  noteDraftText: {
    color: '#94A3B8',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  actionButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
