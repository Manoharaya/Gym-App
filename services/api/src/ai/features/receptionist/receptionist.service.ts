/**
 * Day 31 — AI Receptionist Main Facade Service
 * High-level orchestration for conversational receptionist, knowledge grounding, guardrails, and handoffs.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { ReceptionistConversationService } from './conversation/receptionist-conversation.service';
import { ReceptionistMessageService } from './conversation/receptionist-message.service';
import { ReceptionistContextService } from './context/receptionist-context.service';
import { ReceptionistKnowledgeService } from './knowledge/receptionist-knowledge.service';
import { ReceptionistSafetyService } from './safety/receptionist-safety.service';
import { ReceptionistHandoffService } from './handoff/receptionist-handoff.service';
import { ReceptionistAIService } from './ai/receptionist-ai.service';
import {
  ReceptionistChatDto,
  ReceptionistFeedbackDto,
  CreateAIReceptionistDto,
  UpdateAIReceptionistDto,
} from './dto/receptionist.dto';
import { ReceptionistResponseDto } from '@fitcore/types';

@Injectable()
export class ReceptionistService {
  private readonly logger = new Logger(ReceptionistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationService: ReceptionistConversationService,
    private readonly messageService: ReceptionistMessageService,
    private readonly contextService: ReceptionistContextService,
    private readonly knowledgeService: ReceptionistKnowledgeService,
    private readonly safetyService: ReceptionistSafetyService,
    private readonly handoffService: ReceptionistHandoffService,
    private readonly aiService: ReceptionistAIService,
  ) {}

  /**
   * Retrieves or creates default AI receptionist configuration for an organisation.
   */
  async getOrCreateReceptionist(organisationId: string, outletId?: string | null) {
    let receptionist = await this.prisma.aIReceptionist.findFirst({
      where: {
        organisationId,
        ...(outletId ? { outletId } : { outletId: null }),
      },
    });

    if (!receptionist) {
      // Fallback: check if org-wide receptionist exists
      receptionist = await this.prisma.aIReceptionist.findFirst({
        where: { organisationId, outletId: null },
      });
    }

    if (!receptionist) {
      // Create initial receptionist
      receptionist = await this.prisma.aIReceptionist.create({
        data: {
          organisationId,
          outletId: null,
          name: 'Default AI Receptionist',
          displayName: 'FitCore Receptionist',
          status: 'ACTIVE',
          language: 'en',
          tone: 'FRIENDLY',
          greeting: 'Welcome to FitCore! How can I help you today?',
          timezone: 'UTC',
          knowledgeScope: 'ORGANISATION',
          escalationEnabled: true,
          humanHandoffEnabled: true,
          metadata: {
            guardrails: {},
            supportedChannels: ['WEB_CHAT', 'MOBILE', 'SMS', 'WHATSAPP', 'IN_APP'],
          },
        },
      });
    }

    return receptionist;
  }

  /**
   * Creates or updates custom receptionist configuration.
   */
  async createReceptionist(organisationId: string, dto: CreateAIReceptionistDto) {
    return this.prisma.aIReceptionist.create({
      data: {
        organisationId,
        outletId: dto.outletId || null,
        name: dto.name,
        displayName: dto.displayName,
        status: 'ACTIVE',
        tone: dto.tone || 'FRIENDLY',
        language: dto.language || 'en',
        greeting: dto.greeting || 'Welcome to FitCore! How can I assist you today?',
        timezone: dto.timezone || 'UTC',
        knowledgeScope: dto.knowledgeScope || 'ORGANISATION',
        escalationEnabled: dto.escalationEnabled ?? true,
        humanHandoffEnabled: dto.humanHandoffEnabled ?? true,
        metadata: {
          guardrails: dto.guardrails,
          promptOverrides: dto.promptOverrides,
          supportedChannels: dto.supportedChannels || ['WEB_CHAT', 'MOBILE'],
        },
      },
    });
  }

  async updateReceptionist(organisationId: string, id: string, dto: UpdateAIReceptionistDto) {
    const existing = await this.prisma.aIReceptionist.findFirst({
      where: { id, organisationId },
    });
    if (!existing) {
      throw new NotFoundException(`AI Receptionist ${id} not found`);
    }

    return this.prisma.aIReceptionist.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        displayName: dto.displayName ?? existing.displayName,
        status: dto.status ?? existing.status,
        tone: dto.tone ?? existing.tone,
        language: dto.language ?? existing.language,
        greeting: dto.greeting ?? existing.greeting,
        timezone: dto.timezone ?? existing.timezone,
        knowledgeScope: dto.knowledgeScope ?? existing.knowledgeScope,
        escalationEnabled: dto.escalationEnabled ?? existing.escalationEnabled,
        humanHandoffEnabled: dto.humanHandoffEnabled ?? existing.humanHandoffEnabled,
        metadata: {
          ...(existing.metadata as any),
          guardrails: dto.guardrails !== undefined ? dto.guardrails : (existing.metadata as any)?.guardrails,
          promptOverrides: dto.promptOverrides !== undefined ? dto.promptOverrides : (existing.metadata as any)?.promptOverrides,
          supportedChannels: dto.supportedChannels ?? (existing.metadata as any)?.supportedChannels,
        },
      },
    });
  }

  /**
   * Primary conversational chat endpoint.
   * Enforces safety pre-checks, grounds knowledge, evaluates multi-turn context, and records messages.
   */
  async chat(
    organisationId: string,
    dto: ReceptionistChatDto,
    authenticatedUser?: any,
  ): Promise<{
    conversationId: string;
    response: ReceptionistResponseDto;
    messageId: string;
  }> {
    const receptionist = await this.getOrCreateReceptionist(organisationId, dto.outletId);

    // 1. Resolve or create conversation session
    const conversation = await this.conversationService.findOrCreateConversation({
      organisationId,
      receptionistId: receptionist.id,
      conversationId: dto.conversationId,
      externalConversationId: dto.externalConversationId,
      channel: dto.channel || 'WEB_CHAT',
      outletId: dto.outletId,
      memberId: authenticatedUser?.memberProfileId || null,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      customerEmail: dto.customerEmail,
      language: dto.language || receptionist.language,
    });

    // 2. Pre-execution safety evaluation
    const safetyResult = this.safetyService.evaluateInput(dto.message);

    // 3. Record incoming customer message
    await this.messageService.recordCustomerMessage({
      conversationId: conversation.id,
      content: safetyResult.sanitizedInput,
    });

    // 4. Handle pre-execution safety block (e.g. prompt injection attack)
    if (!safetyResult.isSafe && safetyResult.remedyAction === 'BLOCK') {
      const blockedResponse: ReceptionistResponseDto = {
        message:
          'I am only able to assist with questions about our gym facilities, memberships, schedules, and policies. How can I help you with your fitness journey today?',
        intent: 'UNKNOWN',
        confidence: 0.99,
        requiresClarification: false,
        suggestedNextStep: 'Ask a question about gym hours, classes, or pricing.',
        citations: [],
        handoffRecommended: false,
        safetyFlag: safetyResult.safetyFlag,
      };

      const aiMsg = await this.messageService.recordAIMessage({
        conversationId: conversation.id,
        content: blockedResponse.message,
        intent: blockedResponse.intent,
        confidenceScore: blockedResponse.confidence,
        citations: blockedResponse.citations,
        safetyFlag: blockedResponse.safetyFlag,
        latencyMs: 5,
        tokensUsed: 20,
      });

      return {
        conversationId: conversation.id,
        response: blockedResponse,
        messageId: aiMsg.id,
      };
    }

    // 5. Retrieve Grounded Knowledge
    const retrievedKnowledge = await this.knowledgeService.searchKnowledge({
      organisationId,
      outletId: dto.outletId || conversation.outletId,
      query: safetyResult.sanitizedInput,
      limit: 5,
    });

    // 6. Build Unified Context
    const aggregatedContext = await this.contextService.buildContext({
      organisationId,
      conversationId: conversation.id,
      outletId: dto.outletId || conversation.outletId,
      memberId: authenticatedUser?.memberProfileId || conversation.customerId,
      customerName: dto.customerName || (conversation.metadata as any)?.customerName || undefined,
      customerPhone: dto.customerPhone || (conversation.metadata as any)?.customerPhone || undefined,
      customerEmail: dto.customerEmail || (conversation.metadata as any)?.customerEmail || undefined,
    });

    aggregatedContext.retrievedKnowledge = retrievedKnowledge.map((k) => ({
      id: k.id,
      type: k.type,
      title: k.title,
      content: k.content,
      outletId: k.outletId,
      confidenceScore: k.score,
    }));

    // 7. Generate AI Response
    const { response, latencyMs, tokensUsed, costEstimate } = await this.aiService.generateResponse({
      organisationId,
      context: aggregatedContext,
      query: safetyResult.sanitizedInput,
      authenticatedUser,
    });

    // 8. Handle Handoff Escalation if recommended by AI or requested by customer
    if (response.handoffRecommended && receptionist.humanHandoffEnabled) {
      const isComplaint =
        response.intent === 'HUMAN_HANDOFF' ||
        safetyResult.sanitizedInput.toLowerCase().includes('complaint');

      await this.handoffService.createHandoff(organisationId, {
        conversationId: conversation.id,
        outletId: dto.outletId || conversation.outletId,
        reason: isComplaint ? 'COMPLAINT' : 'CUSTOMER_REQUESTED',
        reasonDescription: response.message,
        summary: `Handoff requested during conversation. Latest query: "${safetyResult.sanitizedInput}"`,
      });
    }

    // 9. Record Knowledge Gap if question was on an unknown topic or facility
    const isUnknownTopicOrFacility =
      response.intent === 'UNKNOWN' ||
      response.intent === 'FACILITIES' ||
      response.confidence < 0.8 ||
      (response.handoffRecommended && response.citations.length === 0);

    if (isUnknownTopicOrFacility && (response.citations.length === 0 || response.confidence < 0.8)) {
      await this.knowledgeService.recordKnowledgeGap({
        organisationId,
        outletId: dto.outletId || conversation.outletId,
        query: safetyResult.sanitizedInput,
        detectedTopic: response.intent,
        conversationId: conversation.id,
      });
    }

    // 10. Record AI response message in transcript
    const recordedMessage = await this.messageService.recordAIMessage({
      conversationId: conversation.id,
      content: response.message,
      intent: response.intent,
      confidenceScore: response.confidence,
      citations: response.citations,
      toolResults: response.toolResults,
      latencyMs,
      tokensUsed,
      costEstimate,
      safetyFlag: response.safetyFlag,
    });

    return {
      conversationId: conversation.id,
      response,
      messageId: recordedMessage.id,
    };
  }

  /**
   * Records user satisfaction rating/feedback.
   */
  async recordFeedback(organisationId: string, dto: ReceptionistFeedbackDto) {
    const conv = await this.prisma.receptionistConversation.findUnique({
      where: { id: dto.conversationId },
    });

    if (!conv || conv.organisationId !== organisationId) {
      throw new NotFoundException(`Conversation ${dto.conversationId} not found`);
    }

    return this.prisma.receptionistFeedback.create({
      data: {
        organisationId,
        conversationId: dto.conversationId,
        messageId: dto.messageId || null,
        rating: dto.rating >= 4 ? 'THUMBS_UP' : 'THUMBS_DOWN',
        comment: dto.feedback || null,
      },
    });
  }

  /**
   * Staff dashboard metrics.
   */
  async getMetrics(organisationId: string) {
    const [
      totalConversations,
      activeConversations,
      pendingHandoffs,
      publishedKnowledgeSources,
      unresolvedGaps,
    ] = await Promise.all([
      this.prisma.receptionistConversation.count({ where: { organisationId } }),
      this.prisma.receptionistConversation.count({
        where: { organisationId, status: { in: ['ACTIVE', 'WAITING'] } },
      }),
      this.prisma.receptionistHandoff.count({
        where: { conversation: { organisationId }, status: 'PENDING' },
      }),
      this.prisma.receptionistKnowledgeSource.count({
        where: { organisationId, status: 'PUBLISHED' },
      }),
      this.prisma.receptionistKnowledgeGap.count({
        where: { organisationId, status: { in: ['NEW', 'REVIEW_REQUIRED'] } },
      }),
    ]);

    return {
      totalConversations,
      activeConversations,
      pendingHandoffs,
      publishedKnowledgeSources,
      unresolvedGaps,
    };
  }
}
