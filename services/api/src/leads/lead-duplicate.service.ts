/**
 * Day 33 — Lead Duplicate Detection Service
 * Normalizes contact signals (email, phone) and checks for duplicates against existing leads
 * and existing active members within the same organisation.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface DuplicateDetectionResult {
  type: 'NEW_LEAD' | 'EXISTING_LEAD' | 'EXISTING_MEMBER' | 'AMBIGUOUS_MATCH';
  existingLeadId?: string;
  existingMemberId?: string;
  matchedFields: string[];
  message: string;
}

@Injectable()
export class LeadDuplicateService {
  private readonly logger = new Logger(LeadDuplicateService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normalizes an email address (trim, lowercase).
   */
  normalizeEmail(email?: string | null): string | null {
    if (!email || typeof email !== 'string') return null;
    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmed) ? trimmed : null;
  }

  /**
   * Normalizes phone number into standard numeric format with optional country code.
   * Strips spaces, dashes, parentheses, dots.
   */
  normalizePhone(phone?: string | null): string | null {
    if (!phone || typeof phone !== 'string') return null;
    const stripped = phone.replace(/[\s\-\(\)\.]/g, '');
    // Ensure at least 7 digits
    const digitsOnly = stripped.replace(/[^\d+]/g, '');
    return digitsOnly.length >= 7 ? digitsOnly : null;
  }

  /**
   * Evaluates contact signals against existing Leads and MemberProfiles in the organisation.
   */
  async detectDuplicates(
    organisationId: string,
    contact: { email?: string | null; phone?: string | null },
  ): Promise<DuplicateDetectionResult> {
    const normEmail = this.normalizeEmail(contact.email);
    const normPhone = this.normalizePhone(contact.phone);

    if (!normEmail && !normPhone) {
      return {
        type: 'NEW_LEAD',
        matchedFields: [],
        message: 'No contact signals provided for duplicate matching.',
      };
    }

    const matchedFields: string[] = [];

    // 1. Check for Existing Member in the Organisation
    // MemberProfile is connected to User, which holds email and phone
    const memberConditions: any[] = [];
    if (normEmail) {
      memberConditions.push({ user: { email: normEmail } });
    }
    if (normPhone) {
      memberConditions.push({ user: { phone: normPhone } });
    }

    const matchedMembers = await this.prisma.memberProfile.findMany({
      where: {
        organisationId,
        OR: memberConditions,
      },
      select: {
        id: true,
        user: { select: { email: true, phone: true } },
      },
      take: 2,
    });

    if (matchedMembers.length === 1) {
      const member = matchedMembers[0];
      if (normEmail && member.user.email?.toLowerCase() === normEmail) {
        matchedFields.push('email');
      }
      if (normPhone && member.user.phone === normPhone) {
        matchedFields.push('phone');
      }

      this.logger.log(
        `[DUPLICATE] Contact matches existing member ${member.id} in org ${organisationId}`,
      );

      return {
        type: 'EXISTING_MEMBER',
        existingMemberId: member.id,
        matchedFields,
        message: 'Prospect contact information maps to an active organisation member.',
      };
    } else if (matchedMembers.length > 1) {
      return {
        type: 'AMBIGUOUS_MATCH',
        matchedFields: ['member_records'],
        message: 'Multiple existing members match the supplied contact signals.',
      };
    }

    // 2. Check for Existing Leads in the Organisation
    const leadConditions: any[] = [];
    if (normEmail) {
      leadConditions.push({ email: normEmail });
    }
    if (normPhone) {
      leadConditions.push({ phone: normPhone });
    }

    const matchedLeads = await this.prisma.lead.findMany({
      where: {
        organisationId,
        OR: leadConditions,
      },
      select: {
        id: true,
        email: true,
        phone: true,
      },
      take: 2,
    });

    if (matchedLeads.length === 1) {
      const lead = matchedLeads[0];
      if (normEmail && lead.email?.toLowerCase() === normEmail) {
        matchedFields.push('email');
      }
      if (normPhone && lead.phone === normPhone) {
        matchedFields.push('phone');
      }

      this.logger.log(`[DUPLICATE] Contact matches existing lead ${lead.id} in org ${organisationId}`);

      return {
        type: 'EXISTING_LEAD',
        existingLeadId: lead.id,
        matchedFields,
        message: 'Prospect matches an existing lead record.',
      };
    } else if (matchedLeads.length > 1) {
      return {
        type: 'AMBIGUOUS_MATCH',
        matchedFields: ['lead_records'],
        message: 'Multiple lead records match the supplied contact signals.',
      };
    }

    return {
      type: 'NEW_LEAD',
      matchedFields: [],
      message: 'No duplicate lead or member detected. Safe to create new lead.',
    };
  }
}
