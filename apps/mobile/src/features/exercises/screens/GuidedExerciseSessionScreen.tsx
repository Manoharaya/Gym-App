import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Card, Badge, Icon, Button } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import {
  ExerciseService,
  GuidedSessionDetail,
  GuidedSessionItem,
} from '../services/exerciseService';
import { GuidedSessionHeader } from '../components/GuidedSessionHeader';
import { GuidedSessionIntroView } from '../components/GuidedSessionIntroView';
import { GuidedSessionTransitionView } from '../components/GuidedSessionTransitionView';
import { GuidedSessionRestTimerView } from '../components/GuidedSessionRestTimerView';
import { GuidedSessionPracticeView } from '../components/GuidedSessionPracticeView';
import { GuidedSessionCompletionView } from '../components/GuidedSessionCompletionView';
import { InteractiveExerciseTutorial } from '../components/InteractiveExerciseTutorial';
import { KnowledgeCheckPlayer } from '../components/KnowledgeCheckPlayer';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
};

export const GuidedExerciseSessionScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { sessionId, startFresh = false, previewMode = false } = route.params;

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<GuidedSessionDetail | null>(null);

  // Player state machine
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);
  const [tutorialPayload, setTutorialPayload] = useState<any>(null);
  const [tutorialLoading, setTutorialLoading] = useState<boolean>(false);
  const [knowledgeCheckPayload, setKnowledgeCheckPayload] = useState<any>(null);
  const [knowledgeAttempt, setKnowledgeAttempt] = useState<any>(null);
  const [knowledgeCheckLoading, setKnowledgeCheckLoading] = useState<boolean>(false);
  const [totalTimeSpent, setTotalTimeSpent] = useState<number>(0);

  // Load session detail and initialize progress
  const initSession = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ExerciseService.getGuidedSession(sessionId);
      setDetail(data);

      if (!previewMode) {
        const progress = await ExerciseService.startGuidedSession(sessionId, {
          resetProgress: startFresh,
        });
        const resumeStep = startFresh ? 0 : progress.currentStepIndex || 0;
        setCurrentIndex(Math.min(data.items.length - 1, Math.max(0, resumeStep)));
        if (progress.status === 'COMPLETED' && !startFresh) {
          setSessionCompleted(true);
        }
      } else {
        setCurrentIndex(0);
      }
    } catch (err: any) {
      Alert.alert(
        'Session Error',
        err?.response?.data?.message || 'Could not load guided exercise session.',
      );
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [sessionId, startFresh, previewMode, navigation]);

  useEffect(() => {
    initSession();
  }, [initSession]);

  const currentItem: GuidedSessionItem | undefined = detail?.items[currentIndex];
  const nextItem: GuidedSessionItem | undefined = detail?.items[currentIndex + 1];

  // Fetch full exercise tutorial payload if current item is EXERCISE_TUTORIAL
  useEffect(() => {
    if (currentItem && currentItem.itemType === 'EXERCISE_TUTORIAL' && currentItem.exerciseId) {
      setTutorialLoading(true);
      ExerciseService.getExerciseTutorial(currentItem.exerciseId)
        .then((payload) => {
          setTutorialPayload(payload);
        })
        .catch(() => {
          setTutorialPayload(null);
        })
        .finally(() => {
          setTutorialLoading(false);
        });
    } else {
      setTutorialPayload(null);
    }
  }, [currentItem]);

  // Fetch knowledge check player data if current item is KNOWLEDGE_CHECK
  useEffect(() => {
    if (
      currentItem &&
      currentItem.itemType === 'KNOWLEDGE_CHECK' &&
      currentItem.knowledgeCheckId
    ) {
      setKnowledgeCheckLoading(true);
      Promise.all([
        ExerciseService.getKnowledgeCheckPlayer(currentItem.knowledgeCheckId),
        ExerciseService.startKnowledgeAttempt(currentItem.knowledgeCheckId).catch(() => null),
      ])
        .then(([payload, attempt]) => {
          setKnowledgeCheckPayload(payload);
          setKnowledgeAttempt(attempt);
        })
        .catch(() => {
          setKnowledgeCheckPayload(null);
          setKnowledgeAttempt(null);
        })
        .finally(() => {
          setKnowledgeCheckLoading(false);
        });
    } else {
      setKnowledgeCheckPayload(null);
      setKnowledgeAttempt(null);
    }
  }, [currentItem]);

  // Step advancement & persistence
  const advanceToNextStep = async (stepTime = 60, completionData?: any) => {
    if (!detail) return;
    const completedItemId = currentItem?.id;
    const nextIdx = currentIndex + 1;
    setTotalTimeSpent((t) => t + stepTime);

    if (!previewMode && completedItemId) {
      try {
        await ExerciseService.updateGuidedSessionProgress(sessionId, {
          completedItemId,
          currentStepIndex: nextIdx,
          currentItemId: detail.items[nextIdx]?.id,
          timeSpentSecondsIncrement: stepTime,
          itemCompletionData: completionData,
        });
      } catch (err) {
        // Network resilience: progress continues locally
      }
    }

    if (nextIdx >= detail.items.length) {
      // Completed all items!
      if (!previewMode) {
        await ExerciseService.completeGuidedSession(sessionId, {
          totalTimeSpentSeconds: totalTimeSpent + stepTime,
        }).catch(() => {});
      }
      setSessionCompleted(true);
    } else {
      setCurrentIndex(nextIdx);
    }
  };

  const handlePreviousStep = () => {
    if (currentIndex > 0) {
      setCurrentIndex((idx) => idx - 1);
    }
  };

  const handleExitSession = () => {
    navigation.goBack();
  };

  if (loading || !detail) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={themeColors.accent} />
        <Text style={styles.loadingText}>Initializing guided learning session...</Text>
      </View>
    );
  }

  // 1. SESSION COMPLETION SCREEN
  if (sessionCompleted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <GuidedSessionHeader
          title={detail.session.title}
          currentStepIndex={detail.items.length}
          totalSteps={detail.items.length}
          itemTitle="Session Completed"
          onExit={handleExitSession}
        />
        <GuidedSessionCompletionView
          sessionDetail={detail}
          timeSpentSeconds={totalTimeSpent}
          onReturnToDashboard={() => navigation.navigate('LearningHome')}
          onBrowseMoreSessions={() => navigation.navigate('GuidedSessions')}
        />
      </SafeAreaView>
    );
  }

  if (!currentItem) {
    return null;
  }

  // Render content based on current itemType
  const renderItemContent = () => {
    switch (currentItem.itemType) {
      case 'INTRO':
        return (
          <GuidedSessionIntroView
            sessionDetail={detail}
            onStartSession={() => advanceToNextStep(60)}
          />
        );

      case 'WARMUP':
        return (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <Card style={styles.card}>
              <Badge label="WARM-UP & MOBILITY" variant="warning" />
              <Text style={styles.itemTitle}>{currentItem.title}</Text>
              {currentItem.description ? (
                <Text style={styles.itemDescription}>{currentItem.description}</Text>
              ) : null}

              {/* Dynamic warm-up coaching points */}
              <View style={styles.coachingPointsBox}>
                <Text style={styles.coachingHeader}>Warm-Up Guidelines</Text>
                <View style={styles.cueRow}>
                  <Icon name="check" size={14} color="#10B981" />
                  <Text style={styles.cueText}>
                    Perform movement at 50% effort with deep nasal breathing.
                  </Text>
                </View>
                <View style={styles.cueRow}>
                  <Icon name="check" size={14} color="#10B981" />
                  <Text style={styles.cueText}>
                    Focus on end-range joint mobility without joint impingement.
                  </Text>
                </View>
                <View style={styles.cueRow}>
                  <Icon name="check" size={14} color="#10B981" />
                  <Text style={styles.cueText}>
                    Activate glutes and stabilize the abdominal wall.
                  </Text>
                </View>
              </View>

              <Button
                title="Warm-Up Completed"
                variant="primary"
                leftIcon={<Icon name="check-circle" size={16} color="#FFFFFF" />}
                onPress={() => advanceToNextStep(currentItem.durationSeconds || 180)}
                style={styles.ctaButton}
              />
            </Card>
          </ScrollView>
        );

      case 'EXERCISE_TUTORIAL':
        if (tutorialLoading) {
          return (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={themeColors.accent} />
              <Text style={styles.loadingText}>Loading interactive tutorial...</Text>
            </View>
          );
        }
        if (!tutorialPayload) {
          return (
            <View style={styles.centerBox}>
              <Text style={styles.errorText}>
                Tutorial content temporarily unavailable.
              </Text>
              <Button
                title="Continue to Next Step"
                variant="primary"
                onPress={() => advanceToNextStep(60)}
              />
            </View>
          );
        }
        return (
          <InteractiveExerciseTutorial
            tutorial={tutorialPayload}
            onUpdateProgress={() => {}}
            onCompleteTutorial={() => advanceToNextStep(300)}
            onExitTutorial={handleExitSession}
          />
        );

      case 'PRACTICE':
        return (
          <GuidedSessionPracticeView
            item={currentItem}
            onCompletePractice={(payload) => advanceToNextStep(payload.timeSpentSeconds, payload)}
          />
        );

      case 'REST':
        return (
          <GuidedSessionRestTimerView
            durationSeconds={currentItem.durationSeconds || 45}
            itemTitle={currentItem.title}
            itemDescription={currentItem.description}
            onCompleteRest={(restSkipped, timeSpent) =>
              advanceToNextStep(timeSpent, { restSkipped })
            }
          />
        );

      case 'TRANSITION':
        return (
          <GuidedSessionTransitionView
            item={currentItem}
            nextItem={nextItem}
            onContinue={() => advanceToNextStep(30)}
          />
        );

      case 'KNOWLEDGE_CHECK':
        if (knowledgeCheckLoading) {
          return (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={themeColors.accent} />
              <Text style={styles.loadingText}>Loading knowledge review...</Text>
            </View>
          );
        }
        if (!knowledgeCheckPayload) {
          return (
            <View style={styles.centerBox}>
              <Text style={styles.errorText}>
                Knowledge review temporarily unavailable.
              </Text>
              <Button
                title="Continue to Next Step"
                variant="primary"
                onPress={() => advanceToNextStep(60)}
              />
            </View>
          );
        }
        return (
          <KnowledgeCheckPlayer
            check={knowledgeCheckPayload}
            onAnswerSubmit={async (payload: any) => {
              if (knowledgeAttempt?.id) {
                const res = await ExerciseService.submitQuestionResponse(
                  knowledgeAttempt.id,
                  payload,
                );
                return {
                  isCorrect: res.isCorrect,
                  feedback: res.feedback,
                  explanation: res.explanation,
                  correctAnswers: res.correctAnswers,
                };
              }
              return { isCorrect: true };
            }}
            onCompleteCheck={async () => {
              if (knowledgeAttempt?.id) {
                await ExerciseService.completeKnowledgeAttempt(knowledgeAttempt.id, 120).catch(() => {});
              }
              await advanceToNextStep(120, { knowledgeCheckCompleted: true });
            }}
            onExit={handleExitSession}
          />
        );

      case 'COOLDOWN':
        return (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <Card style={styles.card}>
              <Badge label="COOLDOWN & RESTORATION" variant="primary" />
              <Text style={styles.itemTitle}>{currentItem.title}</Text>
              {currentItem.description ? (
                <Text style={styles.itemDescription}>{currentItem.description}</Text>
              ) : null}

              <View style={styles.coachingPointsBox}>
                <Text style={styles.coachingHeader}>Recovery Guidance</Text>
                <View style={styles.cueRow}>
                  <Icon name="check" size={14} color="#10B981" />
                  <Text style={styles.cueText}>
                    Perform 4-second inhale, 6-second exhale cadence to downregulate the nervous system.
                  </Text>
                </View>
                <View style={styles.cueRow}>
                  <Icon name="check" size={14} color="#10B981" />
                  <Text style={styles.cueText}>
                    Gentle passive stretching without forcing painful end-ranges.
                  </Text>
                </View>
              </View>

              <Button
                title="Finish Cooldown"
                variant="primary"
                leftIcon={<Icon name="award" size={16} color="#FFFFFF" />}
                onPress={() => advanceToNextStep(currentItem.durationSeconds || 120)}
                style={styles.ctaButton}
              />
            </Card>
          </ScrollView>
        );

      case 'SUMMARY':
      default:
        return (
          <GuidedSessionCompletionView
            sessionDetail={detail}
            timeSpentSeconds={totalTimeSpent}
            onReturnToDashboard={() => navigation.navigate('LearningHome')}
            onBrowseMoreSessions={() => navigation.navigate('GuidedSessions')}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GuidedSessionHeader
        title={detail.session.title}
        currentStepIndex={currentIndex}
        totalSteps={detail.items.length}
        itemTitle={currentItem.title}
        itemType={currentItem.itemType}
        onExit={handleExitSession}
      />

      <View style={styles.mainContent}>{renderItemContent()}</View>

      {/* Floating Bottom Step Controls (for non-player items) */}
      {currentItem.itemType !== 'EXERCISE_TUTORIAL' &&
        currentItem.itemType !== 'KNOWLEDGE_CHECK' &&
        currentItem.itemType !== 'INTRO' && (
          <View style={styles.navControlsBar}>
            <TouchableOpacity
              style={[
                styles.navBtn,
                currentIndex === 0 && styles.navBtnDisabled,
              ]}
              onPress={handlePreviousStep}
              disabled={currentIndex === 0}
            >
              <Icon
                name="chevron-left"
                size={18}
                color={currentIndex === 0 ? themeColors.textMuted : themeColors.textPrimary}
              />
              <Text
                style={[
                  styles.navBtnText,
                  currentIndex === 0 && styles.navBtnTextDisabled,
                ]}
              >
                Previous
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => advanceToNextStep(30)}
            >
              <Text style={styles.navBtnText}>Skip Step</Text>
              <Icon name="chevron-right" size={18} color={themeColors.textPrimary} />
            </TouchableOpacity>
          </View>
        )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: sp.lg,
    backgroundColor: themeColors.background,
  },
  loadingText: {
    ...typography.bodySmall,
    color: themeColors.textMuted,
    marginTop: sp.sm,
  },
  errorText: {
    ...typography.body,
    color: themeColors.textSecondary,
    marginBottom: sp.md,
    textAlign: 'center',
  },
  mainContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: sp.md,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.lg,
    padding: sp.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  itemTitle: {
    ...typography.h2,
    color: themeColors.textPrimary,
    marginTop: sp.sm,
    marginBottom: sp.xs,
    textAlign: 'center',
  },
  itemDescription: {
    ...typography.body,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginBottom: sp.lg,
    lineHeight: 20,
  },
  coachingPointsBox: {
    width: '100%',
    backgroundColor: '#151A26',
    borderRadius: radius.md,
    padding: sp.md,
    marginBottom: sp.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  coachingHeader: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: sp.sm,
  },
  cueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: sp.xs,
    marginBottom: 6,
  },
  cueText: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  ctaButton: {
    width: '100%',
    paddingVertical: 14,
  },
  navControlsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: sp.md,
    paddingVertical: sp.xs,
    backgroundColor: themeColors.elevatedBackground,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: sp.sm,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    ...typography.caption,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  navBtnTextDisabled: {
    color: themeColors.textMuted,
  },
});
