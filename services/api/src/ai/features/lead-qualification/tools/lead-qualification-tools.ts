/**
 * FitCore AI Lead Qualification Tools (Day 38)
 *
 * Controlled tools exposed to the AI Sales Agent and internal workflows:
 * - get_qualification_profile
 * - update_qualification_profile
 * - record_objection
 * - resolve_objection
 * - generate_discovery_questions
 */

import { Injectable, Logger } from '@nestjs/common';
import { LeadQualificationService } from '../application/lead-qualification.service';
import { ObjectionService } from '../application/objection.service';
import {
  CreateLeadObjectionDto,
  StaffOverrideQualificationDto,
  ExtractLeadQualificationDto,
} from '../dto/lead-qualification.dto';

@Injectable()
export class LeadQualificationTools {
  private readonly logger = new Logger(LeadQualificationTools.name);

  constructor(
    private readonly qualificationService: LeadQualificationService,
    private readonly objectionService: ObjectionService,
  ) {}

  /**
   * Tool: get_qualification_profile
   */
  async getQualificationProfile(organisationId: string, leadId: string) {
    this.logger.log(`Tool invoked: get_qualification_profile for lead ${leadId}`);
    return this.qualificationService.getQualificationProfile(organisationId, leadId);
  }

  /**
   * Tool: update_qualification_profile
   */
  async updateQualificationProfile(
    organisationId: string,
    leadId: string,
    options: ExtractLeadQualificationDto,
  ) {
    this.logger.log(`Tool invoked: update_qualification_profile for lead ${leadId}`);
    return this.qualificationService.qualifyLead(organisationId, leadId, options);
  }

  /**
   * Tool: record_objection
   */
  async recordObjection(
    organisationId: string,
    leadId: string,
    dto: CreateLeadObjectionDto,
    actorId?: string,
  ) {
    this.logger.log(`Tool invoked: record_objection for lead ${leadId} (${dto.objectionType})`);
    return this.objectionService.createObjection(
      organisationId,
      leadId,
      dto,
      'AI_SALES_AGENT',
      actorId,
    );
  }

  /**
   * Tool: resolve_objection
   */
  async resolveObjection(
    organisationId: string,
    leadId: string,
    objectionId: string,
    resolutionNotes?: string,
  ) {
    this.logger.log(`Tool invoked: resolve_objection for objection ${objectionId}`);
    return this.objectionService.updateObjection(
      organisationId,
      leadId,
      objectionId,
      {
        status: 'RESOLVED',
        resolutionNotes,
      },
      'AI_SALES_AGENT',
    );
  }

  /**
   * Tool: generate_discovery_questions
   */
  async generateDiscoveryQuestions(
    organisationId: string,
    leadId: string,
    limit: number = 2,
    language?: string,
  ) {
    this.logger.log(`Tool invoked: generate_discovery_questions for lead ${leadId}`);
    return this.qualificationService.getDiscoveryQuestions(organisationId, leadId, {
      limit,
      language,
    });
  }
}
