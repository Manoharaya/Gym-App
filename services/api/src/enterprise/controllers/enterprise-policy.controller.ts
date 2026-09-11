import {
  Controller,
  Get,
  Post,
  Patch,
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
import { EnterprisePolicyService } from '../services/enterprise-policy.service';
import { EnterprisePolicyResolverService } from '../services/enterprise-policy-resolver.service';
import { EnterprisePolicySimulatorService } from '../services/enterprise-policy-simulator.service';
import {
  CreatePolicyDto,
  UpdatePolicyDto,
  SimulatePolicyDto,
} from '../dto/create-policy.dto';

@Controller('enterprise/policies')
@UseGuards(JwtAuthGuard)
export class EnterprisePolicyController {
  constructor(
    private readonly policyService: EnterprisePolicyService,
    private readonly resolverService: EnterprisePolicyResolverService,
    private readonly simulatorService: EnterprisePolicySimulatorService,
  ) {}

  private extractOrgId(user: AuthenticatedUser, req: any): string {
    const orgId =
      req?.headers?.['x-organisation-id'] ||
      req?.headers?.['X-Organisation-Id'] ||
      user?.primaryOrganisationId ||
      user?.roles?.[0]?.organisationId;

    if (!orgId) {
      throw new BadRequestException('Organisation context is required');
    }
    return orgId;
  }

  @Post()
  async createPolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Body() dto: CreatePolicyDto,
  ) {
    const orgId = this.extractOrgId(user, req);
    // If not creating an organisation root policy, validate against upstream hard ceilings
    if (dto.scopeType !== 'ORGANISATION') {
      await this.resolverService.validateHardCeilings(
        orgId,
        dto.category,
        dto.scopeType,
        dto.scopeId || dto.brandId || dto.outletId,
        dto.configJson,
      );
    }
    return this.policyService.createPolicy(orgId, dto, user.id);
  }

  @Get()
  async getPolicies(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Query('category') category?: string,
    @Query('scopeType') scopeType?: string,
    @Query('scopeId') scopeId?: string,
    @Query('status') status?: string,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.policyService.getPolicies(orgId, {
      category,
      scopeType,
      scopeId,
      status,
    });
  }

  @Get('effective')
  async getEffectivePolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Query('category') category: string,
    @Query('brandId') brandId?: string,
    @Query('regionCode') regionCode?: string,
    @Query('outletId') outletId?: string,
  ) {
    if (!category) {
      throw new BadRequestException('category query parameter is required');
    }
    const orgId = this.extractOrgId(user, req);
    return this.resolverService.resolveEffectivePolicy({
      organisationId: orgId,
      category,
      brandId,
      regionCode,
      outletId,
    });
  }

  @Post('preview')
  async previewPolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Body() dto: SimulatePolicyDto,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.simulatorService.simulate(orgId, dto);
  }

  @Get(':id')
  async getPolicyById(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.policyService.getPolicyById(orgId, id);
  }

  @Patch(':id')
  async updatePolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePolicyDto,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.policyService.updatePolicy(orgId, id, dto, user.id);
  }
}
