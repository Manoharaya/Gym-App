/**
 * FitCore Qualification History & Precedence Service (Day 38)
 *
 * Enforces data source authority hierarchy:
 * DIRECT_CUSTOMER_STATEMENT (5) > VERIFIED_BUSINESS_EVENT (4) > STAFF_ENTERED (3) > AI_EXTRACTION (2) > AI_INFERENCE (1)
 * Records immutable audit history diffs for qualification profile changes.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { QualificationDataSource, QualificationActorType } from '@fitcore/types';
import { DATA_SOURCE_AUTHORITY_PRIORITY } from '../domain/lead-qualification.constants';

export interface FieldChange {
  field: string;
  previousValue: any;
  newValue: any;
}

export interface RecordHistoryParams {
  leadId: string;
  profileId?: string;
  organisationId: string;
  actorType: QualificationActorType;
  actorId?: string;
  source: QualificationDataSource;
  evidence?: string;
  reason?: string;
  changes: FieldChange[];
}

@Injectable()
export class QualificationHistoryService {
  private readonly logger = new Logger(QualificationHistoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Checks if an incoming change is permitted under authority precedence rules.
   * If a field was previously modified by staff (STAFF_ENTERED), AI extraction or inference cannot overwrite it.
   */
  canOverrideField(
    incomingSource: QualificationDataSource,
    existingLastStaffOverrideAt?: Date | null,
  ): boolean {
    const incomingPriority = DATA_SOURCE_AUTHORITY_PRIORITY[incomingSource] || 1;
    const staffPriority = DATA_SOURCE_AUTHORITY_PRIORITY['STAFF_ENTERED'];

    // If staff modified this profile and incoming source has lower priority than staff, disallow overwrite
    if (existingLastStaffOverrideAt && incomingPriority < staffPriority) {
      return false;
    }

    return true;
  }

  /**
   * Compares two qualification states and computes list of changed fields.
   */
  detectFieldChanges(oldProfile: any, newValues: Record<string, any>): FieldChange[] {
    const changes: FieldChange[] = [];
    if (!oldProfile) return changes;

    for (const [key, val] of Object.entries(newValues)) {
      if (val === undefined) continue;

      const oldVal = oldProfile[key];
      const oldStr = JSON.stringify(oldVal ?? null);
      const newStr = JSON.stringify(val ?? null);

      if (oldStr !== newStr) {
        changes.push({
          field: key,
          previousValue: oldVal ?? null,
          newValue: val,
        });
      }
    }

    return changes;
  }

  /**
   * Records immutable diffs in the lead_qualification_histories table.
   */
  async recordChanges(params: RecordHistoryParams): Promise<void> {
    if (!params.changes || params.changes.length === 0) return;

    for (const change of params.changes) {
      await this.prisma.leadQualificationHistory.create({
        data: {
          leadId: params.leadId,
          profileId: params.profileId,
          organisationId: params.organisationId,
          fieldChanged: change.field,
          previousValue: change.previousValue,
          newValue: change.newValue,
          actorType: params.actorType,
          actorId: params.actorId,
          source: params.source,
          evidence: params.evidence,
          reason: params.reason,
        },
      });
    }

    this.logger.log(
      `Recorded ${params.changes.length} qualification history diff(s) for lead ${params.leadId} by ${params.actorType} (${params.source})`,
    );
  }

  /**
   * Retrieves full history timeline for a lead.
   */
  async getLeadHistory(leadId: string) {
    return this.prisma.leadQualificationHistory.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
