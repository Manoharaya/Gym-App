import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { ObservabilityService } from './observability.service';
import { ObservabilityHealthService } from './health/observability-health.service';
import { MetricRegistryService } from './metrics/metric-registry.service';
import { AlertEngineService } from './alerts/alert-engine.service';
import { IncidentService } from './incidents/incident.service';
import { QueueTelemetryService } from './queues/queue-telemetry.service';
import { AiTelemetryService } from './ai/ai-telemetry.service';
import { SloService } from './slo/slo.service';
import {
  CreateAlertRuleDto,
  CreateIncidentDto,
  UpdateIncidentDto,
  RecordDeploymentDto,
} from './dto/observability.dto';

@ApiTags('Observability & Platform Health')
@Controller('observability')
export class ObservabilityController {
  constructor(
    private readonly obsService: ObservabilityService,
    private readonly healthService: ObservabilityHealthService,
    private readonly metricsService: MetricRegistryService,
    private readonly alertService: AlertEngineService,
    private readonly incidentService: IncidentService,
    private readonly queueService: QueueTelemetryService,
    private readonly aiService: AiTelemetryService,
    private readonly sloService: SloService,
  ) {}

  // -------------------------------------------------------------
  // PUBLIC PROBES
  // -------------------------------------------------------------

  @Public()
  @Get('health/live')
  @ApiOperation({ summary: 'Liveness probe for process orchestrator' })
  getLiveness() {
    return this.healthService.getLiveness();
  }

  @Public()
  @Get('health/ready')
  @ApiOperation({ summary: 'Readiness probe verifying DB cluster' })
  async getReadiness() {
    return this.healthService.getReadiness();
  }

  // -------------------------------------------------------------
  // OPERATOR / SUPERADMIN OBSERVABILITY
  // -------------------------------------------------------------

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Get('overview')
  @ApiOperation({ summary: 'Comprehensive platform health overview' })
  async getOverview() {
    return this.healthService.getHealthOverview();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Get('metrics')
  @ApiOperation({ summary: 'Live metrics snapshot registry' })
  async getMetrics() {
    return this.metricsService.getAllSnapshots();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Get('metric-definitions')
  @ApiOperation({ summary: 'Catalog of documented metric definitions' })
  getMetricDefinitions() {
    return this.metricsService.getDefinitions();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Get('alerts')
  @ApiOperation({ summary: 'List platform alerts' })
  async listAlerts(
    @Query('status') status?: string,
    @Query('severity') severity?: string,
  ) {
    return this.alertService.listAlerts(status, severity);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Post('alerts/rules')
  @ApiOperation({ summary: 'Create configurable alert rule' })
  async createAlertRule(@Body() dto: CreateAlertRuleDto) {
    return this.alertService.createRule(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Post('alerts/evaluate')
  @ApiOperation({ summary: 'Evaluate alert rules against live metrics' })
  async evaluateAlerts() {
    return this.alertService.evaluateRules();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Post('alerts/:id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge an active alert' })
  async acknowledgeAlert(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.alertService.acknowledgeAlert(id, req.user?.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Post('alerts/:id/resolve')
  @ApiOperation({ summary: 'Resolve an active alert' })
  async resolveAlert(@Param('id') id: string) {
    return this.alertService.resolveAlert(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Get('incidents')
  @ApiOperation({ summary: 'List platform incidents' })
  async listIncidents(@Query('status') status?: string) {
    return this.incidentService.listIncidents(status);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Get('incidents/:id')
  @ApiOperation({ summary: 'Get single incident details & timeline' })
  async getIncident(@Param('id') id: string) {
    return this.incidentService.getIncident(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Post('incidents')
  @ApiOperation({ summary: 'Declare new operational incident' })
  async createIncident(
    @Body() dto: CreateIncidentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.incidentService.createIncident(dto, req.user?.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Patch('incidents/:id')
  @ApiOperation({ summary: 'Update operational incident status or notes' })
  async updateIncident(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.incidentService.updateIncident(id, dto, req.user?.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Get('queues')
  @ApiOperation({ summary: 'Background worker queues health & backlog' })
  async getQueueHealth() {
    return this.queueService.getQueueHealth();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Get('ai')
  @ApiOperation({ summary: 'AI Gateway operational telemetry & tokens' })
  async getAiTelemetry() {
    return this.aiService.getAiTelemetry();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Get('slo')
  @ApiOperation({ summary: 'Service Level Objective (SLO) compliance' })
  async getSloCompliance() {
    return this.sloService.getSloCompliance();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Get('deployments')
  @ApiOperation({ summary: 'List recent deployments for release correlation' })
  async listDeployments() {
    return this.obsService.listDeployments();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Post('deployments')
  @ApiOperation({ summary: 'Record new release deployment' })
  async recordDeployment(
    @Body() dto: RecordDeploymentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.obsService.recordDeployment(dto, req.user?.id);
  }
}
