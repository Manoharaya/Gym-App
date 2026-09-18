import {
  Controller,
  Get,
  Post,
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
import { ExerciseTutorialService } from '../services/exercise-tutorial.service';
import { ExerciseLearningPersonalizationService } from '../services/exercise-learning-personalization.service';
import {
  UpdateExerciseTutorialConfigDto,
  StartExerciseTutorialDto,
  UpdateExerciseTutorialProgressDto,
  CompleteExerciseTutorialDto,
} from '../dto/exercise-tutorial.dto';

@ApiTags('Interactive Exercise Tutorials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ExerciseTutorialController {
  constructor(
    private readonly tutorialService: ExerciseTutorialService,
    private readonly personalizationService: ExerciseLearningPersonalizationService,
  ) {}

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
  // 1. TUTORIAL READ MODEL
  // =========================================================================

  @Get('exercises/:id/tutorial')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary:
      'Get aggregated interactive exercise tutorial payload including demonstration, phases, coaching, mistakes, and user progress',
  })
  async getExerciseTutorial(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.tutorialService.getExerciseTutorial(orgId, id, user);
  }

  // =========================================================================
  // 2. TUTORIAL PROGRESS TRACKING
  // =========================================================================

  @Get('exercises/:id/tutorial/progress')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary: 'Get member tutorial progress and resume state',
  })
  async getTutorialProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.tutorialService.getTutorialProgress(orgId, id, user.id);
  }

  @Post('exercises/:id/tutorial/start')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary: 'Start or resume an interactive exercise tutorial session',
  })
  async startTutorial(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: StartExerciseTutorialDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.tutorialService.startTutorial(orgId, id, user.id, dto);
  }

  @Post('exercises/:id/tutorial/progress')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary: 'Checkpoint incremental interactive tutorial progress (phase, step, checklist)',
  })
  async recordTutorialProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExerciseTutorialProgressDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.tutorialService.recordTutorialProgress(orgId, id, user.id, dto);
  }

  @Post('exercises/:id/tutorial/complete')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary: 'Mark an interactive exercise tutorial complete',
  })
  async completeTutorial(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CompleteExerciseTutorialDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.tutorialService.completeTutorial(orgId, id, user.id, dto);
  }

  // =========================================================================
  // 3. RELATED RECOMMENDATIONS
  // =========================================================================

  @Get('exercises/:id/tutorial/related')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary: 'Get deterministic related tutorials, movement patterns, and learning paths',
  })
  async getRelatedTutorials(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.tutorialService.getRelatedTutorials(orgId, id);
  }

  // =========================================================================
  // 4. TRAINER / ADMIN AUTHORING
  // =========================================================================

  @Patch('exercises/:id/tutorial')
  @RequirePermission('exercises', 'update')
  @ApiOperation({
    summary: 'Author or update custom tutorial configuration for an exercise (Trainer/Admin)',
  })
  async updateTutorialConfig(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExerciseTutorialConfigDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.tutorialService.updateTutorialConfig(orgId, id, user, dto);
  }

  // =========================================================================
  // 5. DAY 78: PERSONALIZED TUTORIAL & TARGETED REVIEW
  // =========================================================================

  @Get('exercises/:id/personalized-tutorial')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary: 'Get personalized exercise tutorial payload with adapted depth, mode, and section plan',
  })
  async getPersonalizedTutorial(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.personalizationService.getPersonalizedTutorial(orgId, id, user);
  }

  @Get('exercises/:id/targeted-review')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary: 'Get targeted review checkpoints and common mistakes for rapid technique reinforcement',
  })
  async getTargetedReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.personalizationService.getTargetedReview(orgId, id, user.id);
  }

  @Get('exercises/:id/learning-context')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary: 'Get deterministic learning context, difficulty compatibility, and personalized plan',
  })
  async getLearningContext(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.personalizationService.buildPersonalizedTutorialPlan(orgId, id, user.id, user);
  }
}
