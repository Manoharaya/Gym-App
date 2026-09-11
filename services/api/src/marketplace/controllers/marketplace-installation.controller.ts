/**
 * FitCore — Day 50: Marketplace Tenant Installation Management Controller
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
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { MarketplaceInstallationService } from '../services/marketplace-installation.service';
import { MarketplaceHealthService } from '../services/marketplace-health.service';
import {
  ConfigureMarketplaceInstallationDto,
  InstallMarketplaceListingDto,
} from '../dto';

@Controller('marketplace/installations')
@UseGuards(JwtAuthGuard)
export class MarketplaceInstallationController {
  constructor(
    private readonly installationService: MarketplaceInstallationService,
    private readonly healthService: MarketplaceHealthService,
  ) {}

  private extractOrgId(user: AuthenticatedUser, req: any): string {
    const orgId =
      req?.headers?.['x-organisation-id'] ||
      req?.headers?.['X-Organisation-Id'] ||
      user?.primaryOrganisationId ||
      user?.roles?.[0]?.organisationId;

    if (!orgId) {
      throw new BadRequestException('Organisation context is required (x-organisation-id header or authenticated organisation)');
    }
    return orgId;
  }

  @Post()
  async installListing(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InstallMarketplaceListingDto,
    @Req() req: any,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.installationService.installListing(orgId, user.id, dto);
  }

  @Get()
  async listInstallations(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Query('outletId') outletId?: string,
    @Query('status') status?: string,
    @Query('listingType') listingType?: string,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.installationService.getTenantInstallations(orgId, {
      outletId,
      status,
      listingType,
    });
  }

  @Get('health')
  async getHealthOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.healthService.getTenantHealthSummary(orgId);
  }

  @Get(':id')
  async getInstallation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.installationService.getInstallationById(id, orgId);
  }

  @Patch(':id/config')
  async configureInstallation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ConfigureMarketplaceInstallationDto,
    @Req() req: any,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.installationService.configureInstallation(id, orgId, user.id, dto);
  }

  @Post(':id/pause')
  async pauseInstallation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.installationService.pauseInstallation(id, orgId, user.id);
  }

  @Post(':id/resume')
  async resumeInstallation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.installationService.resumeInstallation(id, orgId, user.id);
  }

  @Post(':id/upgrade')
  async upgradeInstallation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('version') version: string,
    @Req() req: any,
  ) {
    if (!version) {
      throw new BadRequestException('Target version is required');
    }
    const orgId = this.extractOrgId(user, req);
    return this.installationService.upgradeInstallation(id, version, orgId, user.id);
  }

  @Post(':id/health')
  async recordHealthCheck(
    @Param('id') id: string,
    @Body('status') status: 'HEALTHY' | 'DEGRADED' | 'FAILING',
    @Body('details') details?: Record<string, any>,
  ) {
    if (!status || !['HEALTHY', 'DEGRADED', 'FAILING'].includes(status)) {
      throw new BadRequestException('Valid status (HEALTHY, DEGRADED, FAILING) is required');
    }
    return this.healthService.recordHealthCheck(id, status, details);
  }

  @Delete(':id')
  async uninstallInstallation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.installationService.uninstallInstallation(id, orgId, user.id);
  }
}
