/**
 * Day 31 — Receptionist Tool Registry
 * Defines tool calling schemas, validates permissions, and dispatches read-only tool executions.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ToolPermissionService } from './tool-permission.service';
import { OrganisationTools } from './organisation-tools';
import { ClassTools } from './class-tools';
import { TrainerTools } from './trainer-tools';
import { MembershipTools } from './membership-tools';
import { KnowledgeRetrievalService } from '../knowledge/knowledge-retrieval.service';

export interface ReceptionistToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

@Injectable()
export class ReceptionistToolRegistry {
  private readonly logger = new Logger(ReceptionistToolRegistry.name);

  constructor(
    private readonly permissionService: ToolPermissionService,
    private readonly orgTools: OrganisationTools,
    private readonly classTools: ClassTools,
    private readonly trainerTools: TrainerTools,
    private readonly membershipTools: MembershipTools,
    private readonly knowledgeRetrieval: KnowledgeRetrievalService,
  ) {}

  getToolDefinitions(): ReceptionistToolDefinition[] {
    return [
      {
        name: 'lookup_gym_info',
        description: 'Lookup organisation contact, location, and facility overview.',
        parameters: {
          type: 'object',
          properties: {
            outletId: { type: 'string', description: 'Optional specific outlet ID' },
          },
        },
      },
      {
        name: 'lookup_operating_hours',
        description: 'Lookup standard operating hours and holiday schedules for gym outlets.',
        parameters: {
          type: 'object',
          properties: {
            outletId: { type: 'string', description: 'Optional specific outlet ID' },
          },
        },
      },
      {
        name: 'lookup_classes',
        description: 'Lookup available group exercise classes, duration, and descriptions.',
        parameters: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Optional category (e.g. Yoga, HIIT)' },
          },
        },
      },
      {
        name: 'lookup_class_schedule',
        description: 'Lookup scheduled class times and instructor names for a specific date.',
        parameters: {
          type: 'object',
          properties: {
            outletId: { type: 'string', description: 'Optional specific outlet ID' },
            date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
          },
        },
      },
      {
        name: 'lookup_trainers',
        description: 'Lookup certified personal trainers, bios, and coaching specializations.',
        parameters: {
          type: 'object',
          properties: {
            outletId: { type: 'string', description: 'Optional outlet ID filter' },
            specialty: { type: 'string', description: 'Optional specialty filter' },
          },
        },
      },
      {
        name: 'lookup_membership_plans',
        description: 'Lookup available membership tiers, pricing, and perks.',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'lookup_pricing',
        description: 'Lookup full pricing matrix, guest passes, and free trial options.',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'lookup_knowledge_source',
        description: 'Search official gym knowledge base for policies, FAQs, parking, or amenities.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query or topic to find' },
            outletId: { type: 'string', description: 'Optional outlet ID' },
          },
          required: ['query'],
        },
      },
    ];
  }

  async executeTool(
    toolName: string,
    organisationId: string,
    input: Record<string, any>,
  ): Promise<{ status: 'SUCCESS' | 'BLOCKED' | 'FAILED'; output: any; error?: string }> {
    try {
      this.permissionService.validateToolExecution(toolName, organisationId, input);

      let output: any;
      switch (toolName) {
        case 'lookup_gym_info':
          output = await this.orgTools.lookupGymInfo(organisationId, input.outletId);
          break;
        case 'lookup_operating_hours':
          output = await this.orgTools.lookupOperatingHours(organisationId, input.outletId);
          break;
        case 'lookup_classes':
          output = await this.classTools.lookupClasses(organisationId, input.category);
          break;
        case 'lookup_class_schedule':
          output = await this.classTools.lookupClassSchedule(organisationId, input.outletId, input.date);
          break;
        case 'lookup_trainers':
          output = await this.trainerTools.lookupTrainers(organisationId, input.outletId, input.specialty);
          break;
        case 'lookup_membership_plans':
          output = await this.membershipTools.lookupMembershipPlans(organisationId);
          break;
        case 'lookup_pricing':
          output = await this.membershipTools.lookupPricing(organisationId);
          break;
        case 'lookup_knowledge_source':
          output = await this.knowledgeRetrieval.retrieveKnowledge({
            organisationId,
            outletId: input.outletId,
            query: input.query || '',
          });
          break;
        default:
          return {
            status: 'BLOCKED',
            output: {},
            error: `Unknown tool: ${toolName}`,
          };
      }

      return { status: 'SUCCESS', output };
    } catch (err: any) {
      this.logger.error(`Tool execution error for ${toolName}: ${err.message}`);
      return {
        status: err.status === 403 ? 'BLOCKED' : 'FAILED',
        output: {},
        error: err.message,
      };
    }
  }
}
