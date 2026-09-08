import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { spacing, radius, themeColors } from '../../../theme';

export interface NutritionCoachInputProps {
  onSend: (text: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  onVoicePress?: () => void;
}

export const NutritionCoachInput: React.FC<NutritionCoachInputProps> = ({
  onSend,
  isLoading = false,
  placeholder = 'Ask about meals, targets, or log food...',
  onVoicePress,
}) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor="#64748B"
          multiline
          maxLength={1000}
          editable={!isLoading}
        />
        {onVoicePress ? (
          <TouchableOpacity
            style={styles.voiceButton}
            onPress={onVoicePress}
            disabled={isLoading}
            accessibilityLabel="Voice input"
          >
            <Text style={styles.voiceIcon}>🎙️</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <TouchableOpacity
        style={[
          styles.sendButton,
          (!text.trim() || isLoading) && styles.sendButtonDisabled,
        ]}
        onPress={handleSend}
        disabled={!text.trim() || isLoading}
        accessibilityLabel="Send nutrition message"
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.sendIcon}>➤</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    gap: spacing[2],
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: radius.xl,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 44,
    maxHeight: 100,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    maxHeight: 90,
  },
  voiceButton: {
    padding: spacing[1],
  },
  voiceIcon: {
    fontSize: 18,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: themeColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#334155',
    opacity: 0.6,
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 2,
  },
});
