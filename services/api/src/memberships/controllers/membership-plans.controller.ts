import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MembershipPlanService } from '../membership-plan.service';
import {
  CreateMembershipPlanDto,
  UpdateMembershipPlanDto,
} from '../dto/membership-domain.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';

@ApiTags('Membership Plans')
@ApiBearerAuth()
@Controller('membership-plans')
export class MembershipPlansController {
  constructor(private readonly planService: MembershipPlanService) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || user.roles[0]?.organisationId;
    if (!orgId) {
      throw new Error('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new membership plan' })
  @RequirePermission('membership_plans', 'CREATE', 'ORGANISATION')
  async createPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMembershipPlanDto,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.planService.createPlan(orgId, dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List membership plans for organisation' })
  async getPlans(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('outletId') outletId?: string,
    @Query('membershipType') membershipType?: string,
    @Query('billingType') billingType?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.planService.getPlans(orgId, {
      status,
      outletId,
      membershipType,
      billingType,
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get membership plan details by ID' })
  async getPlanById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') planId: string,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.planService.getPlanById(orgId, planId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a membership plan' })
  @RequirePermission('membership_plans', 'UPDATE', 'ORGANISATION')
  async updatePlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') planId: string,
    @Body() dto: UpdateMembershipPlanDto,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.planService.updatePlan(orgId, planId, dto, user.id);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive a membership plan' })
  @RequirePermission('membership_plans', 'ARCHIVE', 'ORGANISATION')
  async archivePlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') planId: string,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.planService.archivePlan(orgId, planId, user.id);
  }

  @Get(':id/entitlements')
  @ApiOperation({ summary: 'Get entitlements for a membership plan' })
  async getPlanEntitlements(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') planId: string,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.planService.getPlanEntitlements(orgId, planId);
  }
}
