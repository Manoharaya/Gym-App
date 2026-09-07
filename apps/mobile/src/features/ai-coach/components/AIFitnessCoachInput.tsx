import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text } from 'react-native';
import { spacing, radius } from '../../../theme';

export interface AIFitnessCoachInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const AIFitnessCoachInput: React.FC<AIFitnessCoachInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Ask your Fitness Coach about training, workouts, or goals...',
}) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor="#64748B"
        multiline
        maxLength={2000}
        editable={!disabled}
        returnKeyType="send"
        onSubmitEditing={handleSend}
      />
      <TouchableOpacity
        style={[styles.sendButton, (!text.trim() || disabled) && styles.sendButtonDisabled]}
        onPress={handleSend}
        disabled={!text.trim() || disabled}
        activeOpacity={0.7}
      >
        <Text style={styles.sendIcon}>↑</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#1E293B',
    borderRadius: radius.xl,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderWidth: 1,
    borderColor: '#334155',
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
  },
  input: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 15,
    maxHeight: 100,
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: spacing[2],
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0EA5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing[2],
  },
  sendButtonDisabled: {
    backgroundColor: '#334155',
    opacity: 0.6,
  },
  sendIcon: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
});
