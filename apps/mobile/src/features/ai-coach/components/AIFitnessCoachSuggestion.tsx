import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { spacing, radius } from '../../../theme';

export interface AIFitnessCoachSuggestionProps {
  suggestions: string[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export const AIFitnessCoachSuggestion: React.FC<AIFitnessCoachSuggestionProps> = ({
  suggestions,
  onSelect,
  disabled = false,
}) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.heading}>Suggested Questions</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {suggestions.map((item, index) => (
          <TouchableOpacity
            key={`${item}-${index}`}
            style={[styles.chip, disabled && styles.chipDisabled]}
            onPress={() => onSelect(item)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={styles.chipText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: spacing[2],
  },
  heading: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: spacing[2],
    paddingHorizontal: spacing[4],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  container: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  chip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    fontSize: 13,
    color: '#E2E8F0',
    fontWeight: '500',
  },
});
