/**
 * FitCore — Day 49: Developer Platform Management & Portal Controller
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { DeveloperApplicationService } from '../services/developer-application.service';
import { ApiKeyService } from '../services/api-key.service';
import { WebhookSubscriptionService } from '../services/webhook-subscription.service';
import { WebhookDeliveryService } from '../services/webhook-delivery.service';
import { ApiUsageService } from '../services/api-usage.service';
import { ApiScopeService } from '../services/api-scope.service';
import { DeveloperSandboxService } from '../services/developer-sandbox.service';
import { ApiAuditService } from '../services/api-audit.service';
import {
  CreateApiKeyDto,
  CreateDeveloperApplicationDto,
  CreateWebhookSubscriptionDto,
  RotateApiKeyDto,
  UpdateDeveloperApplicationDto,
  UpdateWebhookSubscriptionDto,
} from '@fitcore/types';

@Controller('developer')
@UseGuards(JwtAuthGuard)
export class DeveloperPlatformController {
  constructor(
    private readonly applicationService: DeveloperApplicationService,
    private readonly apiKeyService: ApiKeyService,
    private readonly webhookSubscriptionService: WebhookSubscriptionService,
    private readonly webhookDeliveryService: WebhookDeliveryService,
    private readonly usageService: ApiUsageService,
    private readonly scopeService: ApiScopeService,
    private readonly sandboxService: DeveloperSandboxService,
    private readonly auditService: ApiAuditService,
  ) {}

  // =========================================================================
  // APPLICATIONS
  // =========================================================================
  @Post('applications')
  async createApplication(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDeveloperApplicationDto,
    @Req() req: any,
  ) {
    const orgId =
      dto.organisationId ||
      req.header('x-organisation-id') ||
      req.header('X-Organisation-Id') ||
      user.primaryOrganisationId ||
      user.roles[0]?.organisationId ||
      null;
    return this.applicationService.createApplication(orgId, user.id, dto);
  }

  @Get('applications')
  async listApplications(@CurrentUser() user: AuthenticatedUser) {
    const orgId = user.isSuperAdmin
      ? undefined
      : user.primaryOrganisationId || user.roles[0]?.organisationId;
    return this.applicationService.listApplications(orgId);
  }

  @Get('applications/:id')
  async getApplication(@Param('id') id: string) {
    return this.applicationService.getApplication(id);
  }

  @Patch('applications/:id')
  async updateApplication(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateDeveloperApplicationDto,
  ) {
    return this.applicationService.updateApplication(id, dto, user.id);
  }

  @Post('applications/:id/rotate-secret')
  async rotateClientSecret(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applicationService.rotateClientSecret(id, user.id);
  }

  @Post('applications/:id/revoke')
  async revokeApplication(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applicationService.revokeApplication(id, 'REVOKED', user.id);
  }

  // =========================================================================
  // API KEYS
  // =========================================================================
  @Post('applications/:id/api-keys')
  async createApiKey(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.apiKeyService.createApiKey(id, dto, user.id);
  }

  @Get('applications/:id/api-keys')
  async listApiKeys(@Param('id') id: string) {
    return this.apiKeyService.listApiKeys(id);
  }

  @Post('api-keys/:id/rotate')
  async rotateApiKey(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RotateApiKeyDto,
  ) {
    return this.apiKeyService.rotateApiKey(id, dto, user.id);
  }

  @Post('api-keys/:id/revoke')
  async revokeApiKey(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.apiKeyService.revokeApiKey(id, user.id);
  }

  // =========================================================================
  // WEBHOOKS
  // =========================================================================
  @Post('applications/:id/webhooks')
  async createWebhook(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWebhookSubscriptionDto,
  ) {
    const orgId = user.primaryOrganisationId || user.roles[0]?.organisationId || '';
    return this.webhookSubscriptionService.createSubscription(id, orgId, dto, user.id);
  }

  @Get('applications/:id/webhooks')
  async listWebhooks(@Param('id') id: string) {
    return this.webhookSubscriptionService.listSubscriptions(id);
  }

  @Patch('webhooks/:id')
  async updateWebhook(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateWebhookSubscriptionDto,
  ) {
    return this.webhookSubscriptionService.updateSubscription(id, dto, user.id);
  }

  @Post('webhooks/:id/rotate-secret')
  async rotateWebhookSecret(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.webhookSubscriptionService.rotateSecret(id, user.id);
  }

  @Post('webhooks/:id/test')
  async sendTestWebhook(@Param('id') id: string) {
    return this.webhookDeliveryService.sendTestEvent(id);
  }

  @Get('webhooks/:id/deliveries')
  async listDeliveries(
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    return this.webhookDeliveryService.listDeliveries(id, limit ? Number(limit) : 50);
  }

  @Delete('webhooks/:id')
  async deleteWebhook(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.webhookSubscriptionService.deleteSubscription(id, user.id);
  }

  // =========================================================================
  // ANALYTICS, LOGS & SANDBOX
  // =========================================================================
  @Get('applications/:id/analytics')
  async getAnalytics(@Param('id') id: string) {
    return this.usageService.getAnalyticsSummary(id);
  }

  @Get('applications/:id/logs')
  async listLogs(
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    return this.usageService.listLogs(id, limit ? Number(limit) : 50);
  }

  @Get('scopes')
  async getScopesRegistry() {
    return this.scopeService.getAllScopes();
  }

  @Get('sandbox/status')
  async getSandboxStatus() {
    return this.sandboxService.getSandboxStatus();
  }

  @Get('audit-logs')
  async listAuditLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Query('applicationId') applicationId?: string,
    @Query('limit') limit?: number,
  ) {
    const orgId = user.isSuperAdmin ? undefined : user.primaryOrganisationId;
    return this.auditService.listLogs({
      organisationId: orgId,
      applicationId,
      limit: limit ? Number(limit) : 50,
    });
  }
}
