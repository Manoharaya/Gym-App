import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Headers,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { ExerciseAnatomyService } from '../services/exercise-anatomy.service';
import {
  UpdateExerciseWhyItWorksDto,
  ExerciseAnatomyResponseDto,
  MuscleCatalogItemDto,
  MuscleDetailResponseDto,
  MovementCatalogItemDto,
  MovementPatternDetailResponseDto,
} from '../dto/exercise-anatomy.dto';

@ApiTags('Visual Anatomy & Movement Mechanics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ExerciseAnatomyController {
  constructor(private readonly anatomyService: ExerciseAnatomyService) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId =
      headerOrgId ||
      (user as any).organisationId ||
      user.roles?.[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException(
        'Tenant context required: active organisation not identified',
      );
    }
    return orgId;
  }

  // =========================================================================
  // 1. EXERCISE ANATOMY & MECHANICS
  // =========================================================================

  @Get('exercises/:id/anatomy')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary:
      'Get aggregated visual anatomy, muscle roles, movement mechanics, and "Why This Exercise Works"',
  })
  async getExerciseAnatomy(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<ExerciseAnatomyResponseDto> {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.anatomyService.getExerciseAnatomy(organisationId, id, user?.id);
  }

  @Patch('exercises/:id/why-it-works')
  @RequirePermission('exercises', 'update')
  @ApiOperation({
    summary:
      'Author or update "Why This Exercise Works" educational biomechanics for an exercise',
  })
  async updateWhyItWorks(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExerciseWhyItWorksDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.anatomyService.updateExerciseWhyItWorks(
      organisationId,
      id,
      dto,
      user,
    );
  }

  // =========================================================================
  // 2. MUSCLE TAXONOMY & DETAIL
  // =========================================================================

  @Get('muscles')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary:
      'List all muscle groups categorized by anatomical region with exercise counts',
  })
  async getMuscles(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<MuscleCatalogItemDto[]> {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.anatomyService.getMusclesCatalog(organisationId);
  }

  @Get('muscles/:code')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary:
      'Get educational anatomy profile, functional actions, exercises, and lessons for a muscle',
  })
  async getMuscleDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('code') code: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<MuscleDetailResponseDto> {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.anatomyService.getMuscleDetail(organisationId, code);
  }

  @Get('muscles/:code/exercises')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary:
      'Get exercises targeting a muscle split by primary driver vs secondary synergist',
  })
  async getMuscleExercises(
    @CurrentUser() user: AuthenticatedUser,
    @Param('code') code: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const detail = await this.anatomyService.getMuscleDetail(
      organisationId,
      code,
    );
    return detail.exercises;
  }

  // =========================================================================
  // 3. MOVEMENT PATTERNS CATALOG & DETAIL
  // =========================================================================

  @Get('movements')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary:
      'List foundational movement patterns (Squat, Hinge, Push, Pull, etc.) with definitions',
  })
  async getMovements(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<MovementCatalogItemDto[]> {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.anatomyService.getMovementsCatalog(organisationId);
  }

  @Get('movements/:pattern')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary:
      'Get biomechanical educational detail, joint actions, and common exercises for a movement pattern',
  })
  async getMovementPatternDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('pattern') pattern: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<MovementPatternDetailResponseDto> {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.anatomyService.getMovementPatternDetail(organisationId, pattern);
  }

  @Get('movements/:pattern/exercises')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary: 'Get common exercises for a movement pattern',
  })
  async getMovementExercises(
    @CurrentUser() user: AuthenticatedUser,
    @Param('pattern') pattern: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const detail = await this.anatomyService.getMovementPatternDetail(
      organisationId,
      pattern,
    );
    return detail.exercises;
  }
}
