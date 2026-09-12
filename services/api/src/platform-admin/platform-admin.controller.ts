import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PlatformPermissionGuard } from './permissions/platform-permission.guard';
import { PlatformPermissions } from './permissions/platform-permission.decorator';
import { PlatformAdminService } from './platform-admin.service';
import { PlatformOrganisationsService } from './organisations/platform-organisations.service';
import { PlatformUsageService } from './usage/platform-usage.service';
import { PlatformAIUsageService } from './ai-usage/platform-ai-usage.service';
import { PlatformBillingService } from './billing/platform-billing.service';
import { PlatformSupportService } from './support/platform-support.service';
import { PlatformFeatureFlagsService } from './feature-flags/platform-feature-flags.service';
import { PlatformConfigurationService } from './configuration/platform-configuration.service';
import { PlatformHealthService } from './platform-health/platform-health.service';
import { PlatformIntegrationsService } from './integrations/platform-integrations.service';
import { PlatformSupportAccessService } from './support-access/platform-support-access.service';
import { PlatformAnnouncementsService } from './announcements/platform-announcements.service';
import { PlatformDataQualityService } from './data-quality/platform-data-quality.service';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import {
  QueryOrganisationsDto,
  SuspendOrganisationDto,
  ReactivateOrganisationDto,
  ArchiveOrganisationDto,
  ActivateOrganisationDto,
  QueryUsageDto,
  QueryAIUsageDto,
  CreateSupportTicketDto,
  UpdateSupportTicketDto,
  CreateSupportMessageDto,
  AssignSupportTicketDto,
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
  CreateFeatureFlagAssignmentDto,
  UpdatePlatformConfigDto,
  SetMaintenanceModeDto,
  CreateIncidentDto,
  UpdateIncidentDto,
  RequestSupportAccessDto,
  ApproveSupportAccessDto,
  RevokeSupportAccessDto,
  CreateAnnouncementDto,
} from './dto/platform-admin.dto';

@ApiTags('Platform Admin')
@ApiBearerAuth()
@UseGuards(PlatformPermissionGuard)
@Controller('platform-admin')
export class PlatformAdminController {
  constructor(
    private readonly adminService: PlatformAdminService,
    private readonly organisationsService: PlatformOrganisationsService,
    private readonly usageService: PlatformUsageService,
    private readonly aiUsageService: PlatformAIUsageService,
    private readonly billingService: PlatformBillingService,
    private readonly supportService: PlatformSupportService,
    private readonly featureFlagsService: PlatformFeatureFlagsService,
    private readonly configurationService: PlatformConfigurationService,
    private readonly healthService: PlatformHealthService,
    private readonly integrationsService: PlatformIntegrationsService,
    private readonly supportAccessService: PlatformSupportAccessService,
    private readonly announcementsService: PlatformAnnouncementsService,
    private readonly dataQualityService: PlatformDataQualityService,
  ) {}

  // -------------------------------------------------------------
  // OVERVIEW & METRICS
  // -------------------------------------------------------------

  @Get('overview')
  @PlatformPermissions('platform.organisations.read')
  @ApiOperation({ summary: 'Platform KPI overview cards' })
  async getOverviewKPIs() {
    return this.adminService.getOverviewKPIs();
  }

  @Get('search')
  @PlatformPermissions('platform.organisations.read')
  @ApiOperation({ summary: 'Global scoped platform search' })
  async globalSearch(@Query('q') query: string) {
    return this.adminService.globalPlatformSearch(query);
  }

  @Get('audit')
  @PlatformPermissions('platform.audit.read')
  @ApiOperation({ summary: 'Platform audit logs' })
  async getAuditLogs(
    @Query('organisationId') organisationId?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getPlatformAuditLogs({
      organisationId,
      action,
      resource,
      from,
      to,
      page,
      limit,
    });
  }

  @Get('data-quality')
  @PlatformPermissions('platform.health.read')
  @ApiOperation({ summary: 'Platform data quality scanner' })
  async getDataQuality() {
    return this.dataQualityService.runPlatformDataQualityScan();
  }

  // -------------------------------------------------------------
  // ORGANISATIONS MANAGEMENT
  // -------------------------------------------------------------

  @Get('organisations')
  @PlatformPermissions('platform.organisations.read')
  @ApiOperation({ summary: 'List organisations with pagination and filters' })
  async listOrganisations(@Query() query: QueryOrganisationsDto) {
    return this.organisationsService.listOrganisations(query);
  }

  @Get('organisations/:id')
  @PlatformPermissions('platform.organisations.read')
  @ApiOperation({ summary: 'Get aggregated platform organisation summary' })
  async getOrganisationSummary(@Param('id') id: string) {
    return this.organisationsService.getOrganisationSummary(id);
  }

  @Get('organisations/:id/impact-preview')
  @PlatformPermissions('platform.organisations.manage')
  @ApiOperation({ summary: 'Get pre-suspension impact preview' })
  async getSuspensionImpactPreview(@Param('id') id: string) {
    return this.organisationsService.getSuspensionImpactPreview(id);
  }

  @Post('organisations/:id/activate')
  @PlatformPermissions('platform.organisations.manage')
  @ApiOperation({ summary: 'Activate organisation' })
  async activateOrganisation(
    @Param('id') id: string,
    @Body() dto: ActivateOrganisationDto,
    @Req() req: RequestWithUser,
  ) {
    return this.organisationsService.activateOrganisation(id, dto, req.user!);
  }

  @Post('organisations/:id/suspend')
  @PlatformPermissions('platform.organisations.manage', { requireStepUp: true })
  @ApiOperation({ summary: 'Suspend organisation with step-up verification' })
  async suspendOrganisation(
    @Param('id') id: string,
    @Body() dto: SuspendOrganisationDto,
    @Req() req: RequestWithUser,
  ) {
    return this.organisationsService.suspendOrganisation(id, dto, req.user!);
  }

  @Post('organisations/:id/reactivate')
  @PlatformPermissions('platform.organisations.manage')
  @ApiOperation({ summary: 'Reactivate suspended organisation' })
  async reactivateOrganisation(
    @Param('id') id: string,
    @Body() dto: ReactivateOrganisationDto,
    @Req() req: RequestWithUser,
  ) {
    return this.organisationsService.reactivateOrganisation(id, dto, req.user!);
  }

  @Post('organisations/:id/archive')
  @PlatformPermissions('platform.organisations.manage', { requireStepUp: true })
  @ApiOperation({ summary: 'Archive organisation' })
  async archiveOrganisation(
    @Param('id') id: string,
    @Body() dto: ArchiveOrganisationDto,
    @Req() req: RequestWithUser,
  ) {
    return this.organisationsService.archiveOrganisation(id, dto, req.user!);
  }

  // -------------------------------------------------------------
  // USAGE & AI METERING
  // -------------------------------------------------------------

  @Get('usage')
  @PlatformPermissions('platform.usage.read')
  @ApiOperation({ summary: 'Get live platform usage metrics' })
  async getLiveUsage(@Query() query: QueryUsageDto) {
    return this.usageService.getLiveUsageTotals(query);
  }

  @Get('usage/definitions')
  @PlatformPermissions('platform.usage.read')
  @ApiOperation({ summary: 'List platform metric definitions' })
  async getMetricDefinitions() {
    return this.usageService.getMetricDefinitions();
  }

  @Get('usage/snapshots')
  @PlatformPermissions('platform.usage.read')
  @ApiOperation({ summary: 'Query periodic usage projection snapshots' })
  async getUsageSnapshots(@Query() query: QueryUsageDto) {
    return this.usageService.getUsageSnapshots(query);
  }

  @Get('ai-usage')
  @PlatformPermissions('platform.ai_usage.read')
  @ApiOperation({ summary: 'Query platform AI requests, tokens, and cost metrics' })
  async getAIUsage(@Query() query: QueryAIUsageDto) {
    return this.aiUsageService.getAIUsageMetrics(query);
  }

  @Get('ai-usage/health')
  @PlatformPermissions('platform.ai_usage.read')
  @ApiOperation({ summary: 'Inspect AI feature health and latency' })
  async getAIFeatureHealth() {
    return this.aiUsageService.getAIFeatureHealth();
  }

  // -------------------------------------------------------------
  // BILLING VISIBILITY
  // -------------------------------------------------------------

  @Get('billing')
  @PlatformPermissions('platform.billing.read')
  @ApiOperation({ summary: 'Get platform subscription & billing overview' })
  async getPlatformBilling() {
    return this.billingService.getPlatformBillingAggregates();
  }

  @Get('billing/organisations/:id')
  @PlatformPermissions('platform.billing.read')
  @ApiOperation({ summary: 'Get organisation SaaS plan, limits, and overage' })
  async getOrganisationBilling(@Param('id') id: string) {
    return this.billingService.getOrganisationBillingOverview(id);
  }

  // -------------------------------------------------------------
  // SUPPORT TICKETS
  // -------------------------------------------------------------

  @Get('support/tickets')
  @PlatformPermissions('platform.support.manage')
  @ApiOperation({ summary: 'List platform support tickets' })
  async listSupportTickets(
    @Query('organisationId') organisationId: string | undefined,
    @Query('status') status: any,
    @Query('priority') priority: string | undefined,
    @Query('assignedToUserId') assignedToUserId: string | undefined,
    @Query('page') page: number | undefined,
    @Query('limit') limit: number | undefined,
    @Req() req: RequestWithUser,
  ) {
    return this.supportService.listTickets(
      { organisationId, status, priority, assignedToUserId, page, limit },
      req.user!,
    );
  }

  @Post('support/tickets')
  @PlatformPermissions('platform.support.manage')
  @ApiOperation({ summary: 'Create a support ticket' })
  async createSupportTicket(
    @Body() dto: CreateSupportTicketDto,
    @Req() req: RequestWithUser,
  ) {
    return this.supportService.createTicket(dto, req.user!);
  }

  @Get('support/tickets/:id')
  @PlatformPermissions('platform.support.manage')
  @ApiOperation({ summary: 'Get support ticket thread with visibility enforcement' })
  async getSupportTicket(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.supportService.getTicket(id, req.user!);
  }

  @Patch('support/tickets/:id')
  @PlatformPermissions('platform.support.manage')
  @ApiOperation({ summary: 'Update support ticket status or priority' })
  async updateSupportTicket(
    @Param('id') id: string,
    @Body() dto: UpdateSupportTicketDto,
    @Req() req: RequestWithUser,
  ) {
    return this.supportService.updateTicket(id, dto, req.user!);
  }

  @Post('support/tickets/:id/assign')
  @PlatformPermissions('platform.support.manage')
  @ApiOperation({ summary: 'Assign support ticket' })
  async assignSupportTicket(
    @Param('id') id: string,
    @Body() dto: AssignSupportTicketDto,
    @Req() req: RequestWithUser,
  ) {
    return this.supportService.assignTicket(id, dto, req.user!);
  }

  @Post('support/tickets/:id/messages')
  @PlatformPermissions('platform.support.manage')
  @ApiOperation({ summary: 'Post message or internal note to ticket' })
  async addSupportMessage(
    @Param('id') id: string,
    @Body() dto: CreateSupportMessageDto,
    @Req() req: RequestWithUser,
  ) {
    return this.supportService.addMessage(id, dto, req.user!);
  }

  // -------------------------------------------------------------
  // FEATURE FLAGS
  // -------------------------------------------------------------

  @Get('feature-flags')
  @PlatformPermissions('platform.feature_flags.manage')
  @ApiOperation({ summary: 'List platform feature flags' })
  async listFeatureFlags() {
    return this.featureFlagsService.listFlags();
  }

  @Post('feature-flags')
  @PlatformPermissions('platform.feature_flags.manage')
  @ApiOperation({ summary: 'Create feature flag' })
  async createFeatureFlag(
    @Body() dto: CreateFeatureFlagDto,
    @Req() req: RequestWithUser,
  ) {
    return this.featureFlagsService.createFlag(dto, req.user!);
  }

  @Get('feature-flags/:id')
  @PlatformPermissions('platform.feature_flags.manage')
  @ApiOperation({ summary: 'Get feature flag details with assignments' })
  async getFeatureFlag(@Param('id') id: string) {
    return this.featureFlagsService.getFlag(id);
  }

  @Patch('feature-flags/:id')
  @PlatformPermissions('platform.feature_flags.manage')
  @ApiOperation({ summary: 'Update feature flag or percentage rollout' })
  async updateFeatureFlag(
    @Param('id') id: string,
    @Body() dto: UpdateFeatureFlagDto,
    @Req() req: RequestWithUser,
  ) {
    return this.featureFlagsService.updateFlag(id, dto, req.user!);
  }

  @Post('feature-flags/:id/assignments')
  @PlatformPermissions('platform.feature_flags.manage')
  @ApiOperation({ summary: 'Create feature flag assignment override' })
  async createFlagAssignment(
    @Param('id') id: string,
    @Body() dto: CreateFeatureFlagAssignmentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.featureFlagsService.createAssignment(id, dto, req.user!);
  }

  @Delete('feature-flags/:id/assignments/:assignmentId')
  @PlatformPermissions('platform.feature_flags.manage')
  @ApiOperation({ summary: 'Remove feature flag assignment override' })
  async deleteFlagAssignment(
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.featureFlagsService.deleteAssignment(id, assignmentId, req.user!);
  }

  @Get('feature-flags/eval/:key')
  @PlatformPermissions('platform.feature_flags.manage')
  @ApiOperation({ summary: 'Evaluate feature flag for context' })
  async evaluateFlag(
    @Param('key') key: string,
    @Query('organisationId') organisationId?: string,
    @Query('outletId') outletId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.featureFlagsService.evaluateFlag(key, { organisationId, outletId, userId });
  }

  // -------------------------------------------------------------
  // CONFIGURATION & MAINTENANCE MODE
  // -------------------------------------------------------------

  @Get('configuration')
  @PlatformPermissions('platform.configuration.manage')
  @ApiOperation({ summary: 'List platform configuration entries' })
  async listConfigurations() {
    return this.configurationService.listConfigurations();
  }

  @Get('configuration/:key')
  @PlatformPermissions('platform.configuration.manage')
  @ApiOperation({ summary: 'Get single platform configuration' })
  async getConfig(@Param('key') key: string) {
    return this.configurationService.getConfig(key);
  }

  @Put('configuration/:key')
  @PlatformPermissions('platform.configuration.manage', { requireStepUp: true })
  @ApiOperation({ summary: 'Set or update platform configuration' })
  async setConfig(
    @Param('key') key: string,
    @Body() dto: UpdatePlatformConfigDto,
    @Req() req: RequestWithUser,
  ) {
    return this.configurationService.setConfig(key, dto, req.user!);
  }

  @Post('configuration/maintenance')
  @PlatformPermissions('platform.configuration.manage', { requireStepUp: true })
  @ApiOperation({ summary: 'Configure platform maintenance mode' })
  async setMaintenanceMode(
    @Body() dto: SetMaintenanceModeDto,
    @Req() req: RequestWithUser,
  ) {
    return this.configurationService.setMaintenanceMode(dto, req.user!);
  }

  // -------------------------------------------------------------
  // PLATFORM HEALTH & INCIDENTS
  // -------------------------------------------------------------

  @Get('health')
  @PlatformPermissions('platform.health.read')
  @ApiOperation({ summary: 'Comprehensive platform health check probe' })
  async getPlatformHealth() {
    return this.healthService.getComprehensiveHealthReport();
  }

  @Get('incidents')
  @PlatformPermissions('platform.health.read')
  @ApiOperation({ summary: 'List operational incidents' })
  async listIncidents(
    @Query('status') status: any,
    @Query('severity') severity: any,
  ) {
    return this.healthService.listIncidents({ status, severity });
  }

  @Post('incidents')
  @PlatformPermissions('platform.operations.execute')
  @ApiOperation({ summary: 'Declare a platform operational incident' })
  async createIncident(
    @Body() dto: CreateIncidentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.healthService.createIncident(dto, req.user!);
  }

  @Get('incidents/:id')
  @PlatformPermissions('platform.health.read')
  @ApiOperation({ summary: 'Get incident details with events' })
  async getIncident(@Param('id') id: string) {
    return this.healthService.getIncident(id);
  }

  @Patch('incidents/:id')
  @PlatformPermissions('platform.operations.execute')
  @ApiOperation({ summary: 'Update incident status and notes' })
  async updateIncident(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.healthService.updateIncident(id, dto, req.user!);
  }

  // -------------------------------------------------------------
  // INTEGRATIONS & DEVELOPER PLATFORM
  // -------------------------------------------------------------

  @Get('integrations/health')
  @PlatformPermissions('platform.integrations.read')
  @ApiOperation({ summary: 'Monitor integration health across organisations' })
  async getIntegrationHealth(
    @Query('organisationId') organisationId?: string,
    @Query('provider') provider?: string,
  ) {
    return this.integrationsService.getIntegrationHealthSummary({ organisationId, provider });
  }

  @Get('developer/health')
  @PlatformPermissions('platform.integrations.read')
  @ApiOperation({ summary: 'Monitor developer platform APIs and webhooks' })
  async getDeveloperHealth() {
    return this.integrationsService.getDeveloperPlatformHealth();
  }

  @Get('marketplace/health')
  @PlatformPermissions('platform.integrations.read')
  @ApiOperation({ summary: 'Monitor marketplace listings and installations' })
  async getMarketplaceHealth() {
    return this.integrationsService.getMarketplaceHealth();
  }

  // -------------------------------------------------------------
  // SUPPORT ACCESS & BREAK-GLASS
  // -------------------------------------------------------------

  @Get('support-access')
  @PlatformPermissions('platform.operations.execute')
  @ApiOperation({ summary: 'List support access requests' })
  async listSupportAccessRequests(
    @Query('organisationId') organisationId?: string,
    @Query('status') status?: string,
  ) {
    return this.supportAccessService.listRequests({ organisationId, status });
  }

  @Post('support-access/request')
  @PlatformPermissions('platform.operations.execute')
  @ApiOperation({ summary: 'Request temporary support access to an organisation' })
  async requestSupportAccess(
    @Body() dto: RequestSupportAccessDto,
    @Req() req: RequestWithUser,
  ) {
    return this.supportAccessService.requestAccess(dto, req.user!);
  }

  @Post('support-access/:id/approve')
  @PlatformPermissions('platform.operations.execute', { requireStepUp: true })
  @ApiOperation({ summary: 'Approve support access with step-up verification' })
  async approveSupportAccess(
    @Param('id') id: string,
    @Body() dto: ApproveSupportAccessDto,
    @Req() req: RequestWithUser,
  ) {
    return this.supportAccessService.approveAccess(id, dto, req.user!);
  }

  @Post('support-access/:id/revoke')
  @PlatformPermissions('platform.operations.execute')
  @ApiOperation({ summary: 'Revoke active support access immediately' })
  async revokeSupportAccess(
    @Param('id') id: string,
    @Body() dto: RevokeSupportAccessDto,
    @Req() req: RequestWithUser,
  ) {
    return this.supportAccessService.revokeAccess(id, dto, req.user!);
  }

  // -------------------------------------------------------------
  // PLATFORM ANNOUNCEMENTS
  // -------------------------------------------------------------

  @Get('announcements')
  @PlatformPermissions('platform.announcements.manage')
  @ApiOperation({ summary: 'List platform broadcast announcements' })
  async listAnnouncements(
    @Query('isActive') isActive?: boolean,
    @Query('category') category?: string,
  ) {
    return this.announcementsService.listAnnouncements({ isActive, category });
  }

  @Post('announcements')
  @PlatformPermissions('platform.announcements.manage')
  @ApiOperation({ summary: 'Publish platform broadcast announcement' })
  async createAnnouncement(
    @Body() dto: CreateAnnouncementDto,
    @Req() req: RequestWithUser,
  ) {
    return this.announcementsService.createAnnouncement(dto, req.user!);
  }

  @Delete('announcements/:id')
  @PlatformPermissions('platform.announcements.manage')
  @ApiOperation({ summary: 'Deactivate announcement' })
  async deactivateAnnouncement(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.announcementsService.deactivateAnnouncement(id, req.user!);
  }
}
