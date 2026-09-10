/**
 * FitCore Lead Qualification Controller (Day 38)
 *
 * REST API for AI-powered Lead Qualification & Sales Discovery under /api/v1/leads/:leadId/qualification
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { LeadQualificationService } from '../application/lead-qualification.service';
import { ObjectionService } from '../application/objection.service';
import { QualificationHistoryService } from '../application/qualification-history.service';
import {
  ExtractLeadQualificationDto,
  StaffOverrideQualificationDto,
  CreateLeadObjectionDto,
  UpdateLeadObjectionDto,
  GenerateDiscoveryQuestionsDto,
} from '../dto/lead-qualification.dto';

@Controller('leads/:leadId/qualification')
export class LeadQualificationController {
  constructor(
    private readonly qualificationService: LeadQualificationService,
    private readonly objectionService: ObjectionService,
    private readonly historyService: QualificationHistoryService,
  ) {}

  private resolveOrganisationId(orgHeader?: string): string {
    if (!orgHeader) {
      throw new BadRequestException('Missing required x-organisation-id header');
    }
    return orgHeader;
  }

  /**
   * 1. Get full qualification profile, objections, and history timeline.
   * GET /api/v1/leads/:leadId/qualification
   */
  @Get()
  async getQualification(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('leadId') leadId: string,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.qualificationService.getQualificationProfile(organisationId, leadId);
  }

  /**
   * 2. Trigger AI or deterministic extraction from conversation / message.
   * POST /api/v1/leads/:leadId/qualification/extract
   */
  @Post('extract')
  async extractQualification(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('leadId') leadId: string,
    @Body() dto: ExtractLeadQualificationDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.qualificationService.qualifyLead(organisationId, leadId, dto);
  }

  /**
   * 3. Staff manual override with audit history diff tracking.
   * PATCH /api/v1/leads/:leadId/qualification
   */
  @Patch()
  async staffOverride(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-staff-id') staffHeader: string,
    @Param('leadId') leadId: string,
    @Body() dto: StaffOverrideQualificationDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    const staffId = staffHeader || 'staff_default';
    return this.qualificationService.staffOverride(organisationId, leadId, dto, staffId);
  }

  /**
   * 4. Get smart discovery questions for missing dimensions.
   * GET /api/v1/leads/:leadId/qualification/questions
   */
  @Get('questions')
  async getDiscoveryQuestions(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('leadId') leadId: string,
    @Query() query: GenerateDiscoveryQuestionsDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.qualificationService.getDiscoveryQuestions(organisationId, leadId, query);
  }

  /**
   * 5. Get all objections for the lead.
   * GET /api/v1/leads/:leadId/qualification/objections
   */
  @Get('objections')
  async getObjections(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('leadId') leadId: string,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    // Verifies lead exists in org
    await this.qualificationService.getQualificationProfile(organisationId, leadId);
    return this.objectionService.findObjections(leadId);
  }

  /**
   * 6. Record a new objection.
   * POST /api/v1/leads/:leadId/qualification/objections
   */
  @Post('objections')
  async createObjection(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-staff-id') staffHeader: string,
    @Param('leadId') leadId: string,
    @Body() dto: CreateLeadObjectionDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.objectionService.createObjection(
      organisationId,
      leadId,
      dto,
      staffHeader ? 'STAFF' : 'AI_SALES_AGENT',
      staffHeader || undefined,
    );
  }

  /**
   * 7. Update or resolve an objection.
   * PATCH /api/v1/leads/:leadId/qualification/objections/:objectionId
   */
  @Patch('objections/:objectionId')
  async updateObjection(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-staff-id') staffHeader: string,
    @Param('leadId') leadId: string,
    @Param('objectionId') objectionId: string,
    @Body() dto: UpdateLeadObjectionDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.objectionService.updateObjection(
      organisationId,
      leadId,
      objectionId,
      dto,
      'STAFF',
      staffHeader || undefined,
    );
  }

  /**
   * 8. Get immutable qualification audit history diffs.
   * GET /api/v1/leads/:leadId/qualification/history
   */
  @Get('history')
  async getHistory(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('leadId') leadId: string,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    // Verifies lead exists in org
    await this.qualificationService.getQualificationProfile(organisationId, leadId);
    return this.historyService.getLeadHistory(leadId);
  }
}
