import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { spacing, radius } from '../../theme';
import { AIFeedbackRating } from '@fitcore/types';

export interface AIFeedbackControlProps {
  onFeedback: (rating: AIFeedbackRating) => void;
  disabled?: boolean;
}

export const AIFeedbackControl: React.FC<AIFeedbackControlProps> = ({
  onFeedback,
  disabled = false,
}) => {
  const [selected, setSelected] = useState<AIFeedbackRating | null>(null);

  const handleSelect = (rating: AIFeedbackRating) => {
    if (disabled || selected) return;
    setSelected(rating);
    onFeedback(rating);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Was this helpful?</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, selected === 'HELPFUL' && styles.buttonActive]}
          onPress={() => handleSelect('HELPFUL')}
          disabled={disabled || selected !== null}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>👍 Helpful</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, selected === 'NOT_HELPFUL' && styles.buttonActive]}
          onPress={() => handleSelect('NOT_HELPFUL')}
          disabled={disabled || selected !== null}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>👎 Not Helpful</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, selected === 'REPORT' && styles.buttonActive]}
          onPress={() => handleSelect('REPORT')}
          disabled={disabled || selected !== null}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>🚩 Report</Text>
        </TouchableOpacity>
      </View>
      {selected && (
        <Text style={styles.thankYouText}>Thank you for your feedback!</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: '#334155',
    marginTop: spacing[3],
  },
  label: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: spacing[2],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  button: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    backgroundColor: '#334155',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#475569',
  },
  buttonActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.2)',
    borderColor: '#0EA5E9',
  },
  buttonText: {
    fontSize: 12,
    color: '#E2E8F0',
  },
  thankYouText: {
    fontSize: 12,
    color: '#10B981',
    marginTop: spacing[2],
  },
});
