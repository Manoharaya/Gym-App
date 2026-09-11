import {
  Controller,
  Get,
  Post,
  Put,
  Query,
  Body,
  Headers,
  UseGuards,
  Res,
  HttpCode,
} from '@nestjs/common';
import { Response } from 'express';
import { BusinessIntelligenceService } from '../services/business-intelligence.service';
import { BusinessFilterDto } from '../dto/business-filter.dto';
import { BusinessAiQueryDto } from '../dto/business-ai-query.dto';
import { UpdateBusinessPreferenceDto } from '../dto/business-preference.dto';
import { BusinessBiRequestUser } from '../domain/business-intelligence.permissions';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('business-intelligence')
@UseGuards(JwtAuthGuard)
export class BusinessIntelligenceController {
  constructor(private readonly service: BusinessIntelligenceService) {}

  private resolveUser(
    orgHeader?: string,
    userHeader?: string,
    roleHeader?: string,
    outletHeader?: string,
  ): BusinessBiRequestUser {
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
    @Query() filters: BusinessFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getOverview(user, filters);
  }

  @Get('kpis')
  async getKpis(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: BusinessFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getKpis(user, filters);
  }

  @Get('membership')
  async getMembership(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: BusinessFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getMembership(user, filters);
  }

  @Get('sales')
  async getSales(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: BusinessFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getSales(user, filters);
  }

  @Get('finance')
  async getFinance(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: BusinessFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getFinance(user, filters);
  }

  @Get('attendance')
  async getAttendance(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: BusinessFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getAttendance(user, filters);
  }

  @Get('bookings')
  async getBookings(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: BusinessFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getBookings(user, filters);
  }

  @Get('training')
  async getTraining(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: BusinessFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getTraining(user, filters);
  }

  @Get('engagement')
  async getEngagement(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: BusinessFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getEngagement(user, filters);
  }

  @Get('retention')
  async getRetention(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: BusinessFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getRetention(user, filters);
  }

  @Get('communication')
  async getCommunication(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: BusinessFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getCommunication(user, filters);
  }

  @Get('ai')
  async getAi(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: BusinessFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getAi(user, filters);
  }

  @Get('trends')
  async getTrends(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: BusinessFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getTrends(user, filters);
  }

  @Get('comparisons')
  async getComparisons(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: BusinessFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getComparisons(user, filters);
  }

  @Get('outlets')
  async getOutlets(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: BusinessFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getOutlets(user, filters);
  }

  @Get('metric-definitions')
  getMetricDefinitions() {
    return this.service.getMetricDefinitions();
  }

  @Get('data-quality')
  async getDataQuality(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: BusinessFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getDataQuality(user, filters);
  }

  @Get('freshness')
  getFreshness() {
    return this.service.getFreshness();
  }

  @Post('ai/insights')
  @HttpCode(200)
  async generateAiInsights(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Body() query: BusinessAiQueryDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.generateAiInsights(user, query);
  }

  @Get(['export', 'export/csv'])
  async exportCsv(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: BusinessFilterDto,
    @Res() res: Response,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    const csvData = await this.service.exportCsv(user, filters);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="fitcore-bi-export-${new Date().toISOString().split('T')[0]}.csv"`,
    );
    res.status(200).send(csvData);
  }

  @Get('preferences')
  async getPreferences(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getPreferences(user);
  }

  @Put('preferences')
  async updatePreferences(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Body() dto: UpdateBusinessPreferenceDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.updatePreferences(user, dto);
  }
}
