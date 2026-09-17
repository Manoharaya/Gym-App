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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { ExercisesService } from '../services/exercises.service';
import { ExerciseMediaService } from '../services/exercise-media.service';
import {
  ExerciseMediaQueryDto,
  PresignExerciseMediaUploadDto,
  CreateExerciseMediaDto,
  DirectUploadMediaMetadataDto,
  UploadedMediaFile,
} from '../dto/exercise-media.dto';
import {
  ExerciseQueryDto,
  CreateExerciseDto,
  UpdateExerciseDto,
  AttachExerciseMediaDto,
  PresignMediaUploadDto,
  CreateInstructionStepDto,
  CreateMovementPhaseDto,
  CreateCommonMistakeDto,
  CreateSafetyGuidelineDto,
  CreateExerciseVariationDto,
  CreateEquipmentRelationDto,
  UpdateContentStatusDto,
} from '../dto/exercise.dto';
import {
  UpdateExercisePreferencesDto,
  UpdateExerciseLearningProgressDto,
} from '../dto/exercise-personalization.dto';
import { ExercisePersonalizationService } from '../services/exercise-personalization.service';

@ApiTags('Exercises')
@ApiBearerAuth()
@Controller('exercises')
export class ExercisesController {
  constructor(
    private readonly exercisesService: ExercisesService,
    private readonly mediaService: ExerciseMediaService,
    private readonly personalizationService: ExercisePersonalizationService,
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
  @ApiOperation({ summary: 'Search and list exercises accessible to organisation' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ExerciseQueryDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.exercisesService.findAll(organisationId, query, user?.id);
  }

  @Get('filter-metadata')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Get dynamic filter metadata (categories, muscles, equipment, difficulties) with counts' })
  async getFilterMetadata(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.exercisesService.getFilterMetadata(organisationId);
  }

  @Get('favorites')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'List user favorited exercises' })
  async getFavorites(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.exercisesService.getFavorites(organisationId, user.id, page ? Number(page) : 1, limit ? Number(limit) : 20);
  }

  @Get('recent')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Get recently viewed exercises for current user' })
  async getRecentlyViewed(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: number,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.exercisesService.getRecentlyViewed(organisationId, user.id, limit ? Number(limit) : 10);
  }

  @Get('personalized')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Get personalized exercise discovery sections tailored to the member' })
  async getPersonalizedDiscovery(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.personalizationService.getPersonalizedDiscovery(organisationId, user.id);
  }

  @Get('preferences')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Get current member exercise discovery preferences' })
  async getPreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.personalizationService.getPreferences(organisationId, user.id);
  }

  @Patch('preferences')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Update member exercise discovery preferences' })
  async updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateExercisePreferencesDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.personalizationService.updatePreferences(organisationId, user.id, dto);
  }

  @Post('preferences/reset')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Reset member exercise discovery preferences to profile defaults' })
  async resetPreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.personalizationService.resetPreferences(organisationId, user.id);
  }

  @Post(':id/favorite')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Toggle exercise favorite bookmark for current user' })
  async toggleFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.exercisesService.toggleFavorite(organisationId, user.id, id);
  }

  @Post(':id/view')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Record exercise view timestamp for current user' })
  async recordRecentView(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.exercisesService.recordRecentView(organisationId, user.id, id);
  }

  @Get([':id/visual', ':id/visual-content'])
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Get comprehensive visual exercise details including media, phases, mistakes, safety, and variations' })
  async findVisualContent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.exercisesService.findVisualContent(organisationId, id, user?.id);
  }

  @Get(':id/instructions')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Get step-by-step instructions and movement phases' })
  async getInstructionSteps(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.exercisesService.getInstructionSteps(organisationId, id);
  }

  @Get(':id/learning-progress')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Get member learning progress for an exercise' })
  async getLearningProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.personalizationService.getLearningProgress(organisationId, user.id, id);
  }

  @Post(':id/learning-progress')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Update or complete member learning progress for an exercise' })
  async updateLearningProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExerciseLearningProgressDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.personalizationService.updateLearningProgress(organisationId, user.id, id, dto);
  }

  @Get(':id/media')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Get visual media gallery for an exercise' })
  async getMedia(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: ExerciseMediaQueryDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.mediaService.getExerciseMedia(organisationId, id, query, user);
  }

  @Get(':id/relationships')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Get exercise variations, progressions, regressions, and equipment requirements' })
  async getRelationships(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.exercisesService.getRelationships(organisationId, id);
  }

  @Get(':id')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Get exercise basic details by ID' })
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

  @Post(':id/instructions')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Add instruction step to exercise' })
  async addInstructionStep(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateInstructionStepDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.exercisesService.addInstructionStep(organisationId, id, dto, user);
  }

  @Post(':id/phases')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Add movement phase to exercise' })
  async addMovementPhase(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateMovementPhaseDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.exercisesService.addMovementPhase(organisationId, id, dto, user);
  }

  @Post(':id/mistakes')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Add common mistake and correction to exercise' })
  async addCommonMistake(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateCommonMistakeDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.exercisesService.addCommonMistake(organisationId, id, dto, user);
  }

  @Post(':id/safety')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Add safety guideline or contraindication to exercise' })
  async addSafetyGuideline(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateSafetyGuidelineDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.exercisesService.addSafetyGuideline(organisationId, id, dto, user);
  }

  @Post(':id/variations')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Add variation/regression/progression relationship' })
  async addVariation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateExerciseVariationDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.exercisesService.addVariation(organisationId, id, dto, user);
  }

  @Post(':id/equipment')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Add equipment relation to exercise' })
  async addEquipmentRelation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateEquipmentRelationDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.exercisesService.addEquipmentRelation(organisationId, id, dto, user);
  }

  @Patch(':id/status')
  @RequirePermission('exercises', 'manage')
  @ApiOperation({ summary: 'Update exercise publication/review content status' })
  async updateContentStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateContentStatusDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.exercisesService.updateContentStatus(organisationId, id, dto.contentStatus, user);
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
    @Body() dto: PresignExerciseMediaUploadDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.mediaService.presignUpload(organisationId, id, dto, user);
  }

  @Post(':id/media')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Attach or create media record for custom exercise' })
  async attachMedia(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateExerciseMediaDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.mediaService.createMediaRecord(organisationId, id, dto, user);
  }

  @Post(':id/media/upload')
  @RequirePermission('exercises', 'update')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Direct multipart file upload for exercise media' })
  async uploadMedia(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @UploadedFile() file: UploadedMediaFile,
    @Body() dto: DirectUploadMediaMetadataDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.mediaService.uploadDirectBuffer(organisationId, id, file, dto, user);
  }
}
