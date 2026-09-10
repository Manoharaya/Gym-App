/**
 * Day 36 — AI Sales Qualification Bridge Service
 * Progressively qualifies prospects from conversational discoveries into Day 33's LeadQualificationProfile.
 * Zero hidden psychological profiling or sensitive attribute inference.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { LeadQualificationService } from '../../../../leads/lead-qualification.service';
import { LeadsService } from '../../../../leads/leads.service';
import {
  QualificationStatus,
  ReadinessLevel,
  PreferredSchedule,
  ExperienceLevel,
  PriceSensitivity,
} from '@fitcore/types';

export interface DiscoveredSignals {
  goals?: string[];
  experience?: string;
  schedule?: {
    frequency?: string;
    preferredTime?: string;
    preferredDays?: string[];
  };
  budget?: string;
  readiness?: string;
  serviceInterest?: string[];
}

@Injectable()
export class SalesQualificationService {
  private readonly logger = new Logger(SalesQualificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leadQualService: LeadQualificationService,
    private readonly leadsService: LeadsService,
  ) {}

  /**
   * Sync discovered prospect signals into the Day 33 LeadQualificationProfile.
   */
  async syncDiscoveryToQualification(
    organisationId: string,
    leadId: string,
    signals: DiscoveredSignals,
  ) {
    this.logger.debug(`[SalesQualificationService] Syncing discovery signals for lead ${leadId}`);

    // Map discovered schedule to PreferredSchedule enum
    let mappedSchedule: PreferredSchedule | undefined;
    if (signals.schedule?.preferredTime) {
      const t = signals.schedule.preferredTime.toUpperCase();
      if (t === 'EVENING' || t === 'MORNING' || t === 'EARLY_MORNING' || t === 'AFTERNOON' || t === 'WEEKEND') {
        mappedSchedule = t as PreferredSchedule;
      } else {
        mappedSchedule = 'FLEXIBLE';
      }
    }

    // Map experience
    let mappedExp: ExperienceLevel | undefined;
    if (signals.experience) {
      const e = signals.experience.toUpperCase();
      if (e === 'BEGINNER' || e === 'INTERMEDIATE' || e === 'ADVANCED') {
        mappedExp = e as ExperienceLevel;
      }
    }

    // Map readiness
    let mappedReadiness: ReadinessLevel | undefined;
    if (signals.readiness) {
      const r = signals.readiness.toUpperCase();
      if (
        r === 'EXPLORING' ||
        r === 'INTERESTED' ||
        r === 'READY_FOR_TRIAL' ||
        r === 'READY_TO_TRY' ||
        r === 'READY_TO_JOIN'
      ) {
        mappedReadiness = r === 'READY_FOR_TRIAL' ? 'READY_TO_TRY' : (r as ReadinessLevel);
      }
    }

    // Update qualification profile via Day 33 service
    const updated = await this.leadsService.updateQualification(
      organisationId,
      leadId,
      {
        goals: signals.goals,
        serviceInterests: signals.serviceInterest,
        preferredSchedule: mappedSchedule,
        experienceLevel: mappedExp,
        readiness: mappedReadiness,
        aiSummary: `Conversational discovery: goals=${signals.goals?.join(', ') || 'none'}, readiness=${
          signals.readiness || 'unknown'
        }`,
      },
    );

    // Update lead score via LeadsService
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { qualificationProfile: true },
    });

    if (lead) {
      const hasGoals = signals.goals && signals.goals.length > 0;
      const hasContact = Boolean(lead.email || lead.phone);
      const isReady = signals.readiness === 'READY_FOR_TRIAL' || signals.readiness === 'READY_TO_JOIN';

      let newStatus = lead.status;
      if (isReady && lead.status === 'NEW') {
        newStatus = 'QUALIFIED';
      } else if (hasGoals && lead.status === 'NEW') {
        newStatus = 'QUALIFYING';
      }

      await this.prisma.lead.update({
        where: { id: leadId },
        data: {
          status: newStatus,
          score: Math.min(100, (lead.score || 30) + (hasGoals ? 15 : 0) + (isReady ? 20 : 0)),
          lastInteractionAt: new Date(),
        },
      });
    }

    return updated;
  }
}
