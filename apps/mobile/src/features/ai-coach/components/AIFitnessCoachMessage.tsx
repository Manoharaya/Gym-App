import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { spacing, radius } from '../../../theme';
import { Badge } from '../../../components/primitives/Badge';
import { AIFeedbackControl } from '../../../components/ai/AIFeedbackControl';
import type {
  FitnessCoachResponse,
  FitnessAction,
  AIFeedbackRating,
} from '@fitcore/types';

export interface AIFitnessCoachMessageProps {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  structuredOutput?: FitnessCoachResponse | null;
  onActionPress?: (action: FitnessAction) => void;
  onFeedback?: (rating: AIFeedbackRating) => void;
}

export const AIFitnessCoachMessage: React.FC<AIFitnessCoachMessageProps> = ({
  id: _id,
  role,
  content,
  structuredOutput,
  onActionPress,
  onFeedback,
}) => {
  const isUser = role === 'USER';

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{content}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.assistantRow}>
      <View style={styles.assistantCard}>
        <View style={styles.header}>
          <Badge label="FitCore AI Coach" variant="ai" />
          <Text style={styles.timestamp}>Coach</Text>
        </View>

        <Text style={styles.messageText}>{content}</Text>

        {/* Insights Section */}
        {structuredOutput?.insights && structuredOutput.insights.length > 0 && (
          <View style={styles.insightsContainer}>
            {structuredOutput.insights.map((ins, idx) => (
              <View key={`ins-${idx}`} style={styles.insightBox}>
                <Text style={styles.insightTitle}>💡 {ins.title}</Text>
                <Text style={styles.insightDesc}>{ins.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recommendations Section */}
        {structuredOutput?.recommendations && structuredOutput.recommendations.length > 0 && (
          <View style={styles.recsContainer}>
            <Text style={styles.sectionHeader}>Recommendations</Text>
            {structuredOutput.recommendations.map((rec, idx) => (
              <View key={`rec-${idx}`} style={styles.recCard}>
                <View style={styles.recHeaderRow}>
                  <Text style={styles.recTitle}>{rec.title}</Text>
                  {rec.priority && (
                    <Text
                      style={[
                        styles.priorityBadge,
                        rec.priority === 'HIGH' ? styles.priorityHigh : styles.priorityMedium,
                      ]}
                    >
                      {rec.priority}
                    </Text>
                  )}
                </View>
                <Text style={styles.recDesc}>{rec.description}</Text>
                {rec.rationale && (
                  <Text style={styles.recRationale}>Rationale: {rec.rationale}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Cautions */}
        {structuredOutput?.cautions && structuredOutput.cautions.length > 0 && (
          <View style={styles.cautionsContainer}>
            {structuredOutput.cautions.map((c, idx) => (
              <Text key={`caution-${idx}`} style={styles.cautionText}>
                ⚠️ {c}
              </Text>
            ))}
          </View>
        )}

        {/* Suggested Actions */}
        {structuredOutput?.suggestedActions && structuredOutput.suggestedActions.length > 0 && (
          <View style={styles.actionsContainer}>
            {structuredOutput.suggestedActions.map((act, idx) => (
              <TouchableOpacity
                key={`act-${idx}`}
                style={styles.actionButton}
                onPress={() => onActionPress && onActionPress(act)}
                activeOpacity={0.7}
              >
                <Text style={styles.actionLabel}>👉 {act.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Follow up question */}
        {structuredOutput?.followUpQuestion && (
          <Text style={styles.followUpText}>{structuredOutput.followUpQuestion}</Text>
        )}

        {/* Feedback Control */}
        {onFeedback && (
          <View style={styles.feedbackWrap}>
            <AIFeedbackControl onFeedback={onFeedback} />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  userBubble: {
    backgroundColor: '#0284C7',
    borderRadius: radius.xl,
    borderBottomRightRadius: radius.xs,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    maxWidth: '85%',
  },
  userText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
  },
  assistantRow: {
    marginVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  assistantCard: {
    backgroundColor: '#1E293B',
    borderRadius: radius.xl,
    borderBottomLeftRadius: radius.xs,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  timestamp: {
    fontSize: 12,
    color: '#64748B',
  },
  messageText: {
    fontSize: 15,
    color: '#F8FAFC',
    lineHeight: 22,
    marginBottom: spacing[2],
  },
  insightsContainer: {
    marginVertical: spacing[2],
    gap: spacing[2],
  },
  insightBox: {
    backgroundColor: '#0F172A',
    borderRadius: radius.md,
    padding: spacing[3],
    borderLeftWidth: 3,
    borderLeftColor: '#0EA5E9',
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#38BDF8',
    marginBottom: 2,
  },
  insightDesc: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 18,
  },
  recsContainer: {
    marginVertical: spacing[2],
    gap: spacing[2],
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  recCard: {
    backgroundColor: '#0F172A',
    borderRadius: radius.md,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: '#334155',
  },
  recHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    flex: 1,
  },
  priorityBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityHigh: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#F87171',
  },
  priorityMedium: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    color: '#FBBF24',
  },
  recDesc: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  recRationale: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  cautionsContainer: {
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  cautionText: {
    fontSize: 12,
    color: '#F59E0B',
    lineHeight: 16,
    marginBottom: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  actionButton: {
    backgroundColor: '#334155',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#475569',
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#38BDF8',
  },
  followUpText: {
    fontSize: 13,
    color: '#38BDF8',
    fontStyle: 'italic',
    marginTop: spacing[2],
  },
  feedbackWrap: {
    marginTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.5)',
    paddingTop: spacing[2],
  },
});
