import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { ResourceService } from '../services/resource.service';
import { CreateResourceDto } from '../dto';

@ApiTags('Resources & Studios')
@ApiBearerAuth()
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourceService: ResourceService) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || user.roles[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  @Get()
  @ApiOperation({ summary: 'List physical resources, studios, and rooms for an outlet' })
  async listResources(
    @CurrentUser() user: AuthenticatedUser,
    @Query('outletId') outletId?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.resourceService.listResources(organisationId, outletId);
  }

  @Post()
  @RequirePermission('resources', 'MANAGE', 'ORGANISATION')
  @ApiOperation({ summary: 'Register a new studio room or resource zone (Staff)' })
  async createResource(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateResourceDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.resourceService.createResource(organisationId, dto);
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Check room / resource availability or timetable (Staff)' })
  async getAvailability(
    @Param('id') resourceId: string,
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
  ) {
    const startDate = startDateStr ? new Date(startDateStr) : new Date();
    const endDate = endDateStr
      ? new Date(endDateStr)
      : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    return this.resourceService.getResourceTimetable(resourceId, startDate, endDate);
  }
}
