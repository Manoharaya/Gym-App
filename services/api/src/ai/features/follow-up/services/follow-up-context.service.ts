/**
 * Day 39 — Follow-Up Context Service
 * Assembles safe, bounded personalization context from Lead, Opportunity, and Day 38 Qualification.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';

export interface FollowUpPersonalizationContext {
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone?: string;
  outletName: string;
  outletAddress?: string;
  outletCity?: string;
  primaryGoal?: string;
  secondaryGoals?: string[];
  experienceLevel?: string;
  preferredSchedule?: string;
  preferredTimes?: string[];
  preferredDays?: string[];
  readiness?: string;
  budgetSensitivity?: string;
  objectionSummary?: string;
  opportunityTitle?: string;
  pipelineStage?: string;
  assignedStaffName?: string;
  membershipInterest?: string;
  customVariables?: Record<string, any>;
}

@Injectable()
export class FollowUpContextService {
  private readonly logger = new Logger(FollowUpContextService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assembles safe context from database entities for template rendering and AI assistance.
   */
  async assembleContext(
    organisationId: string,
    leadId?: string,
    opportunityId?: string,
    customVariables?: Record<string, any>,
  ): Promise<FollowUpPersonalizationContext> {
    let lead: any = null;
    let opportunity: any = null;

    if (leadId) {
      lead = await this.prisma.lead.findFirst({
        where: { id: leadId, organisationId },
        include: {
          outlet: true,
          assignedStaff: true,
          qualificationProfile: {
            include: {
              qualificationObjections: {
                where: { status: 'OPEN' },
                take: 1,
              },
            },
          },
        },
      });
    }

    if (opportunityId) {
      opportunity = await this.prisma.salesOpportunity.findFirst({
        where: { id: opportunityId, organisationId },
        include: {
          outlet: true,
          stage: true,
          ownerStaff: true,
          lead: {
            include: {
              outlet: true,
              assignedStaff: true,
              qualificationProfile: true,
            },
          },
        },
      });

      if (!lead && opportunity?.lead) {
        lead = opportunity.lead;
      }
    }

    const outlet = lead?.outlet || opportunity?.outlet;
    const profile = lead?.qualificationProfile;
    const goals = Array.isArray(profile?.goals) ? (profile?.goals as string[]) : [];

    const firstName = lead?.firstName || 'Friend';
    const lastName = lead?.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();

    return {
      firstName,
      lastName,
      fullName,
      email: lead?.email || undefined,
      phone: lead?.phone || undefined,
      outletName: outlet?.name || 'FitCore Performance Centre',
      outletAddress: outlet?.address || undefined,
      outletCity: outlet?.city || undefined,
      primaryGoal: goals[0] || (profile?.primaryGoal as string) || undefined,
      secondaryGoals: goals.slice(1),
      experienceLevel: (profile?.experienceLevel as string) || undefined,
      preferredSchedule: profile?.preferredSchedule || undefined,
      preferredTimes: (profile?.preferredTimes as string[]) || undefined,
      preferredDays: (profile?.preferredDays as string[]) || undefined,
      readiness: (profile?.readiness as string) || undefined,
      budgetSensitivity: (profile?.budgetSensitivity as string) || undefined,
      objectionSummary: profile?.qualificationObjections?.[0]?.normalizedSummary || undefined,
      opportunityTitle: opportunity?.title || undefined,
      pipelineStage: opportunity?.currentStage || undefined,
      assignedStaffName: lead?.assignedStaff?.displayName || opportunity?.ownerStaff?.displayName || undefined,
      membershipInterest: opportunity?.membershipInterest || undefined,
      customVariables: customVariables || {},
    };
  }

  /**
   * Safely replaces mustache-style `{{variable}}` placeholders in a template string.
   */
  renderTemplate(template: string, context: FollowUpPersonalizationContext): string {
    if (!template) return '';

    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
      if (key in context) {
        const val = (context as any)[key];
        return val !== undefined && val !== null ? String(val) : '';
      }
      if (context.customVariables && key in context.customVariables) {
        const val = context.customVariables[key];
        return val !== undefined && val !== null ? String(val) : '';
      }
      return match; // preserve unmapped variable if not found
    });
  }
}
