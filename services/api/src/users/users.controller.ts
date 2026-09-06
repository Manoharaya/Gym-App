import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../common/interfaces/request-with-user.interface';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Retrieve full detailed profile for current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findMe(user.id);
  }

  @Get()
  @RequirePermission('members', 'READ')
  @ApiOperation({ summary: 'List users/members within current organisation scope' })
  @ApiQuery({ name: 'organisationId', required: false, description: 'Filter by organisation ID' })
  @ApiResponse({ status: 200, description: 'List of users' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions or cross-tenant access denied' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organisationId') organisationId?: string,
  ) {
    return this.usersService.findAll(user, organisationId);
  }
}
