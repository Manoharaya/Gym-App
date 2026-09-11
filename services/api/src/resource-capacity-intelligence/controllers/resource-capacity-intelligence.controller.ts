import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResourceCapacityIntelligenceService } from '../services/resource-capacity-intelligence.service';
import { ResourceFilterDto } from '../dto/resource-filter.dto';
import { ResourceAiQueryDto } from '../dto/resource-ai-query.dto';

@Controller('resource-capacity-intelligence')
@UseGuards(JwtAuthGuard)
export class ResourceCapacityIntelligenceController {
  constructor(private readonly service: ResourceCapacityIntelligenceService) {}

  private resolveUser(req: any) {
    const user = req.user || {};
    const orgHeader = req.headers?.['x-organisation-id'];
    const roleHeader = req.headers?.['x-role'];
    const outletHeader = req.headers?.['x-outlet-id'];
    const userHeader = req.headers?.['x-user-id'];

    return {
      ...user,
      id: userHeader || user.id || 'system_user',
      organisationId:
        orgHeader ||
        user.organisationId ||
        user.primaryOrganisationId ||
        user.roles?.[0]?.organisationId,
      role:
        roleHeader ||
        user.role ||
        user.roles?.[0]?.role ||
        (user.isSuperAdmin ? 'SUPERADMIN' : 'ORGANISATION_OWNER'),
      outletId:
        outletHeader ||
        user.outletId ||
        user.primaryOutletId ||
        user.roles?.[0]?.outletId,
    };
  }

  @Get('overview')
  async getOverview(@Req() req: any, @Query() filter: ResourceFilterDto) {
    return this.service.getOverview(this.resolveUser(req), filter);
  }

  @Get('resources')
  async listResources(@Req() req: any, @Query() filter: ResourceFilterDto) {
    return this.service.listResources(this.resolveUser(req), filter);
  }

  @Get('resources/:resourceId')
  async getResourceDetail(
    @Req() req: any,
    @Param('resourceId') resourceId: string,
    @Query() filter: ResourceFilterDto,
  ) {
    return this.service.getResourceDetail(this.resolveUser(req), resourceId, filter);
  }

  @Get('metrics')
  async getMetrics(@Req() req: any, @Query() filter: ResourceFilterDto) {
    return this.service.getOverview(this.resolveUser(req), filter);
  }

  @Get('utilisation')
  async getUtilisation(@Req() req: any, @Query() filter: ResourceFilterDto) {
    return this.service.getUtilisation(this.resolveUser(req), filter);
  }

  @Get('trainers')
  async getTrainers(@Req() req: any, @Query() filter: ResourceFilterDto) {
    return this.service.getTrainers(this.resolveUser(req), filter);
  }

  @Get('rooms')
  async getRooms(@Req() req: any, @Query() filter: ResourceFilterDto) {
    return this.service.getRooms(this.resolveUser(req), filter);
  }

  @Get('equipment')
  async getEquipment(@Req() req: any, @Query() filter: ResourceFilterDto) {
    return this.service.getEquipment(this.resolveUser(req), filter);
  }

  @Get('classes')
  async getClasses(@Req() req: any, @Query() filter: ResourceFilterDto) {
    return this.service.getClasses(this.resolveUser(req), filter);
  }

  @Get('peak-hours')
  async getPeakHours(@Req() req: any, @Query() filter: ResourceFilterDto) {
    return this.service.getPeakHours(this.resolveUser(req), filter);
  }

  @Get('trends')
  async getTrends(@Req() req: any, @Query() filter: ResourceFilterDto) {
    return this.service.getTrends(this.resolveUser(req), filter);
  }

  @Get('bottlenecks')
  async getBottlenecks(@Req() req: any, @Query() filter: ResourceFilterDto) {
    return this.service.getBottlenecks(this.resolveUser(req), filter);
  }

  @Get('health')
  async getHealth(@Req() req: any, @Query() filter: ResourceFilterDto) {
    return this.service.getHealth(this.resolveUser(req), filter);
  }

  @Get('comparison')
  async getComparison(@Req() req: any, @Query() filter: ResourceFilterDto) {
    return this.service.getComparison(this.resolveUser(req), filter);
  }

  @Get('data-quality')
  async getDataQuality(@Req() req: any, @Query() filter: ResourceFilterDto) {
    return this.service.getDataQuality(this.resolveUser(req), filter);
  }

  @Get('freshness')
  async getFreshness(@Req() req: any, @Query() filter: ResourceFilterDto) {
    return this.service.getFreshness(this.resolveUser(req), filter);
  }

  @Get('metric-definitions')
  getMetricDefinitions() {
    return this.service.getMetricDefinitions();
  }

  @Get('ai/insights')
  async getAiInsights(@Req() req: any, @Query() filter: ResourceFilterDto) {
    return this.service.getAiInsights(this.resolveUser(req), filter);
  }

  @Post('ai/insights')
  async queryAiInsights(@Req() req: any, @Body() dto: ResourceAiQueryDto) {
    return this.service.queryAiInsights(this.resolveUser(req), dto);
  }

  @Get('export')
  async exportCsv(
    @Req() req: any,
    @Query() filter: ResourceFilterDto,
    @Res() res: Response,
  ) {
    const csvData = await this.service.exportCsv(this.resolveUser(req), filter);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="resource-capacity-intelligence.csv"',
    );
    return res.status(200).send(csvData);
  }
}
