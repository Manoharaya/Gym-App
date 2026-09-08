/**
 * Day 31 — Receptionist AI Execution Engine
 * Interfaces with AIOrchestratorService, handles tool executions, and returns validated receptionist responses.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { AIOrchestratorService } from '../../../orchestrator/ai-orchestrator.service';
import { RECEPTIONIST_OUTPUT_JSON_SCHEMA } from '../receptionist.schemas';
import { ReceptionistAggregatedContext } from '../receptionist.types';
import { ReceptionistSafetyService } from '../safety/receptionist-safety.service';
import { ReceptionistToolRegistry } from '../tools/receptionist-tool-registry';
import { ReceptionistResponseDto, ReceptionistIntent } from '@fitcore/types';

@Injectable()
export class ReceptionistAIService {
  private readonly logger = new Logger(ReceptionistAIService.name);

  constructor(
    private readonly orchestrator: AIOrchestratorService,
    private readonly safetyService: ReceptionistSafetyService,
    private readonly toolRegistry: ReceptionistToolRegistry,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generates a grounded, structured AI receptionist response.
   */
  async generateResponse(params: {
    organisationId: string;
    context: ReceptionistAggregatedContext;
    query: string;
    authenticatedUser?: any;
  }): Promise<{
    response: ReceptionistResponseDto;
    latencyMs: number;
    tokensUsed: number;
    costEstimate: number;
  }> {
    const { organisationId, context, query, authenticatedUser } = params;
    const startTime = Date.now();

    // 1. Compile context summary into prompt context
    const knowledgeSnippets = (context.retrievedKnowledge || [])
      .map((k) => `[${k.type}] ${k.title}:\n${k.content}`)
      .join('\n\n');

    const multiOutletNote = context.multiOutletContext.isMultiOutlet
      ? `Organisation operates multiple outlets: ${context.multiOutletContext.availableOutlets.map((o) => o.name).join(', ')}. Target outlet disambiguated: ${context.multiOutletContext.hasOutletDisambiguated ? context.outlet?.name : 'NO (AMBIGUOUS_OUTLET)'}.`
      : `Single outlet gym: ${context.outlet?.name || context.organisation.name}.`;

    const customerNote = context.customer.isAuthenticated
      ? `Authenticated Member: ${context.customer.customerName}, Status: ${context.customer.membershipStatus}, Home Outlet: ${context.customer.homeOutletName || 'None'}.`
      : `Guest / Prospect: ${context.customer.customerName || 'Anonymous visitor'}.`;

    const recentTranscript = (context.recentMessages || [])
      .slice(-6)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const promptContext = [
      `=== ORGANISATION DATA ===`,
      `Name: ${context.organisation.name}`,
      multiOutletNote,
      context.outlet ? `Current Outlet: ${context.outlet.name}, Address: ${context.outlet.address}, Hours: ${JSON.stringify(context.outlet.operatingHours)}` : '',
      `=== CUSTOMER CONTEXT ===`,
      customerNote,
      `=== RECENT TRANSCRIPT ===`,
      recentTranscript || '(Beginning of conversation)',
      `=== GROUNDED KNOWLEDGE SOURCES ===`,
      knowledgeSnippets || '(No specific knowledge articles retrieved for this query)',
      `=== USER INQUIRY ===`,
      query,
    ].filter(Boolean).join('\n\n');

    let structuredOutput: any = null;
    let tokensUsed = 40;
    let costEstimate = 0.0004;

    // Resolve a valid user ID for AIRequest tracking
    let executionUser = authenticatedUser;
    if (!executionUser || executionUser.id === 'receptionist_guest') {
      try {
        const existingRole = await this.prisma.userRole.findFirst({
          where: { organisationId },
          include: { user: true },
        });
        if (existingRole?.user) {
          executionUser = {
            id: existingRole.user.id,
            organisationId,
            roles: [{ role: 'MEMBER', organisationId }],
          };
        } else {
          const anyUser = await this.prisma.user.findFirst();
          if (anyUser) {
            executionUser = {
              id: anyUser.id,
              organisationId,
              roles: [{ role: 'MEMBER', organisationId }],
            };
          } else {
            const guestUser = await this.prisma.user.upsert({
              where: { email: `guest-${organisationId}@fitcore.internal` },
              update: {},
              create: {
                email: `guest-${organisationId}@fitcore.internal`,
                passwordHash: 'guest_hash',
                firstName: 'FitCore',
                lastName: 'Guest',
              },
            });
            executionUser = {
              id: guestUser.id,
              organisationId,
              roles: [{ role: 'MEMBER', organisationId }],
            };
          }
        }
      } catch (userErr: any) {
        this.logger.debug(`Could not resolve user for AIRequest: ${userErr.message}`);
      }
    }

    try {
      const orchestratorResult = await this.orchestrator.execute({
        feature: 'RECEPTIONIST' as any,
        prompt: promptContext,
        organisationId,
        user: executionUser || ({
          id: 'receptionist_guest',
          organisationId,
          roles: [{ role: 'MEMBER', organisationId }],
        } as any),
        promptKey: 'receptionist.v1',
        responseFormat: 'json',
        expectedSchema: RECEPTIONIST_OUTPUT_JSON_SCHEMA,
      });

      if (orchestratorResult.structuredOutput) {
        structuredOutput = orchestratorResult.structuredOutput;
      }
      tokensUsed = orchestratorResult.tokens?.totalTokens || 50;
      costEstimate = Number((tokensUsed * 0.00001).toFixed(6));
    } catch (err: any) {
      this.logger.warn(`AI Orchestration error, generating safe fallback: ${err.message}`);
      structuredOutput = {
        message: 'Thank you for reaching out to FitCore. How can I assist you with our memberships, classes, or facilities?',
        intent: 'GREETING',
        confidence: 0.85,
        requiresClarification: false,
        citations: [],
        handoffRecommended: false,
      };
    }

    const latencyMs = Math.max(10, Date.now() - startTime);

    // 2. Validate response with Safety Service
    const fallbackResponse: ReceptionistResponseDto = {
      message: structuredOutput?.message || 'Welcome to FitCore. How may I assist you today?',
      intent: (structuredOutput?.intent as ReceptionistIntent) || 'UNKNOWN',
      confidence: structuredOutput?.confidence ?? 0.9,
      requiresClarification: structuredOutput?.requiresClarification ?? false,
      suggestedNextStep: structuredOutput?.suggestedNextStep,
      citations: structuredOutput?.citations || [],
      toolResults: structuredOutput?.toolResults || [],
      handoffRecommended: structuredOutput?.handoffRecommended ?? false,
      safetyFlag: structuredOutput?.safetyFlag,
    };

    const { modifiedResponse } = this.safetyService.validateResponse(fallbackResponse, query);

    return {
      response: modifiedResponse,
      latencyMs,
      tokensUsed,
      costEstimate,
    };
  }
}
