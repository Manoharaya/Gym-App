import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  Headers,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { ExerciseCollectionsLearningPathsService } from '../services/exercise-collections-learning-paths.service';
import {
  QueryLearningPathsDto,
  CreateLearningPathDto,
  UpdateLearningPathDto,
  CompleteLessonDto,
  AssignLearningPathDto,
} from '../dto/exercise-collections-learning-paths.dto';

@ApiTags('Guided Learning Paths')
@ApiBearerAuth()
@Controller('learning-paths')
export class LearningPathsController {
  constructor(
    private readonly service: ExerciseCollectionsLearningPathsService,
  ) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || (user as any).organisationId || user.roles?.[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  @Get()
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'List and filter guided learning paths with member progress' })
  async listPaths(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryLearningPathsDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.service.findLearningPaths(organisationId, user.id, query);
  }

  @Get(':idOrSlug')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Get full learning path outline with sections, lessons, and progress' })
  async getPathById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('idOrSlug') idOrSlug: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.service.findLearningPathById(organisationId, user.id, idOrSlug);
  }

  @Post()
  @RequirePermission('exercises', 'create')
  @ApiOperation({ summary: 'Create a new structured learning path' })
  async createPath(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLearningPathDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.service.createLearningPath(organisationId, user.id, dto, 'ORGANISATION');
  }

  @Put(':id')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Update learning path metadata' })
  async updatePath(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateLearningPathDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.service.updateLearningPath(organisationId, user.id, id, dto);
  }

  @Get(':pathId/lessons/:lessonId')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Get a specific lesson in a learning path with full instructions' })
  async getLesson(
    @CurrentUser() user: AuthenticatedUser,
    @Param('pathId') pathId: string,
    @Param('lessonId') lessonId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.service.getLesson(organisationId, user.id, pathId, lessonId);
  }

  @Post(':pathId/lessons/:lessonId/complete')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Mark a lesson as completed and recalculate path progress' })
  async completeLesson(
    @CurrentUser() user: AuthenticatedUser,
    @Param('pathId') pathId: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: CompleteLessonDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.service.completeLesson(organisationId, user.id, pathId, lessonId, dto);
  }

  @Post(':pathId/reset')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Reset member progress for a learning path to start over' })
  async resetPath(
    @CurrentUser() user: AuthenticatedUser,
    @Param('pathId') pathId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.service.resetPathProgress(organisationId, user.id, pathId);
  }

  @Post(':pathId/assign')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Trainer assigns a learning path to a client' })
  async assignPath(
    @CurrentUser() user: AuthenticatedUser,
    @Param('pathId') pathId: string,
    @Body() dto: AssignLearningPathDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.service.assignLearningPath(organisationId, user.id, pathId, dto);
  }
}
