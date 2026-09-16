import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Param,
  Body,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { ExerciseMetadataService } from '../services/exercise-metadata.service';
import {
  AddExerciseMuscleRelationDto,
  UpdateExerciseMuscleRelationDto,
  BatchSetExerciseMusclesDto,
  AddExerciseEquipmentRelationExtendedDto,
  UpdateExerciseEquipmentRelationExtendedDto,
  CreateExerciseMetadataItemDto,
  UpdateExerciseMetadataItemDto,
  ExerciseTaxonomyQueryDto,
  UpdateExerciseClassificationDto,
} from '../dto/exercise-metadata.dto';
import type { VariationRelationshipType } from '@fitcore/types';

@ApiTags('Exercise Metadata Intelligence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ExerciseMetadataController {
  constructor(private readonly metadataService: ExerciseMetadataService) {}

  // =========================================================================
  // 1. TAXONOMY MANAGEMENT
  // =========================================================================

  @Get('exercise-metadata/taxonomy')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'List active taxonomies (Muscles, Equipment, Categories, Goals, Tags)' })
  async getTaxonomy(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ExerciseTaxonomyQueryDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.metadataService.getTaxonomy(organisationId, query);
  }

  @Post('exercise-metadata/taxonomy')
  @RequirePermission('exercises', 'manage')
  @ApiOperation({ summary: 'Create custom organisation taxonomy item' })
  async createTaxonomyItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExerciseMetadataItemDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.metadataService.createTaxonomyItem(organisationId, dto, user);
  }

  @Patch('exercise-metadata/taxonomy/:id')
  @RequirePermission('exercises', 'manage')
  @ApiOperation({ summary: 'Update custom organisation taxonomy item' })
  async updateTaxonomyItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExerciseMetadataItemDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.metadataService.updateTaxonomyItem(organisationId, id, dto, user);
  }

  @Post('exercise-metadata/taxonomy/:id/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('exercises', 'manage')
  @ApiOperation({ summary: 'Archive custom organisation taxonomy item' })
  async archiveTaxonomyItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.metadataService.archiveTaxonomyItem(organisationId, id, user);
  }

  // =========================================================================
  // 2. EXERCISE MUSCLE RELATIONS
  // =========================================================================

  @Get('exercises/:id/muscles')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Get structured muscles worked for exercise (Primary, Secondary, Stabilizers)' })
  async getExerciseMuscles(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.metadataService.getExerciseMuscles(organisationId, id);
  }

  @Post('exercises/:id/muscles')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Add structured muscle relation with role and qualitative activation level' })
  async addMuscleRelation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddExerciseMuscleRelationDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.metadataService.addMuscleRelation(organisationId, id, dto, user);
  }

  @Put('exercises/:id/muscles')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Batch set all muscles worked for an exercise' })
  async batchSetMuscles(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: BatchSetExerciseMusclesDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.metadataService.batchSetMuscles(organisationId, id, dto, user);
  }

  @Delete('exercise-muscles/:id')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Remove a structured muscle relation' })
  async removeMuscleRelation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.metadataService.removeMuscleRelation(organisationId, id, user);
  }

  // =========================================================================
  // 3. EXERCISE EQUIPMENT RELATIONS (EXTENDED)
  // =========================================================================

  @Post('exercises/:id/equipment-relations')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Add extended equipment relation with requirement type, alternatives and environments' })
  async addEquipmentRelation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddExerciseEquipmentRelationExtendedDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.metadataService.addEquipmentRelation(organisationId, id, dto, user);
  }

  @Patch('exercise-equipment/:id')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Update extended equipment relation' })
  async updateEquipmentRelation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExerciseEquipmentRelationExtendedDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.metadataService.updateEquipmentRelation(organisationId, id, dto, user);
  }

  @Delete('exercise-equipment/:id')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Remove equipment relation' })
  async removeEquipmentRelation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.metadataService.removeEquipmentRelation(organisationId, id, user);
  }

  // =========================================================================
  // 4. CLASSIFICATION & METADATA
  // =========================================================================

  @Patch('exercises/:id/classification')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Update exercise classification (Category, Mechanics, EquipmentRequirement, Goals, Tags)' })
  async updateClassification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExerciseClassificationDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.metadataService.updateClassification(organisationId, id, dto, user);
  }

  @Post('exercises/:id/relationships-strict')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Add validated relationship (Variation, Progression, Regression, Alternative, Equipment Substitute)' })
  async addStrictRelationship(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body()
    dto: {
      targetExerciseId: string;
      relationshipType: VariationRelationshipType;
      notes?: string;
    },
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.metadataService.addRelationship(organisationId, id, dto, user);
  }

  // =========================================================================
  // 5. AUDIT & SUBSTITUTIONS
  // =========================================================================

  @Get('exercises/:id/completeness')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Get metadata quality and completeness audit score for exercise' })
  async getCompleteness(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.metadataService.getCompleteness(organisationId, id);
  }

  @Get('exercises/:id/substitutes')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Get candidate exercise substitutes based on muscles, movement pattern and equipment' })
  async getSubstitutes(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('availableEquipment') availableEquipment?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const equipmentList = availableEquipment ? availableEquipment.split(',').map((s) => s.trim()) : undefined;
    return this.metadataService.getSubstitutes(organisationId, id, equipmentList);
  }

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    return headerOrgId || (user as any).organisationId || user.roles?.[0]?.organisationId || '';
  }
}
