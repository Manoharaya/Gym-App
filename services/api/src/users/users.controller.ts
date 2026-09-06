import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  UpdateUserDto,
  CreateInvitationDto,
  AssignRoleDto,
} from './dto/user-management.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/request-with-user.interface';

@ApiTags('User & Staff Management')
@Controller()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('organisations/:organisationId/users')
  @RequirePermission('users', 'READ')
  @ApiOperation({ summary: 'List users and staff within an organisation (paginated)' })
  @ApiQuery({ name: 'role', required: false, description: 'Filter by role name (e.g. TRAINER, MEMBER)' })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  async findAllInOrg(
    @Param('organisationId') organisationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
    @Query('role') role?: string,
  ) {
    return this.usersService.findAll(organisationId, user, query, role);
  }

  @Get('users/me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findMe(user.id);
  }

  @Get('users/:userId')
  @RequirePermission('users', 'READ')
  @ApiOperation({ summary: 'Get user profile by ID (IDOR protected)' })
  @ApiResponse({ status: 200, description: 'User profile details' })
  @ApiResponse({ status: 403, description: 'Cross-tenant IDOR access forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findById(
    @Param('userId') userId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.usersService.findById(userId, caller);
  }

  @Patch('users/:userId')
  @RequirePermission('users', 'UPDATE')
  @ApiOperation({ summary: 'Update user profile or account status' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 403, description: 'Cross-tenant IDOR or privilege escalation forbidden' })
  async update(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.usersService.update(userId, dto, caller);
  }

  @Post('organisations/:organisationId/invitations')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('invitations', 'CREATE')
  @ApiOperation({ summary: 'Create a staff or member invitation with privilege escalation checks' })
  @ApiResponse({ status: 201, description: 'Invitation created, raw token generated' })
  @ApiResponse({ status: 403, description: 'Privilege escalation or cross-tenant forbidden' })
  async createInvitation(
    @Param('organisationId') organisationId: string,
    @Body() dto: CreateInvitationDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.usersService.createInvitation(organisationId, dto, caller);
  }

  @Get('organisations/:organisationId/invitations')
  @RequirePermission('invitations', 'READ')
  @ApiOperation({ summary: 'List invitations for an organisation' })
  @ApiResponse({ status: 200, description: 'List of invitations' })
  async listInvitations(
    @Param('organisationId') organisationId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.usersService.listInvitations(organisationId, caller);
  }

  @Post('organisations/:organisationId/users/:userId/roles')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('roles', 'ASSIGN')
  @ApiOperation({ summary: 'Assign a role to a user within organisation (Privilege Escalation Protected)' })
  @ApiResponse({ status: 201, description: 'Role assigned successfully' })
  @ApiResponse({ status: 403, description: 'Privilege escalation or cross-tenant forbidden' })
  @ApiResponse({ status: 409, description: 'User already holds role' })
  async assignRole(
    @Param('organisationId') organisationId: string,
    @Param('userId') userId: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.usersService.assignRole(organisationId, userId, dto, caller);
  }

  @Delete('organisations/:organisationId/users/:userId/roles/:roleId')
  @RequirePermission('roles', 'REVOKE')
  @ApiOperation({ summary: 'Revoke a role from a user within organisation' })
  @ApiResponse({ status: 200, description: 'Role revoked successfully' })
  @ApiResponse({ status: 403, description: 'Privilege escalation or cross-tenant forbidden' })
  async revokeRole(
    @Param('organisationId') organisationId: string,
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.usersService.revokeRole(organisationId, userId, roleId, caller);
  }

  @Get('organisations/:organisationId/users/:userId/roles')
  @RequirePermission('roles', 'ASSIGN')
  @ApiOperation({ summary: 'List roles assigned to a user in organisation' })
  @ApiResponse({ status: 200, description: 'List of user roles' })
  async listRoles(
    @Param('organisationId') organisationId: string,
    @Param('userId') userId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.usersService.listRoles(organisationId, userId, caller);
  }
}
