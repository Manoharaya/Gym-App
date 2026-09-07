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
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { StaffService } from '../staff.service';
import { CertificationExpirationProcessor } from '../processors/certification-expiration.processor';
import {
  CreateStaffDto,
  UpdateStaffDto,
  StaffStatusTransitionDto,
  InviteStaffDto,
  AcceptStaffInvitationDto,
  StaffOutletAssignmentDto,
  QueryStaffDto,
} from '../dto/staff-domain.dto';

@ApiTags('Staff Management')
@ApiBearerAuth()
@Controller('staff')
export class StaffController {
  constructor(
    private readonly staffService: StaffService,
    private readonly expirationProcessor: CertificationExpirationProcessor,
  ) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || user.roles[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  @Post()
  @RequirePermission('staff', 'create')
  @ApiOperation({ summary: 'Create a new staff member with decoupled identity' })
  async createStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateStaffDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.staffService.createStaff(organisationId, dto, user);
  }

  @Get()
  @RequirePermission('staff', 'read')
  @ApiOperation({ summary: 'List and filter organisation staff profiles' })
  async findAllStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryStaffDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.staffService.findAllStaff(organisationId, query, user);
  }

  @Post('invite')
  @RequirePermission('staff', 'manage')
  @ApiOperation({ summary: 'Invite a new staff member via email' })
  async inviteStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InviteStaffDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.staffService.inviteStaff(organisationId, dto, user);
  }

  @Public()
  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a staff invitation and establish login credentials' })
  async acceptInvitation(
    @Query('token') token: string,
    @Body() dto: AcceptStaffInvitationDto,
  ) {
    return this.staffService.acceptInvitation(token, dto);
  }

  @Post('process-expirations')
  @RequirePermission('staff', 'manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run expiration processing for trainer certifications and invitations' })
  async processExpirations(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.expirationProcessor.processAllExpirations(organisationId);
  }

  @Get(':id')
  @RequirePermission('staff', 'read')
  @ApiOperation({ summary: 'Get detailed staff profile by ID' })
  async findStaffById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.staffService.findStaffById(organisationId, id, user);
  }

  @Patch(':id')
  @RequirePermission('staff', 'update')
  @ApiOperation({ summary: 'Update staff profile details' })
  async updateStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.staffService.updateStaff(organisationId, id, dto, user);
  }

  @Post(':id/status')
  @RequirePermission('staff', 'manage')
  @ApiOperation({ summary: 'Transition staff employment status (INVITED, ACTIVE, ON_LEAVE, etc.)' })
  async transitionStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: StaffStatusTransitionDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.staffService.transitionStatus(organisationId, id, dto.status, dto.reason, user);
  }

  @Post(':id/deactivate')
  @RequirePermission('staff', 'manage')
  @ApiOperation({ summary: 'Deactivate staff member, close assignments and revoke sessions' })
  async deactivateStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('reason') reason?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.staffService.deactivateStaff(organisationId, id, reason || 'Deactivated by staff manager', user);
  }

  @Post(':id/outlets')
  @RequirePermission('staff', 'manage')
  @ApiOperation({ summary: 'Assign staff member to an outlet with role scope' })
  async assignOutlet(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: StaffOutletAssignmentDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.staffService.assignOutlet(organisationId, id, dto, user);
  }

  @Delete(':id/outlets/:outletId')
  @RequirePermission('staff', 'manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove staff outlet assignment' })
  async removeOutlet(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('outletId') outletId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.staffService.removeOutlet(organisationId, id, outletId, user);
  }
}
