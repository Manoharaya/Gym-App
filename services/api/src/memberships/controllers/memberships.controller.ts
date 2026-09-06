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
import { MembershipsService } from '../memberships.service';
import { MembershipLifecycleService } from '../membership-lifecycle.service';
import { MembershipRenewalService } from '../membership-renewal.service';
import {
  AssignMembershipDto,
  UpdateMembershipDto,
  LifecycleActionDto,
  CheckAccessDto,
  MembershipQueryDto,
} from '../dto/membership-domain.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';

@ApiTags('Memberships & Subscriptions')
@ApiBearerAuth()
@Controller()
export class MembershipsController {
  constructor(
    private readonly membershipsService: MembershipsService,
    private readonly lifecycleService: MembershipLifecycleService,
    private readonly renewalService: MembershipRenewalService
  ) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || user.roles[0]?.organisationId;
    if (!orgId) {
      throw new Error('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  // ==========================================
  // 1. Member Self-Service Endpoints
  // ==========================================

  @Get('members/me/memberships/active')
  @ApiOperation({ summary: 'Get current active or trial membership for member' })
  async getMyActiveMembership(@CurrentUser() user: AuthenticatedUser) {
    return this.membershipsService.getActiveMembershipForUser(user.id);
  }

  @Get('members/me/memberships')
  @ApiOperation({ summary: 'Get all memberships (active and history) for member' })
  async getMyMemberships(@CurrentUser() user: AuthenticatedUser) {
    return this.membershipsService.getMembershipsForUser(user.id);
  }

  @Get('members/me/memberships/:id')
  @ApiOperation({ summary: 'Get details of a specific membership belonging to member' })
  async getMyMembershipById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') membershipId: string,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.membershipsService.getMembershipById(orgId, membershipId, user);
  }

  @Post('members/me/memberships/:id/cancel')
  @ApiOperation({ summary: 'Self-service cancellation of own membership' })
  async cancelMyMembership(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') membershipId: string,
    @Body() dto: LifecycleActionDto,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    // Verifies ownership before cancelling
    await this.membershipsService.getMembershipById(orgId, membershipId, user);
    return this.lifecycleService.cancel(
      membershipId,
      { id: user.id, role: 'MEMBER' },
      dto.reason ?? 'Member self-cancellation'
    );
  }

  @Post('members/me/memberships/:id/renew')
  @ApiOperation({ summary: 'Self-service renewal of own membership' })
  async renewMyMembership(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') membershipId: string,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    await this.membershipsService.getMembershipById(orgId, membershipId, user);
    return this.renewalService.renewMembership(
      membershipId,
      { id: user.id, role: 'MEMBER' },
      'Member self-renewal'
    );
  }

  // ==========================================
  // 2. Staff / Admin Endpoints
  // ==========================================

  @Get('memberships')
  @ApiOperation({ summary: 'List and search memberships within organisation' })
  @RequirePermission('memberships', 'READ', 'ORGANISATION')
  async getMemberships(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MembershipQueryDto,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.membershipsService.getMemberships(orgId, query, user);
  }

  @Get('memberships/:id')
  @ApiOperation({ summary: 'Get membership by ID with full history and entitlements' })
  @RequirePermission('memberships', 'READ', 'ORGANISATION')
  async getMembershipById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') membershipId: string,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.membershipsService.getMembershipById(orgId, membershipId, user);
  }

  @Post('memberships')
  @ApiOperation({ summary: 'Assign a membership plan to a member' })
  @RequirePermission('memberships', 'CREATE', 'ORGANISATION')
  async assignMembership(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AssignMembershipDto,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.membershipsService.assignMembership(orgId, dto, user);
  }

  @Patch('memberships/:id')
  @ApiOperation({ summary: 'Update membership parameters' })
  @RequirePermission('memberships', 'UPDATE', 'ORGANISATION')
  async updateMembership(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') membershipId: string,
    @Body() dto: UpdateMembershipDto,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.membershipsService.updateMembership(orgId, membershipId, dto, user);
  }

  @Post('memberships/:id/activate')
  @ApiOperation({ summary: 'Activate a pending membership' })
  @RequirePermission('memberships', 'ACTIVATE', 'ORGANISATION')
  async activateMembership(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') membershipId: string,
    @Body() dto: LifecycleActionDto
  ) {
    return this.lifecycleService.activate(
      membershipId,
      { id: user.id, role: user.roles[0]?.role ?? 'STAFF' },
      dto.reason
    );
  }

  @Post('memberships/:id/pause')
  @ApiOperation({ summary: 'Pause an active membership' })
  @RequirePermission('memberships', 'PAUSE', 'ORGANISATION')
  async pauseMembership(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') membershipId: string,
    @Body() dto: LifecycleActionDto
  ) {
    return this.lifecycleService.pause(
      membershipId,
      { id: user.id, role: user.roles[0]?.role ?? 'STAFF' },
      dto.reason
    );
  }

  @Post('memberships/:id/resume')
  @ApiOperation({ summary: 'Resume a paused membership' })
  @RequirePermission('memberships', 'RESUME', 'ORGANISATION')
  async resumeMembership(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') membershipId: string,
    @Body() dto: LifecycleActionDto
  ) {
    return this.lifecycleService.resume(
      membershipId,
      { id: user.id, role: user.roles[0]?.role ?? 'STAFF' },
      dto.reason
    );
  }

  @Post('memberships/:id/suspend')
  @ApiOperation({ summary: 'Suspend a membership for administrative/policy reasons' })
  @RequirePermission('memberships', 'SUSPEND', 'ORGANISATION')
  async suspendMembership(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') membershipId: string,
    @Body() dto: LifecycleActionDto
  ) {
    return this.lifecycleService.suspend(
      membershipId,
      { id: user.id, role: user.roles[0]?.role ?? 'STAFF' },
      dto.reason
    );
  }

  @Post('memberships/:id/cancel')
  @ApiOperation({ summary: 'Cancel a membership administratively' })
  @RequirePermission('memberships', 'CANCEL', 'ORGANISATION')
  async cancelMembership(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') membershipId: string,
    @Body() dto: LifecycleActionDto
  ) {
    return this.lifecycleService.cancel(
      membershipId,
      { id: user.id, role: user.roles[0]?.role ?? 'STAFF' },
      dto.reason
    );
  }

  @Post('memberships/:id/renew')
  @ApiOperation({ summary: 'Renew a membership administratively' })
  @RequirePermission('memberships', 'RENEW', 'ORGANISATION')
  async renewMembership(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') membershipId: string,
    @Body() dto: LifecycleActionDto
  ) {
    return this.renewalService.renewMembership(
      membershipId,
      { id: user.id, role: user.roles[0]?.role ?? 'STAFF' },
      dto.reason ?? 'Administrative renewal'
    );
  }

  // ==========================================
  // 3. Facility Access Check
  // ==========================================

  @Post('memberships/check-access')
  @ApiOperation({ summary: 'Evaluate facility access decision for a member at an outlet' })
  async checkFacilityAccess(@Body() dto: CheckAccessDto) {
    return this.membershipsService.checkFacilityAccess(
      dto.memberProfileId,
      dto.outletId,
      dto.entitlementType
    );
  }
}
