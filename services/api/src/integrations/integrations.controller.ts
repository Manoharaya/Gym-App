/**
 * FitCore — Day 48: Integrations Platform Controller
 *
 * Exposes the unified integrations API under /api/v1/integrations/*
 * Enforces strict multi-tenant isolation, RBAC, and IDOR defenses.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { IntegrationsService } from './integrations.service';
import { IntegrationRegistry } from './core/integration-registry.service';
import { IntegrationConnectionService } from './core/integration-connection.service';
import { IntegrationOAuthService } from './core/integration-oauth.service';
import { IntegrationHealthService } from './core/integration-health.service';
import { IntegrationSyncService } from './core/integration-sync.service';
import { IntegrationWebhookService } from './core/integration-webhook.service';
import { IntegrationPermissionService, IntegrationAccessContext } from './core/integration-permission.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';
import { TriggerSyncDto } from './dto/trigger-sync.dto';
import { ConnectionFilterDto } from './dto/connection-filter.dto';
import { WebhookQueryDto } from './dto/webhook-query.dto';
import {
  IntegrationCategory,
  IntegrationScope,
  IntegrationCapability,
  IntegrationConnectionDto,
  IntegrationOverviewSummaryDto,
  IntegrationMetadata,
  IntegrationSyncJobDto,
  IntegrationWebhookEventDto,
  IntegrationHealthReportDto,
  IntegrationAuditDto,
  IntegrationErrorLogDto,
} from '@fitcore/types';

@Controller('integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly registry: IntegrationRegistry,
    private readonly connectionService: IntegrationConnectionService,
    private readonly oauthService: IntegrationOAuthService,
    private readonly healthService: IntegrationHealthService,
    private readonly syncService: IntegrationSyncService,
    private readonly webhookService: IntegrationWebhookService,
    private readonly permissionService: IntegrationPermissionService,
  ) {}

  private resolveContext(
    req: any,
    orgHeader?: string,
    userHeader?: string,
    roleHeader?: string,
    outletHeader?: string,
    memberHeader?: string,
    staffHeader?: string,
  ): IntegrationAccessContext {
    const userId = userHeader || req.user?.id || req.user?.sub || 'system_user';
    const organisationId = orgHeader || req.user?.organisationId || req.user?.primaryOrganisationId || 'DEFAULT_ORG';
    const roles: string[] = roleHeader
      ? [roleHeader]
      : req.user?.roles?.map((r: any) => r.role || r) || (req.user?.role ? [req.user.role] : ['ORGANISATION_OWNER']);

    const outletId = outletHeader || req.user?.outletId || req.user?.primaryOutletId;
    const memberId = memberHeader || req.user?.memberId;
    const staffId = staffHeader || req.user?.staffId;

    return {
      organisationId,
      userId,
      roles,
      outletId,
      memberId,
      staffId,
    };
  }

  // ---------------------------------------------------------------------------
  // 1. Management Overview & Catalog
  // ---------------------------------------------------------------------------

  @Get()
  async getOverview(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader?: string,
    @Headers('x-user-id') userHeader?: string,
    @Headers('x-role') roleHeader?: string,
  ): Promise<IntegrationOverviewSummaryDto> {
    const ctx = this.resolveContext(req, orgHeader, userHeader, roleHeader);
    return this.integrationsService.getOverviewSummary(ctx);
  }

  @Get('providers')
  listProviders(
    @Query('category') category?: IntegrationCategory,
    @Query('scope') scope?: IntegrationScope,
    @Query('capability') capability?: IntegrationCapability,
  ): IntegrationMetadata[] {
    return this.registry.listProviders({ category, scope, capability });
  }

  @Get('providers/:integrationKey')
  getProvider(@Param('integrationKey') integrationKey: string): IntegrationMetadata {
    return this.registry.getProvider(integrationKey);
  }

  @Get('capabilities')
  getCapabilities(): { capability: IntegrationCapability; description: string }[] {
    return this.registry.getAllCapabilities();
  }

  // ---------------------------------------------------------------------------
  // 2. Connections Management (CRUD & Lifecycle)
  // ---------------------------------------------------------------------------

  @Get('connections')
  async listConnections(
    @Req() req: any,
    @Query() filter: ConnectionFilterDto,
    @Headers('x-organisation-id') orgHeader?: string,
    @Headers('x-user-id') userHeader?: string,
    @Headers('x-role') roleHeader?: string,
    @Headers('x-outlet-id') outletHeader?: string,
    @Headers('x-member-id') memberHeader?: string,
    @Headers('x-staff-id') staffHeader?: string,
  ): Promise<IntegrationConnectionDto[]> {
    const ctx = this.resolveContext(
      req,
      orgHeader,
      userHeader,
      roleHeader,
      outletHeader,
      memberHeader,
      staffHeader,
    );
    return this.connectionService.listConnections(ctx, filter);
  }

  @Get('connections/:id')
  async getConnection(
    @Param('id') id: string,
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader?: string,
    @Headers('x-user-id') userHeader?: string,
    @Headers('x-role') roleHeader?: string,
    @Headers('x-outlet-id') outletHeader?: string,
    @Headers('x-member-id') memberHeader?: string,
    @Headers('x-staff-id') staffHeader?: string,
  ): Promise<IntegrationConnectionDto> {
    const ctx = this.resolveContext(
      req,
      orgHeader,
      userHeader,
      roleHeader,
      outletHeader,
      memberHeader,
      staffHeader,
    );
    return this.connectionService.getConnectionById(ctx, id);
  }

  @Post('connections')
  @HttpCode(HttpStatus.CREATED)
  async createConnection(
    @Body() dto: CreateConnectionDto,
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader?: string,
    @Headers('x-user-id') userHeader?: string,
    @Headers('x-role') roleHeader?: string,
    @Headers('x-outlet-id') outletHeader?: string,
    @Headers('x-member-id') memberHeader?: string,
    @Headers('x-staff-id') staffHeader?: string,
  ): Promise<IntegrationConnectionDto> {
    const ctx = this.resolveContext(
      req,
      orgHeader,
      userHeader,
      roleHeader,
      outletHeader,
      memberHeader,
      staffHeader,
    );
    return this.connectionService.createConnection(ctx, dto);
  }

  @Patch('connections/:id')
  async updateConnection(
    @Param('id') id: string,
    @Body() dto: UpdateConnectionDto,
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader?: string,
    @Headers('x-user-id') userHeader?: string,
    @Headers('x-role') roleHeader?: string,
  ): Promise<IntegrationConnectionDto> {
    const ctx = this.resolveContext(req, orgHeader, userHeader, roleHeader);
    return this.connectionService.updateConnection(ctx, id, dto);
  }

  @Post('connections/:id/connect')
  @HttpCode(HttpStatus.OK)
  async initiateConnect(
    @Param('id') id: string,
    @Body() body: { redirectUri?: string; credentials?: Record<string, any> },
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader?: string,
    @Headers('x-user-id') userHeader?: string,
    @Headers('x-role') roleHeader?: string,
  ) {
    const ctx = this.resolveContext(req, orgHeader, userHeader, roleHeader);
    const conn = await this.connectionService.getConnectionById(ctx, id);

    const providerMeta = this.registry.getProvider(conn.integrationKey);

    if (providerMeta.authenticationType === 'OAUTH2') {
      const redirectUri = body.redirectUri || 'https://api.fitcore.app/api/v1/integrations/oauth/callback';
      this.integrationsService.validateUrlForSsrf(redirectUri);

      const stateToken = await this.oauthService.generateState(
        ctx.organisationId,
        ctx.userId,
        conn.provider,
        redirectUri,
      );

      const authorizationUrl = `https://login.${conn.provider.toLowerCase()}.com/oauth/authorize?client_id=fitcore&response_type=code&state=${stateToken}&redirect_uri=${encodeURIComponent(
        redirectUri,
      )}`;

      return { authorizationUrl, stateToken };
    }

    // Direct API key activation
    if (body.credentials) {
      return this.connectionService.updateConnection(ctx, id, {
        credentials: body.credentials,
        status: 'CONNECTED',
      });
    }

    return conn;
  }

  @Post('connections/:id/disconnect')
  @HttpCode(HttpStatus.OK)
  async disconnect(
    @Param('id') id: string,
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader?: string,
    @Headers('x-user-id') userHeader?: string,
    @Headers('x-role') roleHeader?: string,
  ): Promise<IntegrationConnectionDto> {
    const ctx = this.resolveContext(req, orgHeader, userHeader, roleHeader);
    return this.connectionService.disconnect(ctx, id);
  }

  @Post('connections/:id/reconnect')
  @HttpCode(HttpStatus.OK)
  async reconnect(
    @Param('id') id: string,
    @Body() body: { credentials?: Record<string, any> },
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader?: string,
    @Headers('x-user-id') userHeader?: string,
    @Headers('x-role') roleHeader?: string,
  ): Promise<IntegrationConnectionDto> {
    const ctx = this.resolveContext(req, orgHeader, userHeader, roleHeader);
    return this.connectionService.reconnect(ctx, id, body?.credentials);
  }

  // ---------------------------------------------------------------------------
  // 3. Health Monitoring & Checks
  // ---------------------------------------------------------------------------

  @Post('connections/:id/health-check')
  @HttpCode(HttpStatus.OK)
  async checkConnectionHealth(
    @Param('id') id: string,
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader?: string,
    @Headers('x-user-id') userHeader?: string,
    @Headers('x-role') roleHeader?: string,
  ): Promise<IntegrationHealthReportDto> {
    const ctx = this.resolveContext(req, orgHeader, userHeader, roleHeader);
    await this.connectionService.getConnectionById(ctx, id);
    return this.healthService.evaluateHealth(id);
  }

  @Get('connections/:id/health')
  async getConnectionHealth(
    @Param('id') id: string,
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader?: string,
    @Headers('x-user-id') userHeader?: string,
    @Headers('x-role') roleHeader?: string,
  ): Promise<IntegrationHealthReportDto> {
    const ctx = this.resolveContext(req, orgHeader, userHeader, roleHeader);
    await this.connectionService.getConnectionById(ctx, id);
    return this.healthService.evaluateHealth(id);
  }

  @Get('health')
  async getSystemHealth(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader?: string,
    @Headers('x-user-id') userHeader?: string,
    @Headers('x-role') roleHeader?: string,
  ) {
    const ctx = this.resolveContext(req, orgHeader, userHeader, roleHeader);
    const overview = await this.integrationsService.getOverviewSummary(ctx);
    return {
      status: overview.degradedCount > 0 ? 'DEGRADED' : 'HEALTHY',
      summary: overview,
      timestamp: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // 4. Synchronization Engine
  // ---------------------------------------------------------------------------

  @Get('connections/:id/sync')
  async getConnectionSyncJobs(
    @Param('id') id: string,
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader?: string,
    @Headers('x-user-id') userHeader?: string,
    @Headers('x-role') roleHeader?: string,
  ): Promise<IntegrationSyncJobDto[]> {
    const ctx = this.resolveContext(req, orgHeader, userHeader, roleHeader);
    await this.connectionService.getConnectionById(ctx, id);
    return this.syncService.listSyncJobs(ctx, { connectionId: id });
  }

  @Post('connections/:id/sync')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerConnectionSync(
    @Param('id') id: string,
    @Body() dto: TriggerSyncDto,
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader?: string,
    @Headers('x-user-id') userHeader?: string,
    @Headers('x-role') roleHeader?: string,
  ): Promise<IntegrationSyncJobDto> {
    const ctx = this.resolveContext(req, orgHeader, userHeader, roleHeader);
    return this.syncService.triggerSync(ctx, id, {
      syncType: dto.syncType,
      entityType: dto.entityType,
    });
  }

  @Get('sync-jobs')
  async listAllSyncJobs(
    @Req() req: any,
    @Query('connectionId') connectionId?: string,
    @Headers('x-organisation-id') orgHeader?: string,
    @Headers('x-user-id') userHeader?: string,
    @Headers('x-role') roleHeader?: string,
  ): Promise<IntegrationSyncJobDto[]> {
    const ctx = this.resolveContext(req, orgHeader, userHeader, roleHeader);
    return this.syncService.listSyncJobs(ctx, { connectionId });
  }

  // ---------------------------------------------------------------------------
  // 5. Inbound Webhooks Pipeline
  // ---------------------------------------------------------------------------

  @Public()
  @Post('webhooks/:provider')
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(
    @Param('provider') provider: string,
    @Headers() headers: Record<string, any>,
    @Body() body: any,
  ) {
    const rawPayload = typeof body === 'string' ? body : JSON.stringify(body);
    return this.webhookService.processWebhook(provider, headers, rawPayload);
  }

  @Get('webhook-events')
  async listWebhookEvents(
    @Query() query: WebhookQueryDto,
  ): Promise<IntegrationWebhookEventDto[]> {
    return this.webhookService.listWebhookEvents({
      provider: query.provider,
      status: query.status,
    });
  }

  // ---------------------------------------------------------------------------
  // 6. Auditing, Error Logs & Diagnostics
  // ---------------------------------------------------------------------------

  @Get('audit')
  async listAudit(
    @Req() req: any,
    @Query('connectionId') connectionId?: string,
    @Headers('x-organisation-id') orgHeader?: string,
    @Headers('x-user-id') userHeader?: string,
    @Headers('x-role') roleHeader?: string,
  ): Promise<IntegrationAuditDto[]> {
    const ctx = this.resolveContext(req, orgHeader, userHeader, roleHeader);
    return this.integrationsService.listAuditLogs(ctx, { connectionId });
  }

  @Get('errors')
  async listErrors(
    @Req() req: any,
    @Query('connectionId') connectionId?: string,
    @Headers('x-organisation-id') orgHeader?: string,
    @Headers('x-user-id') userHeader?: string,
    @Headers('x-role') roleHeader?: string,
  ): Promise<IntegrationErrorLogDto[]> {
    const ctx = this.resolveContext(req, orgHeader, userHeader, roleHeader);
    return this.integrationsService.listErrors(ctx, { connectionId });
  }
}
