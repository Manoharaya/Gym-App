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
import { OutletsService } from './outlets.service';
import { CreateOutletDto } from './dto/create-outlet.dto';
import { UpdateOutletDto } from './dto/update-outlet.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/request-with-user.interface';

@ApiTags('Outlets')
@Controller()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
export class OutletsController {
  constructor(private readonly outletsService: OutletsService) {}

  // 1. Nested routes under organisations
  @Post('organisations/:organisationId/outlets')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('outlets', 'CREATE')
  @ApiOperation({ summary: 'Create a new branch outlet within an organisation' })
  @ApiResponse({ status: 201, description: 'Outlet created successfully' })
  @ApiResponse({ status: 403, description: 'Cross-tenant or unauthorized access' })
  @ApiResponse({ status: 409, description: 'Outlet code collision' })
  async createNested(
    @Param('organisationId') organisationId: string,
    @Body() dto: CreateOutletDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.outletsService.create(organisationId, dto, user);
  }

  @Get('organisations/:organisationId/outlets')
  @RequirePermission('outlets', 'READ')
  @ApiOperation({ summary: 'List outlets within an organisation (paginated)' })
  @ApiResponse({ status: 200, description: 'List of outlets' })
  async findAllNested(
    @Param('organisationId') organisationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.outletsService.findAll(organisationId, user, query);
  }

  @Get('organisations/:organisationId/outlets/:outletId')
  @RequirePermission('outlets', 'READ')
  @ApiOperation({ summary: 'Get outlet details within an organisation' })
  @ApiResponse({ status: 200, description: 'Outlet details' })
  @ApiResponse({ status: 403, description: 'Cross-tenant or unauthorized outlet access' })
  @ApiResponse({ status: 404, description: 'Outlet not found' })
  async findByIdNested(
    @Param('organisationId') organisationId: string,
    @Param('outletId') outletId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.outletsService.findById(organisationId, outletId, user);
  }

  @Patch('organisations/:organisationId/outlets/:outletId')
  @RequirePermission('outlets', 'UPDATE')
  @ApiOperation({ summary: 'Update outlet details within an organisation' })
  @ApiResponse({ status: 200, description: 'Outlet updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateNested(
    @Param('organisationId') organisationId: string,
    @Param('outletId') outletId: string,
    @Body() dto: UpdateOutletDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.outletsService.update(organisationId, outletId, dto, user);
  }

  @Delete('organisations/:organisationId/outlets/:outletId')
  @RequirePermission('outlets', 'DELETE')
  @ApiOperation({ summary: 'Soft-delete an outlet within an organisation' })
  @ApiResponse({ status: 200, description: 'Outlet marked deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async softDeleteNested(
    @Param('organisationId') organisationId: string,
    @Param('outletId') outletId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.outletsService.softDelete(organisationId, outletId, user);
  }

  // 2. Direct routes for backwards compatibility
  @Get('outlets')
  @RequirePermission('outlets', 'READ')
  @ApiOperation({ summary: 'List accessible outlets (flat endpoint)' })
  @ApiQuery({ name: 'organisationId', required: false })
  async findAllFlat(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organisationId') organisationId?: string,
    @Query() query?: PaginationQueryDto,
  ) {
    const targetOrgId = organisationId || user.primaryOrganisationId || user.roles[0]?.organisationId;
    return this.outletsService.findAll(targetOrgId, user, query);
  }

  @Get('outlets/:id')
  @RequirePermission('outlets', 'READ')
  @ApiOperation({ summary: 'Get outlet details by ID (flat endpoint)' })
  async findByIdFlat(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.outletsService.findByIdFlat(id, user);
  }
}
