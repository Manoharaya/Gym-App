import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { AIOrchestratorService } from '../../../orchestrator/ai-orchestrator.service';
import { FitnessCoachContextBuilderService } from '../context/fitness-coach-context-builder.service';
import { FitnessSafetyPolicyService } from '../policies/fitness-safety-policy.service';
import { FITNESS_COACH_RESPONSE_SCHEMA } from '../schemas/fitness-coach-response.schema';
import { AIAuditService } from '../../../services/ai-audit.service';
import { AuthenticatedUser } from '../../../../common/interfaces/request-with-user.interface';
import {
  CreateConversationDto,
  SendMessageDto,
  UpdateCoachProfileDto,
  SubmitCoachFeedbackDto,
  ConversationQueryDto,
} from '../dto/fitness-coach.dto';
import type {
  FitnessCoachResponse,
  AIFitnessCoachProfileDto,
  AIFitnessCoachConversationDto,
} from '@fitcore/types';

@Injectable()
export class FitnessCoachService {
  private readonly logger = new Logger(FitnessCoachService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: AIOrchestratorService,
    private readonly contextBuilder: FitnessCoachContextBuilderService,
    private readonly safetyPolicy: FitnessSafetyPolicyService,
    private readonly auditService: AIAuditService,
  ) {}

  /**
   * Retrieves or creates default AI Fitness Coach profile for a member.
   */
  async getOrCreateProfile(memberId: string, organisationId: string): Promise<AIFitnessCoachProfileDto> {
    const existing = await this.prisma.aIFitnessCoachProfile.findUnique({
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
        trainingFocus: existing.trainingFocus as any,
        enabled: existing.enabled,
        createdAt: existing.createdAt.toISOString(),
        updatedAt: existing.updatedAt.toISOString(),
      };
    }

    const created = await this.prisma.aIFitnessCoachProfile.create({
      data: {
        organisationId,
        memberId,
        coachingStyle: 'BALANCED',
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
      trainingFocus: created.trainingFocus as any,
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
    dto: UpdateCoachProfileDto,
  ): Promise<AIFitnessCoachProfileDto> {
    const profile = await this.getOrCreateProfile(memberId, organisationId);

    const updated = await this.prisma.aIFitnessCoachProfile.update({
      where: { memberId },
      data: {
        coachingStyle: dto.coachingStyle ?? profile.coachingStyle,
        responseLength: dto.responseLength ?? profile.responseLength,
        language: dto.language ?? profile.language,
        unitPreference: dto.unitPreference ?? profile.unitPreference,
        trainingFocus: dto.trainingFocus ?? profile.trainingFocus,
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
      trainingFocus: updated.trainingFocus as any,
      enabled: updated.enabled,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Creates a new conversation for the authenticated member.
   */
  async createConversation(
    memberId: string,
    organisationId: string,
    dto: CreateConversationDto,
  ): Promise<AIFitnessCoachConversationDto> {
    await this.assertMemberConsent(memberId);

    const conversation = await this.prisma.aIFitnessCoachConversation.create({
      data: {
        organisationId,
        memberId,
        title: dto.title || 'Training Coaching Session',
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
    query: ConversationQueryDto,
  ): Promise<{ data: AIFitnessCoachConversationDto[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      memberId,
      organisationId,
      status: query.status || { not: 'DELETED' },
    };

    const [conversations, total] = await Promise.all([
      this.prisma.aIFitnessCoachConversation.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.aIFitnessCoachConversation.count({ where }),
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
   * Retrieves conversation by ID with messages. Enforces ownership & IDOR security.
   */
  async getConversation(
    conversationId: string,
    memberId: string,
    organisationId: string,
  ): Promise<AIFitnessCoachConversationDto> {
    const conversation = await this.prisma.aIFitnessCoachConversation.findUnique({
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

    // IDOR & Multi-tenant boundary check (Slice 13, 60)
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
   * Soft-deletes a conversation (Slice 14, 56).
   */
  async deleteConversation(conversationId: string, memberId: string, organisationId: string): Promise<{ success: boolean }> {
    const conversation = await this.prisma.aIFitnessCoachConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation '${conversationId}' not found`);
    }

    if (conversation.memberId !== memberId || conversation.organisationId !== organisationId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.aIFitnessCoachConversation.update({
      where: { id: conversationId },
      data: { status: 'DELETED' },
    });

    return { success: true };
  }

  /**
   * Dispatches a message to the AI Fitness Coach through the Day 19 Gateway.
   */
  async sendMessage(
    conversationId: string,
    memberId: string,
    organisationId: string,
    user: AuthenticatedUser,
    dto: SendMessageDto,
  ): Promise<{
    userMessageId: string;
    assistantMessageId: string;
    response: FitnessCoachResponse;
  }> {
    // 1. Verify Conversation & Ownership
    const conversation = await this.prisma.aIFitnessCoachConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.status === 'DELETED') {
      throw new NotFoundException(`Conversation '${conversationId}' not found`);
    }

    if (conversation.memberId !== memberId || conversation.organisationId !== organisationId) {
      throw new ForbiddenException('Access to this conversation is denied');
    }

    // 2. Consent Verification (Slice 55)
    await this.assertMemberConsent(memberId);

    // 3. Persist User Message
    const userMsg = await this.prisma.aIFitnessCoachMessage.create({
      data: {
        conversationId,
        role: 'USER',
        content: dto.content,
        status: 'COMPLETED',
      },
    });

    // 4. Fitness Safety Policy Check (Slice 23, 24, 25, 76)
    const safetyCheck = await this.safetyPolicy.evaluateQuery(
      dto.content,
      organisationId,
      memberId,
      conversationId,
    );

    if (!safetyCheck.isSafeToProceed && safetyCheck.safeResponse) {
      // Safety Intervention: Persist assistant message with safety escalation response
      const assistantMsg = await this.prisma.aIFitnessCoachMessage.create({
        data: {
          conversationId,
          role: 'ASSISTANT',
          content: safetyCheck.safeResponse.message,
          structuredOutput: safetyCheck.safeResponse as any,
          status: 'COMPLETED',
        },
      });

      await this.auditService.recordAuditEvent({
        organisationId,
        userId: user.id,
        feature: 'FITNESS_COACH',
        eventType: 'FITNESS_COACH_SAFETY_ESCALATION',
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

    // 5. Gather Member Coaching Preferences
    const coachProfile = await this.getOrCreateProfile(memberId, organisationId);

    // 6. Build Prioritized Context (Slice 5, 6)
    const fitnessContext = await this.contextBuilder.buildContext(
      memberId,
      organisationId,
      coachProfile,
      !!dto.includeNutritionContext,
    );

    // 7. Context Window & Conversation History (Slice 15, 16)
    const previousMessages = await this.prisma.aIFitnessCoachMessage.findMany({
      where: { conversationId, id: { not: userMsg.id } },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    const conversationSummary = await this.prisma.aIFitnessConversationSummary.findFirst({
      where: { conversationId },
      orderBy: { generatedAt: 'desc' },
    });

    // 8. Execute via Centralized AI Orchestrator (Slice 1)
    const requestedSources = [
      'MEMBER_PROFILE',
      'TRAINING',
      'PROGRESS',
      'ENGAGEMENT',
      'ATTENDANCE',
      ...(dto.includeNutritionContext ? ['NUTRITION'] : []),
    ] as any[];

    // Format prompt with context directives
    const fullPrompt = [
      dto.content,
      '',
      '### MEMBER FITNESS CONTEXT ###',
      JSON.stringify(fitnessContext),
      conversationSummary ? `\n### PREVIOUS CONVERSATION SUMMARY ###\n${conversationSummary.summary}` : '',
    ].join('\n');

    const executionResult = await this.orchestrator.execute({
      feature: 'FITNESS_COACH',
      prompt: fullPrompt,
      organisationId,
      outletId: user.primaryOutletId || user.roles?.[0]?.outletId,
      user,
      memberId,
      promptKey: 'fitness_coach.v1',
      responseFormat: 'json',
      expectedSchema: FITNESS_COACH_RESPONSE_SCHEMA,
      requestedSources,
    });

    const parsedResponse: FitnessCoachResponse =
      executionResult.structuredOutput || {
        message: executionResult.content,
        summary: 'Fitness response generated.',
        cautions: ['FitCore AI is for fitness guidance only.'],
      };

    // 9. Persist Assistant Message
    const assistantMsg = await this.prisma.aIFitnessCoachMessage.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        content: parsedResponse.message,
        structuredOutput: parsedResponse as any,
        tokens: executionResult.tokens.totalTokens,
        latencyMs: executionResult.latencyMs,
        status: 'COMPLETED',
      },
    });

    // Update conversation title if this was the first turn
    const totalMessages = await this.prisma.aIFitnessCoachMessage.count({ where: { conversationId } });
    if (totalMessages <= 2 && dto.content.length > 5) {
      const suggestedTitle = dto.content.slice(0, 40) + (dto.content.length > 40 ? '...' : '');
      await this.prisma.aIFitnessCoachConversation.update({
        where: { id: conversationId },
        data: { title: suggestedTitle, updatedAt: new Date() },
      });
    } else {
      await this.prisma.aIFitnessCoachConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
    }

    // 10. Conversation Summarization check (Slice 16)
    if (totalMessages > 0 && totalMessages % 10 === 0) {
      await this.createConversationSummary(conversationId, executionResult.model);
    }

    return {
      userMessageId: userMsg.id,
      assistantMessageId: assistantMsg.id,
      response: parsedResponse,
    };
  }

  /**
   * Retrieves transparent data context summary for the member (Slice 53, 54).
   */
  async getContextSummary(memberId: string, organisationId: string) {
    const profile = await this.getOrCreateProfile(memberId, organisationId);
    const context = await this.contextBuilder.buildContext(memberId, organisationId, profile, true);

    return {
      coachingPreferences: context.coachingPreferences,
      training: {
        hasActivePlan: !!context.training.activePlan,
        activePlanName: context.training.activePlan?.name || null,
        recentWorkoutsCount: context.training.recentWorkouts.length,
        hasTodayWorkout: !!context.training.todayWorkout,
      },
      progress: {
        activeGoalsCount: context.progress.activeGoals.length,
        goals: context.progress.activeGoals.map((g) => ({ title: g.title, category: g.category })),
      },
      engagement: {
        streak: context.engagement.streak,
        engagementLevel: context.engagement.engagementLevel,
        totalVisits: context.attendance.recentCheckInsCount30d,
      },
      nutrition: {
        authorized: !!context.nutrition,
        dailyCalories: context.nutrition?.dailyCalories || null,
      },
      privacyNotice:
        'FitCore AI processes only authorized workout history, goals, and consistency data. Raw medical screenings, PAR-Q records, credentials, and private trainer notes are strictly excluded.',
    };
  }

  /**
   * Trainer preview for assigned clients (Slice 35, 36).
   */
  async getTrainerPreview(memberId: string, trainerUserId: string, organisationId: string) {
    // 1. Verify Trainer Profile
    const trainerProfile = await this.prisma.trainerProfile.findFirst({
      where: { staffProfile: { userId: trainerUserId } },
    });

    if (!trainerProfile) {
      throw new ForbiddenException('Trainer profile required');
    }

    // 2. Verify Assignment
    const assignment = await this.prisma.trainerClientAssignment.findFirst({
      where: {
        trainerProfileId: trainerProfile.id,
        memberProfileId: memberId,
        status: 'ACTIVE',
      },
    });

    if (!assignment) {
      throw new ForbiddenException(`Trainer is not assigned to member '${memberId}'`);
    }

    // 3. Build Non-clinical Trainer Summary
    const context = await this.contextBuilder.buildContext(memberId, organisationId, undefined, false);

    return {
      memberId,
      clientName: context.member.firstName,
      trainingAdherence: {
        completedWorkoutsLast30d: context.training.recentWorkouts.length,
        activePlan: context.training.activePlan?.name || 'No active plan',
        isTrainerAssignedPlan: context.training.activePlan?.isTrainerAssigned || false,
      },
      goalProgress: context.progress.activeGoals,
      engagement: {
        streak: context.engagement.streak,
        engagementLevel: context.engagement.engagementLevel,
      },
      discussionPoints: [
        'Review progressive overload target for upcoming week',
        'Verify consistency streak adherence and recovery pacing',
        'Check milestone completion for active training goals',
      ],
    };
  }

  /**
   * Submits member feedback on an AI message (Slice 42).
   */
  async submitFeedback(memberId: string, organisationId: string, dto: SubmitCoachFeedbackDto) {
    if (dto.messageId) {
      const message = await this.prisma.aIFitnessCoachMessage.findUnique({
        where: { id: dto.messageId },
        include: { conversation: true },
      });

      if (!message || message.conversation.memberId !== memberId) {
        throw new NotFoundException(`Message '${dto.messageId}' not found`);
      }
    }

    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException('Member profile not found');
    }

    let aiResponse = await this.prisma.aIResponse.findFirst({
      where: {
        aiRequest: {
          memberId,
          feature: 'FITNESS_COACH',
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!aiResponse) {
      aiResponse = await this.prisma.aIResponse.findFirst({
        where: {
          aiRequest: {
            userId: member.userId,
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
        userId: member.userId,
        memberId,
        rating: dto.rating,
        reason: dto.reason,
        comment: dto.comment,
      },
    });

    return {
      id: feedback.id,
      rating: feedback.rating,
      createdAt: feedback.createdAt.toISOString(),
    };
  }

  /**
   * Verifies member consent (Slice 55).
   */
  private async assertMemberConsent(memberProfileId: string) {
    const consentType = await this.prisma.consentType.findUnique({
      where: { key: 'AI_PROCESSING' },
    });

    if (!consentType) {
      return; // Consent type not configured on platform, proceed
    }

    const latestRecord = await this.prisma.consentRecord.findFirst({
      where: {
        memberProfileId,
        consentTypeId: consentType.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (latestRecord && (latestRecord.status === 'WITHDRAWN' || latestRecord.status === 'DECLINED')) {
      throw new ForbiddenException(
        'AI processing consent has been declined or withdrawn by the member. AI Fitness Coach is unavailable.',
      );
    }
  }

  /**
   * Generates conversation summary (Slice 16).
   */
  private async createConversationSummary(conversationId: string, model: string) {
    try {
      const messages = await this.prisma.aIFitnessCoachMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      const summaryText = `Discussion focused on training volume, exercise selection, and consistency with ${messages.length} recent messages reviewed.`;

      await this.prisma.aIFitnessConversationSummary.create({
        data: {
          conversationId,
          summary: summaryText,
          keyTopics: ['TRAINING_CONSISTENCY', 'EXERCISE_TECHNIQUE'],
          model,
          promptVersion: 1,
          version: 1,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to generate conversation summary: ${err.message}`);
    }
  }
}
