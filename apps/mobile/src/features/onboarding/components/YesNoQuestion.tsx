import React from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Text } from '../../../components/primitives/Text';

interface YesNoQuestionProps {
  questionNumber: number;
  questionText: string;
  value?: boolean;
  notes?: string;
  onChangeValue: (val: boolean) => void;
  onChangeNotes?: (notes: string) => void;
}

export const YesNoQuestion: React.FC<YesNoQuestionProps> = ({
  questionNumber,
  questionText,
  value,
  notes,
  onChangeValue,
  onChangeNotes,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.numberBadge}>
          <Text style={styles.numberText}>{questionNumber}</Text>
        </View>
        <Text style={styles.questionText}>{questionText}</Text>
      </View>

      <View style={styles.optionsRow}>
        <TouchableOpacity
          style={[styles.optionButton, value === false && styles.selectedNo]}
          onPress={() => onChangeValue(false)}
          activeOpacity={0.8}
        >
          <Text style={[styles.optionText, value === false && styles.selectedOptionText]}>
            No
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionButton, value === true && styles.selectedYes]}
          onPress={() => onChangeValue(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.optionText, value === true && styles.selectedOptionText]}>
            Yes
          </Text>
        </TouchableOpacity>
      </View>

      {value === true && onChangeNotes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Please provide additional details:</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={onChangeNotes}
            placeholder="e.g. Diagnosed in 2022, cleared by doctor..."
            placeholderTextColor="#737373"
            multiline
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  numberText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  questionText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  selectedNo: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: '#22C55E',
  },
  selectedYes: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#EF4444',
  },
  optionText: {
    color: '#D4D4D4',
    fontSize: 15,
    fontWeight: '600',
  },
  selectedOptionText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  notesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  notesLabel: {
    color: '#A3A3A3',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  notesInput: {
    backgroundColor: '#171717',
    color: '#FFFFFF',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#333333',
    textAlignVertical: 'top',
  },
});
