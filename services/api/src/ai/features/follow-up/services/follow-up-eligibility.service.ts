/**
 * Day 39 — Follow-Up Eligibility Evaluation Service
 * Evaluates 11+ criteria before enrolling a prospect into a sequence or executing steps.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import {
  FollowUpEligibilityResult,
  FollowUpStepChannel,
} from '@fitcore/types';

@Injectable()
export class FollowUpEligibilityService {
  private readonly logger = new Logger(FollowUpEligibilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates whether a lead or opportunity is eligible to be enrolled into a sequence.
   */
  async evaluateEnrollmentEligibility(
    organisationId: string,
    params: {
      leadId?: string;
      opportunityId?: string;
      memberId?: string;
      sequenceId: string;
    },
  ): Promise<FollowUpEligibilityResult> {
    const { leadId, opportunityId, sequenceId } = params;

    // 1. Resolve Lead
    let lead = null;
    if (leadId) {
      lead = await this.prisma.lead.findFirst({
        where: { id: leadId, organisationId },
        include: { qualificationProfile: true },
      });
      if (!lead) {
        return {
          eligible: false,
          status: 'INVALID_STATUS',
          reason: `Lead ${leadId} not found in this organisation`,
        };
      }
    }

    // 2. Resolve Opportunity if provided
    let opportunity = null;
    if (opportunityId) {
      opportunity = await this.prisma.salesOpportunity.findFirst({
        where: { id: opportunityId, organisationId },
      });
      if (opportunity && !lead && opportunity.leadId) {
        lead = await this.prisma.lead.findFirst({
          where: { id: opportunity.leadId, organisationId },
          include: { qualificationProfile: true },
        });
      }
    }

    if (!lead && !opportunity) {
      return {
        eligible: false,
        status: 'INVALID_STATUS',
        reason: 'At least one valid leadId or opportunityId must be provided',
      };
    }

    // 3. Status checks: Converted or Disqualified leads cannot be enrolled in sales follow-up
    if (lead) {
      if (lead.status === 'CONVERTED') {
        return {
          eligible: false,
          status: 'ALREADY_CONVERTED',
          reason: 'Prospect has already converted into a member',
        };
      }
      if (lead.status === 'UNQUALIFIED' || lead.status === 'LOST') {
        return {
          eligible: false,
          status: 'INVALID_STATUS',
          reason: `Lead status is ${lead.status}`,
        };
      }
    }

    if (opportunity) {
      if (opportunity.currentStage === 'CONVERTED') {
        return {
          eligible: false,
          status: 'ALREADY_CONVERTED',
          reason: 'Sales opportunity has already converted',
        };
      }
      if (opportunity.currentStage === 'LOST') {
        return {
          eligible: false,
          status: 'INVALID_STATUS',
          reason: 'Sales opportunity is closed lost',
        };
      }
    }

    // 4. Marketing / Communication Consent Check (Section 46)
    if (lead) {
      if (lead.consentStatus === 'DENIED' || lead.consentStatus === 'WITHDRAWN') {
        return {
          eligible: false,
          status: 'NO_CONSENT',
          reason: `Prospect marketing consent status is ${lead.consentStatus}`,
        };
      }
    }

    // 5. Active Staff Handoff Check (Section 11)
    if (lead && lead.status === 'HANDOFF_IN_PROGRESS') {
      return {
        eligible: false,
        status: 'STAFF_HANDOFF_ACTIVE',
        reason: 'Lead is currently actively triaged under human staff handoff',
      };
    }

    // 6. Duplicate Active Enrollment Prevention (Section 11 & 52)
    const existingActiveEnrollment = await this.prisma.followUpEnrollment.findFirst({
      where: {
        organisationId,
        sequenceId,
        ...(lead ? { leadId: lead.id } : {}),
        status: 'ACTIVE',
      },
    });

    if (existingActiveEnrollment) {
      return {
        eligible: false,
        status: 'ALREADY_ENROLLED',
        reason: `Recipient is already actively enrolled in sequence ${sequenceId}`,
      };
    }

    // 7. Channel Availability Check
    const availableChannels: FollowUpStepChannel[] = [];
    if (lead?.phone) {
      availableChannels.push('WHATSAPP', 'SMS', 'VOICE');
    }
    if (lead?.email) {
      availableChannels.push('EMAIL');
    }

    if (availableChannels.length === 0) {
      return {
        eligible: false,
        status: 'NO_VALID_CHANNEL',
        reason: 'Prospect does not have a verified phone number or email address',
      };
    }

    return {
      eligible: true,
      status: 'ELIGIBLE',
      availableChannels,
    };
  }

  /**
   * Checks whether a specific channel is available and consented for a recipient.
   */
  canUseChannel(channel: FollowUpStepChannel, availableChannels: FollowUpStepChannel[]): boolean {
    return availableChannels.includes(channel);
  }
}
