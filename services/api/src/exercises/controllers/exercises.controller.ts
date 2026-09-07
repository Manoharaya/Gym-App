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
import { ExercisesService } from '../services/exercises.service';
import {
  ExerciseQueryDto,
  CreateExerciseDto,
  UpdateExerciseDto,
  AttachExerciseMediaDto,
  PresignMediaUploadDto,
} from '../dto/exercise.dto';

@ApiTags('Exercises')
@ApiBearerAuth()
@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || (user as any).organisationId || user.roles?.[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  @Get()
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Search and list exercises accessible to organisation' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ExerciseQueryDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.exercisesService.findAll(organisationId, query);
  }

  @Get(':id')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Get exercise details by ID' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.exercisesService.findById(organisationId, id);
  }

  @Post()
  @RequirePermission('exercises', 'create')
  @ApiOperation({ summary: 'Create custom organisation exercise' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExerciseDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.exercisesService.create(organisationId, dto, user);
  }

  @Patch(':id')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Update custom exercise' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExerciseDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.exercisesService.update(organisationId, id, dto, user);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('exercises', 'manage')
  @ApiOperation({ summary: 'Archive custom exercise' })
  async archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.exercisesService.archive(organisationId, id, user);
  }

  @Post(':id/media/presign-upload')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Generate pre-signed upload URL for exercise media' })
  async presignMediaUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: PresignMediaUploadDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.exercisesService.presignMediaUpload(organisationId, id, dto);
  }

  @Post(':id/media')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Attach media record to custom exercise' })
  async attachMedia(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AttachExerciseMediaDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.exercisesService.attachMedia(organisationId, id, dto, user);
  }
}
