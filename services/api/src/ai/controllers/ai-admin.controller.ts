import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  Headers,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { AIFeatureConfigService } from '../services/ai-feature-config.service';
import { AIUsageService } from '../usage/ai-usage.service';
import { AIAuditService } from '../services/ai-audit.service';
import { AIObservabilityService } from '../services/ai-observability.service';
import { UpdateAIFeatureConfigDto, AIUsageQueryDto } from '../dto/ai.dto';
import { AIFeature } from '@fitcore/types';

@ApiTags('AI Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/ai')
export class AIAdminController {
  constructor(
    private readonly featureConfig: AIFeatureConfigService,
    private readonly usageService: AIUsageService,
    private readonly auditService: AIAuditService,
    private readonly observabilityService: AIObservabilityService,
  ) {}

  @Get('features')
  @RequirePermissions({ resource: 'ai', action: 'read', scope: 'ORGANISATION' })
  @ApiOperation({ summary: 'List organisation AI feature configurations' })
  async getOrganisationFeatures(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrganisationId(user, headerOrgId);
    return this.featureConfig.listOrganisationFeatures(organisationId);
  }

  @Put('features/:feature')
  @RequirePermissions({ resource: 'ai', action: 'configure', scope: 'ORGANISATION' })
  @ApiOperation({ summary: 'Update organisation AI feature configuration' })
  async updateOrganisationFeature(
    @CurrentUser() user: AuthenticatedUser,
    @Param('feature') feature: AIFeature,
    @Body() dto: UpdateAIFeatureConfigDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrganisationId(user, headerOrgId);
    return this.featureConfig.updateOrganisationFeature(organisationId, feature, dto);
  }

  @Get('usage')
  @RequirePermissions({ resource: 'ai', action: 'read', scope: 'ORGANISATION' })
  @ApiOperation({ summary: 'Get organisation AI usage summary and costs' })
  async getOrganisationUsage(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AIUsageQueryDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrganisationId(user, headerOrgId);
    return this.usageService.getUsageSummary(organisationId, query);
  }

  @Get('audit')
  @RequirePermissions({ resource: 'ai', action: 'read', scope: 'ORGANISATION' })
  @ApiOperation({ summary: 'Get organisation AI audit trail' })
  async getOrganisationAudit(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrganisationId(user, headerOrgId);
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.auditService.listAuditEvents(organisationId, parsedLimit);
  }

  @Get('observability')
  @RequirePermissions({ resource: 'ai', action: 'read', scope: 'ORGANISATION' })
  @ApiOperation({ summary: 'Get organisation AI observability metrics' })
  async getOrganisationMetrics(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrganisationId(user, headerOrgId);
    return this.observabilityService.getMetrics(organisationId);
  }

  private resolveOrganisationId(user: AuthenticatedUser, headerOrgId?: string): string {
    const userOrgId = user.roles?.[0]?.organisationId;
    const orgId = userOrgId || headerOrgId;
    if (!orgId) {
      throw new BadRequestException('Organisation context is required');
    }
    return orgId;
  }
}
