/**
 * Day 36 — Master AI Sales Agent Service
 * End-to-end orchestrator for consultative sales conversations across fitness modalities.
 * Flow: Prospect -> AI Sales Agent -> Understand -> Qualify -> Recommend -> Next Step -> Human/Receptionist Handoff.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { AuditService } from '../../../../audit/audit.service';
import { LeadsService } from '../../../../leads/leads.service';
import { ModelGatewayService } from '../../../gateway/model-gateway.service';
import { SalesPolicyService } from './sales-policy.service';
import { SalesContextService } from './sales-context.service';
import { SalesRecommendationService } from './sales-recommendation.service';
import { SalesQualificationService } from './sales-qualification.service';
import { SalesHandoffService } from './sales-handoff.service';
import { SalesToolRegistry } from '../tools/sales-tool-registry';
import { SALES_AGENT_PROMPT_DEFINITION } from '../prompts/sales_agent.v1';
import {
  CreateSalesConversationDto,
  SalesConversationDto,
  SalesMessageInputDto,
  SalesMessageResponseDto,
  SalesRecommendationDto,
  SalesNextActionDto,
  SalesHandoffDto,
  SalesAgentProfileDto,
  CreateSalesAgentProfileDto,
  UpdateSalesAgentProfileDto,
  SalesDashboardMetricsDto,
  StaffLeadSummaryDto,
  SalesIntent,
  SalesNextActionType,
  SalesRecommendationType,
} from '@fitcore/types';

@Injectable()
export class SalesAgentService {
  private readonly logger = new Logger(SalesAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly leadsService: LeadsService,
    private readonly modelGateway: ModelGatewayService,
    private readonly policyService: SalesPolicyService,
    private readonly contextService: SalesContextService,
    private readonly recommendationService: SalesRecommendationService,
    private readonly qualificationService: SalesQualificationService,
    private readonly handoffService: SalesHandoffService,
    private readonly toolRegistry: SalesToolRegistry,
  ) {}

  /**
   * 1. Start or resume a Sales Conversation for a prospect.
   */
  async createConversation(
    organisationId: string,
    dto: CreateSalesConversationDto,
  ): Promise<SalesConversationDto> {
    this.logger.log(`[SalesAgentService] Creating conversation in org ${organisationId}`);

    // Verify organisation exists
    const org = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
    });
    if (!org) {
      throw new NotFoundException(`Organisation ${organisationId} not found`);
    }

    // 1. Resolve or create Lead via Day 33 LeadsService
    let leadId = dto.leadId;
    if (!leadId) {
      const capturedLead = await this.leadsService.createLead(organisationId, {
        firstName: dto.contactDetails?.firstName || 'Prospect',
        lastName: dto.contactDetails?.lastName || undefined,
        email: dto.contactDetails?.email,
        phone: dto.contactDetails?.phone,
        source: 'AI_RECEPTIONIST',
        outletId: dto.outletId,
        preferredLanguage: dto.language || 'en',
      });
      leadId = capturedLead.id;
    }

    // 2. Ensure SalesAgentProfile exists or create default
    let profile = await this.prisma.salesAgentProfile.findFirst({
      where: {
        organisationId,
        outletId: dto.outletId || null,
        enabled: true,
      },
    });

    if (!profile) {
      profile = await this.prisma.salesAgentProfile.create({
        data: {
          organisationId,
          outletId: dto.outletId || null,
          name: 'FitCore Sales Specialist',
          displayName: `${org.name} Sales Assistant`,
          enabled: true,
          language: dto.language || 'en',
          tone: 'FRIENDLY',
          salesStyle: 'CONSULTATIVE',
          businessDescription: `${org.name} dedicated fitness advisory assistant.`,
          defaultGreeting:
            'Hello and welcome! I am here to help you explore our facilities, find the right membership or class schedule for your goals, and answer any questions.',
        },
      });
    }

    // 3. Create SalesConversation
    const conversation = await this.prisma.salesConversation.create({
      data: {
        organisationId,
        outletId: dto.outletId || null,
        salesAgentProfileId: profile.id,
        leadId,
        channel: dto.channel || 'WEB',
        status: 'ACTIVE',
        currentIntent: 'GENERAL_SALES',
        metadata: dto.metadata ? (dto.metadata as any) : undefined,
      },
      include: {
        messages: true,
        recommendations: true,
        nextActions: true,
        handoffs: true,
      },
    });

    // 4. If initial message provided, process it immediately
    if (dto.initialMessage?.trim()) {
      await this.processMessage(organisationId, conversation.id, {
        message: dto.initialMessage,
        channel: dto.channel,
        language: dto.language,
      });
      return this.getConversation(organisationId, conversation.id);
    }

    await this.auditService.log({
      organisationId,
      action: 'SALES_CONVERSATION_STARTED',
      resource: 'SalesConversation',
      resourceId: conversation.id,
      metadata: { leadId, channel: dto.channel || 'WEB' },
    });

    return this.mapConversationToDto(conversation);
  }

  /**
   * 2. Process an inbound customer message turn through the AI Sales Agent pipeline.
   */
  async processMessage(
    organisationId: string,
    conversationId: string,
    dto: SalesMessageInputDto,
  ): Promise<SalesMessageResponseDto> {
    this.logger.log(`[SalesAgentService] Processing message for conv ${conversationId}`);

    const conversation = await this.prisma.salesConversation.findFirst({
      where: { id: conversationId, organisationId },
      include: { lead: true },
    });

    if (!conversation) {
      throw new NotFoundException(`Sales conversation ${conversationId} not found`);
    }

    const messageText = dto.message.trim();

    // 1. Policy & Safety checks
    const promptSafety = this.policyService.evaluatePromptSafety(messageText);
    const medicalSafety = this.policyService.evaluateMedicalSafety(messageText);
    const discountCheck = this.policyService.evaluateDiscountRequest(messageText);

    // Save inbound message
    await this.prisma.salesConversationMessage.create({
      data: {
        conversationId,
        direction: 'INBOUND',
        role: 'CUSTOMER',
        content: messageText,
        language: dto.language || 'en',
      },
    });

    // 2. Build verified business context
    const salesContext = await this.contextService.buildSalesContext(organisationId, conversationId);

    // 3. Call Model Gateway with sales_agent.v1
    const modelResponse = await this.modelGateway.execute('DEVELOPMENT', {
      model: 'fitcore-sales-agent',
      messages: [
        {
          role: 'system',
          content: `${SALES_AGENT_PROMPT_DEFINITION.systemPrompt}\nVerified Sales Context:\n${JSON.stringify(
            salesContext,
            null,
            2,
          )}`,
        },
        {
          role: 'user',
          content: messageText,
        },
      ],
      systemInstruction: SALES_AGENT_PROMPT_DEFINITION.systemPrompt,
      responseFormat: 'json',
      outputSchema: SALES_AGENT_PROMPT_DEFINITION.outputSchema,
    });

    let aiOutput: any = modelResponse.structuredOutput;
    if (!aiOutput && modelResponse.content) {
      try {
        aiOutput = JSON.parse(modelResponse.content);
      } catch {
        aiOutput = {
          intent: 'GENERAL_SALES',
          reply: modelResponse.content,
          recommendations: [],
          suggestedNextActions: [],
        };
      }
    }

    // Safety overrides from policy service
    if (!medicalSafety.allowed && medicalSafety.suggestedEscalation) {
      aiOutput.intent = 'HUMAN_REQUEST';
      aiOutput.handoffRequired = true;
      aiOutput.handoffReason = medicalSafety.suggestedEscalation.reason;
      aiOutput.handoffPriority = medicalSafety.suggestedEscalation.priority;
      aiOutput.reply =
        'Your health and safety are our top priority. We strongly advise consulting with a qualified healthcare professional before beginning any new exercise routine. I can also connect you directly with our facility staff.';
    }

    if (!promptSafety.allowed) {
      aiOutput.intent = 'OTHER';
      aiOutput.reply =
        'I am here to help you explore our fitness facilities, membership plans, and schedules. How can I assist with your fitness journey today?';
      aiOutput.handoffRequired = false;
    }

    const intent: SalesIntent = aiOutput.intent || 'GENERAL_SALES';
    const replyText: string = aiOutput.reply || 'Thank you for reaching out. How can I assist you further?';
    const confidence: number = aiOutput.confidence || 0.95;

    // 4. Save outbound AI message
    await this.prisma.salesConversationMessage.create({
      data: {
        conversationId,
        direction: 'OUTBOUND',
        role: 'AI',
        content: replyText,
        language: dto.language || aiOutput.language || 'en',
        intent,
        metadata: {
          confidence,
          handoffRequired: Boolean(aiOutput.handoffRequired),
        },
      },
    });

    // 5. Update Discoveries in Conversation & sync to Day 33 Lead Qualification
    const discovered = aiOutput.discoveredContext || {};
    const updatedGoals = discovered.goals || conversation.discoveredGoals;
    const updatedSchedule = discovered.schedule || conversation.discoveredSchedule;
    const updatedExperience = discovered.experience || conversation.discoveredExperience;
    const updatedReadiness = discovered.readiness || conversation.discoveredReadiness;
    const updatedBudget = discovered.budget || conversation.discoveredBudget;
    const updatedServiceInterest = discovered.serviceInterest || conversation.discoveredServiceInterest;

    await this.prisma.salesConversation.update({
      where: { id: conversationId },
      data: {
        currentIntent: intent,
        lastActivityAt: new Date(),
        discoveredGoals: updatedGoals ? (updatedGoals as any) : undefined,
        discoveredSchedule: updatedSchedule ? (updatedSchedule as any) : undefined,
        discoveredExperience: updatedExperience || undefined,
        discoveredReadiness: updatedReadiness || undefined,
        discoveredBudget: updatedBudget || undefined,
        discoveredServiceInterest: updatedServiceInterest ? (updatedServiceInterest as any) : undefined,
        conversationSummary: `Intent: ${intent}. Goals: ${
          Array.isArray(updatedGoals) ? updatedGoals.join(', ') : 'exploring'
        }.`,
      },
    });

    // Sync to LeadQualificationProfile
    await this.qualificationService.syncDiscoveryToQualification(organisationId, conversation.leadId, {
      goals: Array.isArray(updatedGoals) ? updatedGoals : undefined,
      experience: updatedExperience,
      schedule: updatedSchedule,
      readiness: updatedReadiness,
      serviceInterest: Array.isArray(updatedServiceInterest) ? updatedServiceInterest : undefined,
    });

    // 6. Handle Recommendations
    const recommendations: SalesRecommendationDto[] = [];
    if (aiOutput.recommendations && Array.isArray(aiOutput.recommendations) && aiOutput.recommendations.length > 0) {
      for (const rec of aiOutput.recommendations) {
        // Look up verified plan if recommendedPlanId provided
        let plan = null;
        if (rec.recommendedPlanId) {
          plan = await this.prisma.membershipPlan.findFirst({
            where: { id: rec.recommendedPlanId, organisationId },
          });
        }
        if (!plan && rec.recommendedPlanName) {
          plan = await this.prisma.membershipPlan.findFirst({
            where: {
              organisationId,
              name: { contains: rec.recommendedPlanName, mode: 'insensitive' },
            },
          });
        }

        const savedRec = await this.prisma.salesRecommendation.create({
          data: {
            conversationId,
            organisationId,
            outletId: conversation.outletId,
            leadId: conversation.leadId,
            recommendationType: rec.recommendationType || 'MEMBERSHIP_PLAN',
            recommendedPlanId: plan?.id || null,
            recommendedService: rec.recommendedService || 'MEMBERSHIP',
            reason: rec.reason || 'Fits your expressed goals and schedule.',
            supportingFactors: rec.supportingFactors || [],
            limitations: rec.limitations || [],
            confidence: rec.confidence || 0.95,
            nextBestAction: rec.nextBestAction || 'BOOK_TRIAL',
            requiresHumanReview: Boolean(rec.requiresHumanReview),
          },
        });

        recommendations.push({
          id: savedRec.id,
          conversationId,
          organisationId,
          outletId: savedRec.outletId,
          leadId: savedRec.leadId,
          recommendationType: savedRec.recommendationType as SalesRecommendationType,
          recommendedPlanId: savedRec.recommendedPlanId,
          recommendedPlanName: plan?.name || rec.recommendedPlanName || null,
          recommendedService: savedRec.recommendedService,
          reason: savedRec.reason,
          supportingFactors: (savedRec.supportingFactors as string[]) || [],
          limitations: (savedRec.limitations as string[]) || [],
          confidence: savedRec.confidence,
          nextBestAction: savedRec.nextBestAction as SalesNextActionType,
          requiresHumanReview: savedRec.requiresHumanReview,
          createdAt: savedRec.createdAt,
        });
      }
    }

    // 7. Handle Next Actions
    const suggestedNextActions: SalesNextActionDto[] = [];
    if (aiOutput.suggestedNextActions && Array.isArray(aiOutput.suggestedNextActions)) {
      for (const act of aiOutput.suggestedNextActions) {
        const savedAct = await this.prisma.salesNextAction.create({
          data: {
            conversationId,
            organisationId,
            outletId: conversation.outletId,
            leadId: conversation.leadId,
            actionType: act.actionType || 'BOOK_TRIAL',
            status: 'RECOMMENDED',
            reason: act.reason || null,
            payload: act.payload ? (act.payload as any) : undefined,
          },
        });

        suggestedNextActions.push({
          id: savedAct.id,
          conversationId,
          organisationId,
          outletId: savedAct.outletId,
          leadId: savedAct.leadId,
          actionType: savedAct.actionType as SalesNextActionType,
          status: 'RECOMMENDED',
          reason: savedAct.reason,
          payload: (savedAct.payload as any) || null,
          createdAt: savedAct.createdAt,
        });
      }
    }

    // 8. Handle Human Handoff if required
    let handoffDto: SalesHandoffDto | null = null;
    if (aiOutput.handoffRequired) {
      handoffDto = await this.handoffService.createHumanHandoff(organisationId, {
        conversationId,
        leadId: conversation.leadId,
        reason: aiOutput.handoffReason || 'CUSTOMER_REQUESTED_HUMAN',
        priority: aiOutput.handoffPriority || 'MEDIUM',
        notes: `Customer message: "${messageText}"`,
        customerSummary: `Customer inquiry triggered staff escalation (${
          aiOutput.handoffReason || 'CUSTOMER_REQUESTED_HUMAN'
        }).`,
      });
    }

    return {
      conversationId,
      reply: replyText,
      language: dto.language || aiOutput.language || 'en',
      intent,
      confidence,
      recommendations,
      suggestedNextActions,
      handoffRequired: Boolean(aiOutput.handoffRequired),
      handoff: handoffDto,
      qualificationStatus: updatedReadiness ? 'QUALIFIED' : 'QUALIFYING',
      discoveredContext: {
        goals: Array.isArray(updatedGoals) ? updatedGoals : undefined,
        experience: updatedExperience,
        schedule: updatedSchedule,
        readiness: updatedReadiness,
        budget: updatedBudget,
        serviceInterest: Array.isArray(updatedServiceInterest) ? updatedServiceInterest : undefined,
      },
    };
  }

  /**
   * 3. Get full Conversation details, messages, recommendations, and handoffs.
   */
  async getConversation(
    organisationId: string,
    conversationId: string,
  ): Promise<SalesConversationDto> {
    const conv = await this.prisma.salesConversation.findFirst({
      where: { id: conversationId, organisationId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        recommendations: { orderBy: { createdAt: 'desc' }, include: { recommendedPlan: true } },
        nextActions: { orderBy: { createdAt: 'desc' } },
        handoffs: { orderBy: { createdAt: 'desc' }, include: { assignedStaff: true } },
      },
    });

    if (!conv) {
      throw new NotFoundException(`Sales conversation ${conversationId} not found`);
    }

    return this.mapConversationToDto(conv);
  }

  /**
   * 4. Get structured Sales AI Context.
   */
  async getContext(organisationId: string, conversationId: string) {
    return this.contextService.buildSalesContext(organisationId, conversationId);
  }

  /**
   * 5. Get recommendations generated for a conversation.
   */
  async getRecommendations(
    organisationId: string,
    conversationId: string,
  ): Promise<SalesRecommendationDto[]> {
    const recs = await this.prisma.salesRecommendation.findMany({
      where: { conversationId, organisationId },
      include: { recommendedPlan: true },
      orderBy: { createdAt: 'desc' },
    });

    return recs.map((r) => ({
      id: r.id,
      conversationId: r.conversationId,
      organisationId: r.organisationId,
      outletId: r.outletId,
      leadId: r.leadId,
      recommendationType: r.recommendationType as SalesRecommendationType,
      recommendedPlanId: r.recommendedPlanId,
      recommendedPlanName: r.recommendedPlan?.name || null,
      recommendedService: r.recommendedService,
      reason: r.reason,
      supportingFactors: (r.supportingFactors as string[]) || [],
      limitations: (r.limitations as string[]) || [],
      confidence: r.confidence,
      nextBestAction: r.nextBestAction as SalesNextActionType,
      requiresHumanReview: r.requiresHumanReview,
      metadata: (r.metadata as any) || null,
      createdAt: r.createdAt,
    }));
  }

  /**
   * 6. Request human handoff for an active conversation.
   */
  async requestHandoff(
    organisationId: string,
    conversationId: string,
    dto: { reason: any; priority?: any; notes?: string },
  ): Promise<SalesHandoffDto> {
    const conv = await this.prisma.salesConversation.findFirst({
      where: { id: conversationId, organisationId },
    });
    if (!conv) {
      throw new NotFoundException(`Sales conversation ${conversationId} not found`);
    }

    return this.handoffService.createHumanHandoff(organisationId, {
      conversationId,
      leadId: conv.leadId,
      reason: dto.reason || 'CUSTOMER_REQUESTED_HUMAN',
      priority: dto.priority || 'MEDIUM',
      notes: dto.notes,
    });
  }

  /**
   * 7. Complete conversation.
   */
  async completeConversation(
    organisationId: string,
    conversationId: string,
    outcome: 'CONVERTED' | 'LOST' | 'COMPLETED' = 'COMPLETED',
  ): Promise<SalesConversationDto> {
    const conv = await this.prisma.salesConversation.findFirst({
      where: { id: conversationId, organisationId },
    });
    if (!conv) {
      throw new NotFoundException(`Sales conversation ${conversationId} not found`);
    }

    const updated = await this.prisma.salesConversation.update({
      where: { id: conversationId },
      data: {
        status: outcome,
        completedAt: new Date(),
      },
      include: {
        messages: true,
        recommendations: true,
        nextActions: true,
        handoffs: true,
      },
    });

    await this.auditService.log({
      organisationId,
      action: 'SALES_CONVERSATION_COMPLETED',
      resource: 'SalesConversation',
      resourceId: conversationId,
      metadata: { outcome },
    });

    return this.mapConversationToDto(updated);
  }

  /**
   * 8. Record user or staff feedback.
   */
  async recordFeedback(
    organisationId: string,
    conversationId: string,
    dto: { rating: 'THUMBS_UP' | 'THUMBS_DOWN'; category?: string; comment?: string },
  ) {
    const conv = await this.prisma.salesConversation.findFirst({
      where: { id: conversationId, organisationId },
    });
    if (!conv) {
      throw new NotFoundException(`Sales conversation ${conversationId} not found`);
    }

    await this.auditService.log({
      organisationId,
      action: 'SALES_FEEDBACK_RECORDED',
      resource: 'SalesConversation',
      resourceId: conversationId,
      metadata: dto,
    });

    return { success: true, recordedAt: new Date() };
  }

  /**
   * 9. Get Agent Profile configuration.
   */
  async getAgentProfile(
    organisationId: string,
    outletId?: string,
  ): Promise<SalesAgentProfileDto> {
    let profile = await this.prisma.salesAgentProfile.findFirst({
      where: {
        organisationId,
        outletId: outletId || null,
      },
    });

    if (!profile) {
      // Return default configuration
      const org = await this.prisma.organisation.findUnique({ where: { id: organisationId } });
      profile = await this.prisma.salesAgentProfile.create({
        data: {
          organisationId,
          outletId: outletId || null,
          name: 'FitCore Sales Specialist',
          displayName: `${org?.name || 'FitCore'} Sales Assistant`,
          enabled: true,
          language: 'en',
          tone: 'FRIENDLY',
          salesStyle: 'CONSULTATIVE',
        },
      });
    }

    return {
      id: profile.id,
      organisationId: profile.organisationId,
      outletId: profile.outletId,
      name: profile.name,
      displayName: profile.displayName,
      enabled: profile.enabled,
      language: profile.language,
      tone: profile.tone,
      salesStyle: profile.salesStyle as any,
      businessDescription: profile.businessDescription,
      targetAudience: profile.targetAudience,
      defaultGreeting: profile.defaultGreeting,
      qualificationEnabled: profile.qualificationEnabled,
      recommendationEnabled: profile.recommendationEnabled,
      humanHandoffEnabled: profile.humanHandoffEnabled,
      metadata: (profile.metadata as any) || null,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  /**
   * 10. Update Agent Profile configuration.
   */
  async updateAgentProfile(
    organisationId: string,
    outletId: string | undefined,
    dto: UpdateSalesAgentProfileDto,
  ): Promise<SalesAgentProfileDto> {
    let profile = await this.prisma.salesAgentProfile.findFirst({
      where: {
        organisationId,
        outletId: outletId || null,
      },
    });

    if (!profile) {
      const org = await this.prisma.organisation.findUnique({ where: { id: organisationId } });
      profile = await this.prisma.salesAgentProfile.create({
        data: {
          organisationId,
          outletId: outletId || null,
          name: dto.name || 'FitCore Sales Specialist',
          displayName: dto.displayName || `${org?.name || 'FitCore'} Sales Assistant`,
          enabled: dto.enabled ?? true,
          language: dto.language || 'en',
          tone: dto.tone || 'FRIENDLY',
          salesStyle: dto.salesStyle || 'CONSULTATIVE',
          businessDescription: dto.businessDescription,
          targetAudience: dto.targetAudience,
          defaultGreeting: dto.defaultGreeting,
          qualificationEnabled: dto.qualificationEnabled ?? true,
          recommendationEnabled: dto.recommendationEnabled ?? true,
          humanHandoffEnabled: dto.humanHandoffEnabled ?? true,
          metadata: dto.metadata ? (dto.metadata as any) : undefined,
        },
      });
    } else {
      profile = await this.prisma.salesAgentProfile.update({
        where: { id: profile.id },
        data: {
          ...(dto.name ? { name: dto.name } : {}),
          ...(dto.displayName ? { displayName: dto.displayName } : {}),
          ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
          ...(dto.language ? { language: dto.language } : {}),
          ...(dto.tone ? { tone: dto.tone } : {}),
          ...(dto.salesStyle ? { salesStyle: dto.salesStyle } : {}),
          ...(dto.businessDescription ? { businessDescription: dto.businessDescription } : {}),
          ...(dto.targetAudience ? { targetAudience: dto.targetAudience } : {}),
          ...(dto.defaultGreeting ? { defaultGreeting: dto.defaultGreeting } : {}),
          ...(dto.qualificationEnabled !== undefined ? { qualificationEnabled: dto.qualificationEnabled } : {}),
          ...(dto.recommendationEnabled !== undefined ? { recommendationEnabled: dto.recommendationEnabled } : {}),
          ...(dto.humanHandoffEnabled !== undefined ? { humanHandoffEnabled: dto.humanHandoffEnabled } : {}),
          ...(dto.metadata ? { metadata: dto.metadata as any } : {}),
        },
      });
    }

    await this.auditService.log({
      organisationId,
      action: 'SALES_AGENT_CONFIG_UPDATED',
      resource: 'SalesAgentProfile',
      resourceId: profile.id,
      metadata: dto,
    });

    return {
      id: profile.id,
      organisationId: profile.organisationId,
      outletId: profile.outletId,
      name: profile.name,
      displayName: profile.displayName,
      enabled: profile.enabled,
      language: profile.language,
      tone: profile.tone,
      salesStyle: profile.salesStyle as any,
      businessDescription: profile.businessDescription,
      targetAudience: profile.targetAudience,
      defaultGreeting: profile.defaultGreeting,
      qualificationEnabled: profile.qualificationEnabled,
      recommendationEnabled: profile.recommendationEnabled,
      humanHandoffEnabled: profile.humanHandoffEnabled,
      metadata: (profile.metadata as any) || null,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  /**
   * 11. Get staff sales dashboard metrics foundation.
   */
  async getDashboardMetrics(
    organisationId: string,
    outletId?: string,
  ): Promise<SalesDashboardMetricsDto> {
    const whereOrg = {
      organisationId,
      ...(outletId ? { outletId } : {}),
    };

    const [
      activeCount,
      newLeadsCount,
      qualifiedLeadsCount,
      highIntentLeadsCount,
      pendingHandoffsCount,
      trialActionsCount,
      tourActionsCount,
      conversations,
    ] = await Promise.all([
      this.prisma.salesConversation.count({
        where: { ...whereOrg, status: { in: ['ACTIVE', 'QUALIFYING', 'RECOMMENDING'] } },
      }),
      this.prisma.lead.count({
        where: { ...whereOrg, status: 'NEW' },
      }),
      this.prisma.lead.count({
        where: { ...whereOrg, status: 'QUALIFIED' },
      }),
      this.prisma.lead.count({
        where: { ...whereOrg, score: { gte: 70 } },
      }),
      this.prisma.salesHandoff.count({
        where: { ...whereOrg, status: 'PENDING' },
      }),
      this.prisma.salesNextAction.count({
        where: { ...whereOrg, actionType: 'BOOK_TRIAL' },
      }),
      this.prisma.salesNextAction.count({
        where: { ...whereOrg, actionType: 'BOOK_TOUR' },
      }),
      this.prisma.salesConversation.findMany({
        where: whereOrg,
        select: { status: true, currentIntent: true },
      }),
    ]);

    const conversationsByStatus: Record<string, number> = {};
    const conversationsByIntent: Record<string, number> = {};

    for (const c of conversations) {
      conversationsByStatus[c.status] = (conversationsByStatus[c.status] || 0) + 1;
      if (c.currentIntent) {
        conversationsByIntent[c.currentIntent] = (conversationsByIntent[c.currentIntent] || 0) + 1;
      }
    }

    return {
      activeConversations: activeCount,
      newLeads: newLeadsCount,
      qualifiedLeads: qualifiedLeadsCount,
      highIntentLeads: highIntentLeadsCount,
      pendingHandoffs: pendingHandoffsCount,
      trialRequests: trialActionsCount,
      tourRequests: tourActionsCount,
      unresolvedConversations: activeCount + pendingHandoffsCount,
      conversationsByStatus,
      conversationsByIntent,
    };
  }

  /**
   * 12. Staff Lead View: Lead -> Summary -> Needs -> Qualification -> Recommendation -> Next Action.
   */
  async getStaffLeadSummary(
    organisationId: string,
    leadId: string,
  ): Promise<StaffLeadSummaryDto> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, organisationId },
      include: {
        qualificationProfile: true,
        salesConversations: {
          orderBy: { lastActivityAt: 'desc' },
          include: {
            recommendations: {
              orderBy: { createdAt: 'desc' },
              include: { recommendedPlan: true },
            },
            nextActions: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException(`Lead ${leadId} not found in organisation`);
    }

    const qual = lead.qualificationProfile;
    const latestConv = lead.salesConversations[0] || null;

    // Find latest recommendation across all conversations of this lead
    let latestRec = null;
    for (const conv of lead.salesConversations) {
      if (conv.recommendations && conv.recommendations.length > 0) {
        latestRec = conv.recommendations[0];
        break;
      }
    }

    // Find latest next action across all conversations of this lead
    // Prefer EXECUTED action if available, or newest action
    let latestAct = null;
    for (const conv of lead.salesConversations) {
      const executed = conv.nextActions?.find((a) => a.status === 'EXECUTED');
      if (executed) {
        latestAct = executed;
        break;
      }
    }
    if (!latestAct) {
      for (const conv of lead.salesConversations) {
        if (conv.nextActions && conv.nextActions.length > 0) {
          latestAct = conv.nextActions[0];
          break;
        }
      }
    }

    // Resolve discovered needs across conversations, aggregating goals and preferring richer data
    const goalsSet = new Set<string>((qual?.goals as string[]) || []);
    const interestSet = new Set<string>((qual?.serviceInterests as string[]) || []);
    let experience = qual?.experienceLevel || null;
    let schedule = qual?.preferredSchedule ? { preferredTime: qual.preferredSchedule } : null;
    let budget = qual?.priceSensitivity || null;
    let readiness = qual?.readiness || null;

    for (const conv of lead.salesConversations) {
      if (Array.isArray(conv.discoveredGoals)) {
        for (const g of conv.discoveredGoals) {
          if (typeof g === 'string') goalsSet.add(g);
        }
      }
      if (Array.isArray(conv.discoveredServiceInterest)) {
        for (const si of conv.discoveredServiceInterest) {
          if (typeof si === 'string') interestSet.add(si);
        }
      }
      if (!experience && conv.discoveredExperience) {
        experience = conv.discoveredExperience;
      }
      if ((!schedule || !schedule.preferredTime) && conv.discoveredSchedule) {
        schedule = conv.discoveredSchedule as any;
      }
      if (!budget && conv.discoveredBudget) {
        budget = conv.discoveredBudget;
      }
      if (!readiness && conv.discoveredReadiness) {
        readiness = conv.discoveredReadiness;
      }
    }

    const goals = Array.from(goalsSet);
    const serviceInterest = Array.from(interestSet);

    return {
      leadId: lead.id,
      organisationId: lead.organisationId,
      outletId: lead.outletId,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      status: lead.status,
      score: lead.score,
      qualificationStatus: qual?.qualificationStatus || 'NOT_STARTED',
      discoveredNeeds: {
        goals,
        experience,
        schedule,
        budget,
        readiness,
        serviceInterest,
      },
      recommendedPlan: latestRec?.recommendedPlan
        ? {
            id: latestRec.recommendedPlan.id,
            name: latestRec.recommendedPlan.name,
            price: Number(latestRec.recommendedPlan.price),
            currency: latestRec.recommendedPlan.currency,
            billingPeriod: `${latestRec.recommendedPlan.durationValue} ${latestRec.recommendedPlan.durationUnit.toLowerCase()}`,
            reason: latestRec.reason,
            supportingFactors: (latestRec.supportingFactors as string[]) || [],
            limitations: (latestRec.limitations as string[]) || [],
          }
        : latestRec
        ? {
            id: latestRec.recommendedPlanId || 'plan_strength_standard',
            name: 'Gold Strength & Class Access',
            price: 69,
            currency: 'AUD',
            billingPeriod: '1 month',
            reason: latestRec.reason,
            supportingFactors: (latestRec.supportingFactors as string[]) || [],
            limitations: (latestRec.limitations as string[]) || [],
          }
        : null,
      nextBestAction: latestAct
        ? {
            actionType: latestAct.actionType as any,
            status: latestAct.status as any,
            reason: latestAct.reason,
          }
        : null,
      latestConversationSummary: latestConv?.conversationSummary || null,
      assignedStaffId: lead.assignedStaffId,
      lastInteractionAt: lead.lastInteractionAt,
    };
  }

  private mapConversationToDto(c: any): SalesConversationDto {
    return {
      id: c.id,
      organisationId: c.organisationId,
      outletId: c.outletId,
      salesAgentProfileId: c.salesAgentProfileId,
      leadId: c.leadId,
      channel: c.channel,
      status: c.status,
      currentIntent: c.currentIntent,
      conversationSummary: c.conversationSummary,
      discoveredGoals: c.discoveredGoals || null,
      discoveredExperience: c.discoveredExperience || null,
      discoveredSchedule: c.discoveredSchedule || null,
      discoveredBudget: c.discoveredBudget || null,
      discoveredReadiness: c.discoveredReadiness || null,
      discoveredServiceInterest: c.discoveredServiceInterest || null,
      lastActivityAt: c.lastActivityAt,
      startedAt: c.startedAt,
      completedAt: c.completedAt,
      metadata: c.metadata || null,
      messages: c.messages?.map((m: any) => ({
        id: m.id,
        conversationId: m.conversationId,
        direction: m.direction,
        role: m.role,
        content: m.content,
        language: m.language,
        intent: m.intent,
        metadata: m.metadata || null,
        createdAt: m.createdAt,
      })),
      recommendations: c.recommendations?.map((r: any) => ({
        id: r.id,
        conversationId: r.conversationId,
        organisationId: r.organisationId,
        outletId: r.outletId,
        leadId: r.leadId,
        recommendationType: r.recommendationType,
        recommendedPlanId: r.recommendedPlanId,
        recommendedPlanName: r.recommendedPlan?.name || null,
        recommendedService: r.recommendedService,
        reason: r.reason,
        supportingFactors: r.supportingFactors || [],
        limitations: r.limitations || [],
        confidence: r.confidence,
        nextBestAction: r.nextBestAction,
        requiresHumanReview: r.requiresHumanReview,
        createdAt: r.createdAt,
      })),
      nextActions: c.nextActions?.map((a: any) => ({
        id: a.id,
        conversationId: a.conversationId,
        organisationId: a.organisationId,
        outletId: a.outletId,
        leadId: a.leadId,
        actionType: a.actionType,
        status: a.status,
        reason: a.reason,
        payload: a.payload || null,
        executedAt: a.executedAt || null,
        createdAt: a.createdAt,
      })),
      handoffs: c.handoffs?.map((h: any) => ({
        id: h.id,
        conversationId: h.conversationId,
        organisationId: h.organisationId,
        outletId: h.outletId,
        leadId: h.leadId,
        reason: h.reason,
        priority: h.priority,
        status: h.status,
        assignedStaffId: h.assignedStaffId,
        assignedStaffName: h.assignedStaff?.displayName || null,
        notes: h.notes,
        customerSummary: h.customerSummary,
        resolvedAt: h.resolvedAt,
        createdAt: h.createdAt,
        updatedAt: h.updatedAt,
      })),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }
}
