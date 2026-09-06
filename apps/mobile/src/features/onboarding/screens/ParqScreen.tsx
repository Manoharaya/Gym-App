import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { StepHeader } from '../components/StepHeader';
import { StepFooter } from '../components/StepFooter';
import { YesNoQuestion } from '../components/YesNoQuestion';
import { useOnboardingStore } from '../store/onboardingStore';
import { onboardingService } from '../services/onboardingService';
import type { Question } from '@fitcore/types';

interface ParqScreenProps {
  onNext: () => void;
  onBack: () => void;
}

export const ParqScreen: React.FC<ParqScreenProps> = ({ onNext, onBack }) => {
  const {
    parqAnswers,
    parqNotes,
    setParqAnswer,
    setParqNote,
    isSubmitting,
    setSubmitting,
  } = useOnboardingStore();

  const [questionnaireId, setQuestionnaireId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadParq = async () => {
      try {
        const data = await onboardingService.getParqQuestionnaire();
        if (isMounted && data.questionnaire) {
          setQuestionnaireId(data.questionnaire.id);
          setQuestions(data.questionnaire.questions || []);

          // Preload previous answers if draft/submission exists
          if (data.submission?.responses) {
            data.submission.responses.forEach((r) => {
              setParqAnswer(r.questionId, (r.answer as any)?.value === true);
              if (r.notes) {
                setParqNote(r.questionId, r.notes);
              }
            });
          }
        }
      } catch {
        setErrorMsg('Unable to load questionnaire from server.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadParq();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveDraft = async () => {
    if (!questionnaireId) return;
    const responses = Object.entries(parqAnswers).map(([questionId, value]) => ({
      questionId,
      answer: { value },
      notes: parqNotes[questionId],
    }));

    setSubmitting(true);
    try {
      await onboardingService.saveParqDraft(questionnaireId, responses);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!questionnaireId) return;

    // Validate all required questions are answered
    const unanswered = questions.filter((q) => q.required && parqAnswers[q.id] === undefined);
    if (unanswered.length > 0) {
      setErrorMsg(`Please answer all ${questions.length} questions before proceeding.`);
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);

    try {
      const responses = questions.map((q) => ({
        questionId: q.id,
        answer: { value: Boolean(parqAnswers[q.id]) },
        notes: parqNotes[q.id],
      }));

      await onboardingService.submitParq(questionnaireId, responses);
      await onboardingService.updateCurrentStep('HEALTH_SCREENING');
      onNext();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit PAR-Q responses.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading PAR-Q questionnaire...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <StepHeader
          title="Physical Activity Readiness"
          subtitle="The PAR-Q+ questionnaire checks if physical exercise is safe for you or if medical consultation is advised."
        />

        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {questions.map((q, idx) => (
          <YesNoQuestion
            key={q.id}
            questionNumber={idx + 1}
            questionText={q.text}
            value={parqAnswers[q.id]}
            notes={parqNotes[q.id]}
            onChangeValue={(val) => setParqAnswer(q.id, val)}
            onChangeNotes={(note) => setParqNote(q.id, note)}
          />
        ))}
      </ScrollView>

      <StepFooter
        onBack={onBack}
        onNext={handleSubmit}
        onSaveDraft={handleSaveDraft}
        isSubmitting={isSubmitting}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#A3A3A3',
    marginTop: 12,
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 24,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
  },
});
