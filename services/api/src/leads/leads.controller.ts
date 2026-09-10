/**
 * Day 33 — Lead Management Controller
 * REST endpoints for lead capture, qualification, staff assignment, and CRM foundation.
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
  UseGuards,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadQualificationService } from './lead-qualification.service';
import {
  CreateLeadDto,
  UpdateLeadDto,
  UpdateLeadQualificationDto,
  AssignStaffDto,
  RequestLeadHandoffDto,
  QualifyLeadRequestDto,
  LeadFilterDto,
} from './dto/lead.dto';

@Controller('leads')
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly qualificationService: LeadQualificationService,
  ) {}

  /**
   * Helper extracting organisation ID from header
   */
  private resolveOrganisationId(orgHeader?: string): string {
    const orgId = orgHeader;
    if (!orgId) {
      throw new BadRequestException('Missing required x-organisation-id header');
    }
    return orgId;
  }

  @Post()
  async createLead(
    @Headers('x-organisation-id') orgHeader: string,
    @Body() dto: CreateLeadDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.leadsService.createLead(organisationId, dto);
  }

  @Get()
  async listLeads(
    @Headers('x-organisation-id') orgHeader: string,
    @Query() filter: LeadFilterDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.leadsService.listLeads(organisationId, filter);
  }

  @Get('metrics')
  async getMetrics(
    @Headers('x-organisation-id') orgHeader: string,
    @Query('outletId') outletId?: string,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.leadsService.getMetrics(organisationId, outletId);
  }

  @Get(':id')
  async getLead(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') id: string,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.leadsService.getLead(organisationId, id);
  }

  @Patch(':id')
  async updateLead(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.leadsService.updateLead(organisationId, id, dto);
  }

  @Get(':id/qualification')
  async getLeadQualification(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') id: string,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    const lead = await this.leadsService.getLead(organisationId, id);
    return lead.qualification;
  }

  @Patch(':id/qualification')
  async updateLeadQualification(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeadQualificationDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.leadsService.updateQualification(organisationId, id, dto);
  }

  @Post(':id/qualify')
  async qualifyLead(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') id: string,
    @Body() dto: QualifyLeadRequestDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.qualificationService.qualifyLead(organisationId, id, {
      conversationId: dto.conversationId,
      userMessage: dto.userMessage,
    });
  }

  @Post(':id/handoff')
  async requestHandoff(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') id: string,
    @Body() dto: RequestLeadHandoffDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.leadsService.requestHandoff(organisationId, id, dto.reason, dto.notes);
  }

  @Post(':id/assign')
  async assignStaff(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') id: string,
    @Body() dto: AssignStaffDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.leadsService.assignStaff(organisationId, id, dto);
  }
}
