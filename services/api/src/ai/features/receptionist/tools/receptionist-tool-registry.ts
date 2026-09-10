/**
 * Day 32 — Receptionist Tool Registry
 * Defines tool calling schemas, validates permissions, and dispatches both read-only
 * discovery tools and controlled booking mutation tools.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ToolPermissionService } from './tool-permission.service';
import { OrganisationTools } from './organisation-tools';
import { ClassTools } from './class-tools';
import { TrainerTools } from './trainer-tools';
import { MembershipTools } from './membership-tools';
import { KnowledgeRetrievalService } from '../knowledge/knowledge-retrieval.service';
import { BookingSearchTool } from './booking-search.tool';
import { BookingDetailsTool } from './booking-details.tool';
import { BookingCreateTool } from './booking-create.tool';
import { BookingCancelTool } from './booking-cancel.tool';
import { BookingRescheduleTool } from './booking-reschedule.tool';
import { BookingWaitlistTool } from './booking-waitlist.tool';
import { LeadTools } from './lead-tools';

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
    private readonly bookingSearchTool: BookingSearchTool,
    private readonly bookingDetailsTool: BookingDetailsTool,
    private readonly bookingCreateTool: BookingCreateTool,
    private readonly bookingCancelTool: BookingCancelTool,
    private readonly bookingRescheduleTool: BookingRescheduleTool,
    private readonly bookingWaitlistTool: BookingWaitlistTool,
    private readonly leadTools: LeadTools,
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
      // Day 32 — Booking Discovery & Management Tools
      {
        name: 'search_class_availability',
        description: 'Search real-time class availability, remaining spots, waitlist status, and schedules across outlets.',
        parameters: {
          type: 'object',
          properties: {
            outletId: { type: 'string', description: 'Optional specific outlet ID filter' },
            className: { type: 'string', description: 'Optional class title filter (e.g. HIIT, Yoga)' },
            category: { type: 'string', description: 'Optional category filter' },
            date: { type: 'string', description: 'Optional date (YYYY-MM-DD or relative like today, tomorrow)' },
            timeRange: {
              type: 'string',
              enum: ['MORNING', 'AFTERNOON', 'EVENING'],
              description: 'Optional time range filter',
            },
            trainerName: { type: 'string', description: 'Optional trainer name filter' },
            includeWaitlistOnly: { type: 'boolean', description: 'Whether to include waitlisted classes' },
          },
        },
      },
      {
        name: 'get_member_bookings',
        description: 'Retrieve upcoming or past class bookings for the authenticated member.',
        parameters: {
          type: 'object',
          properties: {
            memberProfileId: { type: 'string', description: 'The member profile ID' },
            upcomingOnly: { type: 'boolean', description: 'Filter to upcoming sessions only' },
          },
          required: ['memberProfileId'],
        },
      },
      {
        name: 'get_booking_details',
        description: 'Retrieve details for a single booking including cancellation eligibility and policy.',
        parameters: {
          type: 'object',
          properties: {
            bookingId: { type: 'string', description: 'The booking identifier' },
            memberProfileId: { type: 'string', description: 'The member profile ID' },
          },
          required: ['bookingId', 'memberProfileId'],
        },
      },
      {
        name: 'create_booking',
        description: 'Execute a confirmed class booking using a validated server-side confirmation token.',
        parameters: {
          type: 'object',
          properties: {
            memberProfileId: { type: 'string', description: 'The member profile ID' },
            confirmationToken: { type: 'string', description: 'Single-use cryptographic confirmation token' },
            notes: { type: 'string', description: 'Optional customer notes' },
          },
          required: ['memberProfileId', 'confirmationToken'],
        },
      },
      {
        name: 'cancel_booking',
        description: 'Execute a confirmed booking cancellation using a validated server-side confirmation token.',
        parameters: {
          type: 'object',
          properties: {
            memberProfileId: { type: 'string', description: 'The member profile ID' },
            confirmationToken: { type: 'string', description: 'Single-use cryptographic confirmation token' },
            reason: { type: 'string', description: 'Optional cancellation reason' },
          },
          required: ['memberProfileId', 'confirmationToken'],
        },
      },
      {
        name: 'reschedule_booking',
        description: 'Execute an atomic booking reschedule using a validated server-side confirmation token.',
        parameters: {
          type: 'object',
          properties: {
            memberProfileId: { type: 'string', description: 'The member profile ID' },
            confirmationToken: { type: 'string', description: 'Single-use cryptographic confirmation token' },
          },
          required: ['memberProfileId', 'confirmationToken'],
        },
      },
      {
        name: 'join_waitlist',
        description: 'Execute joining a class session waitlist using a validated server-side confirmation token.',
        parameters: {
          type: 'object',
          properties: {
            memberProfileId: { type: 'string', description: 'The member profile ID' },
            confirmationToken: { type: 'string', description: 'Single-use cryptographic confirmation token' },
            notes: { type: 'string', description: 'Optional notes' },
          },
          required: ['memberProfileId', 'confirmationToken'],
        },
      },
      // Day 33 — Lead Capture & Qualification Tools
      {
        name: 'get_lead',
        description: 'Retrieve lead contact and status details by lead identifier.',
        parameters: {
          type: 'object',
          properties: {
            leadId: { type: 'string', description: 'The unique lead identifier' },
          },
          required: ['leadId'],
        },
      },
      {
        name: 'get_lead_qualification',
        description: 'Retrieve qualification profile, goals, readiness, and objections for a lead.',
        parameters: {
          type: 'object',
          properties: {
            leadId: { type: 'string', description: 'The unique lead identifier' },
          },
          required: ['leadId'],
        },
      },
      {
        name: 'get_lead_history',
        description: 'Retrieve recent activity timeline and interactions for a lead.',
        parameters: {
          type: 'object',
          properties: {
            leadId: { type: 'string', description: 'The unique lead identifier' },
          },
          required: ['leadId'],
        },
      },
      {
        name: 'get_outlet_lead_information',
        description: 'Retrieve available membership plans, trial options, and club info for prospects.',
        parameters: {
          type: 'object',
          properties: {
            outletId: { type: 'string', description: 'Optional specific outlet identifier' },
          },
        },
      },
      {
        name: 'create_lead',
        description: 'Capture a new prospective customer lead from a conversation.',
        parameters: {
          type: 'object',
          properties: {
            outletId: { type: 'string', description: 'Optional outlet identifier' },
            firstName: { type: 'string', description: 'Optional first name' },
            lastName: { type: 'string', description: 'Optional last name' },
            email: { type: 'string', description: 'Optional email address' },
            phone: { type: 'string', description: 'Optional phone number' },
            preferredContactChannel: {
              type: 'string',
              enum: ['EMAIL', 'SMS', 'WHATSAPP', 'PHONE'],
              description: 'Optional preferred contact channel',
            },
            preferredLanguage: { type: 'string', description: 'Optional preferred language' },
            consentStatus: {
              type: 'string',
              enum: ['NOT_REQUESTED', 'GRANTED', 'DENIED', 'WITHDRAWN'],
              description: 'Consent status explicitly confirmed by the user',
            },
            originatingConversationId: { type: 'string', description: 'Conversation ID' },
            initialGoals: { type: 'array', items: { type: 'string' } },
            initialServiceInterests: { type: 'array', items: { type: 'string' } },
            initialReadiness: {
              type: 'string',
              enum: ['EXPLORING', 'INTERESTED', 'READY_TO_VISIT', 'READY_TO_TRY', 'READY_TO_JOIN'],
            },
          },
        },
      },
      {
        name: 'update_lead_contact',
        description: 'Update contact details or preferences for an existing lead.',
        parameters: {
          type: 'object',
          properties: {
            leadId: { type: 'string', description: 'The unique lead identifier' },
            firstName: { type: 'string', description: 'Updated first name' },
            lastName: { type: 'string', description: 'Updated last name' },
            email: { type: 'string', description: 'Updated email address' },
            phone: { type: 'string', description: 'Updated phone number' },
            preferredContactChannel: {
              type: 'string',
              enum: ['EMAIL', 'SMS', 'WHATSAPP', 'PHONE'],
            },
            consentStatus: {
              type: 'string',
              enum: ['NOT_REQUESTED', 'GRANTED', 'DENIED', 'WITHDRAWN'],
            },
          },
          required: ['leadId'],
        },
      },
      {
        name: 'update_lead_qualification',
        description: 'Update structured qualification signals (goals, interests, readiness, objections).',
        parameters: {
          type: 'object',
          properties: {
            leadId: { type: 'string', description: 'The unique lead identifier' },
            goals: { type: 'array', items: { type: 'string' } },
            serviceInterests: { type: 'array', items: { type: 'string' } },
            preferredOutletId: { type: 'string' },
            preferredSchedule: {
              type: 'string',
              enum: ['EARLY_MORNING', 'MORNING', 'AFTERNOON', 'EVENING', 'WEEKEND', 'FLEXIBLE', 'UNKNOWN'],
            },
            readiness: {
              type: 'string',
              enum: ['EXPLORING', 'INTERESTED', 'READY_TO_VISIT', 'READY_TO_TRY', 'READY_TO_JOIN', 'UNKNOWN'],
            },
            priceSensitivity: {
              type: 'string',
              enum: ['PRICE_SENSITIVE', 'VALUE_FOCUSED', 'FLEXIBLE', 'UNKNOWN'],
            },
            objections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  customerStatementSummary: { type: 'string' },
                },
              },
            },
            aiSummary: { type: 'string' },
          },
          required: ['leadId'],
        },
      },
      {
        name: 'request_lead_handoff',
        description: 'Escalate a lead inquiry to a human staff consultant or sales representative.',
        parameters: {
          type: 'object',
          properties: {
            leadId: { type: 'string', description: 'The unique lead identifier' },
            reason: { type: 'string', description: 'Reason for requesting human handoff' },
            notes: { type: 'string', description: 'Optional briefing notes for staff' },
          },
          required: ['leadId', 'reason'],
        },
      },
    ];
  }

  async executeTool(
    toolName: string,
    organisationId: string,
    input: Record<string, any>,
    context?: { memberProfileId?: string; isProspect?: boolean },
  ): Promise<{ status: 'SUCCESS' | 'BLOCKED' | 'FAILED'; output: any; error?: string }> {
    try {
      this.permissionService.validateToolExecution(toolName, organisationId, input, context);

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
        // Day 32 Booking Tools
        case 'search_class_availability':
          output = await this.bookingSearchTool.searchClassAvailability(organisationId, input);
          break;
        case 'get_member_bookings':
          output = await this.bookingDetailsTool.getMemberBookings(
            organisationId,
            input.memberProfileId || context?.memberProfileId,
            { upcomingOnly: input.upcomingOnly },
          );
          break;
        case 'get_booking_details':
          output = await this.bookingDetailsTool.getBookingDetails(
            organisationId,
            input.bookingId,
            input.memberProfileId || context?.memberProfileId,
          );
          break;
        case 'create_booking':
          output = await this.bookingCreateTool.createBooking(organisationId, {
            memberProfileId: input.memberProfileId || context?.memberProfileId,
            confirmationToken: input.confirmationToken,
            notes: input.notes,
            idempotencyKey: input.idempotencyKey,
          });
          break;
        case 'cancel_booking':
          output = await this.bookingCancelTool.cancelBooking(organisationId, {
            memberProfileId: input.memberProfileId || context?.memberProfileId,
            confirmationToken: input.confirmationToken,
            reason: input.reason,
          });
          break;
        case 'reschedule_booking':
          output = await this.bookingRescheduleTool.rescheduleBooking(organisationId, {
            memberProfileId: input.memberProfileId || context?.memberProfileId,
            confirmationToken: input.confirmationToken,
          });
          break;
        case 'join_waitlist':
          output = await this.bookingWaitlistTool.joinWaitlist(organisationId, {
            memberProfileId: input.memberProfileId || context?.memberProfileId,
            confirmationToken: input.confirmationToken,
            notes: input.notes,
          });
          break;
        // Day 33 Lead Tools
        case 'get_lead':
          output = await this.leadTools.getLead(organisationId, input.leadId);
          break;
        case 'get_lead_qualification':
          output = await this.leadTools.getLeadQualification(organisationId, input.leadId);
          break;
        case 'get_lead_history':
          output = await this.leadTools.getLeadHistory(organisationId, input.leadId);
          break;
        case 'get_outlet_lead_information':
          output = await this.leadTools.getOutletLeadInformation(organisationId, input.outletId);
          break;
        case 'create_lead':
          output = await this.leadTools.createLead(organisationId, input);
          break;
        case 'update_lead_contact':
          output = await this.leadTools.updateLeadContact(organisationId, input.leadId, input);
          break;
        case 'update_lead_qualification':
          output = await this.leadTools.updateLeadQualification(organisationId, input.leadId, input);
          break;
        case 'request_lead_handoff':
          output = await this.leadTools.requestLeadHandoff(organisationId, input.leadId, {
            reason: input.reason || 'Lead requested front-desk handoff',
            notes: input.notes,
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
