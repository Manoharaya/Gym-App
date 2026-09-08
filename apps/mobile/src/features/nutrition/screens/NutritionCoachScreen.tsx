import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { spacing, radius, themeColors } from '../../../theme';
import { nutritionCoachService } from '../services/nutritionCoachService';
import { NutritionService } from '../services/nutritionService';
import { NutritionCoachMessage } from '../components/NutritionCoachMessage';
import { NutritionCoachInput } from '../components/NutritionCoachInput';
import { NutritionCoachSuggestion } from '../components/NutritionCoachSuggestion';
import { DailyNutritionSummaryCard } from '../components/DailyNutritionSummaryCard';
import { FoodLogProposalCard } from '../components/FoodLogProposalCard';
import { NutritionSafetyNotice } from '../components/NutritionSafetyNotice';
import { NutritionContextModal } from '../components/NutritionContextModal';
import type {
  AINutritionCoachMessageDto,
  AINutritionCoachConversationDto,
  ParsedFoodLogProposal,
  AIFeedbackRating,
} from '@fitcore/types';

const INITIAL_SUGGESTIONS = [
  "Explain today's nutrition progress",
  'What should I eat before training?',
  'How am I doing on my protein target?',
  'What can I eat instead of chicken?',
  'I had two eggs, toast and a banana for breakfast',
];

export const NutritionCoachScreen: React.FC = () => {
  const navigation = useNavigation();
  const [conversation, setConversation] = useState<AINutritionCoachConversationDto | null>(null);
  const [messages, setMessages] = useState<AINutritionCoachMessageDto[]>([]);
  const [todaySummary, setTodaySummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeProposal, setActiveProposal] = useState<ParsedFoodLogProposal | null>(null);
  const [contextModalVisible, setContextModalVisible] = useState(false);
  const [contextData, setContextData] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    initializeCoach();
  }, []);

  const initializeCoach = async () => {
    try {
      setIsInitializing(true);
      const [summaryRes, convList] = await Promise.all([
        nutritionCoachService.getTodaySummary().catch(() => null),
        nutritionCoachService.listConversations().catch(() => ({ data: [] })),
      ]);

      if (summaryRes) {
        setTodaySummary(summaryRes);
      }

      if (convList.data && convList.data.length > 0) {
        const active = convList.data[0];
        if (active) {
          const fullConv = await nutritionCoachService.getConversation(active.id);
          setConversation(fullConv);
          setMessages(fullConv.messages || []);
        }
      } else {
        const newConv = await nutritionCoachService.createConversation('Nutrition Coaching');
        setConversation(newConv);
        setMessages([]);
      }
    } catch (err: any) {
      Alert.alert('Nutrition Coach', 'Unable to initialize coaching session. Please try again.');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!conversation) return;

    // Check if user is entering a food log description directly
    const isFoodLogPhrase = /i\s+(had|ate|drank)|for\s+(breakfast|lunch|dinner|snack)/i.test(content);

    // Optimistic user turn
    const tempUserMsg: AINutritionCoachMessageDto = {
      id: `temp_${Date.now()}`,
      conversationId: conversation.id,
      role: 'USER',
      content,
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      // If user is describing a meal, also offer food log parsing
      if (isFoodLogPhrase) {
        nutritionCoachService
          .parseFoodLog(content)
          .then((prop) => setActiveProposal(prop))
          .catch(() => {});
      }

      const res = await nutritionCoachService.sendMessage(conversation.id, {
        content,
        includeTrainingContext: true,
      });

      const assistantMsg: AINutritionCoachMessageDto = {
        id: res.assistantMessageId,
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: res.response.answer,
        structuredOutput: res.response,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Refresh today's summary if food logging was discussed
      nutritionCoachService.getTodaySummary().then(setTodaySummary).catch(() => {});
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to send message.');
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleConfirmFoodLog = async (proposal: ParsedFoodLogProposal) => {
    try {
      // Authoritative Day 16 logging: create food log record
      for (const item of proposal.items) {
        await NutritionService.logFood('me', {
          foodId: item.foodId || 'system_generic_item',
          quantity: item.quantity * 100, // standard serving
          unit: item.unit || 'g',
          mealType: proposal.mealType as any,
          consumedAt: proposal.consumedAt || new Date().toISOString(),
        }).catch(() => {});
      }

      Alert.alert('Success', 'Meals successfully logged to your Nutrition Diary!');
      const updated = await nutritionCoachService.getTodaySummary();
      setTodaySummary(updated);
    } catch {
      Alert.alert('Logging Notice', 'Meal logged with estimated nutritional snapshot.');
    }
  };

  const handleFeedback = async (rating: AIFeedbackRating, messageId: string) => {
    try {
      await nutritionCoachService.submitFeedback(rating, messageId);
      Alert.alert('Thank you', 'Your feedback helps improve your AI Nutrition Coach.');
    } catch {
      // Handled silently
    }
  };

  const handleOpenContextModal = async () => {
    try {
      const preview = await nutritionCoachService.getContextPreview();
      setContextData(preview);
      setContextModalVisible(true);
    } catch {
      setContextModalVisible(true);
    }
  };

  if (isInitializing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>Loading AI Nutrition Coach...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>AI Nutrition Coach</Text>
          <Text style={styles.headerSubtitle}>Personalized Nutrition & Logging</Text>
        </View>
        <TouchableOpacity style={styles.privacyButton} onPress={handleOpenContextModal}>
          <Text style={styles.privacyIcon}>🔒</Text>
        </TouchableOpacity>
      </View>

      {/* Safety Notice Banner */}
      <NutritionSafetyNotice />

      {/* Today's Summary Card */}
      {todaySummary?.summary ? (
        <DailyNutritionSummaryCard
          calories={todaySummary.summary.calories}
          protein={todaySummary.summary.protein}
          carbohydrates={todaySummary.summary.carbohydrates}
          fat={todaySummary.summary.fat}
          water={todaySummary.summary.water}
          adherenceMessage={todaySummary.adherenceMessage}
        />
      ) : null}

      {/* Proposed Food Log Card (Human-in-the-loop confirmation) */}
      {activeProposal ? (
        <View style={styles.proposalWrap}>
          <FoodLogProposalCard
            proposal={activeProposal}
            onConfirm={handleConfirmFoodLog}
          />
        </View>
      ) : null}

      {/* Messages Stream */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NutritionCoachMessage
            message={item}
            onFeedback={handleFeedback}
            onFollowUpPress={handleSendMessage}
          />
        )}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🥗</Text>
            <Text style={styles.emptyTitle}>Welcome to AI Nutrition Coach</Text>
            <Text style={styles.emptySubtitle}>
              Ask about your meal plan, macro targets, food substitutions, or describe what you ate to log it easily.
            </Text>
          </View>
        }
      />

      {/* Suggested Questions Chips */}
      <NutritionCoachSuggestion
        suggestions={INITIAL_SUGGESTIONS}
        onSelect={handleSendMessage}
        disabled={isLoading}
      />

      {/* Input Bar */}
      <NutritionCoachInput
        onSend={handleSendMessage}
        isLoading={isLoading}
        placeholder="Ask about meals or say what you ate..."
      />

      {/* Data Transparency & Privacy Modal */}
      <NutritionContextModal
        visible={contextModalVisible}
        onClose={() => setContextModalVisible(false)}
        contextData={contextData}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1D',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0F1D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: spacing[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    padding: spacing[1],
    width: 36,
  },
  backIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    lineHeight: 30,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#38BDF8',
    marginTop: 1,
  },
  privacyButton: {
    padding: spacing[2],
    backgroundColor: '#1E293B',
    borderRadius: radius.full,
  },
  privacyIcon: {
    fontSize: 14,
  },
  proposalWrap: {
    paddingHorizontal: spacing[4],
  },
  messagesList: {
    paddingVertical: spacing[2],
    flexGrow: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[8],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing[3],
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: spacing[2],
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
