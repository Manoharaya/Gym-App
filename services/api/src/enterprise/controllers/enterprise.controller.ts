import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { EnterpriseHierarchyService } from '../services/enterprise-hierarchy.service';
import { EnterpriseGovernanceService } from '../services/enterprise-governance.service';
import { EnterpriseExportService } from '../services/enterprise-export.service';
import { EnterpriseConfigurationService } from '../services/enterprise-configuration.service';

@Controller('enterprise')
@UseGuards(JwtAuthGuard)
export class EnterpriseController {
  constructor(
    private readonly hierarchyService: EnterpriseHierarchyService,
    private readonly governanceService: EnterpriseGovernanceService,
    private readonly exportService: EnterpriseExportService,
    private readonly configService: EnterpriseConfigurationService,
  ) {}

  private extractOrgId(user: AuthenticatedUser, req: any): string {
    const orgId =
      req?.headers?.['x-organisation-id'] ||
      req?.headers?.['X-Organisation-Id'] ||
      user?.primaryOrganisationId ||
      user?.roles?.[0]?.organisationId;

    if (!orgId) {
      throw new BadRequestException('Organisation context is required (x-organisation-id header or user org)');
    }
    return orgId;
  }

  @Get('hierarchy')
  async getHierarchy(@CurrentUser() user: AuthenticatedUser, @Req() req: any) {
    const orgId = this.extractOrgId(user, req);
    return this.hierarchyService.getHierarchyTree(orgId);
  }

  @Get('governance')
  async getGovernance(@CurrentUser() user: AuthenticatedUser, @Req() req: any) {
    const orgId = this.extractOrgId(user, req);
    return this.governanceService.getGovernanceOverview(orgId);
  }

  @Get('export')
  async exportGovernance(@CurrentUser() user: AuthenticatedUser, @Req() req: any) {
    const orgId = this.extractOrgId(user, req);
    return this.exportService.exportOrganisationGovernanceArchive(orgId);
  }

  @Get('config')
  async getConfigs(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Query('category') category?: string,
    @Query('scopeType') scopeType?: string,
    @Query('scopeId') scopeId?: string,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.configService.getConfigs(orgId, category, scopeType, scopeId);
  }

  @Post('config')
  async setConfig(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Body()
    body: {
      category: string;
      key: string;
      value: any;
      scopeType?: string;
      scopeId?: string;
    },
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.configService.setConfig(
      orgId,
      body.category,
      body.key,
      body.value,
      body.scopeType,
      body.scopeId,
      user.id,
    );
  }
}
