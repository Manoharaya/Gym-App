/**
 * Day 36 — AI Sales Context Aggregator
 * Builds a strictly controlled, verified business & lead context for the AI Sales Agent.
 * Excludes sensitive personal data (PAR-Q, payment credentials, medical records).
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { SalesBusinessTools } from '../tools/sales-business-tools';
import { SalesLeadTools } from '../tools/sales-lead-tools';
import { SalesAIContext } from '@fitcore/types';

@Injectable()
export class SalesContextService {
  private readonly logger = new Logger(SalesContextService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly businessTools: SalesBusinessTools,
    private readonly leadTools: SalesLeadTools,
  ) {}

  /**
   * Assemble bounded, verified SalesAIContext for an active conversation.
   */
  async buildSalesContext(
    organisationId: string,
    conversationId: string,
  ): Promise<SalesAIContext> {
    const conversation = await this.prisma.salesConversation.findFirst({
      where: { id: conversationId, organisationId },
      include: {
        lead: {
          include: {
            qualificationProfile: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Sales conversation ${conversationId} not found`);
    }

    // 1. Retrieve verified business information (organisation + outlet)
    const businessInfo = await this.businessTools.getBusinessInformation(
      organisationId,
      conversation.outletId || undefined,
    );

    // 2. Retrieve active public membership plans
    const plansResult = await this.businessTools.searchMembershipPlans(
      organisationId,
      { outletId: conversation.outletId || undefined },
    );

    // 3. Retrieve available classes
    const classesResult = await this.businessTools.searchClasses(
      organisationId,
      { outletId: conversation.outletId || undefined },
    );

    // 4. Retrieve trainer roster
    const trainersResult = await this.businessTools.getTrainerInformation(
      organisationId,
      { outletId: conversation.outletId || undefined },
    );

    // Format previous interaction turns in chronological order
    const previousInteractions = conversation.messages
      .reverse()
      .map((m) => ({
        role: m.role.toLowerCase(),
        content: m.content,
        createdAt: m.createdAt,
      }));

    const qual = conversation.lead?.qualificationProfile;

    return {
      organisationId,
      outletId: conversation.outletId || undefined,
      leadId: conversation.leadId,
      conversationId: conversation.id,
      currentIntent: conversation.currentIntent as any,
      discoveredGoals: (conversation.discoveredGoals as string[]) || (qual?.goals as string[]) || [],
      discoveredExperience: conversation.discoveredExperience || qual?.experienceLevel || undefined,
      discoveredSchedule: (conversation.discoveredSchedule as any) || {
        preferredTime: qual?.preferredSchedule || undefined,
      },
      discoveredBudget: conversation.discoveredBudget || qual?.priceSensitivity || undefined,
      discoveredReadiness: conversation.discoveredReadiness || qual?.readiness || undefined,
      discoveredServiceInterest:
        (conversation.discoveredServiceInterest as string[]) || (qual?.serviceInterests as string[]) || [],
      verifiedBusinessInfo: {
        name: businessInfo.name,
        country: businessInfo.country,
        currency: businessInfo.currency,
        timezone: businessInfo.timezone,
        operatingHours: businessInfo.targetOutlet || '06:00 - 22:00',
        facilities: businessInfo.facilities,
        policies: businessInfo.policies,
      },
      verifiedMembershipPlans: plansResult.plans.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        currency: p.currency,
        durationValue: p.durationValue,
        durationUnit: p.durationUnit,
        membershipType: p.membershipType,
        description: p.description,
        entitlements: p.entitlements.map((e) => e.name),
        isPublic: true,
      })),
      verifiedClasses: classesResult.classes.map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        description: c.description || undefined,
        durationMinutes: c.durationMinutes,
      })),
      verifiedTrainers: trainersResult.trainers.map((t) => ({
        id: t.id,
        displayName: t.displayName,
        specialties: t.specialties,
        bio: t.bio || undefined,
      })),
      availableNextSteps: [
        'BOOK_TRIAL',
        'BOOK_TOUR',
        'BOOK_CLASS',
        'REQUEST_CALLBACK',
        'CONNECT_WITH_STAFF',
        'VIEW_MEMBERSHIP_OPTIONS',
      ],
      previousInteractions,
    };
  }
}
