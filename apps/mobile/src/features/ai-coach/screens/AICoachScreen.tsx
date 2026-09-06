import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MemberStackParamList } from '../../../navigation/types';
import { Screen, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';

type NavigationProp = NativeStackNavigationProp<MemberStackParamList, 'AICoach'>;

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  actionTitle?: string;
  actionRoute?: keyof MemberStackParamList;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_1',
    sender: 'ai',
    text: 'Good morning Alex. Based on your 88% readiness score and recent chest hypertrophy session, your neuromuscular system is in prime condition. How can I optimize your training today?',
    timestamp: '08:30 AM',
  },
  {
    id: 'msg_2',
    sender: 'user',
    text: 'Should I do cardio or heavy lifting today?',
    timestamp: '08:32 AM',
  },
  {
    id: 'msg_3',
    sender: 'ai',
    text: 'Your HRV is +8ms above baseline and sleep quality was rated Optimal (4/5). You have a confirmed spot in Marcus Brody’s HIIT Blast at 17:30. I recommend keeping your afternoon free of heavy eccentric strain so you can push maximum output in today’s class.',
    timestamp: '08:32 AM',
    actionTitle: 'View Today’s HIIT Booking',
    actionRoute: 'MyBookings',
  },
];

const SUGGESTION_CHIPS = [
  'Analyze my bench progression',
  'Suggest 20-min mobility flow',
  'Check my hydration target',
  'Substitute Cable Fly with Dumbbells',
];

export const AICoachScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    // Simulate intelligent coach reply
    setTimeout(() => {
      const aiReply: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: `Understood. Analyzing your volume history for "${text.trim()}": progressive overload trend is consistent. I have logged this guidance into your daily plan.`,
        timestamp: 'Just now',
        actionTitle: 'Review Progress Charts',
        actionRoute: 'Progress',
      };
      setMessages((prev) => [...prev, aiReply]);
    }, 800);
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <View style={styles.headerTitleRow}>
              <View style={styles.aiGlowDot} />
              <Text style={styles.headerTitle}>FitCore AI Coach</Text>
            </View>
            <Text style={styles.headerSubtitle}>Personal Performance Intelligence</Text>
          </View>
          <Badge label="GPT-4o AT SPEED" variant="ai" />
        </View>

        {/* Suggestion Chips */}
        <View style={styles.chipsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {SUGGESTION_CHIPS.map((chip, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => handleSend(chip)}
                style={styles.suggestionChip}
              >
                <Icon name="sparkles" size={12} color={themeColors.aiPrimary} />
                <Text style={styles.chipText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Conversation Stream */}
        <ScrollView contentContainerStyle={styles.chatStream} showsVerticalScrollIndicator={false}>
          {messages.map((msg) => {
            const isAI = msg.sender === 'ai';
            return (
              <View
                key={msg.id}
                style={[styles.messageWrapper, isAI ? styles.aiWrapper : styles.userWrapper]}
              >
                {isAI && (
                  <View style={styles.aiAvatar}>
                    <Icon name="sparkles" size={14} color="#FFFFFF" />
                  </View>
                )}
                <View style={[styles.bubble, isAI ? styles.aiBubble : styles.userBubble]}>
                  <Text style={[styles.bubbleText, isAI ? styles.aiText : styles.userText]}>
                    {msg.text}
                  </Text>
                  {msg.actionTitle && msg.actionRoute && (
                    <TouchableOpacity
                      onPress={() => navigation.navigate(msg.actionRoute as any)}
                      style={styles.bubbleAction}
                    >
                      <Text style={styles.bubbleActionText}>{msg.actionTitle} →</Text>
                    </TouchableOpacity>
                  )}
                  <Text style={styles.timestampText}>{msg.timestamp}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Message Input Box */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask FitCore AI anything..."
            placeholderTextColor={themeColors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSend()}
          />
          <TouchableOpacity
            onPress={() => handleSend()}
            disabled={!inputText.trim()}
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          >
            <Icon name="bolt" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    backgroundColor: themeColors.surface,
  },
  backButton: {
    padding: spacing[1],
    marginLeft: -spacing[1],
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing[2],
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  aiGlowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: themeColors.aiPrimary,
  },
  headerTitle: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 11,
    color: themeColors.textMuted,
  },
  chipsContainer: {
    backgroundColor: themeColors.surface,
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  chipsScroll: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.cardBackground,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#2D2254',
    gap: spacing[1.5],
  },
  chipText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  chatStream: {
    padding: spacing[4],
    gap: spacing[3.5],
    paddingBottom: spacing[4],
  },
  messageWrapper: {
    flexDirection: 'row',
    gap: spacing[2.5],
    maxWidth: '88%',
  },
  aiWrapper: {
    alignSelf: 'flex-start',
  },
  userWrapper: {
    alignSelf: 'flex-end',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: themeColors.aiPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  bubble: {
    borderRadius: radius.lg,
    padding: spacing[3.5],
    gap: spacing[1.5],
  },
  aiBubble: {
    backgroundColor: '#161B2E',
    borderWidth: 1,
    borderColor: '#2D2254',
    borderTopLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: themeColors.accent,
    borderTopRightRadius: 4,
  },
  bubbleText: {
    ...typography.bodySmall,
    lineHeight: 20,
  },
  aiText: {
    color: themeColors.textPrimary,
  },
  userText: {
    color: '#FFFFFF',
  },
  bubbleAction: {
    alignSelf: 'flex-start',
    backgroundColor: themeColors.aiLight,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
    marginTop: spacing[1],
  },
  bubbleActionText: {
    ...typography.caption,
    color: '#A78BFA',
    fontWeight: '700',
  },
  timestampText: {
    fontSize: 10,
    color: themeColors.textMuted,
    alignSelf: 'flex-end',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    backgroundColor: themeColors.surface,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    gap: spacing[2],
  },
  textInput: {
    flex: 1,
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    color: themeColors.textPrimary,
    borderWidth: 1,
    borderColor: themeColors.border,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: themeColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: themeColors.surfaceActive,
  },
});
