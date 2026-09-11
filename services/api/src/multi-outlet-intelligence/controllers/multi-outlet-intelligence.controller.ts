import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  Headers,
  UseGuards,
  Res,
  HttpCode,
} from '@nestjs/common';
import { Response } from 'express';
import { MultiOutletIntelligenceService } from '../services/multi-outlet-intelligence.service';
import { MultiOutletFilterDto } from '../dto/multi-outlet-filter.dto';
import { MultiOutletAiQueryDto } from '../dto/multi-outlet-ai-query.dto';
import { BusinessBiRequestUser } from '../../business-intelligence/domain/business-intelligence.permissions';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('multi-outlet-intelligence')
@UseGuards(JwtAuthGuard)
export class MultiOutletIntelligenceController {
  constructor(private readonly service: MultiOutletIntelligenceService) {}

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
    @Query() filters: MultiOutletFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getOverview(user, filters);
  }

  @Get('outlets')
  async getOutlets(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: MultiOutletFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getOutlets(user, filters);
  }

  @Get('metrics')
  async getMetrics(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: MultiOutletFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getMetrics(user, filters);
  }

  @Get('comparison')
  async getComparison(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: MultiOutletFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getComparison(user, filters);
  }

  @Get('rankings')
  async getRankings(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: MultiOutletFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getRankings(user, filters);
  }

  @Get('trends')
  async getTrends(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: MultiOutletFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getTrends(user, filters);
  }

  @Get('benchmarks')
  async getBenchmarks(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: MultiOutletFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getBenchmarks(user, filters);
  }

  @Get('health')
  async getHealth(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: MultiOutletFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getHealth(user, filters);
  }

  @Get('attention')
  async getAttention(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: MultiOutletFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getAttention(user, filters);
  }

  @Get('data-quality')
  async getDataQuality(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: MultiOutletFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getDataQuality(user, filters);
  }

  @Get('freshness')
  getFreshness() {
    return this.service.getFreshness();
  }

  @Get('outlets/:outletId')
  async getOutletDetail(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Param('outletId') outletId: string,
    @Query() filters: MultiOutletFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getOutletDetail(user, outletId, filters);
  }

  @Post('ai/insights')
  @HttpCode(200)
  async generateAiInsights(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Body() query: MultiOutletAiQueryDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.generateAiInsights(user, query);
  }

  @Get('metric-definitions')
  getMetricDefinitions() {
    return this.service.getMetricDefinitions();
  }

  @Get(['export', 'export/csv'])
  async exportCsv(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: MultiOutletFilterDto,
    @Res() res: Response,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    const csvData = await this.service.exportCsv(user, filters);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="fitcore-multi-outlet-export-${new Date().toISOString().split('T')[0]}.csv"`,
    );
    res.status(200).send(csvData);
  }
}
