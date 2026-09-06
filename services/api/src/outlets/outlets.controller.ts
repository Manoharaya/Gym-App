import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OutletsService } from './outlets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/request-with-user.interface';

@ApiTags('Outlets')
@Controller('outlets')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class OutletsController {
  constructor(private readonly outletsService: OutletsService) {}

  @Get()
  @ApiOperation({ summary: 'List outlets accessible to current user / tenant context' })
  @ApiQuery({ name: 'organisationId', required: false, description: 'Filter by organisation' })
  @ApiResponse({ status: 200, description: 'List of outlets' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organisationId') organisationId?: string,
  ) {
    return this.outletsService.findAll(user, organisationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get outlet details by ID or slug (enforces tenant and outlet boundaries)' })
  @ApiResponse({ status: 200, description: 'Outlet details' })
  @ApiResponse({ status: 403, description: 'Cross-tenant or unauthorized outlet access forbidden' })
  @ApiResponse({ status: 404, description: 'Outlet not found' })
  async findById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.outletsService.findById(id, user);
  }
}
