import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Headers,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { SalesIntelligenceService } from '../services/sales-intelligence.service';
import { SalesFilterDto } from '../dto/sales-filter.dto';
import { SalesInsightRequestDto } from '../dto/sales-insight-request.dto';
import { RequestUser } from '../domain/sales-intelligence.permissions';

@Controller('sales-intelligence')
export class SalesIntelligenceController {
  constructor(private readonly salesIntelligenceService: SalesIntelligenceService) {}

  private resolveUser(
    orgHeader?: string,
    userHeader?: string,
    roleHeader?: string,
    outletHeader?: string,
  ): RequestUser {
    return {
      id: userHeader || 'system_user',
      organisationId: orgHeader,
      role: roleHeader || 'ORGANISATION_OWNER',
      roles: roleHeader ? [roleHeader] : ['ORGANISATION_OWNER'],
      outletId: outletHeader,
      outletIds: outletHeader ? [outletHeader] : [],
    };
  }

  @Get('overview')
  async getOverview(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: SalesFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.salesIntelligenceService.getOverview(user, filters);
  }

  @Get('funnel')
  async getFunnel(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: SalesFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.salesIntelligenceService.getFunnel(user, filters);
  }

  @Get('trends')
  async getTrends(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: SalesFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.salesIntelligenceService.getTrends(user, filters);
  }

  @Get('sources')
  async getSources(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: SalesFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.salesIntelligenceService.getSourcePerformance(user, filters);
  }

  @Get('channels')
  async getChannels(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: SalesFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.salesIntelligenceService.getChannelPerformance(user, filters);
  }

  @Get('staff')
  async getStaff(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: SalesFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.salesIntelligenceService.getStaffPerformance(user, filters);
  }

  @Get('outlets')
  async getOutlets(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: SalesFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.salesIntelligenceService.getOutletPerformance(user, filters);
  }

  @Get('follow-ups')
  async getFollowUps(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: SalesFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.salesIntelligenceService.getFollowUpPerformance(user, filters);
  }

  @Get('ai-receptionist')
  async getAiReceptionist(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: SalesFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.salesIntelligenceService.getAiReceptionistMetrics(user, filters);
  }

  @Get('ai-sales')
  async getAiSales(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: SalesFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.salesIntelligenceService.getAiSalesAgentMetrics(user, filters);
  }

  @Get('losses')
  async getLosses(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: SalesFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.salesIntelligenceService.getLossAnalytics(user, filters);
  }

  @Get('objections')
  async getObjections(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: SalesFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.salesIntelligenceService.getObjectionAnalytics(user, filters);
  }

  @Get('pipeline')
  async getPipeline(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: SalesFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.salesIntelligenceService.getPipelineVelocity(user, filters);
  }

  @Get('activity')
  async getActivity(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: SalesFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.salesIntelligenceService.getActivityTimeline(user, filters);
  }

  @Get('opportunities')
  async getOpportunities(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: SalesFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.salesIntelligenceService.getDrillDownOpportunities(user, filters);
  }

  @Get('export')
  async exportCsv(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: SalesFilterDto,
    @Res() res: Response,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    const csvContent = await this.salesIntelligenceService.exportOpportunitiesCsv(user, filters);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="sales_opportunities.csv"');
    return res.status(200).send(csvContent);
  }

  @Get('metrics/definitions')
  getDefinitions() {
    return this.salesIntelligenceService.getMetricDefinitions();
  }

  @Post('insights')
  async getAiInsights(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Body() dto: SalesInsightRequestDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.salesIntelligenceService.generateAiInsights(user, dto);
  }
}
