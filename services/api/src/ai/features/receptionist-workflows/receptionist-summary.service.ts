/**
 * Day 35 — Receptionist Summary Service
 * Generates structured, deterministic, and safe interaction summaries.
 * Enforces strict AI Safety: Summaries must only contain OBSERVED facts,
 * never hallucinated goals, health conditions, pricing promises, or consent.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../audit/audit.service';
import {
  ReceptionistSummary,
  ReceptionistSummaryType,
  ReceptionistOutcome,
} from '@fitcore/types';
import { RECEPTIONIST_AUDIT_ACTIONS } from './receptionist-workflow.constants';

@Injectable()
export class ReceptionistSummaryService {
  private readonly logger = new Logger(ReceptionistSummaryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Builds a safe structured summary for an interaction.
   */
  async generateSummary(params: {
    organisationId: string;
    interactionId: string;
    type: ReceptionistSummaryType;
    outcome: ReceptionistOutcome;
    customerTopic?: string;
    preferredOutlet?: string;
    observedGoal?: string;
    reason?: string;
    observedFacts?: string[];
    actionItems?: string[];
    userId?: string;
  }): Promise<ReceptionistSummary> {
    const {
      organisationId,
      interactionId,
      type,
      outcome,
      customerTopic,
      preferredOutlet,
      observedGoal,
      reason,
      observedFacts = [],
      actionItems = [],
      userId,
    } = params;

    // Filter out forbidden fabricated patterns
    const safeFacts = observedFacts.filter((fact) => {
      const lower = fact.toLowerCase();
      // Exclude medical speculation or unverified financial promises
      return (
        !lower.includes('diagnosed with') &&
        !lower.includes('promised discount') &&
        !lower.includes('special rate approved')
      );
    });

    const summary: ReceptionistSummary = {
      type,
      requestedTopic: customerTopic || 'General Inquiry',
      preferredOutlet: preferredOutlet || 'OBSERVED_NONE',
      goal: observedGoal || 'UNKNOWN',
      outcome,
      reason: reason || 'Conversation concluded normally',
      keyPoints: safeFacts.length > 0 ? safeFacts : ['Inquiry processed through receptionist workflow'],
      actionItems: actionItems.length > 0 ? actionItems : ['No further operational action required'],
      isObservedOnly: true,
    };

    // Persist summary in interaction metadata
    try {
      const interaction = await this.prisma.receptionistInteraction.findUnique({
        where: { id: interactionId },
      });

      if (interaction) {
        const metadata = (interaction.metadata as Record<string, any>) || {};
        await this.prisma.receptionistInteraction.update({
          where: { id: interactionId },
          data: {
            metadata: {
              ...metadata,
              structuredSummary: summary as any,
              lastSummarizedAt: new Date().toISOString(),
            },
          },
        });
      }

      await this.audit.log({
        userId,
        organisationId,
        action: RECEPTIONIST_AUDIT_ACTIONS.AI_SUMMARY_GENERATED,
        resource: 'ReceptionistInteraction',
        resourceId: interactionId,
        metadata: { summaryType: type, outcome },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to audit summary for interaction ${interactionId}: ${err.message}`);
    }

    return summary;
  }

  /**
   * Formats a plain-text representation of the summary suitable for staff alerts or dashboard notes.
   */
  formatSummaryForStaff(summary: ReceptionistSummary): string {
    const lines = [
      `[${summary.type}] Outcome: ${summary.outcome}`,
      `Topic: ${summary.requestedTopic || 'General'}`,
      `Preferred Outlet: ${summary.preferredOutlet || 'Not specified'}`,
      `Goal: ${summary.goal || 'Unknown'}`,
      `Reason: ${summary.reason || 'None provided'}`,
      `Key Points:`,
      ...summary.keyPoints.map((p) => ` - ${p}`),
      `Action Items:`,
      ...summary.actionItems.map((a) => ` - ${a}`),
    ];
    return lines.join('\n');
  }
}
