import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { spacing, radius } from '../../../theme';
import { MealSuggestionCard } from './MealSuggestionCard';
import { FoodAlternativeCard } from './FoodAlternativeCard';
import type {
  AINutritionCoachMessageDto,
  AIFeedbackRating,
} from '@fitcore/types';

export interface NutritionCoachMessageProps {
  message: AINutritionCoachMessageDto;
  onFeedback?: (rating: AIFeedbackRating, messageId: string) => void;
  onFollowUpPress?: (question: string) => void;
}

export const NutritionCoachMessage: React.FC<NutritionCoachMessageProps> = ({
  message,
  onFeedback,
  onFollowUpPress,
}) => {
  const isUser = message.role === 'USER';
  const structured = message.structuredOutput;
  const [feedbackSent, setFeedbackSent] = useState<AIFeedbackRating | null>(null);

  const handleRating = (rating: AIFeedbackRating) => {
    setFeedbackSent(rating);
    onFeedback?.(rating, message.id);
  };

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      {/* Sender Header */}
      <View style={styles.header}>
        <Text style={styles.sender}>
          {isUser ? 'You' : 'AI Nutrition Coach'}
        </Text>
        {structured?.confidence ? (
          <Text style={styles.confidenceBadge}>
            Confidence: {structured.confidence}
          </Text>
        ) : null}
      </View>

      {/* Main Text Content */}
      <Text style={[styles.bodyText, isUser ? styles.userBodyText : styles.assistantBodyText]}>
        {message.content}
      </Text>

      {/* Recommendations */}
      {structured?.recommendations && structured.recommendations.length > 0 ? (
        <View style={styles.recommendationsList}>
          {structured.recommendations.map((rec, idx) => (
            <View key={`${idx}-${rec.title}`} style={styles.recItem}>
              <View style={styles.recHeader}>
                <Text style={styles.recTypeBadge}>{rec.type}</Text>
                {rec.priority ? (
                  <Text
                    style={[
                      styles.recPriority,
                      rec.priority === 'HIGH' && styles.highPriority,
                    ]}
                  >
                    {rec.priority}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.recTitle}>{rec.title}</Text>
              <Text style={styles.recDesc}>{rec.description}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Meal Suggestions */}
      {structured?.mealSuggestions && structured.mealSuggestions.length > 0 ? (
        <View style={styles.subCardsList}>
          {structured.mealSuggestions.map((sug, idx) => (
            <MealSuggestionCard key={`${idx}-${sug.name}`} suggestion={sug} />
          ))}
        </View>
      ) : null}

      {/* Food Alternatives */}
      {structured?.foodAlternatives && structured.foodAlternatives.length > 0 ? (
        <View style={styles.subCardsList}>
          {structured.foodAlternatives.map((alt, idx) => (
            <FoodAlternativeCard key={`${idx}-${alt.substituteFood}`} alternative={alt} />
          ))}
        </View>
      ) : null}

      {/* Warnings */}
      {structured?.warnings && structured.warnings.length > 0 ? (
        <View style={styles.warningsBox}>
          {structured.warnings.map((warn, idx) => (
            <Text key={idx} style={styles.warningText}>
              ⚠️ {warn}
            </Text>
          ))}
        </View>
      ) : null}

      {/* Follow-up Questions */}
      {structured?.followUpQuestions && structured.followUpQuestions.length > 0 ? (
        <View style={styles.followUps}>
          {structured.followUpQuestions.map((q, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.followUpChip}
              onPress={() => onFollowUpPress?.(q)}
              activeOpacity={0.7}
            >
              <Text style={styles.followUpText}>💬 {q}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {/* Feedback Controls (Assistant Messages Only) */}
      {!isUser ? (
        <View style={styles.feedbackRow}>
          <Text style={styles.feedbackLabel}>Was this helpful?</Text>
          <TouchableOpacity
            style={[styles.feedbackButton, feedbackSent === 'HELPFUL' && styles.feedbackSelected]}
            onPress={() => handleRating('HELPFUL')}
            disabled={feedbackSent !== null}
          >
            <Text style={styles.feedbackIcon}>👍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.feedbackButton, feedbackSent === 'NOT_HELPFUL' && styles.feedbackSelected]}
            onPress={() => handleRating('NOT_HELPFUL')}
            disabled={feedbackSent !== null}
          >
            <Text style={styles.feedbackIcon}>👎</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.feedbackButton, feedbackSent === 'REPORT' && styles.feedbackSelected]}
            onPress={() => handleRating('REPORT')}
            disabled={feedbackSent !== null}
          >
            <Text style={styles.feedbackIcon}>🚩</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing[3],
    borderRadius: radius.lg,
    marginHorizontal: spacing[4],
    marginVertical: spacing[2],
    maxWidth: '90%',
  },
  userContainer: {
    backgroundColor: '#0369A1',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantContainer: {
    backgroundColor: '#1E293B',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  sender: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.3,
  },
  confidenceBadge: {
    fontSize: 10,
    color: '#38BDF8',
    fontWeight: '600',
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userBodyText: {
    color: '#FFFFFF',
  },
  assistantBodyText: {
    color: '#F8FAFC',
  },
  recommendationsList: {
    marginTop: spacing[2],
    gap: spacing[2],
  },
  recItem: {
    backgroundColor: '#0F172A',
    borderRadius: radius.md,
    padding: spacing[2],
    borderWidth: 1,
    borderColor: '#334155',
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  recTypeBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#38BDF8',
  },
  recPriority: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
  },
  highPriority: {
    color: '#F87171',
  },
  recTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  recDesc: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 16,
  },
  subCardsList: {
    marginTop: spacing[2],
    gap: spacing[1],
  },
  warningsBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: radius.md,
    padding: spacing[2],
    marginTop: spacing[2],
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  warningText: {
    fontSize: 11,
    color: '#FCD34D',
    lineHeight: 16,
  },
  followUps: {
    marginTop: spacing[2],
    gap: spacing[1],
  },
  followUpChip: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    alignSelf: 'flex-start',
  },
  followUpText: {
    fontSize: 12,
    color: '#38BDF8',
    fontWeight: '500',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[3],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: spacing[2],
  },
  feedbackLabel: {
    fontSize: 11,
    color: '#64748B',
    marginRight: spacing[1],
  },
  feedbackButton: {
    padding: spacing[1],
    borderRadius: radius.sm,
    backgroundColor: '#0F172A',
  },
  feedbackSelected: {
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
  },
  feedbackIcon: {
    fontSize: 12,
  },
});
