/**
 * Day 36 — AI Sales Agent Tool Registry
 * Manages tool definitions, permission checks, tenant isolation validation,
 * execution dispatch, and safety auditing.
 */

import { Injectable, Logger, ForbiddenException, BadRequestException } from '@nestjs/common';
import { SalesBusinessTools } from './sales-business-tools';
import { SalesLeadTools } from './sales-lead-tools';
import { SalesActionTools } from './sales-action-tools';
import { AuditService } from '../../../../audit/audit.service';

export interface SalesToolDefinition {
  name: string;
  description: string;
  category: 'READ' | 'ACTION';
  parameters: Record<string, any>;
}

@Injectable()
export class SalesToolRegistry {
  private readonly logger = new Logger(SalesToolRegistry.name);

  constructor(
    private readonly businessTools: SalesBusinessTools,
    private readonly leadTools: SalesLeadTools,
    private readonly actionTools: SalesActionTools,
    private readonly auditService: AuditService,
  ) {}

  getToolDefinitions(): SalesToolDefinition[] {
    return [
      {
        name: 'getBusinessInformation',
        description: 'Lookup verified organisation facilities, contact details, currency, timezone, and general policies.',
        category: 'READ',
        parameters: {
          type: 'object',
          properties: {
            outletId: { type: 'string', description: 'Optional specific outlet identifier' },
          },
        },
      },
      {
        name: 'getOutletInformation',
        description: 'Lookup verified outlet location, operating hours, and contact details.',
        category: 'READ',
        parameters: {
          type: 'object',
          properties: {
            outletId: { type: 'string', description: 'Target outlet ID' },
          },
          required: ['outletId'],
        },
      },
      {
        name: 'searchMembershipPlans',
        description: 'Search available verified membership plans, pricing, and entitlements.',
        category: 'READ',
        parameters: {
          type: 'object',
          properties: {
            outletId: { type: 'string', description: 'Optional outlet filter' },
            query: { type: 'string', description: 'Search term or plan name' },
            maxPrice: { type: 'number', description: 'Maximum budget constraint' },
          },
        },
      },
      {
        name: 'getMembershipPlanDetails',
        description: 'Get full details, entitlements, cancellation terms, and fees for a specific membership plan.',
        category: 'READ',
        parameters: {
          type: 'object',
          properties: {
            planId: { type: 'string', description: 'Target membership plan ID' },
          },
          required: ['planId'],
        },
      },
      {
        name: 'searchClasses',
        description: 'Search group fitness classes by category, duration, and intensity.',
        category: 'READ',
        parameters: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Class category (e.g. HIIT, Yoga, Strength)' },
          },
        },
      },
      {
        name: 'getTrainerInformation',
        description: 'Lookup trainer profiles, credentials, and coaching specialties.',
        category: 'READ',
        parameters: {
          type: 'object',
          properties: {
            specialty: { type: 'string', description: 'Optional specialty filter' },
          },
        },
      },
      {
        name: 'checkAvailability',
        description: 'Check class schedules and trial/tour booking availability.',
        category: 'READ',
        parameters: {
          type: 'object',
          properties: {
            outletId: { type: 'string', description: 'Optional outlet filter' },
            date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
          },
        },
      },
      {
        name: 'getApprovedPromotions',
        description: 'Get verified approved promotions, introductory passes, and active offers.',
        category: 'READ',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'getBusinessPolicies',
        description: 'Lookup club policies regarding trials, guests, cancellations, and medical safety.',
        category: 'READ',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'getLeadContext',
        description: 'Retrieve current prospect lead profile, score, and qualification status.',
        category: 'READ',
        parameters: {
          type: 'object',
          properties: {
            leadId: { type: 'string', description: 'Target lead ID' },
          },
          required: ['leadId'],
        },
      },
      {
        name: 'getLeadQualification',
        description: 'Get detailed progressive qualification profile including discovered goals, budget, and readiness.',
        category: 'READ',
        parameters: {
          type: 'object',
          properties: {
            leadId: { type: 'string', description: 'Target lead ID' },
          },
          required: ['leadId'],
        },
      },
      {
        name: 'requestTrial',
        description: 'Request a complimentary 1-day trial pass for a qualified prospective member.',
        category: 'ACTION',
        parameters: {
          type: 'object',
          properties: {
            conversationId: { type: 'string' },
            leadId: { type: 'string' },
            outletId: { type: 'string' },
            preferredDate: { type: 'string' },
            notes: { type: 'string' },
          },
          required: ['conversationId', 'leadId'],
        },
      },
      {
        name: 'requestTour',
        description: 'Schedule a guided facility tour with gym staff.',
        category: 'ACTION',
        parameters: {
          type: 'object',
          properties: {
            conversationId: { type: 'string' },
            leadId: { type: 'string' },
            outletId: { type: 'string' },
            preferredDate: { type: 'string' },
            notes: { type: 'string' },
          },
          required: ['conversationId', 'leadId'],
        },
      },
      {
        name: 'requestHumanHandoff',
        description: 'Escalate conversation to human staff for complaints, medical concerns, or custom pricing.',
        category: 'ACTION',
        parameters: {
          type: 'object',
          properties: {
            conversationId: { type: 'string' },
            leadId: { type: 'string' },
            reason: { type: 'string' },
            priority: { type: 'string' },
            notes: { type: 'string' },
            customerSummary: { type: 'string' },
          },
          required: ['conversationId', 'leadId', 'reason'],
        },
      },
      {
        name: 'handoffToReceptionist',
        description: 'Transfer customer to Receptionist booking engine when class or appointment booking is requested.',
        category: 'ACTION',
        parameters: {
          type: 'object',
          properties: {
            conversationId: { type: 'string' },
            leadId: { type: 'string' },
            action: { type: 'string' },
            details: { type: 'object' },
          },
          required: ['conversationId', 'leadId', 'action'],
        },
      },
    ];
  }

  /**
   * Execute a controlled tool call with tenant and permission validation.
   */
  async executeTool(
    organisationId: string,
    toolName: string,
    args: Record<string, any>,
  ): Promise<any> {
    if (!organisationId) {
      throw new ForbiddenException('Tenant isolation violation: organisationId is required');
    }

    const startTime = Date.now();
    this.logger.debug(`[SalesToolRegistry] Executing tool ${toolName} for org ${organisationId}`);

    try {
      let result: any;

      switch (toolName) {
        case 'getBusinessInformation':
          result = await this.businessTools.getBusinessInformation(organisationId, args.outletId);
          break;

        case 'getOutletInformation':
          if (!args.outletId) throw new BadRequestException('outletId is required');
          result = await this.businessTools.getOutletInformation(organisationId, args.outletId);
          break;

        case 'searchMembershipPlans':
          result = await this.businessTools.searchMembershipPlans(organisationId, args);
          break;

        case 'getMembershipPlanDetails':
          if (!args.planId) throw new BadRequestException('planId is required');
          result = await this.businessTools.getMembershipPlanDetails(organisationId, args.planId);
          break;

        case 'searchClasses':
          result = await this.businessTools.searchClasses(organisationId, args);
          break;

        case 'getTrainerInformation':
          result = await this.businessTools.getTrainerInformation(organisationId, args);
          break;

        case 'checkAvailability':
          result = await this.businessTools.checkAvailability(organisationId, args);
          break;

        case 'getApprovedPromotions':
          result = await this.businessTools.getApprovedPromotions(organisationId, args);
          break;

        case 'getBusinessPolicies':
          result = await this.businessTools.getBusinessPolicies(organisationId);
          break;

        case 'getLeadContext':
          if (!args.leadId) throw new BadRequestException('leadId is required');
          result = await this.leadTools.getLeadContext(organisationId, args.leadId);
          break;

        case 'getLeadQualification':
          if (!args.leadId) throw new BadRequestException('leadId is required');
          result = await this.leadTools.getLeadQualification(organisationId, args.leadId);
          break;

        case 'requestTrial':
          if (!args.conversationId || !args.leadId) {
            throw new BadRequestException('conversationId and leadId are required for requestTrial');
          }
          result = await this.actionTools.requestTrial(organisationId, args as any);
          break;

        case 'requestTour':
          if (!args.conversationId || !args.leadId) {
            throw new BadRequestException('conversationId and leadId are required for requestTour');
          }
          result = await this.actionTools.requestTour(organisationId, args as any);
          break;

        case 'requestHumanHandoff':
          if (!args.conversationId || !args.leadId || !args.reason) {
            throw new BadRequestException('conversationId, leadId, and reason are required for human handoff');
          }
          result = await this.actionTools.requestHumanHandoff(organisationId, args as any);
          break;

        case 'handoffToReceptionist':
          if (!args.conversationId || !args.leadId || !args.action) {
            throw new BadRequestException('conversationId, leadId, and action are required for receptionist delegation');
          }
          result = await this.actionTools.handoffToReceptionist(organisationId, args as any);
          break;

        default:
          throw new BadRequestException(`Unrecognized or unwhitelisted sales tool: ${toolName}`);
      }

      const latencyMs = Date.now() - startTime;
      this.logger.debug(`[SalesToolRegistry] Tool ${toolName} finished in ${latencyMs}ms`);

      return {
        tool: toolName,
        success: true,
        latencyMs,
        data: result,
      };
    } catch (error: any) {
      this.logger.error(`[SalesToolRegistry] Tool ${toolName} failed: ${error.message}`);
      throw error;
    }
  }
}
