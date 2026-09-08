import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { AIOrchestratorService } from '../../../orchestrator/ai-orchestrator.service';
import { NutritionContextBuilder } from '../nutrition-context/nutrition-context.builder';
import { NutritionSafetyService } from '../safety/nutrition-safety.service';
import {
  NUTRITION_COACH_RESPONSE_SCHEMA,
  PARSED_FOOD_LOG_PROPOSAL_SCHEMA,
} from '../schemas/nutrition-response.schema';
import { AIAuditService } from '../../../services/ai-audit.service';
import { AuthenticatedUser } from '../../../../common/interfaces/request-with-user.interface';
import {
  CreateNutritionConversationDto,
  AskNutritionDto,
  UpdateNutritionCoachProfileDto,
  NutritionConversationQueryDto,
  ParseFoodLogDto,
} from '../dto/ask-nutrition.dto';
import { SubmitNutritionFeedbackDto } from '../dto/nutrition-feedback.dto';
import {
  NUTRITION_COACH_FEATURE,
  NUTRITION_COACH_PROMPT_KEY,
  CONVERSATION_SUMMARY_INTERVAL_TURNS,
} from '../nutrition-coach.constants';
import type {
  NutritionCoachResponse,
  ParsedFoodLogProposal,
  AINutritionCoachProfileDto,
  AINutritionCoachConversationDto,
} from '@fitcore/types';

@Injectable()
export class NutritionCoachService {
  private readonly logger = new Logger(NutritionCoachService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: AIOrchestratorService,
    private readonly contextBuilder: NutritionContextBuilder,
    private readonly safetyService: NutritionSafetyService,
    private readonly auditService: AIAuditService,
  ) {}

  /**
   * Retrieves or initializes member coaching preferences for AI Nutrition Coach.
   */
  async getOrCreateProfile(memberId: string, organisationId: string): Promise<AINutritionCoachProfileDto> {
    const existing = await this.prisma.aINutritionCoachProfile.findUnique({
      where: { memberId },
    });

    if (existing) {
      return {
        id: existing.id,
        organisationId: existing.organisationId,
        memberId: existing.memberId,
        coachingStyle: existing.coachingStyle as any,
        responseLength: existing.responseLength as any,
        language: existing.language,
        unitPreference: existing.unitPreference as any,
        enabled: existing.enabled,
        createdAt: existing.createdAt.toISOString(),
        updatedAt: existing.updatedAt.toISOString(),
      };
    }

    const created = await this.prisma.aINutritionCoachProfile.create({
      data: {
        organisationId,
        memberId,
        coachingStyle: 'SUPPORTIVE',
        responseLength: 'BALANCED',
        language: 'en',
        unitPreference: 'METRIC',
        enabled: true,
      },
    });

    return {
      id: created.id,
      organisationId: created.organisationId,
      memberId: created.memberId,
      coachingStyle: created.coachingStyle as any,
      responseLength: created.responseLength as any,
      language: created.language,
      unitPreference: created.unitPreference as any,
      enabled: created.enabled,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  /**
   * Updates coaching preferences for a member.
   */
  async updateProfile(
    memberId: string,
    organisationId: string,
    dto: UpdateNutritionCoachProfileDto,
  ): Promise<AINutritionCoachProfileDto> {
    const profile = await this.getOrCreateProfile(memberId, organisationId);

    const updated = await this.prisma.aINutritionCoachProfile.update({
      where: { memberId },
      data: {
        coachingStyle: dto.coachingStyle ?? profile.coachingStyle,
        responseLength: dto.responseLength ?? profile.responseLength,
        language: dto.language ?? profile.language,
        unitPreference: dto.unitPreference ?? profile.unitPreference,
        enabled: dto.enabled ?? profile.enabled,
      },
    });

    return {
      id: updated.id,
      organisationId: updated.organisationId,
      memberId: updated.memberId,
      coachingStyle: updated.coachingStyle as any,
      responseLength: updated.responseLength as any,
      language: updated.language,
      unitPreference: updated.unitPreference as any,
      enabled: updated.enabled,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Creates a new coaching conversation for the authenticated member.
   */
  async createConversation(
    memberId: string,
    organisationId: string,
    dto: CreateNutritionConversationDto,
  ): Promise<AINutritionCoachConversationDto> {
    await this.assertMemberConsent(memberId);

    const conversation = await this.prisma.aINutritionCoachConversation.create({
      data: {
        organisationId,
        memberId,
        title: dto.title || 'Nutrition Coaching Session',
        status: 'ACTIVE',
      },
    });

    return {
      id: conversation.id,
      organisationId: conversation.organisationId,
      memberId: conversation.memberId,
      title: conversation.title,
      status: conversation.status as any,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }

  /**
   * Lists conversations for the authenticated member.
   */
  async listConversations(
    memberId: string,
    organisationId: string,
    query: NutritionConversationQueryDto,
  ): Promise<{ data: AINutritionCoachConversationDto[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      memberId,
      organisationId,
      status: query.status || { not: 'DELETED' },
    };

    const [conversations, total] = await Promise.all([
      this.prisma.aINutritionCoachConversation.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.aINutritionCoachConversation.count({ where }),
    ]);

    return {
      data: conversations.map((c) => ({
        id: c.id,
        organisationId: c.organisationId,
        memberId: c.memberId,
        title: c.title,
        status: c.status as any,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      total,
    };
  }

  /**
   * Retrieves conversation by ID with messages, enforcing ownership & multi-tenant isolation.
   */
  async getConversation(
    conversationId: string,
    memberId: string,
    organisationId: string,
  ): Promise<AINutritionCoachConversationDto> {
    const conversation = await this.prisma.aINutritionCoachConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
    });

    if (!conversation || conversation.status === 'DELETED') {
      throw new NotFoundException(`Conversation '${conversationId}' not found`);
    }

    if (conversation.memberId !== memberId || conversation.organisationId !== organisationId) {
      throw new ForbiddenException('Access to this conversation is denied');
    }

    return {
      id: conversation.id,
      organisationId: conversation.organisationId,
      memberId: conversation.memberId,
      title: conversation.title,
      status: conversation.status as any,
      messages: conversation.messages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        role: m.role as any,
        content: m.content,
        structuredOutput: m.structuredOutput as any,
        tokens: m.tokens,
        latencyMs: m.latencyMs,
        status: m.status as any,
        createdAt: m.createdAt.toISOString(),
      })),
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }

  /**
   * Soft-deletes a conversation.
   */
  async deleteConversation(
    conversationId: string,
    memberId: string,
    organisationId: string,
  ): Promise<{ success: boolean }> {
    const conversation = await this.prisma.aINutritionCoachConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation '${conversationId}' not found`);
    }

    if (conversation.memberId !== memberId || conversation.organisationId !== organisationId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.aINutritionCoachConversation.update({
      where: { id: conversationId },
      data: { status: 'DELETED' },
    });

    return { success: true };
  }

  /**
   * Dispatches a message to the AI Nutrition Coach through the Day 19 Gateway.
   */
  async sendMessage(
    conversationId: string,
    memberId: string,
    organisationId: string,
    user: AuthenticatedUser,
    dto: AskNutritionDto,
  ): Promise<{
    userMessageId: string;
    assistantMessageId: string;
    response: NutritionCoachResponse;
  }> {
    // 1. Verify Conversation & Ownership
    const conversation = await this.prisma.aINutritionCoachConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.status === 'DELETED') {
      throw new NotFoundException(`Conversation '${conversationId}' not found`);
    }

    if (conversation.memberId !== memberId || conversation.organisationId !== organisationId) {
      throw new ForbiddenException('Access to this conversation is denied');
    }

    // 2. Consent Verification
    await this.assertMemberConsent(memberId);

    // 3. Persist User Message
    const userMsg = await this.prisma.aINutritionCoachMessage.create({
      data: {
        conversationId,
        role: 'USER',
        content: dto.content,
        status: 'COMPLETED',
      },
    });

    // 4. Pre-execution Safety Evaluation
    const safetyCheck = await this.safetyService.evaluateInput(
      dto.content,
      organisationId,
      memberId,
      conversationId,
    );

    if (!safetyCheck.isSafeToProceed && safetyCheck.safeResponse) {
      const assistantMsg = await this.prisma.aINutritionCoachMessage.create({
        data: {
          conversationId,
          role: 'ASSISTANT',
          content: safetyCheck.safeResponse.answer,
          structuredOutput: safetyCheck.safeResponse as any,
          status: 'COMPLETED',
        },
      });

      await this.auditService.recordAuditEvent({
        organisationId,
        userId: user.id,
        feature: NUTRITION_COACH_FEATURE,
        eventType: 'NUTRITION_COACH_SAFETY_ESCALATION',
        result: 'BLOCKED',
        metadata: {
          category: safetyCheck.category,
          severity: safetyCheck.severity,
          triggerPhrase: safetyCheck.triggerPhrase,
          conversationId,
        },
      });

      return {
        userMessageId: userMsg.id,
        assistantMessageId: assistantMsg.id,
        response: safetyCheck.safeResponse,
      };
    }

    // 5. Gather Member Coaching Profile
    const coachProfile = await this.getOrCreateProfile(memberId, organisationId);

    // 6. Build Authorized Nutrition Context
    const nutritionContext = await this.contextBuilder.buildContext(
      memberId,
      organisationId,
      coachProfile,
      user,
      { includeTrainingContext: !!dto.includeTrainingContext },
    );

    // 7. Context Window & Conversation Summary
    const conversationSummary = await this.prisma.aINutritionConversationSummary.findFirst({
      where: { conversationId },
      orderBy: { generatedAt: 'desc' },
    });

    // 8. Execute via Centralized AI Orchestrator
    const requestedSources = [
      'MEMBER_PROFILE',
      'NUTRITION',
      ...(dto.includeTrainingContext ? ['TRAINING'] : []),
    ] as any[];

    const fullPrompt = [
      dto.content,
      '',
      '### MEMBER NUTRITION CONTEXT ###',
      JSON.stringify(nutritionContext),
      conversationSummary ? `\n### PREVIOUS CONVERSATION SUMMARY ###\n${conversationSummary.summary}` : '',
    ].join('\n');

    const executionResult = await this.orchestrator.execute({
      feature: NUTRITION_COACH_FEATURE,
      prompt: fullPrompt,
      organisationId,
      outletId: user.primaryOutletId || user.roles?.[0]?.outletId,
      user,
      memberId,
      promptKey: NUTRITION_COACH_PROMPT_KEY,
      responseFormat: 'json',
      expectedSchema: NUTRITION_COACH_RESPONSE_SCHEMA,
      requestedSources,
    });

    let parsedResponse: NutritionCoachResponse =
      executionResult.structuredOutput || {
        answer: executionResult.content,
        responseType: 'EXPLANATION',
        confidence: 'HIGH',
        requiresProfessionalReview: false,
        warnings: ['FitCore AI is for nutritional guidance only.'],
      };

    // 9. Post-execution Allergen Safety Check
    parsedResponse = await this.safetyService.evaluateOutput(
      parsedResponse,
      nutritionContext.profile.allergies,
      organisationId,
      memberId,
      conversationId,
    );

    // 10. Persist Assistant Message
    const assistantMsg = await this.prisma.aINutritionCoachMessage.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        content: parsedResponse.answer,
        structuredOutput: parsedResponse as any,
        tokens: executionResult.tokens.totalTokens,
        latencyMs: executionResult.latencyMs,
        status: 'COMPLETED',
      },
    });

    // Auto-update conversation title if first turn
    const totalMessages = await this.prisma.aINutritionCoachMessage.count({ where: { conversationId } });
    if (totalMessages <= 2 && dto.content.length > 5) {
      const suggestedTitle = dto.content.slice(0, 40) + (dto.content.length > 40 ? '...' : '');
      await this.prisma.aINutritionCoachConversation.update({
        where: { id: conversationId },
        data: { title: suggestedTitle, updatedAt: new Date() },
      });
    } else {
      await this.prisma.aINutritionCoachConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
    }

    // 11. Rolling Conversation Summarization Check
    if (totalMessages > 0 && totalMessages % CONVERSATION_SUMMARY_INTERVAL_TURNS === 0) {
      await this.createConversationSummary(conversationId, executionResult.model);
    }

    return {
      userMessageId: userMsg.id,
      assistantMessageId: assistantMsg.id,
      response: parsedResponse,
    };
  }

  /**
   * Natural Language Food Log Parsing.
   * Converts informal meal descriptions (e.g. "two eggs and a banana") into a proposed structured log.
   * Requires explicit user confirmation before writing to domain food log.
   */
  async parseFoodLog(
    dto: ParseFoodLogDto,
    memberId: string,
    organisationId: string,
    user: AuthenticatedUser,
  ): Promise<ParsedFoodLogProposal> {
    await this.assertMemberConsent(memberId);

    const promptText = [
      `Parse the following food consumption into structured food items with estimated calories and macros:`,
      `"${dto.text}"`,
      dto.mealType ? `Meal Type: ${dto.mealType}` : '',
      `Output must strictly conform to the ParsedFoodLogProposal schema with requiresConfirmation: true.`,
    ].join('\n');

    const executionResult = await this.orchestrator.execute({
      feature: NUTRITION_COACH_FEATURE,
      prompt: promptText,
      organisationId,
      user,
      memberId,
      responseFormat: 'json',
      expectedSchema: PARSED_FOOD_LOG_PROPOSAL_SCHEMA,
      requestedSources: ['NUTRITION'],
    });

    const proposal: ParsedFoodLogProposal = executionResult.structuredOutput || {
      mealType: dto.mealType || 'SNACK',
      consumedAt: dto.consumedAt || new Date().toISOString(),
      items: [
        {
          foodName: dto.text,
          quantity: 1,
          unit: 'serving',
          mealType: dto.mealType || 'SNACK',
          calories: 250,
          protein: 10,
          carbohydrates: 30,
          fat: 8,
          confidence: 0.7,
        },
      ],
      totalCalories: 250,
      totalProtein: 10,
      totalCarbohydrates: 30,
      totalFat: 8,
      requiresConfirmation: true,
    };

    await this.auditService.recordAuditEvent({
      organisationId,
      userId: user.id,
      feature: NUTRITION_COACH_FEATURE,
      eventType: 'AI_FOOD_LOG_PROPOSAL_CREATED',
      result: 'SUCCESS',
      metadata: {
        itemCount: proposal.items.length,
        totalCalories: proposal.totalCalories,
      },
    });

    return proposal;
  }

  /**
   * Retrieves today's nutrition summary with AI-assisted neutral, supportive interpretation.
   */
  async getTodaySummary(
    memberId: string,
    organisationId: string,
    user: AuthenticatedUser,
  ): Promise<{
    date: string;
    summary: Record<string, any>;
    insights: string[];
    adherenceMessage: string;
  }> {
    const coachProfile = await this.getOrCreateProfile(memberId, organisationId);
    const context = await this.contextBuilder.buildContext(memberId, organisationId, coachProfile, user);

    const s = context.dailySummary;
    const t = context.targets;

    const insights: string[] = [];
    if (s.totalCalories === 0) {
      insights.push('No food logs have been recorded for today yet.');
    } else {
      insights.push(`Consumed ${s.totalCalories} kcal (${s.calorieAdherencePct}% of daily target).`);
      insights.push(`Protein intake: ${s.totalProtein}g (${s.proteinAdherencePct}% of target).`);
    }

    if (s.totalWaterMl > 0) {
      insights.push(`Hydration: ${(s.totalWaterMl / 1000).toFixed(1)}L logged.`);
    }

    let adherenceMessage = 'You are building healthy, sustainable nutrition habits.';
    if (s.calorieAdherencePct >= 90 && s.calorieAdherencePct <= 110) {
      adherenceMessage = 'Your calorie intake is well aligned with your daily goal.';
    } else if (s.calorieAdherencePct < 70 && s.totalCalories > 0) {
      adherenceMessage = 'You have remaining calories and protein available for your upcoming meals.';
    }

    return {
      date: s.date,
      summary: {
        calories: { consumed: s.totalCalories, target: t.dailyCalories ?? 2000, adherencePct: s.calorieAdherencePct },
        protein: { consumed: s.totalProtein, target: t.proteinGrams ?? 150, adherencePct: s.proteinAdherencePct },
        carbohydrates: { consumed: s.totalCarbohydrates, target: t.carbohydrateGrams ?? 200, adherencePct: s.carbAdherencePct },
        fat: { consumed: s.totalFat, target: t.fatGrams ?? 65, adherencePct: s.fatAdherencePct },
        water: { consumed: s.totalWaterMl, target: t.waterMl ?? 2500, adherencePct: s.waterAdherencePct },
      },
      insights,
      adherenceMessage,
    };
  }

  /**
   * Trainer preview of assigned member's nutrition adherence and discussion topics.
   * Strictly enforces TrainerClientAssignment scoping.
   */
  async getTrainerPreview(
    memberProfileId: string,
    trainerUserId: string,
    organisationId: string,
  ): Promise<{
    memberProfileId: string;
    targets: any;
    todaySummary: any;
    assignedMealPlan: any;
    allergies: string[];
    discussionTopics: string[];
  }> {
    // 1. Verify Trainer Assignment
    const trainerProfile = await this.prisma.trainerProfile.findFirst({
      where: { staffProfile: { userId: trainerUserId }, organisationId },
    });

    if (!trainerProfile) {
      throw new ForbiddenException('Trainer profile not found in this organisation');
    }

    const assignment = await this.prisma.trainerClientAssignment.findFirst({
      where: {
        trainerProfileId: trainerProfile.id,
        memberProfileId,
        status: 'ACTIVE',
      },
    });

    if (!assignment) {
      throw new ForbiddenException({
        code: 'TRAINER_UNASSIGNED_CLIENT',
        message: 'Trainer does not have an active client assignment for this member',
      });
    }

    // 2. Fetch member nutrition overview
    const dummyActor: any = { id: trainerUserId, isSuperAdmin: true, roles: [{ role: 'TRAINER' }] };
    const coachProfile = await this.getOrCreateProfile(memberProfileId, organisationId);
    const context = await this.contextBuilder.buildContext(memberProfileId, organisationId, coachProfile, dummyActor);

    const discussionTopics = [
      `Review protein adherence (${context.dailySummary.totalProtein}g consumed against ${context.targets.proteinGrams ?? 150}g target).`,
      context.profile.allergies.length > 0
        ? `Ensure meal plan strictly excludes allergens: ${context.profile.allergies.join(', ')}.`
        : 'Verify overall dietary variety.',
      context.mealPlan.hasAssignedMealPlan
        ? `Current assigned meal plan: ${context.mealPlan.planName}.`
        : 'Consider configuring a structured meal plan.',
    ];

    return {
      memberProfileId,
      targets: context.targets,
      todaySummary: context.dailySummary,
      assignedMealPlan: context.mealPlan,
      allergies: context.profile.allergies,
      discussionTopics,
    };
  }

  /**
   * Submits member feedback for an assistant message.
   */
  async submitFeedback(
    dto: SubmitNutritionFeedbackDto,
    user: AuthenticatedUser,
    organisationId: string,
  ): Promise<{ success: boolean; feedbackId: string }> {
    const message = await this.prisma.aINutritionCoachMessage.findUnique({
      where: { id: dto.messageId },
      include: { conversation: true },
    });

    if (!message) {
      throw new NotFoundException(`Message '${dto.messageId}' not found`);
    }

    if (message.conversation.organisationId !== organisationId) {
      throw new ForbiddenException('Access denied');
    }

    let aiResponse = await this.prisma.aIResponse.findFirst({
      where: {
        aiRequest: {
          memberId: message.conversation.memberId,
          feature: NUTRITION_COACH_FEATURE,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!aiResponse) {
      aiResponse = await this.prisma.aIResponse.findFirst({
        where: {
          aiRequest: {
            userId: user.id,
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!aiResponse) {
      throw new NotFoundException('No AI Response found to associate feedback with');
    }

    const feedback = await this.prisma.aIFeedback.create({
      data: {
        aiResponseId: aiResponse.id,
        userId: user.id,
        memberId: message.conversation.memberId,
        rating: dto.rating,
        reason: dto.reason,
        comment: dto.comment ?? null,
      },
    });

    await this.auditService.recordAuditEvent({
      organisationId,
      userId: user.id,
      feature: NUTRITION_COACH_FEATURE,
      eventType: 'AI_NUTRITION_FEEDBACK_SUBMITTED',
      result: 'SUCCESS',
      metadata: {
        messageId: dto.messageId,
        rating: dto.rating,
        reason: dto.reason,
      },
    });

    return { success: true, feedbackId: feedback.id };
  }

  /**
   * Generates rolling summary of conversation turns.
   */
  private async createConversationSummary(conversationId: string, model: string): Promise<void> {
    const messages = await this.prisma.aINutritionCoachMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const userTurns = messages
      .filter((m) => m.role === 'USER')
      .map((m) => m.content.slice(0, 60))
      .join(' | ');

    const summaryText = `Recent nutrition discussions covered: ${userTurns}. Targets and dietary preferences reviewed.`;

    await this.prisma.aINutritionConversationSummary.create({
      data: {
        conversationId,
        summary: summaryText,
        keyTopics: ['nutrition_targets', 'meal_alternatives', 'food_logging'],
        model,
        promptVersion: 1,
        version: 1,
      },
    });
  }

  /**
   * Enforces member consent for AI processing.
   */
  private async assertMemberConsent(memberProfileId: string): Promise<void> {
    const aiConsentType = await this.prisma.consentType.findUnique({
      where: { key: 'AI_PROCESSING' },
    });

    if (!aiConsentType) {
      return; // Consent type not configured on platform, proceed safely
    }

    const latestConsent = await this.prisma.consentRecord.findFirst({
      where: {
        memberProfileId,
        consentTypeId: aiConsentType.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestConsent || latestConsent.status !== 'ACCEPTED') {
      throw new ForbiddenException({
        code: 'AI_CONSENT_REQUIRED',
        message: 'Member has not consented to AI processing of nutrition and health data',
      });
    }
  }
}
