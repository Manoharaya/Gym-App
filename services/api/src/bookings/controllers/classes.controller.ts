import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { PrismaService } from '../../database/prisma.service';
import { CreateClassTypeDto, CreateClassTemplateDto } from '../dto';

@ApiTags('Classes & Templates')
@ApiBearerAuth()
@Controller('classes')
export class ClassesController {
  constructor(private readonly prisma: PrismaService) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || user.roles[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  @Get()
  @ApiOperation({ summary: 'List all class types for the active organisation' })
  async listClassTypes(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);

    return this.prisma.classType.findMany({
      where: { organisationId, status: 'ACTIVE' },
      include: {
        templates: { where: { status: 'ACTIVE' } },
      },
      orderBy: { name: 'asc' },
    });
  }

  @Post()
  @RequirePermission('classes', 'MANAGE', 'ORGANISATION')
  @ApiOperation({ summary: 'Create a new class type' })
  async createClassType(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateClassTypeDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);

    return this.prisma.classType.create({
      data: {
        organisationId,
        name: dto.name,
        description: dto.description,
        category: dto.category || 'OTHER',
        durationMinutes: dto.durationMinutes || 60,
        defaultCapacity: dto.defaultCapacity || 20,
        bookingRequired: dto.bookingRequired !== undefined ? dto.bookingRequired : true,
        membershipEntitlementKey: dto.membershipEntitlementKey || 'GROUP_CLASSES',
        status: 'ACTIVE',
      },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get class type details by ID' })
  async getClassType(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);

    const classType = await this.prisma.classType.findFirst({
      where: { id, organisationId },
      include: { templates: true },
    });

    if (!classType) {
      throw new NotFoundException('Class type not found');
    }

    return classType;
  }

  @Post('templates')
  @RequirePermission('classes', 'MANAGE', 'ORGANISATION')
  @ApiOperation({ summary: 'Create a reusable class template' })
  async createTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateClassTemplateDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);

    const classType = await this.prisma.classType.findFirst({
      where: { id: dto.classTypeId, organisationId },
    });

    if (!classType) {
      throw new NotFoundException('Class type not found in this organisation');
    }

    return this.prisma.classTemplate.create({
      data: {
        organisationId,
        classTypeId: dto.classTypeId,
        name: dto.name,
        description: dto.description,
        durationMinutes: dto.durationMinutes || classType.durationMinutes,
        defaultCapacity: dto.defaultCapacity || classType.defaultCapacity,
        defaultBookingPolicyId: dto.defaultBookingPolicyId,
        status: 'ACTIVE',
      },
    });
  }

  @Get(':id/templates')
  @ApiOperation({ summary: 'List reusable templates for a class type' })
  async listTemplates(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') classTypeId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);

    return this.prisma.classTemplate.findMany({
      where: { classTypeId, organisationId, status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    });
  }
}
