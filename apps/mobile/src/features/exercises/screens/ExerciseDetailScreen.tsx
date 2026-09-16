import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { MemberStackParamList } from '../../../navigation/types';
import { Screen, Card, Badge, Icon } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { ExerciseService } from '../services/exerciseService';
import { ExerciseMediaManagerModal } from '../components/ExerciseMediaManagerModal';
import { ExerciseStepPlayer } from '../components/ExerciseStepPlayer';
import { ExerciseInstructionEditorModal } from '../components/ExerciseInstructionEditorModal';
import { ExerciseMovementTimeline } from '../components/ExerciseMovementTimeline';
import { ExerciseMovementBuilderModal } from '../components/ExerciseMovementBuilderModal';
import {
  ExerciseMuscleCard,
  ExerciseEquipmentModal,
  ExerciseCompletenessScoreCard,
  ExerciseSubstituteModal,
} from '../components';
import type { Exercise } from '@fitcore/types';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
  xl: spacing[8],
  xxl: spacing[12],
};

const colors = {
  ...themeColors,
  primary: themeColors.primary,
  accent: themeColors.accent,
  textTertiary: themeColors.textMuted,
  surfaceHighlight: themeColors.surfaceElevated,
};

type TabKey = 'overview' | 'muscles' | 'movement' | 'howto' | 'media' | 'mistakes' | 'safety' | 'variations';

type RouteProps = RouteProp<MemberStackParamList, 'ExerciseDetail'>;

export const ExerciseDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { exerciseId, exerciseName: fallbackName } = route.params || {};

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [mediaModalVisible, setMediaModalVisible] = useState(false);
  const [instructionEditorVisible, setInstructionEditorVisible] = useState(false);
  const [movementBuilderVisible, setMovementBuilderVisible] = useState(false);
  const [equipmentModalVisible, setEquipmentModalVisible] = useState(false);
  const [substituteModalVisible, setSubstituteModalVisible] = useState(false);
  const [selectedPhaseForEdit, setSelectedPhaseForEdit] = useState<any>(null);

  const fetchVisualDetails = useCallback(async () => {
    if (!exerciseId) {
      setLoading(false);
      return;
    }
    try {
      const data = await ExerciseService.getExerciseVisualDetails(exerciseId);
      setExercise(data);
    } catch {
      // Fallback to basic exercise lookup if visual endpoint fails
      try {
        const fallback = await ExerciseService.getExerciseById(exerciseId);
        setExercise(fallback);
      } catch (err) {
        console.warn('Failed to load exercise details:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [exerciseId]);

  useEffect(() => {
    setLoading(true);
    fetchVisualDetails();
  }, [fetchVisualDetails]);

  const name = exercise?.name || fallbackName || 'Exercise';
  const instructionsList: string[] = exercise?.instructions
    ? exercise.instructions.split('\n').filter((s) => s.trim().length > 0)
    : [];
  const cues: string[] = Array.isArray(exercise?.coachingCues)
    ? (exercise.coachingCues as string[])
    : [];

  const instructionSteps =
    exercise?.instruction?.steps && exercise.instruction.steps.length > 0
      ? exercise.instruction.steps
      : exercise?.instructionSteps && exercise.instructionSteps.length > 0
      ? exercise.instructionSteps
      : instructionsList.map((text, idx) => ({
          id: `legacy-${idx}`,
          exerciseId: exercise?.id || exerciseId,
          stepNumber: idx + 1,
          title: `Step ${idx + 1}`,
          description: text,
          createdAt: '',
          updatedAt: '',
        } as any));
  const movementPhases = exercise?.movementPhases || [];
  const commonMistakes = exercise?.commonMistakes || [];
  const safetyGuidelines = exercise?.safetyGuidelines || [];
  const variationsFrom = exercise?.variationsFrom || [];
  const equipmentRelations = exercise?.equipmentRelations || [];
  const muscleRelations = exercise?.muscleRelations || [];
  const mediaList = exercise?.media || [];

  const navigateToExercise = (targetId: string, targetName: string) => {
    (navigation as any).push('ExerciseDetail', {
      exerciseId: targetId,
      exerciseName: targetName,
    });
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {name}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading visual exercise biomechanics...</Text>
        </View>
      ) : (
        <View style={styles.contentWrapper}>
          {/* Title & Taxonomy Badges */}
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <Text style={styles.exerciseTitle}>{name}</Text>
              {exercise?.contentStatus && (
                <Badge
                  label={exercise.contentStatus}
                  variant={exercise.contentStatus === 'PUBLISHED' ? 'accent' : 'neutral'}
                />
              )}
            </View>
            <View style={styles.badgeRow}>
              {exercise?.primaryMuscleGroup && (
                <Badge label={exercise.primaryMuscleGroup} variant="accent" />
              )}
              {exercise?.difficulty && (
                <Badge label={exercise.difficulty} variant="primary" />
              )}
              {exercise?.equipment && (
                <Badge label={exercise.equipment} variant="neutral" />
              )}
              {exercise?.movementPattern && (
                <Badge label={exercise.movementPattern} variant="neutral" />
              )}
            </View>
          </View>

          {/* Segmented Navigation Tab Bar */}
          <View style={styles.tabsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsScrollContent}
            >
              <TouchableOpacity
                onPress={() => setActiveTab('overview')}
                style={[styles.tabButton, activeTab === 'overview' && styles.tabButtonActive]}
              >
                <Text
                  style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}
                >
                  Overview
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('muscles')}
                style={[styles.tabButton, activeTab === 'muscles' && styles.tabButtonActive]}
              >
                <Text style={[styles.tabText, activeTab === 'muscles' && styles.tabTextActive]}>
                  Muscles {muscleRelations.length > 0 ? `(${muscleRelations.length})` : ''}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('movement')}
                style={[styles.tabButton, activeTab === 'movement' && styles.tabButtonActive]}
              >
                <Text style={[styles.tabText, activeTab === 'movement' && styles.tabTextActive]}>
                  Movement {movementPhases.length > 0 ? `(${movementPhases.length})` : ''}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('howto')}
                style={[styles.tabButton, activeTab === 'howto' && styles.tabButtonActive]}
              >
                <Text style={[styles.tabText, activeTab === 'howto' && styles.tabTextActive]}>
                  How-To Steps {instructionSteps.length > 0 ? `(${instructionSteps.length})` : ''}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('media')}
                style={[styles.tabButton, activeTab === 'media' && styles.tabButtonActive]}
              >
                <Text style={[styles.tabText, activeTab === 'media' && styles.tabTextActive]}>
                  Visuals {mediaList.length > 0 ? `(${mediaList.length})` : ''}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('mistakes')}
                style={[styles.tabButton, activeTab === 'mistakes' && styles.tabButtonActive]}
              >
                <Text
                  style={[styles.tabText, activeTab === 'mistakes' && styles.tabTextActive]}
                >
                  Mistakes {commonMistakes.length > 0 ? `(${commonMistakes.length})` : ''}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('safety')}
                style={[styles.tabButton, activeTab === 'safety' && styles.tabButtonActive]}
              >
                <Text style={[styles.tabText, activeTab === 'safety' && styles.tabTextActive]}>
                  Safety {safetyGuidelines.length > 0 ? `(${safetyGuidelines.length})` : ''}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('variations')}
                style={[styles.tabButton, activeTab === 'variations' && styles.tabButtonActive]}
              >
                <Text
                  style={[styles.tabText, activeTab === 'variations' && styles.tabTextActive]}
                >
                  Variations {variationsFrom.length > 0 ? `(${variationsFrom.length})` : ''}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Main Scroll Content */}
          <ScrollView
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
          >
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <>
                {/* Day 65: Quality Completeness Audit */}
                <ExerciseCompletenessScoreCard exerciseId={exercise?.id || exerciseId} />

                {/* Day 65: Quick Substitution & Equipment Action Bar */}
                <View style={styles.quickActionRow}>
                  <TouchableOpacity
                    style={styles.quickActionBtn}
                    onPress={() => setSubstituteModalVisible(true)}
                  >
                    <Icon name="refresh" size={16} color={colors.accent} />
                    <Text style={styles.quickActionBtnText}>Find Substitutes</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickActionBtn}
                    onPress={() => setEquipmentModalVisible(true)}
                  >
                    <Icon name="dumbbell" size={16} color={colors.primary} />
                    <Text style={styles.quickActionBtnText}>Equipment Setup</Text>
                  </TouchableOpacity>
                </View>

                {/* Day 65: Target Muscle Engagement Card */}
                <ExerciseMuscleCard
                  muscleRelations={muscleRelations}
                  primaryMuscleGroup={exercise?.primaryMuscleGroup}
                  onManageMuscles={() => setActiveTab('muscles')}
                  canEdit={false}
                />

                {/* Biomechanics Metric Strip */}
                <View style={styles.metricsRow}>
                  {exercise?.tempo && (
                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>TEMPO</Text>
                      <Text style={styles.metricValue}>{exercise.tempo}</Text>
                    </View>
                  )}
                  {exercise?.rangeOfMotion && (
                    <View style={[styles.metricCard, { flex: 2 }]}>
                      <Text style={styles.metricLabel}>RANGE OF MOTION</Text>
                      <Text style={styles.metricValue} numberOfLines={2}>
                        {exercise.rangeOfMotion}
                      </Text>
                    </View>
                  )}
                  {exercise?.defaultUnit && (
                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>UNIT</Text>
                      <Text style={styles.metricValue}>{exercise.defaultUnit}</Text>
                    </View>
                  )}
                </View>

                {/* Description */}
                {exercise?.description ? (
                  <Card style={styles.card}>
                    <Text style={styles.sectionHeading}>OVERVIEW</Text>
                    <Text style={styles.bodyText}>{exercise.description}</Text>
                  </Card>
                ) : null}

                {/* Movement Lifecycle Preview */}
                <Card style={styles.card}>
                  <View style={styles.rowBetween}>
                    <View style={styles.cardHeaderWithIcon}>
                      <Icon name="activity" size={16} color={colors.primary} />
                      <Text style={styles.sectionHeadingIcon}>MOVEMENT LIFECYCLE & PHASES</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.inlineActionBtn}
                      onPress={() => setActiveTab('movement')}
                    >
                      <Text style={styles.inlineActionBtnText}>Deep Dive</Text>
                      <Icon name="chevron-right" size={12} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.bodyText}>
                    {movementPhases.length > 0
                      ? `${name} is structured into ${movementPhases.length} biomechanical movement phases: ${movementPhases.map((p) => p.phaseName).join(' → ')}.`
                      : `${name} has not had its movement phases structured yet.`}
                  </Text>
                  {Boolean((exercise as any)?.tempoStructure) && (
                    <View style={styles.tempoPreviewRow}>
                      <Icon name="timer" size={12} color={colors.accent} />
                      <Text style={styles.tempoPreviewText}>
                        Tempo Blueprint: {(exercise as any).tempoStructure?.eccentricSeconds ?? 0}-
                        {(exercise as any).tempoStructure?.bottomHoldSeconds ?? 0}-
                        {(exercise as any).tempoStructure?.concentricSeconds ?? 0}-
                        {(exercise as any).tempoStructure?.topHoldSeconds ?? 0}s
                      </Text>
                    </View>
                  )}
                </Card>

                {/* Muscle Targeting */}
                <Card style={styles.card}>
                  <Text style={styles.sectionHeading}>ANATOMICAL MUSCLE GROUPS</Text>
                  <View style={styles.muscleSection}>
                    <Text style={styles.muscleSubheading}>Primary Target:</Text>
                    <View style={styles.tagWrap}>
                      <Badge label={exercise?.primaryMuscleGroup || 'Full Body'} variant="accent" />
                    </View>
                  </View>
                  {Array.isArray(exercise?.secondaryMuscleGroups) &&
                    exercise.secondaryMuscleGroups.length > 0 && (
                      <View style={styles.muscleSection}>
                        <Text style={styles.muscleSubheading}>Synergists / Secondary:</Text>
                        <View style={styles.tagWrap}>
                          {exercise.secondaryMuscleGroups.map((m, idx) => (
                            <Badge key={idx} label={String(m)} variant="primary" />
                          ))}
                        </View>
                      </View>
                    )}
                  {Array.isArray(exercise?.stabilizerMuscles) &&
                    exercise.stabilizerMuscles.length > 0 && (
                      <View style={styles.muscleSection}>
                        <Text style={styles.muscleSubheading}>Stabilizers & Core:</Text>
                        <View style={styles.tagWrap}>
                          {exercise.stabilizerMuscles.map((m, idx) => (
                            <Badge key={idx} label={String(m)} variant="neutral" />
                          ))}
                        </View>
                      </View>
                    )}
                </Card>

                {/* Equipment & Setup */}
                {(equipmentRelations.length > 0 || exercise?.equipment) && (
                  <Card style={styles.card}>
                    <Text style={styles.sectionHeading}>EQUIPMENT REQUIREMENTS</Text>
                    {equipmentRelations.length > 0 ? (
                      equipmentRelations.map((eq, idx) => (
                        <View key={idx} style={styles.equipmentRow}>
                          <View style={styles.equipmentIndicator} />
                          <View style={{ flex: 1 }}>
                            <View style={styles.rowBetween}>
                              <Text style={styles.equipmentName}>{eq.equipmentName}</Text>
                              {eq.isOptional && <Badge label="Optional" variant="neutral" />}
                            </View>
                            {eq.notes ? <Text style={styles.notesText}>{eq.notes}</Text> : null}
                          </View>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.bodyText}>{exercise?.equipment}</Text>
                    )}
                  </Card>
                )}

                {/* Breathing Guidance */}
                {exercise?.breathingInstructions && (
                  <Card style={styles.card}>
                    <View style={styles.cardHeaderWithIcon}>
                      <Icon name="sparkles" size={16} color={colors.accent} />
                      <Text style={styles.sectionHeadingIcon}>BREATHING CADENCE</Text>
                    </View>
                    <Text style={styles.bodyText}>{exercise.breathingInstructions}</Text>
                  </Card>
                )}

                {/* Coaching Tips */}
                {((Array.isArray(exercise?.educationalTips) && exercise.educationalTips.length > 0) ||
                  cues.length > 0) && (
                    <Card style={styles.cueCard}>
                      <View style={styles.cueHeader}>
                        <Icon name="award" size={16} color={colors.accent} />
                        <Text style={styles.cueHeaderTitle}>TRAINER PERFORMANCE TIPS</Text>
                      </View>
                      {(exercise?.educationalTips && exercise.educationalTips.length > 0
                        ? exercise.educationalTips
                        : cues
                      ).map((tip, index) => (
                        <View key={index} style={styles.cueItem}>
                          <Text style={styles.bulletPoint}>•</Text>
                          <Text style={styles.cueText}>{tip}</Text>
                        </View>
                      ))}
                    </Card>
                  )}
              </>
            )}

            {/* TAB: MOVEMENT INTELLIGENCE & PHASES */}
            {activeTab === 'movement' && (
              <>
                <View style={styles.mediaHeaderRow}>
                  <Text style={styles.sectionHeading}>
                    MOVEMENT BIOMECHANICS & PHASES ({movementPhases.length})
                  </Text>
                  <TouchableOpacity
                    style={styles.manageMediaBtn}
                    onPress={() => {
                      setSelectedPhaseForEdit(null);
                      setMovementBuilderVisible(true);
                    }}
                  >
                    <Icon name="bolt" size={14} color={colors.primary} />
                    <Text style={styles.manageMediaBtnText}>Movement Studio</Text>
                  </TouchableOpacity>
                </View>

                <ExerciseMovementTimeline
                  phases={movementPhases}
                  exerciseName={name}
                  tempoStructure={(exercise as any)?.tempoStructure}
                  repetitionType={(exercise as any)?.repetitionType}
                  canEdit={true}
                  onEditPhase={(phase: any) => {
                    setSelectedPhaseForEdit(phase);
                    setMovementBuilderVisible(true);
                  }}
                />
              </>
            )}

            {/* TAB 2: HOW-TO & STEPS */}
            {activeTab === 'howto' && (
              <>
                {/* Header Row with Studio Access */}
                <View style={styles.mediaHeaderRow}>
                  <Text style={styles.sectionHeading}>
                    STEP-BY-STEP LEARNING ({instructionSteps.length})
                  </Text>
                  <TouchableOpacity
                    style={styles.manageMediaBtn}
                    onPress={() => setInstructionEditorVisible(true)}
                  >
                    <Icon name="bolt" size={14} color={colors.primary} />
                    <Text style={styles.manageMediaBtnText}>Instruction Studio</Text>
                  </TouchableOpacity>
                </View>

                {/* Preparation Guide */}
                {(exercise?.instruction?.preparationGuide || exercise?.setupInstructions) && (
                  <Card style={styles.card}>
                    <View style={styles.cardHeaderWithIcon}>
                      <Icon name="dumbbell" size={16} color={colors.accent} />
                      <Text style={styles.sectionHeadingIcon}>BEFORE YOU START: PREPARATION</Text>
                    </View>
                    <Text style={styles.bodyText}>
                      {exercise?.instruction?.preparationGuide || exercise?.setupInstructions}
                    </Text>
                  </Card>
                )}

                {/* Starting Position */}
                {(exercise?.instruction?.startingPosition || exercise?.bodyPosition) && (
                  <Card style={styles.card}>
                    <View style={styles.cardHeaderWithIcon}>
                      <Icon name="activity" size={16} color={colors.primary} />
                      <Text style={styles.sectionHeadingIcon}>STARTING POSITION & STANCE</Text>
                    </View>
                    <Text style={styles.bodyText}>
                      {exercise?.instruction?.startingPosition || exercise?.bodyPosition}
                    </Text>
                  </Card>
                )}

                {/* Interactive Step-by-Step Learning Player */}
                <ExerciseStepPlayer
                  steps={instructionSteps}
                  exerciseName={name}
                />

                {/* Movement Phases & Checkpoints */}
                {movementPhases.length > 0 && (
                  <Card style={styles.card}>
                    <Text style={styles.sectionHeading}>MOVEMENT PHASES & CHECKPOINTS</Text>
                    <View style={styles.phasesList}>
                      {movementPhases.map((phase, idx) => (
                        <View key={idx} style={styles.phaseItem}>
                          <View style={styles.phaseNumberBadge}>
                            <Text style={styles.phaseNumberText}>{idx + 1}</Text>
                          </View>
                          <View style={styles.phaseDetails}>
                            <View style={styles.phaseTitleRow}>
                              <Text style={styles.phaseName}>{phase.phaseName}</Text>
                              {phase.cueText && (
                                <Text style={styles.phaseCue}>"{phase.cueText}"</Text>
                              )}
                            </View>
                            {Array.isArray(phase.keyCheckpoints) &&
                              phase.keyCheckpoints.length > 0 && (
                                <View style={styles.checkpointsList}>
                                  {phase.keyCheckpoints.map((cp, cIdx) => (
                                    <View key={cIdx} style={styles.checkpointRow}>
                                      <Icon name="check" size={12} color={colors.primary} />
                                      <Text style={styles.checkpointText}>{cp}</Text>
                                    </View>
                                  ))}
                                </View>
                              )}
                          </View>
                        </View>
                      ))}
                    </View>
                  </Card>
                )}

                {/* Breathing Cadence Summary */}
                {(exercise?.instruction?.breathingSummary || exercise?.breathingInstructions) && (
                  <Card style={styles.card}>
                    <View style={styles.cardHeaderWithIcon}>
                      <Icon name="sparkles" size={16} color={colors.accent} />
                      <Text style={styles.sectionHeadingIcon}>BREATHING CADENCE SUMMARY</Text>
                    </View>
                    <Text style={styles.bodyText}>
                      {exercise?.instruction?.breathingSummary || exercise?.breathingInstructions}
                    </Text>
                  </Card>
                )}

                {/* Safety & Contraindication Summary */}
                {(exercise?.instruction?.safetySummary || exercise?.safetyNotes) && (
                  <Card style={styles.card}>
                    <View style={styles.cardHeaderWithIcon}>
                      <Icon name="alert-circle" size={16} color="#EF4444" />
                      <Text style={[styles.sectionHeadingIcon, { color: '#EF4444' }]}>
                        SAFETY & CONTRAINDICATIONS
                      </Text>
                    </View>
                    <Text style={styles.bodyText}>
                      {exercise?.instruction?.safetySummary || exercise?.safetyNotes}
                    </Text>
                  </Card>
                )}
              </>
            )}

            {/* TAB 3: MEDIA & VISUAL ASSETS */}
            {activeTab === 'media' && (
              <>
                <View style={styles.mediaHeaderRow}>
                  <Text style={styles.sectionHeading}>
                    VISUAL ASSETS ({mediaList.length})
                  </Text>
                  <TouchableOpacity
                    style={styles.manageMediaBtn}
                    onPress={() => setMediaModalVisible(true)}
                  >
                    <Icon name="plus" size={14} color={colors.primary} />
                    <Text style={styles.manageMediaBtnText}>Manage Media</Text>
                  </TouchableOpacity>
                </View>

                {mediaList.length > 0 ? (
                  mediaList.map((m, idx) => {
                    const previewSource = m.thumbnailUrl || m.signedUrl || m.url;
                    const isImage = m.mediaType === 'IMAGE' || m.mediaType === 'THUMBNAIL';

                    return (
                      <Card key={idx} style={styles.mediaCard}>
                        <View style={styles.mediaCardHeader}>
                          <View style={styles.rowAlign}>
                            <Icon
                              name={m.mediaType === 'VIDEO' ? 'activity' : 'dumbbell'}
                              size={18}
                              color={colors.primary}
                            />
                            <Text style={styles.mediaTitle}>
                              {m.title || `${m.mediaType} Asset`}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            {m.isPrimary ? (
                              <Badge label="PRIMARY" variant="primary" />
                            ) : null}
                            <Badge
                              label={m.format3d ? `3D (${m.format3d})` : m.mediaType}
                              variant="accent"
                            />
                          </View>
                        </View>

                        {/* Purpose badge & format specs */}
                        <View style={styles.mediaSubHeader}>
                          <Badge
                            label={m.purpose ? m.purpose.replace(/_/g, ' ') : 'DEMONSTRATION'}
                            variant="neutral"
                          />
                          {m.frameRate ? (
                            <Badge label={`${m.frameRate} FPS`} variant="neutral" />
                          ) : null}
                          {m.durationSeconds ? (
                            <Badge label={`${m.durationSeconds}s`} variant="neutral" />
                          ) : null}
                        </View>

                        {m.description && (
                          <Text style={styles.mediaDesc}>{m.description}</Text>
                        )}

                        {/* Media Visual / Preview */}
                        {isImage && previewSource ? (
                          <View style={styles.mediaImageContainer}>
                            <Image
                              source={{ uri: previewSource }}
                              style={styles.mediaImage}
                              resizeMode="cover"
                            />
                          </View>
                        ) : (
                          <View style={styles.mediaPlaceholder}>
                            <Icon name="activity" size={32} color={colors.textTertiary} />
                            <Text style={styles.mediaPlaceholderText}>
                              {m.format3d
                                ? `Interactive 3D Mesh (${m.modelLod || 'Standard'} LOD)`
                                : m.mediaType === 'VIDEO'
                                ? 'High-Definition Motion Capture Video'
                                : 'Visual Asset'}
                            </Text>
                            <Text style={styles.mediaUrlText} numberOfLines={1}>
                              {m.url || m.storageKey}
                            </Text>
                          </View>
                        )}

                        {/* Accessibility Alt Text */}
                        {m.altText ? (
                          <View style={styles.altTextBox}>
                            <Icon name="alert-circle" size={12} color={colors.textTertiary} />
                            <Text style={styles.altText}>
                              Accessibility: {m.altText}
                            </Text>
                          </View>
                        ) : null}
                      </Card>
                    );
                  })
                ) : (
                  <Card style={styles.card}>
                    <View style={styles.emptyMediaBox}>
                      <Icon name="dumbbell" size={36} color={colors.accent} />
                      <Text style={styles.emptyMediaTitle}>Visual Asset Ready</Text>
                      <Text style={styles.emptyMediaDesc}>
                        This exercise is configured for video capture, photos, and 3D movement analysis.
                      </Text>
                      <TouchableOpacity
                        style={styles.emptyAttachBtn}
                        onPress={() => setMediaModalVisible(true)}
                      >
                        <Text style={styles.emptyAttachBtnText}>+ Attach First Media Asset</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                )}
              </>
            )}

            {/* TAB 4: COMMON MISTAKES */}
            {activeTab === 'mistakes' && (
              <>
                {commonMistakes.length > 0 ? (
                  commonMistakes.map((mistake, idx) => (
                    <Card key={idx} style={styles.mistakeCard}>
                      <View style={styles.mistakeHeader}>
                        <Text style={styles.mistakeTitle}>{mistake.mistake}</Text>
                        <Badge
                          label={mistake.severity}
                          variant={
                            mistake.severity === 'SEVERE'
                              ? 'danger'
                              : mistake.severity === 'MODERATE'
                              ? 'warning'
                              : 'neutral'
                          }
                        />
                      </View>
                      {mistake.consequence && (
                        <View style={styles.consequenceBox}>
                          <Text style={styles.consequenceLabel}>Why It Matters:</Text>
                          <Text style={styles.consequenceText}>{mistake.consequence}</Text>
                        </View>
                      )}
                      <View style={styles.correctionBox}>
                        <View style={styles.rowAlign}>
                          <Icon name="check-circle" size={14} color={colors.primary} />
                          <Text style={styles.correctionLabel}>How To Correct:</Text>
                        </View>
                        <Text style={styles.correctionText}>{mistake.correction}</Text>
                      </View>
                    </Card>
                  ))
                ) : (
                  <Card style={styles.card}>
                    <Text style={styles.bodyMuted}>
                      No common biomechanical errors cataloged for this movement yet.
                    </Text>
                  </Card>
                )}
              </>
            )}

            {/* TAB 5: SAFETY GUIDELINES */}
            {activeTab === 'safety' && (
              <>
                {safetyGuidelines.length > 0 ? (
                  safetyGuidelines.map((g, idx) => (
                    <Card key={idx} style={styles.safetyCard}>
                      <View style={styles.safetyHeader}>
                        <View style={styles.rowAlign}>
                          <Icon name="shield" size={18} color={colors.warning} />
                          <Text style={styles.safetyHeaderTitle}>
                            {g.title || g.category}
                          </Text>
                        </View>
                        <Badge
                          label={g.severity}
                          variant={g.severity === 'CRITICAL' ? 'danger' : 'warning'}
                        />
                      </View>
                      <Text style={styles.safetyText}>{g.description}</Text>
                      {g.reviewedBy && (
                        <Text style={styles.safetyReviewer}>Verified by: {g.reviewedBy}</Text>
                      )}
                    </Card>
                  ))
                ) : exercise?.safetyNotes ? (
                  <Card style={styles.safetyCard}>
                    <View style={styles.safetyHeader}>
                      <Icon name="alert-circle" size={16} color={colors.warning} />
                      <Text style={styles.safetyHeaderTitle}>SAFETY & FORM CHECK</Text>
                    </View>
                    <Text style={styles.safetyText}>{exercise.safetyNotes}</Text>
                  </Card>
                ) : (
                  <Card style={styles.card}>
                    <Text style={styles.bodyMuted}>Standard gym safety precautions apply.</Text>
                  </Card>
                )}
              </>
            )}

            {/* TAB 6: VARIATIONS & PROGRESSIONS */}
            {activeTab === 'variations' && (
              <>
                {variationsFrom.length > 0 ? (
                  variationsFrom.map((v, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() =>
                        v.targetExercise &&
                        navigateToExercise(v.targetExercise.id, v.targetExercise.name)
                      }
                      activeOpacity={0.7}
                    >
                      <Card style={styles.variationCard}>
                        <View style={styles.rowBetween}>
                          <View style={{ flex: 1 }}>
                            <View style={styles.rowAlign}>
                              <Badge
                                label={v.relationshipType}
                                variant={
                                  v.relationshipType === 'REGRESSION'
                                    ? 'neutral'
                                    : v.relationshipType === 'PROGRESSION'
                                    ? 'accent'
                                    : 'primary'
                                }
                              />
                              <Text style={styles.variationName}>
                                {v.targetExercise?.name || 'Related Exercise'}
                              </Text>
                            </View>
                            {v.notes && <Text style={styles.variationNotes}>{v.notes}</Text>}
                          </View>
                          <Icon name="chevron-right" size={16} color={colors.textTertiary} />
                        </View>
                      </Card>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Card style={styles.card}>
                    <Text style={styles.bodyMuted}>
                      No direct regressions or progressions mapped for this exercise.
                    </Text>
                  </Card>
                )}
              </>
            )}

            {/* TAB: MUSCLES & EQUIPMENT */}
            {activeTab === 'muscles' && (
              <>
                <ExerciseMuscleCard
                  muscleRelations={muscleRelations}
                  primaryMuscleGroup={exercise?.primaryMuscleGroup}
                  canEdit={false}
                />

                <Card style={styles.card}>
                  <View style={styles.rowBetween}>
                    <View style={styles.cardHeaderWithIcon}>
                      <Icon name="dumbbell" size={16} color={colors.primary} />
                      <Text style={styles.sectionHeadingIcon}>EQUIPMENT SPECIFICATIONS</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.inlineActionBtn}
                      onPress={() => setEquipmentModalVisible(true)}
                    >
                      <Text style={styles.inlineActionBtnText}>View & Edit</Text>
                      <Icon name="chevron-right" size={12} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.bodyText}>
                    {equipmentRelations.length > 0
                      ? `${equipmentRelations.length} structured equipment item(s) mapped with environment availability contexts.`
                      : `Default requirement: ${exercise?.equipment || 'BODYWEIGHT'}. Tap View & Edit to configure requirements and alternatives.`}
                  </Text>
                </Card>

                <Card style={styles.card}>
                  <View style={styles.rowBetween}>
                    <View style={styles.cardHeaderWithIcon}>
                      <Icon name="refresh" size={16} color={colors.accent} />
                      <Text style={styles.sectionHeadingIcon}>INTELLIGENT SUBSTITUTIONS</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.inlineActionBtn}
                      onPress={() => setSubstituteModalVisible(true)}
                    >
                      <Text style={styles.inlineActionBtnText}>Find Substitutes</Text>
                      <Icon name="chevron-right" size={12} color={colors.accent} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.bodyText}>
                    Need an alternative due to gym equipment availability or injury modification? Launch our biomechanical substitution engine.
                  </Text>
                </Card>
              </>
            )}
          </ScrollView>
        </View>
      )}

      <ExerciseMediaManagerModal
        visible={mediaModalVisible}
        exerciseId={exerciseId}
        exerciseName={name}
        onClose={() => setMediaModalVisible(false)}
        onMediaChanged={fetchVisualDetails}
      />

      <ExerciseInstructionEditorModal
        visible={instructionEditorVisible}
        exerciseId={exerciseId}
        exerciseName={name}
        onClose={() => setInstructionEditorVisible(false)}
        onSaved={fetchVisualDetails}
      />

      <ExerciseMovementBuilderModal
        visible={movementBuilderVisible}
        exerciseId={exerciseId}
        exerciseName={name}
        initialPhase={selectedPhaseForEdit}
        onClose={() => {
          setMovementBuilderVisible(false);
          setSelectedPhaseForEdit(null);
        }}
        onSaved={fetchVisualDetails}
      />

      <ExerciseEquipmentModal
        visible={equipmentModalVisible}
        exerciseId={exerciseId}
        exerciseName={name}
        equipmentRelations={equipmentRelations}
        onClose={() => setEquipmentModalVisible(false)}
        onSaved={fetchVisualDetails}
        canEdit={true}
      />

      <ExerciseSubstituteModal
        visible={substituteModalVisible}
        exerciseId={exerciseId}
        exerciseName={name}
        onClose={() => setSubstituteModalVisible(false)}
        onSelectSubstitute={(targetId, targetName) => {
          setSubstituteModalVisible(false);
          navigateToExercise(targetId, targetName);
        }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  contentWrapper: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp.lg,
    paddingVertical: sp.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: sp.sm,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: sp.xl,
  },
  loadingText: {
    ...typography.body2,
    color: colors.textSecondary,
    marginTop: sp.md,
  },
  titleSection: {
    paddingHorizontal: sp.lg,
    paddingBottom: sp.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp.xs,
  },
  exerciseTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    flex: 1,
    marginRight: sp.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.xs,
    marginTop: sp.xs,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: sp.xs,
  },
  tabsScrollContent: {
    paddingHorizontal: sp.lg,
    gap: sp.sm,
  },
  tabButton: {
    paddingHorizontal: sp.md,
    paddingVertical: sp.sm,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: colors.surfaceHighlight,
  },
  tabText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  container: {
    padding: sp.lg,
    gap: sp.md,
    paddingBottom: sp.xxl,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: sp.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: sp.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  metricValue: {
    ...typography.body2,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  card: {
    padding: sp.lg,
    backgroundColor: colors.surface,
  },
  sectionHeading: {
    ...typography.caption,
    color: colors.textTertiary,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: sp.sm,
  },
  cardHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
    marginBottom: sp.sm,
  },
  sectionHeadingIcon: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '700',
    letterSpacing: 1,
  },
  bodyText: {
    ...typography.body2,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  bodyMuted: {
    ...typography.body2,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  muscleSection: {
    marginTop: sp.xs,
    marginBottom: sp.xs,
  },
  muscleSubheading: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.xs,
  },
  equipmentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: sp.sm,
    paddingVertical: sp.xs,
  },
  equipmentIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 8,
  },
  equipmentName: {
    ...typography.body2,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  notesText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  cueCard: {
    padding: sp.lg,
    backgroundColor: 'rgba(235, 94, 40, 0.05)',
    borderColor: 'rgba(235, 94, 40, 0.2)',
  },
  cueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
    marginBottom: sp.sm,
  },
  cueHeaderTitle: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cueItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: sp.xs,
  },
  bulletPoint: {
    color: colors.accent,
    fontSize: 16,
    marginRight: sp.xs,
    lineHeight: 22,
  },
  cueText: {
    ...typography.body2,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 22,
  },
  phasesList: {
    gap: sp.md,
    marginTop: sp.xs,
  },
  phaseItem: {
    flexDirection: 'row',
    gap: sp.md,
  },
  phaseNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  phaseNumberText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  phaseDetails: {
    flex: 1,
  },
  phaseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: sp.xs,
    marginBottom: 4,
  },
  phaseName: {
    ...typography.body2,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  phaseCue: {
    ...typography.caption,
    color: colors.accent,
    fontStyle: 'italic',
  },
  checkpointsList: {
    gap: 4,
    marginTop: 4,
  },
  checkpointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
  },
  checkpointText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  stepsList: {
    gap: sp.md,
    marginTop: sp.xs,
  },
  stepItem: {
    flexDirection: 'row',
    gap: sp.md,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    ...typography.body2,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 2,
  },
  stepText: {
    ...typography.body2,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  stepCueBox: {
    marginTop: 4,
    padding: sp.xs,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 6,
  },
  stepCueText: {
    ...typography.caption,
    color: colors.accent,
    fontStyle: 'italic',
  },
  mediaCard: {
    padding: sp.md,
    backgroundColor: colors.surface,
  },
  mediaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp.sm,
    marginTop: sp.xs,
  },
  manageMediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: sp.sm + 2,
    paddingVertical: sp.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  manageMediaBtnText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  mediaSubHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: sp.xs + 2,
  },
  mediaCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp.xs,
  },
  mediaTitle: {
    ...typography.body2,
    color: colors.textPrimary,
    fontWeight: '700',
    marginLeft: sp.xs,
  },
  mediaDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: sp.sm,
  },
  mediaImageContainer: {
    height: 180,
    width: '100%',
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceHighlight,
    marginBottom: sp.xs,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaPlaceholder: {
    height: 120,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: sp.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  mediaPlaceholderText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: sp.xs,
  },
  mediaUrlText: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 10,
    marginTop: 2,
  },
  altTextBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: sp.xs,
    paddingTop: sp.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  altText: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 11,
    fontStyle: 'italic',
  },
  emptyMediaBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: sp.lg,
  },
  emptyMediaTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: sp.sm,
  },
  emptyMediaDesc: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: sp.md,
  },
  emptyAttachBtn: {
    paddingHorizontal: sp.md,
    paddingVertical: sp.xs + 4,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  emptyAttachBtnText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  mistakeCard: {
    padding: sp.md,
    backgroundColor: colors.surface,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  mistakeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp.xs,
  },
  mistakeTitle: {
    ...typography.body2,
    color: colors.textPrimary,
    fontWeight: '700',
    flex: 1,
    marginRight: sp.sm,
  },
  consequenceBox: {
    marginVertical: sp.xs,
  },
  consequenceLabel: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '700',
  },
  consequenceText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  correctionBox: {
    marginTop: sp.xs,
    padding: sp.xs,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 8,
  },
  correctionLabel: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    marginLeft: 4,
  },
  correctionText: {
    ...typography.body2,
    color: colors.textPrimary,
    marginTop: 2,
    fontSize: 13,
  },
  safetyCard: {
    padding: sp.md,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp.xs,
  },
  safetyHeaderTitle: {
    ...typography.body2,
    color: colors.warning,
    fontWeight: '700',
    marginLeft: sp.xs,
  },
  safetyText: {
    ...typography.body2,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  safetyReviewer: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: sp.xs,
    fontStyle: 'italic',
  },
  variationCard: {
    padding: sp.md,
    backgroundColor: colors.surface,
    marginBottom: sp.xs,
  },
  variationName: {
    ...typography.body2,
    color: colors.textPrimary,
    fontWeight: '700',
    marginLeft: sp.xs,
  },
  variationNotes: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineActionBtnText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  tempoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: radius.sm,
    padding: sp.sm,
    marginTop: sp.sm,
    gap: 6,
  },
  tempoPreviewText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: sp.sm,
    marginBottom: sp.xs,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: sp.sm,
    paddingHorizontal: sp.md,
  },
  quickActionBtnText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
  },
});
