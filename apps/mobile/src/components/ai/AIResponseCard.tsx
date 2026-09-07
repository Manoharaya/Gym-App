import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { spacing, radius } from '../../theme';
import { Badge } from '../primitives/Badge';
import { AIFeedbackControl } from './AIFeedbackControl';
import { AIFeedbackRating } from '@fitcore/types';

export interface AIResponseCardProps {
  content: string;
  model?: string;
  structuredOutput?: Record<string, any>;
  onFeedback?: (rating: AIFeedbackRating) => void;
  disclaimer?: string;
}

export const AIResponseCard: React.FC<AIResponseCardProps> = ({
  content,
  model,
  structuredOutput,
  onFeedback,
  disclaimer = 'FitCore AI is for fitness guidance only and does not provide medical advice.',
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Badge label="FitCore AI" variant="ai" />
          {model && <Text style={styles.modelText}>{model}</Text>}
        </View>
        <Text style={styles.timestamp}>Just now</Text>
      </View>

      <Text style={styles.content}>{content}</Text>

      {structuredOutput && (
        <View style={styles.structuredBox}>
          {Object.entries(structuredOutput).map(([key, value]) => (
            <View key={key} style={styles.structuredRow}>
              <Text style={styles.structuredKey}>{key}:</Text>
              <Text style={styles.structuredValue}>
                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {disclaimer && <Text style={styles.disclaimer}>{disclaimer}</Text>}

      {onFeedback && <AIFeedbackControl onFeedback={onFeedback} />}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E293B',
    borderRadius: radius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: '#334155',
    marginVertical: spacing[2],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  modelText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  timestamp: {
    fontSize: 12,
    color: '#64748B',
  },
  content: {
    fontSize: 15,
    color: '#E2E8F0',
    lineHeight: 22,
    marginBottom: spacing[3],
  },
  structuredBox: {
    backgroundColor: '#0F172A',
    borderRadius: radius.md,
    padding: spacing[3],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: '#334155',
  },
  structuredRow: {
    marginBottom: spacing[1],
  },
  structuredKey: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  structuredValue: {
    fontSize: 12,
    color: '#E2E8F0',
    marginTop: 2,
  },
  disclaimer: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: spacing[1],
  },
});
