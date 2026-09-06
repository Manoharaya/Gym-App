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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrganisationsService } from './organisations.service';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/request-with-user.interface';

@ApiTags('Organisations')
@Controller('organisations')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, RolesGuard)
@ApiBearerAuth('bearer')
export class OrganisationsController {
  constructor(private readonly organisationsService: OrganisationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('SUPERADMIN')
  @RequirePermission('organisations', 'CREATE')
  @ApiOperation({ summary: 'Create a new tenant organisation (Platform SuperAdmin only)' })
  @ApiResponse({ status: 201, description: 'Organisation created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient privileges' })
  async create(
    @Body() dto: CreateOrganisationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organisationsService.create(dto, user);
  }

  @Get()
  @RequirePermission('organisations', 'READ')
  @ApiOperation({ summary: 'List organisations accessible to caller (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated list of organisations' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.organisationsService.findAll(user, query);
  }

  @Get(':id')
  @RequirePermission('organisations', 'READ')
  @ApiOperation({ summary: 'Get organisation details by ID or slug (enforces tenant isolation)' })
  @ApiResponse({ status: 200, description: 'Organisation details' })
  @ApiResponse({ status: 403, description: 'Cross-tenant access forbidden' })
  @ApiResponse({ status: 404, description: 'Organisation not found' })
  async findById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.organisationsService.findById(id, user);
  }

  @Patch(':id')
  @RequirePermission('organisations', 'UPDATE')
  @ApiOperation({ summary: 'Update organisation configuration (Authorized Org Admins)' })
  @ApiResponse({ status: 200, description: 'Organisation updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Cross-tenant or insufficient role' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganisationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organisationsService.update(id, dto, user);
  }

  @Delete(':id')
  @RequirePermission('organisations', 'DELETE')
  @ApiOperation({ summary: 'Soft-delete an organisation' })
  @ApiResponse({ status: 200, description: 'Organisation marked deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden: Cross-tenant or insufficient role' })
  async softDelete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organisationsService.softDelete(id, user);
  }
}
