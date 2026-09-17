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
  QueryExerciseCollectionsDto,
  CreateExerciseCollectionDto,
  UpdateExerciseCollectionDto,
  SetCollectionItemsDto,
} from '../dto/exercise-collections-learning-paths.dto';

@ApiTags('Exercise Collections')
@ApiBearerAuth()
@Controller('exercise-collections')
export class ExerciseCollectionsController {
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
  @ApiOperation({ summary: 'List and filter curated exercise collections' })
  async listCollections(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryExerciseCollectionsDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.service.findCollections(organisationId, query);
  }

  @Get('exercise/:exerciseId')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Get collections and learning paths containing a given exercise' })
  async getRelatedForExercise(
    @CurrentUser() user: AuthenticatedUser,
    @Param('exerciseId') exerciseId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.service.getRelatedCollectionsAndPathsForExercise(organisationId, exerciseId, user.id);
  }

  @Get(':idOrSlug')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Get exercise collection detail by ID or slug' })
  async getCollectionById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('idOrSlug') idOrSlug: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.service.findCollectionById(organisationId, idOrSlug);
  }

  @Post()
  @RequirePermission('exercises', 'create')
  @ApiOperation({ summary: 'Create a new exercise collection' })
  async createCollection(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExerciseCollectionDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.service.createCollection(organisationId, user.id, dto, 'ORGANISATION');
  }

  @Put(':id')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Update collection metadata' })
  async updateCollection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExerciseCollectionDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.service.updateCollection(organisationId, user.id, id, dto);
  }

  @Put(':id/items')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Set or reorder exercises inside a collection' })
  async setCollectionItems(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SetCollectionItemsDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.service.setCollectionItems(organisationId, user.id, id, dto);
  }
}
