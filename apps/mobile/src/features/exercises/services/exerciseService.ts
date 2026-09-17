import { apiClient } from '../../../services/api/apiClient';
import type {
  Exercise,
  ExerciseMedia,
  ExerciseInstruction,
  ExerciseInstructionStep,
  ExerciseMovementPhase,
  ExerciseDifficulty,
  ExerciseType,
  MovementPattern,
  MuscleGroup,
  EquipmentType,
} from '@fitcore/types';

export interface ExerciseQueryOptions {
  search?: string;
  muscleGroup?: MuscleGroup;
  primaryMuscle?: string;
  secondaryMuscle?: string;
  muscle?: string;
  availableEquipment?: string[];
  noEquipment?: boolean;
  trainingGoal?: string;
  exerciseCategory?: string;
  exerciseMechanics?: string;
  environment?: string;
  tag?: string;
  movementPattern?: MovementPattern;
  equipmentType?: EquipmentType;
  difficulty?: ExerciseDifficulty;
  exerciseType?: ExerciseType;
  ownership?: 'ALL' | 'SYSTEM' | 'ORGANISATION';
  includeArchived?: boolean;
  sortBy?: 'RECOMMENDED' | 'ALPHABETICAL' | 'DIFFICULTY' | 'NEWEST';
  isFavorite?: boolean;
  page?: number;
  limit?: number;
}

export interface ExerciseFilterMetadata {
  totalCount: number;
  categories: Array<{ id: string; name: string; count: number }>;
  muscleGroups: Array<{ id: string; name: string; count: number }>;
  detailedMuscles: Array<{ id: string; name: string; count: number }>;
  equipment: Array<{ id: string; name: string; count: number }>;
  difficulties: Array<{ id: string; name: string; count: number }>;
  movementPatterns: Array<{ id: string; name: string; count: number }>;
  environments: string[];
}

export interface CreateCustomExercisePayload {
  name: string;
  description?: string;
  difficulty: ExerciseDifficulty;
  exerciseType: ExerciseType;
  movementPattern: MovementPattern;
  primaryMuscleGroup: MuscleGroup;
  secondaryMuscleGroups?: MuscleGroup[];
  equipmentType: EquipmentType;
  instructions?: string[];
  coachingCues?: string[];
  safetyNotes?: string;
  defaultRestSeconds?: number;
}

export class ExerciseService {
  static async getExercises(options: ExerciseQueryOptions = {}): Promise<{
    items: (Exercise & { isFavorite?: boolean })[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const params: Record<string, any> = {};
    if (options.search) params.search = options.search;
    if (options.muscleGroup) params.muscleGroup = options.muscleGroup;
    if (options.primaryMuscle) params.primaryMuscle = options.primaryMuscle;
    if (options.secondaryMuscle) params.secondaryMuscle = options.secondaryMuscle;
    if (options.muscle) params.muscle = options.muscle;
    if (options.availableEquipment && options.availableEquipment.length > 0) {
      params.availableEquipment = options.availableEquipment.join(',');
    }
    if (options.noEquipment !== undefined) params.noEquipment = options.noEquipment;
    if (options.trainingGoal) params.trainingGoal = options.trainingGoal;
    if (options.exerciseCategory) params.exerciseCategory = options.exerciseCategory;
    if (options.exerciseMechanics) params.exerciseMechanics = options.exerciseMechanics;
    if (options.environment) params.environment = options.environment;
    if (options.tag) params.tag = options.tag;
    if (options.movementPattern) params.movementPattern = options.movementPattern;
    if (options.equipmentType) params.equipmentType = options.equipmentType;
    if (options.difficulty) params.difficulty = options.difficulty;
    if (options.exerciseType) params.exerciseType = options.exerciseType;
    if (options.ownership) params.ownership = options.ownership;
    if (options.includeArchived) params.includeArchived = options.includeArchived;
    if (options.sortBy) params.sortBy = options.sortBy;
    if (options.isFavorite !== undefined) params.isFavorite = options.isFavorite;
    if (options.page) params.page = options.page;
    if (options.limit) params.limit = options.limit;

    const res = await apiClient.get<any>('/exercises', { params });
    const payload = res.data?.data || res.data;
    return {
      items: payload.items || [],
      meta: payload.meta || { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  }

  static async getFilterMetadata(): Promise<ExerciseFilterMetadata> {
    const res = await apiClient.get<any>('/exercises/filter-metadata');
    return res.data?.data || res.data;
  }

  static async toggleFavorite(exerciseId: string): Promise<{
    exerciseId: string;
    isFavorite: boolean;
    message: string;
  }> {
    const res = await apiClient.post<any>(`/exercises/${exerciseId}/favorite`);
    return res.data?.data || res.data;
  }

  static async getFavorites(page = 1, limit = 20): Promise<{
    items: (Exercise & { isFavorite: boolean; favoritedAt?: string })[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const res = await apiClient.get<any>('/exercises/favorites', { params: { page, limit } });
    const payload = res.data?.data || res.data;
    return {
      items: payload.items || [],
      meta: payload.meta || { page: 1, limit, total: 0, totalPages: 0 },
    };
  }

  static async recordRecentView(exerciseId: string): Promise<{
    success: boolean;
    exerciseId: string;
    viewedAt: string;
  }> {
    const res = await apiClient.post<any>(`/exercises/${exerciseId}/view`);
    return res.data?.data || res.data;
  }

  static async getRecentlyViewed(limit = 10): Promise<{
    items: (Exercise & { isFavorite?: boolean; lastViewedAt?: string })[];
  }> {
    const res = await apiClient.get<any>('/exercises/recent', { params: { limit } });
    const payload = res.data?.data || res.data;
    return {
      items: payload.items || [],
    };
  }

  static async getExerciseById(id: string): Promise<Exercise> {
    const res = await apiClient.get<any>(`/exercises/${id}`);
    return res.data?.data || res.data;
  }

  static async getExerciseVisualDetails(id: string): Promise<any> {
    const res = await apiClient.get<any>(`/exercises/${id}/visual-content`);
    return res.data?.data || res.data;
  }

  static async getExerciseInstructions(id: string): Promise<{
    exerciseId: string;
    instructionSteps: any[];
    movementPhases: any[];
  }> {
    const res = await apiClient.get<any>(`/exercises/${id}/instructions`);
    return res.data?.data || res.data;
  }

  static async getExerciseMedia(id: string, query?: Record<string, any>): Promise<ExerciseMedia[]> {
    const res = await apiClient.get<any>(`/exercises/${id}/media`, { params: query });
    return res.data?.data || res.data;
  }

  static async getMediaById(mediaId: string): Promise<ExerciseMedia> {
    const res = await apiClient.get<any>(`/exercise-media/${mediaId}`);
    return res.data?.data || res.data;
  }

  static async presignMediaUpload(
    id: string,
    payload: {
      filename: string;
      mimeType: string;
      mediaType: string;
      purpose?: string;
      fileSize?: number;
      isPrimary?: boolean;
      altText?: string;
      title?: string;
    },
  ): Promise<{ uploadUrl: string; storageKey: string; expiresAt: string; publicUrl: string }> {
    const res = await apiClient.post<any>(`/exercises/${id}/media/presign-upload`, payload);
    return res.data?.data || res.data;
  }

  static async attachMedia(id: string, payload: Partial<ExerciseMedia>): Promise<ExerciseMedia> {
    const res = await apiClient.post<any>(`/exercises/${id}/media`, payload);
    return res.data?.data || res.data;
  }

  static async updateMedia(mediaId: string, payload: Partial<ExerciseMedia>): Promise<ExerciseMedia> {
    const res = await apiClient.patch<any>(`/exercise-media/${mediaId}`, payload);
    return res.data?.data || res.data;
  }

  static async deleteMedia(mediaId: string): Promise<{ success: boolean; deletedId: string }> {
    const res = await apiClient.delete<any>(`/exercise-media/${mediaId}`);
    return res.data?.data || res.data;
  }

  static async publishMedia(mediaId: string): Promise<ExerciseMedia> {
    const res = await apiClient.post<any>(`/exercise-media/${mediaId}/publish`);
    return res.data?.data || res.data;
  }

  static async archiveMedia(mediaId: string): Promise<ExerciseMedia> {
    const res = await apiClient.post<any>(`/exercise-media/${mediaId}/archive`);
    return res.data?.data || res.data;
  }

  static async getExerciseRelationships(id: string): Promise<{
    exerciseId: string;
    variations: any[];
    referencedAsVariationIn: any[];
    equipment: any[];
  }> {
    const res = await apiClient.get<any>(`/exercises/${id}/relationships`);
    return res.data?.data || res.data;
  }

  static async createCustomExercise(payload: CreateCustomExercisePayload): Promise<Exercise> {
    const res = await apiClient.post<any>('/exercises', payload);
    return res.data?.data || res.data;
  }

  static async archiveExercise(id: string): Promise<Exercise> {
    const res = await apiClient.post<any>(`/exercises/${id}/archive`);
    return res.data?.data || res.data;
  }

  // ==========================================
  // DAY 63: STEP-BY-STEP LEARNING & INSTRUCTIONS
  // ==========================================

  static async getExerciseInstructionGuide(exerciseId: string): Promise<ExerciseInstruction> {
    const res = await apiClient.get<any>(`/exercises/${exerciseId}/instruction`);
    return res.data?.data || res.data;
  }

  static async upsertExerciseInstruction(
    exerciseId: string,
    payload: Partial<ExerciseInstruction>,
  ): Promise<ExerciseInstruction> {
    const res = await apiClient.put<any>(`/exercises/${exerciseId}/instruction`, payload);
    return res.data?.data || res.data;
  }

  static async createInstructionStep(
    exerciseId: string,
    payload: Partial<ExerciseInstructionStep>,
  ): Promise<ExerciseInstructionStep> {
    const res = await apiClient.post<any>(`/exercises/${exerciseId}/instruction/steps`, payload);
    return res.data?.data || res.data;
  }

  static async updateInstructionStep(
    stepId: string,
    payload: Partial<ExerciseInstructionStep>,
  ): Promise<ExerciseInstructionStep> {
    const res = await apiClient.patch<any>(`/exercise-instruction-steps/${stepId}`, payload);
    return res.data?.data || res.data;
  }

  static async deleteInstructionStep(stepId: string): Promise<{ success: boolean; deletedStepId: string }> {
    const res = await apiClient.delete<any>(`/exercise-instruction-steps/${stepId}`);
    return res.data?.data || res.data;
  }

  static async reorderInstructionSteps(
    exerciseId: string,
    stepIds: string[],
  ): Promise<ExerciseInstructionStep[]> {
    const res = await apiClient.post<any>(`/exercises/${exerciseId}/instruction/reorder`, { stepIds });
    return res.data?.data || res.data;
  }

  static async attachStepMedia(
    stepId: string,
    payload: {
      mediaId: string;
      videoStartTimeSeconds?: number;
      videoEndTimeSeconds?: number;
    },
  ): Promise<ExerciseInstructionStep> {
    const res = await apiClient.post<any>(`/exercise-instruction-steps/${stepId}/media`, payload);
    return res.data?.data || res.data;
  }

  static async publishExerciseInstruction(exerciseId: string): Promise<ExerciseInstruction> {
    const res = await apiClient.post<any>(`/exercises/${exerciseId}/instruction/publish`);
    return res.data?.data || res.data;
  }

  // --- Day 64: Movement Steps, Phases & Exercise Movement Intelligence ---

  static async getExerciseMovementStructure(exerciseId: string): Promise<{
    exerciseId: string;
    exerciseName: string;
    ownershipType: string;
    movementPattern: string;
    secondaryMovementPatterns: string[];
    repetitionType: string;
    tempoStructure: any;
    phasesCount: number;
    phases: ExerciseMovementPhase[];
    aiMovementIntelligence: any;
  }> {
    const res = await apiClient.get<any>(`/exercises/${exerciseId}/movement`);
    return res.data?.data || res.data;
  }

  static async updateExerciseMovementStructure(
    exerciseId: string,
    payload: {
      secondaryMovementPatterns?: string[];
      repetitionType?: string;
      tempoStructure?: any;
    },
  ): Promise<any> {
    const res = await apiClient.put<any>(`/exercises/${exerciseId}/movement`, payload);
    return res.data?.data || res.data;
  }

  static async publishExerciseMovementStructure(exerciseId: string): Promise<any> {
    const res = await apiClient.post<any>(`/exercises/${exerciseId}/movement/publish`);
    return res.data?.data || res.data;
  }

  static async getExerciseMovementPhases(exerciseId: string): Promise<ExerciseMovementPhase[]> {
    const res = await apiClient.get<any>(`/exercises/${exerciseId}/movement/phases`);
    return res.data?.data || res.data;
  }

  static async getMovementPhaseById(exerciseId: string, phaseId: string): Promise<ExerciseMovementPhase> {
    const res = await apiClient.get<any>(`/exercises/${exerciseId}/movement/phases/${phaseId}`);
    return res.data?.data || res.data;
  }

  static async createMovementPhase(
    exerciseId: string,
    payload: Partial<ExerciseMovementPhase>,
  ): Promise<ExerciseMovementPhase> {
    const res = await apiClient.post<any>(`/exercises/${exerciseId}/movement/phases`, payload);
    return res.data?.data || res.data;
  }

  static async updateMovementPhase(
    exerciseId: string,
    phaseId: string,
    payload: Partial<ExerciseMovementPhase>,
  ): Promise<ExerciseMovementPhase> {
    const res = await apiClient.put<any>(`/exercises/${exerciseId}/movement/phases/${phaseId}`, payload);
    return res.data?.data || res.data;
  }

  static async deleteMovementPhase(
    exerciseId: string,
    phaseId: string,
  ): Promise<{ success: boolean; deletedPhaseId: string }> {
    const res = await apiClient.delete<any>(`/exercises/${exerciseId}/movement/phases/${phaseId}`);
    return res.data?.data || res.data;
  }

  static async reorderMovementPhases(
    exerciseId: string,
    phaseIds: string[],
  ): Promise<ExerciseMovementPhase[]> {
    const res = await apiClient.post<any>(`/exercises/${exerciseId}/movement/phases/reorder`, { phaseIds });
    return res.data?.data || res.data;
  }

  static async attachPhaseMedia(
    exerciseId: string,
    phaseId: string,
    payload: {
      mediaId: string;
      startTimeSeconds?: number;
      endTimeSeconds?: number;
    },
  ): Promise<ExerciseMovementPhase> {
    const res = await apiClient.post<any>(`/exercises/${exerciseId}/movement/phases/${phaseId}/media`, payload);
    return res.data?.data || res.data;
  }

  static async linkPhaseSteps(
    exerciseId: string,
    phaseId: string,
    stepIds: string[],
  ): Promise<ExerciseMovementPhase> {
    const res = await apiClient.post<any>(`/exercises/${exerciseId}/movement/phases/${phaseId}/steps`, { stepIds });
    return res.data?.data || res.data;
  }

  // ==========================================
  // DAY 65: METADATA, MUSCLES & EQUIPMENT
  // ==========================================

  static async getTaxonomy(query?: { type?: string; includeArchived?: boolean }): Promise<any[]> {
    const res = await apiClient.get<any>('/exercise-metadata/taxonomy', { params: query });
    return res.data?.data || res.data || [];
  }

  static async getExerciseMuscles(exerciseId: string): Promise<any> {
    const res = await apiClient.get<any>(`/exercises/${exerciseId}/muscles`);
    return res.data?.data || res.data;
  }

  static async addExerciseMuscle(exerciseId: string, payload: any): Promise<any> {
    const res = await apiClient.post<any>(`/exercises/${exerciseId}/muscles`, payload);
    return res.data?.data || res.data;
  }

  static async batchSetExerciseMuscles(exerciseId: string, muscles: any[]): Promise<any> {
    const res = await apiClient.put<any>(`/exercises/${exerciseId}/muscles`, { muscles });
    return res.data?.data || res.data;
  }

  static async removeExerciseMuscle(relationId: string): Promise<any> {
    const res = await apiClient.delete<any>(`/exercise-muscles/${relationId}`);
    return res.data?.data || res.data;
  }

  static async addExerciseEquipmentRelation(exerciseId: string, payload: any): Promise<any> {
    const res = await apiClient.post<any>(`/exercises/${exerciseId}/equipment-relations`, payload);
    return res.data?.data || res.data;
  }

  static async removeExerciseEquipmentRelation(relationId: string): Promise<any> {
    const res = await apiClient.delete<any>(`/exercise-equipment/${relationId}`);
    return res.data?.data || res.data;
  }

  static async updateExerciseClassification(exerciseId: string, payload: any): Promise<any> {
    const res = await apiClient.patch<any>(`/exercises/${exerciseId}/classification`, payload);
    return res.data?.data || res.data;
  }

  static async getExerciseCompleteness(exerciseId: string): Promise<any> {
    const res = await apiClient.get<any>(`/exercises/${exerciseId}/completeness`);
    return res.data?.data || res.data;
  }

  static async getExerciseSubstitutes(exerciseId: string, availableEquipment?: string[]): Promise<any[]> {
    const params: Record<string, any> = {};
    if (availableEquipment && availableEquipment.length > 0) {
      params.availableEquipment = availableEquipment.join(',');
    }
    const res = await apiClient.get<any>(`/exercises/${exerciseId}/substitutes`, { params });
    return res.data?.data || res.data || [];
  }

  // ==========================================
  // DAY 68: PERSONALIZATION & SMART LEARNING
  // ==========================================

  static async getPersonalizedSections(): Promise<PersonalizedDiscoveryResponse> {
    const res = await apiClient.get<any>('/exercises/personalized');
    return res.data?.data || res.data;
  }

  static async getPreferences(): Promise<MemberExercisePreference> {
    const res = await apiClient.get<any>('/exercises/preferences');
    return res.data?.data || res.data;
  }

  static async updatePreferences(payload: UpdateExercisePreferencesPayload): Promise<MemberExercisePreference> {
    const res = await apiClient.patch<any>('/exercises/preferences', payload);
    return res.data?.data || res.data;
  }

  static async resetPreferences(): Promise<MemberExercisePreference> {
    const res = await apiClient.post<any>('/exercises/preferences/reset');
    return res.data?.data || res.data;
  }

  static async getLearningProgress(exerciseId: string): Promise<any> {
    const res = await apiClient.get<any>(`/exercises/${exerciseId}/learning-progress`);
    return res.data?.data || res.data;
  }

  static async updateLearningProgress(
    exerciseId: string,
    payload: UpdateExerciseLearningProgressPayload,
  ): Promise<any> {
    const res = await apiClient.post<any>(`/exercises/${exerciseId}/learning-progress`, payload);
    return res.data?.data || res.data;
  }

  // --- Day 69: Visual Exercise Discovery & Taxonomies ---

  static async getDiscoveryOverview(): Promise<ExerciseDiscoveryOverview> {
    const res = await apiClient.get<any>('/exercise-discovery/overview');
    return res.data?.data || res.data;
  }

  static async getDiscoveryDimensionDetail(
    dimension: 'category' | 'muscle' | 'equipment' | 'movement' | 'goal' | 'difficulty',
    value: string,
  ): Promise<ExerciseDimensionDetail> {
    const res = await apiClient.get<any>(`/exercise-discovery/${dimension}/${encodeURIComponent(value)}`);
    return res.data?.data || res.data;
  }

  static async getDiscoveryMuscles(): Promise<DiscoveryMuscleItem[]> {
    const res = await apiClient.get<any>('/exercise-discovery/muscles');
    return res.data?.data || res.data;
  }

  static async getDiscoveryEquipment(): Promise<DiscoveryEquipmentItem[]> {
    const res = await apiClient.get<any>('/exercise-discovery/equipment');
    return res.data?.data || res.data;
  }

  static async getDiscoveryMovements(): Promise<DiscoveryMovementItem[]> {
    const res = await apiClient.get<any>('/exercise-discovery/movements');
    return res.data?.data || res.data;
  }

  // --- Day 70: Exercise Collections & Guided Learning Paths ---

  static async getCollections(params?: {
    category?: string;
    difficulty?: string;
    primaryMuscleGroup?: string;
    equipmentType?: string;
    featured?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: ExerciseCollectionSummary[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const res = await apiClient.get<any>('/exercise-collections', { params });
    return res.data?.data || res.data;
  }

  static async getCollectionById(idOrSlug: string): Promise<ExerciseCollectionDetail> {
    const res = await apiClient.get<any>(`/exercise-collections/${encodeURIComponent(idOrSlug)}`);
    return res.data?.data || res.data;
  }

  static async getLearningPaths(params?: {
    category?: string;
    difficulty?: string;
    primaryGoal?: string;
    featured?: boolean;
    search?: string;
    progressStatus?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: LearningPathSummary[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const res = await apiClient.get<any>('/learning-paths', { params });
    return res.data?.data || res.data;
  }

  static async getLearningPathById(idOrSlug: string): Promise<LearningPathDetail> {
    const res = await apiClient.get<any>(`/learning-paths/${encodeURIComponent(idOrSlug)}`);
    return res.data?.data || res.data;
  }

  static async getLearningLesson(pathId: string, lessonId: string): Promise<LearningPathLessonDetail> {
    const res = await apiClient.get<any>(`/learning-paths/${encodeURIComponent(pathId)}/lessons/${encodeURIComponent(lessonId)}`);
    return res.data?.data || res.data;
  }

  static async completeLearningLesson(
    pathId: string,
    lessonId: string,
    notes?: string,
  ): Promise<{
    success: boolean;
    lessonId: string;
    pathId: string;
    pathProgress: LearningPathProgress;
    nextLessonId: string | null;
  }> {
    const res = await apiClient.post<any>(
      `/learning-paths/${encodeURIComponent(pathId)}/lessons/${encodeURIComponent(lessonId)}/complete`,
      { notes },
    );
    return res.data?.data || res.data;
  }

  static async resetLearningPath(pathId: string): Promise<{
    success: boolean;
    message: string;
    pathId: string;
    status: string;
    currentLessonId: string | null;
  }> {
    const res = await apiClient.post<any>(`/learning-paths/${encodeURIComponent(pathId)}/reset`);
    return res.data?.data || res.data;
  }

  static async getRelatedCollectionsAndPaths(exerciseId: string): Promise<ExerciseRelatedCollectionsAndPaths> {
    const res = await apiClient.get<any>(`/exercise-collections/exercise/${encodeURIComponent(exerciseId)}`);
    return res.data?.data || res.data;
  }

  // --- Day 71: Member Learning Dashboard & Progress Intelligence ---

  static async getLearningDashboard(): Promise<LearningDashboardResponse> {
    const res = await apiClient.get<any>('/learning/dashboard');
    return res.data?.data || res.data;
  }

  static async getResumeLearningPosition(): Promise<ResumePosition | null> {
    const res = await apiClient.get<any>('/learning/resume');
    return res.data?.data || res.data;
  }

  static async getLearningProgressOverview(): Promise<LearningProgressOverview> {
    const res = await apiClient.get<any>('/learning/progress');
    return res.data?.data || res.data;
  }

  static async getLearningHistory(params?: { page?: number; limit?: number; type?: string }): Promise<{
    items: Array<{
      id: string;
      lessonId: string;
      lessonTitle: string;
      lessonType: string;
      estimatedMinutes: number;
      pathId: string;
      pathTitle: string;
      pathCategory?: string | null;
      exerciseId?: string | null;
      exerciseName?: string | null;
      completedAt: string;
    }>;
    pagination: { page: number; limit: number; totalCount: number; totalPages: number };
  }> {
    const res = await apiClient.get<any>('/learning/history', { params });
    return res.data?.data || res.data;
  }

  static async getExerciseLearningMastery(exerciseId: string): Promise<ExerciseLearningMasteryStatus> {
    const res = await apiClient.get<any>(`/learning/exercises/${encodeURIComponent(exerciseId)}/status`);
    return res.data?.data || res.data;
  }

  static async trackCollectionInteraction(collectionId: string): Promise<void> {
    await apiClient.post<any>(`/learning/collections/${encodeURIComponent(collectionId)}/interact`);
  }

  // --- Day 72: Interactive Fitness Education, Knowledge Checks & Assessments ---

  static async getLessonKnowledgeCheck(lessonId: string): Promise<KnowledgeCheckSummary | null> {
    const res = await apiClient.get<any>(`/learning/lessons/${encodeURIComponent(lessonId)}/knowledge-check`);
    return res.data?.data || res.data;
  }

  static async getKnowledgeCheckPlayer(checkId: string): Promise<KnowledgeCheckPlayerDto> {
    const res = await apiClient.get<any>(`/learning/checks/${encodeURIComponent(checkId)}/player`);
    return res.data?.data || res.data;
  }

  static async startKnowledgeAttempt(
    checkId: string,
    payload?: { lessonId?: string; pathId?: string },
  ): Promise<KnowledgeCheckAttemptResult> {
    const res = await apiClient.post<any>(`/learning/checks/${encodeURIComponent(checkId)}/attempt`, payload || {});
    return res.data?.data || res.data;
  }

  static async submitQuestionResponse(
    attemptId: string,
    payload: {
      questionId: string;
      selectedAnswerIds?: string[];
      orderedItemIds?: string[];
      matchingPairs?: Record<string, string>;
      hintsUsed?: boolean;
    },
  ): Promise<{
    questionId: string;
    isCorrect: boolean;
    correctCountSoFar: number;
    feedback?: string;
    explanation?: string;
    correctAnswers?: any;
  }> {
    const res = await apiClient.post<any>(
      `/learning/attempts/${encodeURIComponent(attemptId)}/response`,
      payload,
    );
    return res.data?.data || res.data;
  }

  static async completeKnowledgeAttempt(
    attemptId: string,
    timeSpentSeconds?: number,
  ): Promise<KnowledgeCheckAttemptResult> {
    const res = await apiClient.post<any>(
      `/learning/attempts/${encodeURIComponent(attemptId)}/complete`,
      { timeSpentSeconds },
    );
    return res.data?.data || res.data;
  }

  static async getAttemptReview(attemptId: string): Promise<KnowledgeAttemptReview> {
    const res = await apiClient.get<any>(`/learning/attempts/${encodeURIComponent(attemptId)}/review`);
    return res.data?.data || res.data;
  }

  // --- Day 73: Fitness Education Curriculum, Exercise Fundamentals & Academy ---

  static async getAcademyOverview(): Promise<AcademyOverview> {
    const res = await apiClient.get<any>('/learning/academy/overview');
    return res.data?.data || res.data;
  }

  static async getCurricula(options?: {
    category?: string;
    search?: string;
  }): Promise<CurriculumSummary[]> {
    const res = await apiClient.get<any>('/learning/curricula', { params: options });
    return res.data?.data || res.data || [];
  }

  static async getCurriculumById(curriculumId: string): Promise<CurriculumDetail> {
    const res = await apiClient.get<any>(`/learning/curricula/${encodeURIComponent(curriculumId)}`);
    return res.data?.data || res.data;
  }

  static async getGlossaryTerms(options?: {
    category?: string;
    search?: string;
    letter?: string;
  }): Promise<GlossaryTermItem[]> {
    const res = await apiClient.get<any>('/learning/glossary', { params: options });
    return res.data?.data || res.data || [];
  }

  static async getGlossaryTerm(termOrSlug: string): Promise<GlossaryTermItem> {
    const res = await apiClient.get<any>(`/learning/glossary/${encodeURIComponent(termOrSlug)}`);
    return res.data?.data || res.data;
  }

  // --- Day 74: Visual Anatomy, Muscle Education, Movement Mechanics & "Why This Exercise Works" ---

  static async getExerciseAnatomy(exerciseId: string): Promise<ExerciseAnatomyData> {
    const res = await apiClient.get<any>(`/exercises/${encodeURIComponent(exerciseId)}/anatomy`);
    return res.data?.data || res.data;
  }

  static async updateExerciseWhyItWorks(
    exerciseId: string,
    payload: UpdateExerciseWhyItWorksInput,
  ): Promise<any> {
    const res = await apiClient.patch<any>(
      `/exercises/${encodeURIComponent(exerciseId)}/why-it-works`,
      payload,
    );
    return res.data?.data || res.data;
  }

  static async getMusclesCatalog(): Promise<MuscleCatalogItem[]> {
    const res = await apiClient.get<any>('/muscles');
    return res.data?.data || res.data || [];
  }

  static async getMuscleDetail(muscleCode: string): Promise<MuscleDetailData> {
    const res = await apiClient.get<any>(`/muscles/${encodeURIComponent(muscleCode)}`);
    return res.data?.data || res.data;
  }

  static async getMovementsCatalog(): Promise<MovementCatalogItem[]> {
    const res = await apiClient.get<any>('/movements');
    return res.data?.data || res.data || [];
  }

  static async getMovementPatternDetail(pattern: string): Promise<MovementPatternDetailData> {
    const res = await apiClient.get<any>(`/movements/${encodeURIComponent(pattern)}`);
    return res.data?.data || res.data;
  }

  // ==========================================
  // DAY 75: INTERACTIVE EXERCISE TUTORIALS
  // ==========================================

  static async getExerciseTutorial(exerciseId: string): Promise<ExerciseTutorialResponse> {
    const res = await apiClient.get<any>(`/exercises/${encodeURIComponent(exerciseId)}/tutorial`);
    return res.data?.data || res.data;
  }

  static async getTutorialProgress(exerciseId: string): Promise<TutorialUserProgress> {
    const res = await apiClient.get<any>(`/exercises/${encodeURIComponent(exerciseId)}/tutorial/progress`);
    return res.data?.data || res.data;
  }

  static async startTutorial(
    exerciseId: string,
    payload: StartTutorialPayload = {},
  ): Promise<TutorialUserProgress> {
    const res = await apiClient.post<any>(
      `/exercises/${encodeURIComponent(exerciseId)}/tutorial/start`,
      payload,
    );
    return res.data?.data || res.data;
  }

  static async recordTutorialProgress(
    exerciseId: string,
    payload: UpdateTutorialProgressPayload,
  ): Promise<TutorialUserProgress> {
    const res = await apiClient.post<any>(
      `/exercises/${encodeURIComponent(exerciseId)}/tutorial/progress`,
      payload,
    );
    return res.data?.data || res.data;
  }

  static async completeTutorial(
    exerciseId: string,
    payload: CompleteTutorialPayload = {},
  ): Promise<TutorialUserProgress> {
    const res = await apiClient.post<any>(
      `/exercises/${encodeURIComponent(exerciseId)}/tutorial/complete`,
      payload,
    );
    return res.data?.data || res.data;
  }

  static async getRelatedTutorials(exerciseId: string): Promise<any> {
    const res = await apiClient.get<any>(
      `/exercises/${encodeURIComponent(exerciseId)}/tutorial/related`,
    );
    return res.data?.data || res.data;
  }

  static async updateTutorialConfig(
    exerciseId: string,
    payload: UpdateTutorialConfigPayload,
  ): Promise<any> {
    const res = await apiClient.patch<any>(
      `/exercises/${encodeURIComponent(exerciseId)}/tutorial`,
      payload,
    );
    return res.data?.data || res.data;
  }
}

export type ReasonCode =
  | 'GOAL_MATCH'
  | 'EQUIPMENT_MATCH'
  | 'DIFFICULTY_MATCH'
  | 'RECENT_INTEREST'
  | 'FAVORITE'
  | 'WORKOUT_HISTORY'
  | 'NEW_DISCOVERY';

export interface PersonalizedExerciseItem extends Exercise {
  isFavorite: boolean;
  reasonCode: ReasonCode;
  reasonText: string;
  learningProgress?: {
    status: string;
    completedSteps: number;
    totalSteps: number;
    lastStepNumber?: number | null;
    phasesExplored: boolean;
    completedAt?: string | null;
  };
}

export interface MemberExercisePreference {
  id?: string;
  userId: string;
  organisationId: string;
  fitnessGoals: string[];
  preferredDifficulty: string | null;
  preferredCategories: string[];
  availableEquipment: string[];
  workoutLocation: string | null;
  preferredTrainingStyles: string[];
}

export interface PersonalizedDiscoveryResponse {
  preferences: {
    fitnessGoals: string[];
    preferredDifficulty: string | null;
    preferredCategories: string[];
    availableEquipment: string[];
    workoutLocation: string | null;
  };
  forYou: PersonalizedExerciseItem[];
  continueLearning: PersonalizedExerciseItem[];
  favorites: PersonalizedExerciseItem[];
  recentlyViewed: PersonalizedExerciseItem[];
  basedOnGoals: PersonalizedExerciseItem[];
  basedOnEquipment: PersonalizedExerciseItem[];
  usedInWorkouts: PersonalizedExerciseItem[];
  exploreNew: PersonalizedExerciseItem[];
}

export interface UpdateExercisePreferencesPayload {
  fitnessGoals?: string[];
  preferredDifficulty?: string;
  preferredCategories?: string[];
  availableEquipment?: string[];
  workoutLocation?: string;
  preferredTrainingStyles?: string[];
}

export interface UpdateExerciseLearningProgressPayload {
  stepNumber?: number;
  completedSteps?: number;
  totalSteps?: number;
  mediaViewed?: boolean;
  instructionsViewed?: boolean;
  phasesExplored?: boolean;
  isComplete?: boolean;
}

// --- Day 69 Discovery Types ---

export interface DiscoveryRepresentativeExercise {
  id: string;
  name: string;
  slug: string;
  thumbnailUrl?: string;
  difficulty?: string;
}

export interface DiscoveryCategoryItem {
  code: string;
  name: string;
  count: number;
  description: string;
  representativeExercise?: DiscoveryRepresentativeExercise | null;
}

export interface DiscoveryMuscleItem {
  code: string;
  name: string;
  group: 'UPPER_BODY' | 'CORE' | 'LOWER_BODY';
  region: 'ANTERIOR' | 'POSTERIOR';
  count: number;
  primaryCount: number;
  secondaryCount: number;
  representativeExercise?: DiscoveryRepresentativeExercise | null;
}

export interface DiscoveryEquipmentItem {
  code: string;
  name: string;
  group: string;
  count: number;
  isNoEquipment: boolean;
  representativeExercise?: DiscoveryRepresentativeExercise | null;
}

export interface DiscoveryMovementItem {
  code: string;
  name: string;
  description: string;
  count: number;
  representativeExercise?: DiscoveryRepresentativeExercise | null;
}

export interface DiscoveryGoalItem {
  code: string;
  name: string;
  description: string;
  group: string;
  count: number;
}

export interface DiscoveryDifficultyItem {
  code: string;
  name: string;
  count: number;
  level: number;
}

export interface ExerciseDiscoveryOverview {
  totalExercises: number;
  categories: DiscoveryCategoryItem[];
  muscles: DiscoveryMuscleItem[];
  equipment: DiscoveryEquipmentItem[];
  movementPatterns: DiscoveryMovementItem[];
  goals: DiscoveryGoalItem[];
  difficulties: DiscoveryDifficultyItem[];
}

export interface RelatedMetadataCountItem {
  id: string;
  name: string;
  count: number;
  role?: string;
}

export interface DiscoveryPreviewExercise {
  id: string;
  name: string;
  slug: string;
  difficulty: string;
  primaryMuscleGroup: string;
  equipment: string;
  movementPattern?: string | null;
  exerciseCategory?: string | null;
  thumbnailUrl?: string;
  muscleRole?: string;
}

export interface ExerciseDimensionDetail {
  dimension: 'category' | 'muscle' | 'equipment' | 'movement' | 'goal' | 'difficulty';
  value: string;
  title: string;
  description: string;
  exerciseCount: number;
  region?: 'ANTERIOR' | 'POSTERIOR' | null;
  group?: string | null;
  isNoEquipment?: boolean;
  roles?: {
    primaryCount: number;
    secondaryCount: number;
    stabilizerCount: number;
  };
  relatedEquipment: RelatedMetadataCountItem[];
  relatedMuscles: RelatedMetadataCountItem[];
  relatedMovements: RelatedMetadataCountItem[];
  relatedCategories: RelatedMetadataCountItem[];
  difficultyDistribution: RelatedMetadataCountItem[];
  previewExercises: DiscoveryPreviewExercise[];
}

// --- Day 70: Exercise Collections & Guided Learning Paths Types ---

export interface ExerciseCollectionPreviewItem {
  id: string;
  name: string;
  slug: string;
  primaryMuscleGroup: string;
  equipment: string;
  difficulty: string;
}

export interface ExerciseCollectionSummary {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  coverMediaUrl?: string | null;
  category?: string | null;
  difficulty: string;
  primaryMuscleGroup?: string | null;
  equipmentType?: string | null;
  featured: boolean;
  exerciseCount: number;
  ownershipType: string;
  previewExercises: ExerciseCollectionPreviewItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseCollectionItemDetail {
  id: string;
  exerciseId: string;
  sectionTitle?: string | null;
  sortOrder: number;
  customTitle?: string | null;
  learningObjective?: string | null;
  notes?: string | null;
  exercise: {
    id: string;
    name: string;
    slug: string;
    difficulty: string;
    primaryMuscleGroup: string;
    secondaryMuscleGroups: string[];
    movementPattern?: string | null;
    equipment: string;
    mediaPreview?: { id: string; storageKey: string; mimeType: string; purpose: string } | null;
  };
}

export interface ExerciseCollectionDetail {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  coverMediaUrl?: string | null;
  category?: string | null;
  difficulty: string;
  primaryMuscleGroup?: string | null;
  equipmentType?: string | null;
  featured: boolean;
  contentStatus: string;
  exerciseCount: number;
  ownershipType: string;
  items: ExerciseCollectionItemDetail[];
  createdAt: string;
  updatedAt: string;
}

export interface LearningPathProgress {
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  completedLessons: number;
  totalLessons: number;
  percentComplete: number;
  currentLessonId?: string | null;
  completedAt?: string | null;
  lastInteractedAt?: string | null;
}

export interface LearningPathLessonPreview {
  id: string;
  title: string;
  lessonType: string;
  estimatedMinutes: number;
}

export interface LearningPathSummary {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  coverMediaUrl?: string | null;
  category?: string | null;
  difficulty: string;
  primaryGoal?: string | null;
  estimatedDurationMinutes: number;
  featured: boolean;
  lessonCount: number;
  exerciseCount: number;
  ownershipType: string;
  previewLessons: LearningPathLessonPreview[];
  progress: LearningPathProgress;
  createdAt: string;
  updatedAt: string;
}

export interface LearningPathLessonItem {
  id: string;
  sectionId?: string | null;
  title: string;
  description?: string | null;
  sortOrder: number;
  lessonType: string;
  exerciseId?: string | null;
  mediaUrl?: string | null;
  learningObjective?: string | null;
  keyTakeaways: string[];
  estimatedMinutes: number;
  isRequired: boolean;
  exercise?: {
    id: string;
    name: string;
    slug: string;
    difficulty: string;
    primaryMuscleGroup: string;
    equipment: string;
  } | null;
  isCompleted: boolean;
  completedAt?: string | null;
}

export interface LearningPathSectionDetail {
  id: string;
  title: string;
  description?: string | null;
  sortOrder: number;
  lessons: LearningPathLessonItem[];
}

export interface LearningPathDetail {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  coverMediaUrl?: string | null;
  category?: string | null;
  difficulty: string;
  primaryGoal?: string | null;
  estimatedDurationMinutes: number;
  featured: boolean;
  contentStatus: string;
  lessonCount: number;
  exerciseCount: number;
  ownershipType: string;
  nextLessonId?: string | null;
  progress: LearningPathProgress;
  sections: LearningPathSectionDetail[];
  lessons: LearningPathLessonItem[];
  createdAt: string;
  updatedAt: string;
}

export interface LearningPathLessonDetail {
  id: string;
  pathId: string;
  pathTitle: string;
  section?: { id: string; title: string; description?: string | null } | null;
  title: string;
  description?: string | null;
  sortOrder: number;
  lessonType: string;
  mediaUrl?: string | null;
  learningObjective?: string | null;
  content?: string | null;
  contentBlocks?: ContentBlock[] | null;
  keyTakeaways: string[];
  estimatedMinutes: number;
  isRequired: boolean;
  isCompleted: boolean;
  completedAt?: string | null;
  previousLessonId?: string | null;
  nextLessonId?: string | null;
  exercise?: {
    id: string;
    name: string;
    slug: string;
    difficulty: string;
    primaryMuscleGroup: string;
    equipment: string;
    media?: Array<{ id: string; storageKey: string; mimeType: string; purpose: string }>;
    instructionSteps?: Array<{ stepNumber: number; title: string; description: string }>;
    movementPhases?: Array<{ phaseName: string; description?: string | null; cueText?: string | null }>;
    commonMistakes?: Array<{ mistake: string; correction: string }>;
  } | null;
  position: {
    current: number;
    total: number;
  };
}

export interface ExerciseRelatedCollectionsAndPaths {
  exerciseId: string;
  exerciseName: string;
  exerciseSlug: string;
  collections: Array<{
    id: string;
    slug: string;
    title: string;
    description?: string | null;
    coverMediaUrl?: string | null;
    category?: string | null;
    difficulty: string;
    exerciseCount: number;
  }>;
  learningPaths: Array<{
    id: string;
    slug: string;
    title: string;
    description?: string | null;
    coverMediaUrl?: string | null;
    category?: string | null;
    difficulty: string;
    lessonCount: number;
    estimatedDurationMinutes: number;
    progress?: { status: string; percentComplete: number } | null;
  }>;
}

// --- Day 71: Learning Dashboard & Progress Intelligence Types ---

export interface LearningDashboardSummary {
  pathsStarted: number;
  pathsCompleted: number;
  lessonsCompleted: number;
  exercisesLearned: number;
  collectionsExplored: number;
  learningTimeMinutes: number;
  currentStreakDays: number;
  lastActivityAt?: string | null;
}

export interface ResumePosition {
  pathId: string;
  pathTitle: string;
  pathCoverUrl?: string | null;
  category?: string | null;
  difficulty: string;
  sectionId?: string | null;
  sectionTitle?: string | null;
  lessonId: string;
  lessonTitle: string;
  lessonNumber: number;
  totalLessons: number;
  percentComplete: number;
  estimatedMinutes: number;
}

export interface LearningActivityItem {
  id: string;
  type: 'PATH_STARTED' | 'LESSON_COMPLETED' | 'PATH_COMPLETED' | 'EXERCISE_LEARNED' | 'COLLECTION_STARTED' | 'COLLECTION_COMPLETED';
  title: string;
  subtitle: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface RecentlyLearnedExercise {
  exerciseId: string;
  name: string;
  primaryMuscleGroup?: string | null;
  equipment?: string | null;
  difficulty?: string | null;
  thumbnailUrl?: string | null;
  learnedAt: string;
  masteryState?: string;
}

export interface RecommendedLearningPath {
  pathId: string;
  title: string;
  coverMediaUrl?: string | null;
  category?: string | null;
  difficulty: string;
  lessonCount: number;
  estimatedMinutes: number;
  reason: string;
}

export interface ActivePathOverview {
  pathId: string;
  title: string;
  coverMediaUrl?: string | null;
  category?: string | null;
  difficulty: string;
  completedLessons: number;
  totalLessons: number;
  percentComplete: number;
  currentLessonId?: string | null;
  currentLessonTitle?: string | null;
  lastInteractedAt: string;
}

export interface LearningDashboardResponse {
  summary: LearningDashboardSummary;
  continueLearning: ResumePosition | null;
  activePaths: ActivePathOverview[];
  recentActivity: LearningActivityItem[];
  recentExercises: RecentlyLearnedExercise[];
  recommendations: RecommendedLearningPath[];
  categories: Array<{ key: string; label: string; count: number }>;
}

export interface LearningProgressOverview {
  activePaths: Array<{
    id: string;
    title: string;
    description?: string | null;
    coverMediaUrl?: string | null;
    category?: string | null;
    difficulty: string;
    completedLessons: number;
    totalLessons: number;
    percentComplete: number;
    estimatedMinutes: number;
    lastInteractedAt: string;
  }>;
  completedPaths: Array<{
    id: string;
    title: string;
    description?: string | null;
    coverMediaUrl?: string | null;
    category?: string | null;
    difficulty: string;
    completedLessons: number;
    totalLessons: number;
    completedAt?: string | null;
  }>;
  exploredCollections: Array<{
    id: string;
    title: string;
    description?: string | null;
    category?: string | null;
    difficulty: string;
    exerciseCount: number;
    status: string;
    lastInteractedAt: string;
  }>;
}

export interface ExerciseLearningMasteryStatus {
  exerciseId: string;
  status: 'DISCOVERED' | 'VIEWED' | 'IN_PROGRESS' | 'LEARNED' | 'REVIEW_RECOMMENDED';
  learnedAt?: string | null;
  lastInteractedAt?: string | null;
  instructionsCompleted: boolean;
  phasesExplored: boolean;
  mediaViewed: boolean;
  relatedLearningPath?: {
    pathId: string;
    pathTitle: string;
    lessonId: string;
    lessonTitle: string;
    lessonNumber: number;
    totalLessons: number;
    percentComplete: number;
  } | null;
}

// --- Day 72 Knowledge Check Types ---

export type KnowledgeQuestionType =
  | 'MULTIPLE_CHOICE'
  | 'MULTI_SELECT'
  | 'TRUE_FALSE'
  | 'IMAGE_CHOICE'
  | 'ORDERING'
  | 'MATCHING';

export interface KnowledgeAnswerPlayer {
  id: string;
  answerText: string;
  mediaUrl?: string | null;
  sortOrder: number;
}

export interface KnowledgeQuestionPlayer {
  id: string;
  questionText: string;
  questionType: KnowledgeQuestionType;
  difficulty?: string;
  sortOrder: number;
  hint?: string | null;
  mediaUrl?: string | null;
  mediaAltText?: string | null;
  answers: KnowledgeAnswerPlayer[];
  matchingTargets?: string[];
}

export interface KnowledgeCheckSummary {
  id: string;
  lessonId?: string | null;
  exerciseId?: string | null;
  title: string;
  description?: string | null;
  instructions?: string | null;
  passingScore: number;
  questionCount: number;
  attemptLimit?: number | null;
  timeLimitMinutes?: number | null;
  isRequiredForLesson: boolean;
  userAttemptsCount?: number;
  bestScore?: number | null;
  isPassed?: boolean;
}

export interface KnowledgeCheckPlayerDto {
  id: string;
  lessonId?: string | null;
  exerciseId?: string | null;
  title: string;
  description?: string | null;
  instructions?: string | null;
  passingScore: number;
  questionCount: number;
  attemptLimit?: number | null;
  timeLimitMinutes?: number | null;
  isRequiredForLesson: boolean;
  questions: KnowledgeQuestionPlayer[];
  existingAttempt?: {
    id: string;
    status: string;
    startedAt: string;
    answeredQuestionIds: string[];
  } | null;
}

export interface KnowledgeCheckAttemptResult {
  id: string;
  checkId: string;
  status: string;
  score: number;
  correctCount: number;
  questionCount: number;
  passed: boolean;
  passingScore: number;
  attemptNumber: number;
  timeSpentSeconds?: number | null;
  hintsUsedCount: number;
  startedAt: string;
  completedAt?: string | null;
  lessonCompleted?: boolean;
  reviewRecommendations?: Array<{
    exerciseId?: string;
    exerciseName?: string;
    reason: string;
  }>;
}

export interface KnowledgeAttemptReviewQuestion {
  questionId: string;
  questionText: string;
  questionType: KnowledgeQuestionType;
  userIsCorrect: boolean;
  userAnswers: any;
  correctAnswers: any;
  explanation?: string | null;
  correctFeedback?: string | null;
  incorrectFeedback?: string | null;
}

export interface KnowledgeAttemptReview {
  attemptId: string;
  checkTitle: string;
  score: number;
  passed: boolean;
  passingScore: number;
  questions: KnowledgeAttemptReviewQuestion[];
}

// ==========================================
// DAY 73: FITNESS EDUCATION CURRICULUM & ACADEMY TYPES
// ==========================================

export type CurriculumCategory =
  | 'FITNESS_FUNDAMENTALS'
  | 'MOVEMENT_FUNDAMENTALS'
  | 'EXERCISE_FUNDAMENTALS'
  | 'GYM_EQUIPMENT'
  | 'TRAINING_PRINCIPLES'
  | 'WARMUP_COOLDOWN'
  | 'STRENGTH_TRAINING'
  | 'CARDIO'
  | 'MOBILITY'
  | 'FLEXIBILITY'
  | 'RECOVERY'
  | 'WELLNESS';

export type ContentBlockType =
  | 'TEXT'
  | 'CALLOUT'
  | 'IMAGE'
  | 'VIDEO'
  | 'EXERCISE_REF'
  | 'MOVEMENT_REF'
  | 'GLOSSARY_REF';

export interface ContentBlock {
  id?: string;
  type: ContentBlockType;
  title?: string;
  content?: string;
  calloutType?: 'TIP' | 'SAFETY' | 'KEY_POINT' | 'DEFINITION';
  mediaUrl?: string;
  caption?: string;
  exerciseId?: string;
  exerciseName?: string;
  movementPattern?: string;
  termSlug?: string;
  termDisplay?: string;
  sortOrder?: number;
}

export interface CurriculumSummary {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  category: CurriculumCategory;
  difficulty: string;
  iconName?: string | null;
  coverMediaUrl?: string | null;
  contentStatus: string;
  pathCount: number;
  lessonCount: number;
  completedLessons?: number;
  percentComplete?: number;
}

export interface CurriculumDetail extends CurriculumSummary {
  paths: Array<{
    id: string;
    title: string;
    slug: string;
    description?: string | null;
    difficulty: string;
    coverMediaUrl?: string | null;
    category?: string | null;
    estimatedMinutes: number;
    sortOrder: number;
    sections: Array<{
      id: string;
      title: string;
      description?: string | null;
      sortOrder: number;
      lessons: Array<{
        id: string;
        title: string;
        sortOrder: number;
        lessonType: string;
        estimatedMinutes: number;
        isCompleted: boolean;
        hasKnowledgeCheck?: boolean;
      }>;
    }>;
    unsectionedLessons: Array<{
      id: string;
      title: string;
      sortOrder: number;
      lessonType: string;
      estimatedMinutes: number;
      isCompleted: boolean;
      hasKnowledgeCheck?: boolean;
    }>;
  }>;
}

export interface GlossaryTermItem {
  id: string;
  term: string;
  slug: string;
  definition: string;
  shortExplanation?: string | null;
  category?: string | null;
  difficulty?: string | null;
  relatedExerciseIds?: string[];
  relatedMovementPatterns?: string[];
  relatedLessonIds?: string[];
  mediaUrl?: string | null;
  isSystem: boolean;
  sortOrder: number;
  relatedExercises?: Array<{
    id: string;
    name: string;
    difficulty: string;
    equipment: string;
  }>;
  relatedLessons?: Array<{
    id: string;
    title: string;
    pathId: string;
    pathTitle: string;
  }>;
}

export interface AcademyOverview {
  resumePosition: any | null;
  categories: Array<{
    key: CurriculumCategory;
    label: string;
    count: number;
    icon: string;
  }>;
  curricula: CurriculumSummary[];
  glossaryHighlights: GlossaryTermItem[];
}

// ==========================================
// DAY 74: VISUAL ANATOMY, MUSCLE EDUCATION & MOVEMENT MECHANICS TYPES
// ==========================================

export type MuscleRole = 'PRIMARY' | 'SECONDARY' | 'STABILIZER';
export type AnatomicalRegion = 'ANTERIOR' | 'POSTERIOR';
export type MuscleGroupCategory = 'UPPER_BODY' | 'CORE' | 'LOWER_BODY';

export interface MuscleInvolvedItem {
  code: string;
  name: string;
  group: string;
  region: AnatomicalRegion;
  role: MuscleRole;
  roleExplanation: string;
  educationalDescription: string;
  activationLevel?: string;
  notes?: string;
}

export interface MovementMechanicsPhase {
  id: string;
  phaseName: string;
  phaseType: string;
  title?: string;
  description?: string;
  orderIndex: number;
  cueText?: string;
  bodyPosition?: string;
  jointAlignments?: any;
  rangeOfMotionType?: string;
  rangeOfMotionNotes?: string;
  breathingPattern?: string;
  breathingNotes?: string;
  tempoSeconds?: number;
  holdDurationSeconds?: number;
  visualCues?: any;
  phaseMuscles?: Array<{ muscle: string; role: string; actionType: string }>;
}

export interface WhyThisExerciseWorksData {
  overview: string;
  mechanicsExplanation: string;
  primaryDrivers: string[];
  jointAction: string;
  stabilizationFocus: string;
  benefits: string[];
  educationalDisclaimer: string;
}

export interface ExerciseAnatomyData {
  exercise: {
    id: string;
    name: string;
    slug: string;
    difficulty: string;
    movementPattern: string;
    exerciseMechanics?: string;
    bodyPosition?: string;
    laterality?: string;
    tempo?: string;
    tempoStructure?: any;
    rangeOfMotion?: string;
    breathingInstructions?: string;
    educationalTips?: string[];
    safetyNotes?: string;
  };
  musclesInvolved: {
    primary: MuscleInvolvedItem[];
    secondary: MuscleInvolvedItem[];
    stabilizers: MuscleInvolvedItem[];
    totalCount: number;
  };
  movementMechanics: {
    pattern: {
      code: string;
      name: string;
      definition: string;
      primaryJointActions: string[];
    };
    phases: MovementMechanicsPhase[];
    tempoSummary: {
      tempoString?: string;
      eccentricSeconds?: number;
      bottomHoldSeconds?: number;
      concentricSeconds?: number;
      topHoldSeconds?: number;
      tempoExplanation: string;
    };
    breathingSummary: {
      instructions?: string;
      patternType?: string;
      guidance: string;
    };
  };
  equipment: Array<{
    id: string;
    equipmentName: string;
    requirementType: string;
    equipmentCategory?: string;
    alternatives?: string[];
    notes?: string;
  }>;
  whyThisExerciseWorks: WhyThisExerciseWorksData;
  bodyMapData: {
    anteriorHighlighted: string[];
    posteriorHighlighted: string[];
    allInvolvedMuscles: Array<{
      code: string;
      label: string;
      role: MuscleRole;
      region: AnatomicalRegion;
    }>;
  };
  relatedExercises: Array<{
    id: string;
    name: string;
    slug: string;
    difficulty: string;
    primaryMuscleGroup: string;
    movementPattern: string;
    mediaUrl?: string;
  }>;
  relatedLearning: Array<{
    id: string;
    title: string;
    type: 'CURRICULUM' | 'LEARNING_PATH' | 'LESSON';
    pathId?: string;
    lessonId?: string;
  }>;
  knowledgeChecks: Array<{
    id: string;
    title: string;
    questionCount: number;
  }>;
}

export interface MuscleCatalogItem {
  code: string;
  name: string;
  group: MuscleGroupCategory;
  region: AnatomicalRegion;
  exerciseCount: number;
  educationalSummary: string;
}

export interface MuscleDetailData {
  code: string;
  name: string;
  group: MuscleGroupCategory;
  region: AnatomicalRegion;
  educationalDescription: string;
  primaryActions: string[];
  synergistMuscles: string[];
  exercises: {
    primary: Array<{
      id: string;
      name: string;
      difficulty: string;
      movementPattern: string;
      equipment: string;
    }>;
    secondary: Array<{
      id: string;
      name: string;
      difficulty: string;
      movementPattern: string;
      equipment: string;
    }>;
  };
  relatedLessons: Array<{
    id: string;
    title: string;
    learningPathTitle: string;
    learningPathId: string;
  }>;
}

export interface MovementCatalogItem {
  code: string;
  name: string;
  definition: string;
  exerciseCount: number;
}

export interface MovementPatternDetailData {
  code: string;
  name: string;
  definition: string;
  description: string;
  primaryJointActions: string[];
  commonBodyPositions: string[];
  exercises: Array<{
    id: string;
    name: string;
    difficulty: string;
    primaryMuscleGroup: string;
    equipment: string;
  }>;
  relatedCurricula: Array<{
    id: string;
    title: string;
    category: string;
  }>;
}

export interface UpdateExerciseWhyItWorksInput {
  overview?: string;
  mechanicsExplanation?: string;
  primaryDrivers?: string[];
  jointAction?: string;
  stabilizationFocus?: string;
  benefits?: string[];
}

// ==========================================
// DAY 75: INTERACTIVE EXERCISE TUTORIAL TYPES
// ==========================================

export type TutorialMode =
  | 'QUICK_LEARN'
  | 'STEP_BY_STEP'
  | 'MOVEMENT_BREAKDOWN'
  | 'TECHNIQUE_CHECKLIST';

export type TutorialProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type TutorialSection =
  | 'OVERVIEW'
  | 'DEMONSTRATION'
  | 'COACHING'
  | 'BREAKDOWN'
  | 'PRACTICE'
  | 'KNOWLEDGE_CHECK'
  | 'COMPLETE';

export interface TutorialConfig {
  checklist: string[];
  audioGuidanceUrl?: string | null;
  audioGuidanceTranscript?: string | null;
  defaultMode: TutorialMode;
  estimatedMinutes: number;
  keyTechniquePoints: string[];
}

export interface TutorialDemonstration {
  id: string;
  mediaType: string;
  url: string;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  isPrimary: boolean;
  purpose: string;
  altText?: string | null;
}

export interface TutorialPhase {
  id: string;
  orderIndex: number;
  phaseName: string;
  phaseType: string;
  title?: string | null;
  description?: string | null;
  cueText?: string | null;
  bodyPosition?: string | null;
  bodyOrientation?: string | null;
  jointAlignments?: any;
  rangeOfMotionType?: string | null;
  breathingPattern?: string | null;
  breathingNotes?: string | null;
  tempoSeconds?: number | null;
  visualCues?: any;
  commonMistakes?: any;
  safetyNotes?: string | null;
  phaseMuscles?: any;
  videoStartTimeSeconds?: number | null;
  videoEndTimeSeconds?: number | null;
}

export interface TutorialStep {
  id: string;
  stepNumber: number;
  stepType: string;
  phase?: string | null;
  movementPhase?: string | null;
  title: string;
  description: string;
  detailedInstruction?: string | null;
  coachingCue?: string | null;
  bodyPosition?: string | null;
  breathing?: string | null;
  tempo?: string | null;
  visualCue?: string | null;
  visualCueCategory?: string | null;
  videoStartTimeSeconds?: number | null;
  videoEndTimeSeconds?: number | null;
}

export interface TechniqueCoachingDetails {
  setup: string[];
  position: {
    feet?: string;
    hands?: string;
    spine?: string;
    head?: string;
    core?: string;
  };
  movement: {
    direction?: string;
    movementPattern?: string;
    phase?: string;
    rangeOfMotion?: string;
  };
  breathing: {
    pattern?: string;
    cues?: string[];
  };
  tempo: {
    value?: string;
    explanation?: string;
  };
}

export interface TutorialCommonMistake {
  id: string;
  mistake: string;
  consequence?: string | null;
  correction: string;
  severity: string;
  mediaUrl?: string | null;
}

export interface TutorialSafetyGuideline {
  id: string;
  category: string;
  title?: string | null;
  description: string;
  severity: string;
}

export interface TutorialEquipment {
  required: string[];
  optional: string[];
  alternatives: Array<{ from: string; to: string; notes?: string }>;
}

export interface TutorialMuscles {
  primary: string[];
  secondary: string[];
  stabilizers: string[];
}

export interface TutorialVariations {
  progressions: any[];
  regressions: any[];
  alternatives: any[];
}

export interface TutorialUserProgress {
  status: TutorialProgressStatus;
  currentMode: TutorialMode;
  currentPhaseIndex: number;
  currentStepIndex: number;
  completedSections: string[];
  checklistState: Record<string, boolean>;
  practiceCompleted: boolean;
  practiceCompletedAt?: string | null;
  timeSpentSeconds: number;
  knowledgeCheckCompleted: boolean;
  knowledgeCheckScore?: number | null;
  lastInteractedAt: string;
  completedAt?: string | null;
}

export interface TutorialKnowledgeCheck {
  id: string;
  title: string;
  passingScore: number;
  questionCount: number;
}

export interface TutorialRelatedLearning {
  movementPattern: string;
  primaryMuscle: string;
  relatedExercises: Array<{
    id: string;
    name: string;
    slug: string;
    difficulty: string;
    equipment: string;
  }>;
  learningPaths: Array<{
    id: string;
    title: string;
    slug: string;
    category: string;
  }>;
}

export interface ExerciseTutorialResponse {
  exercise: {
    id: string;
    name: string;
    slug: string;
    difficulty: string;
    equipment: string;
    movementPattern: string;
    primaryMuscleGroup: string;
    secondaryMuscleGroups?: string[];
    description?: string | null;
    setupInstructions?: string | null;
    executionInstructions?: string | null;
    safetyNotes?: string | null;
    tempo?: string | null;
    breathingInstructions?: string | null;
    rangeOfMotion?: string | null;
  };
  tutorialConfig: TutorialConfig;
  demonstrations: TutorialDemonstration[];
  phases: TutorialPhase[];
  steps: TutorialStep[];
  coaching: TechniqueCoachingDetails;
  commonMistakes: TutorialCommonMistake[];
  safetyGuidelines: TutorialSafetyGuideline[];
  equipment: TutorialEquipment;
  muscles: TutorialMuscles;
  variations: TutorialVariations;
  whyItWorks: any;
  knowledgeCheck?: TutorialKnowledgeCheck | null;
  userProgress?: TutorialUserProgress | null;
  relatedLearning: TutorialRelatedLearning;
}

export interface StartTutorialPayload {
  mode?: TutorialMode;
}

export interface UpdateTutorialProgressPayload {
  mode?: TutorialMode;
  phaseIndex?: number;
  stepIndex?: number;
  section?: TutorialSection;
  checklistState?: Record<string, boolean>;
  practiceCompleted?: boolean;
  timeSpentSeconds?: number;
}

export interface CompleteTutorialPayload {
  timeSpentSeconds?: number;
  knowledgeCheckScore?: number;
}

export interface UpdateTutorialConfigPayload {
  checklist?: string[];
  audioGuidanceUrl?: string;
  audioGuidanceTranscript?: string;
  defaultMode?: TutorialMode;
  estimatedMinutes?: number;
  keyTechniquePoints?: string[];
}
