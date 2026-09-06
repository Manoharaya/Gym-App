import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrganisationsService } from './organisations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/request-with-user.interface';

@ApiTags('Organisations')
@Controller('organisations')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class OrganisationsController {
  constructor(private readonly organisationsService: OrganisationsService) {}

  @Get()
  @ApiOperation({ summary: 'List organisations accessible to current user / tenant context' })
  @ApiResponse({ status: 200, description: 'List of organisations' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.organisationsService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organisation details by ID or slug (enforces tenant isolation)' })
  @ApiResponse({ status: 200, description: 'Organisation details' })
  @ApiResponse({ status: 403, description: 'Cross-tenant access forbidden' })
  @ApiResponse({ status: 404, description: 'Organisation not found' })
  async findById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.organisationsService.findById(id, user);
  }
}
