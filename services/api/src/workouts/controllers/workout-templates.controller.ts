import {
  Controller,
  Get,
  Post,
  Patch,
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
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { WorkoutTemplateService } from '../services/workout-template.service';
import {
  WorkoutTemplateQueryDto,
  CreateWorkoutTemplateDto,
  UpdateWorkoutTemplateDto,
} from '../dto/workout-template.dto';

@ApiTags('Workout Templates')
@ApiBearerAuth()
@Controller('workout-templates')
export class WorkoutTemplatesController {
  constructor(private readonly templateService: WorkoutTemplateService) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || (user as any).organisationId || user.roles?.[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  @Get()
  @RequirePermission('workout_templates', 'read')
  @ApiOperation({ summary: 'List workout templates' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: WorkoutTemplateQueryDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.templateService.findAll(organisationId, query);
  }

  @Get(':id')
  @RequirePermission('workout_templates', 'read')
  @ApiOperation({ summary: 'Get workout template by ID' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.templateService.findById(organisationId, id);
  }

  @Post()
  @RequirePermission('workout_templates', 'create')
  @ApiOperation({ summary: 'Create workout template' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWorkoutTemplateDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.templateService.create(organisationId, dto, user);
  }

  @Patch(':id')
  @RequirePermission('workout_templates', 'update')
  @ApiOperation({ summary: 'Update workout template' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateWorkoutTemplateDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.templateService.update(organisationId, id, dto, user);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('workout_templates', 'manage')
  @ApiOperation({ summary: 'Archive workout template' })
  async archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.templateService.archive(organisationId, id, user);
  }

  @Post(':id/version')
  @RequirePermission('workout_templates', 'create')
  @ApiOperation({ summary: 'Create a new version of an existing workout template' })
  async createVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: Partial<CreateWorkoutTemplateDto>,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.templateService.createVersion(organisationId, id, dto, user);
  }
}
