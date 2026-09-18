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
import { MovementPracticeService } from '../services/movement-practice.service';
import {
  StartMovementPracticeSessionDto,
  UpdateMovementPracticeSessionDto,
  RecordPhasePracticeDto,
  RecordPhaseReviewDto,
  CompleteMovementPracticeSessionDto,
  MovementPracticeSessionResponseDto,
  GuidedMovementPracticePayloadDto,
} from '../dto/movement-practice.dto';

@ApiTags('Visual Movement Practice Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class MovementPracticeController {
  constructor(private readonly practiceService: MovementPracticeService) {}

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
  // 1. GUIDED PRACTICE READ MODEL
  // =========================================================================

  @Get('exercises/:id/guided-practice')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary:
      'Get consolidated Guided Movement Practice payload including exercise details, active session, sequential phases, expectations, checklist, and knowledge checks',
  })
  async getGuidedPracticeData(
    @Param('id') exerciseId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<GuidedMovementPracticePayloadDto> {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.practiceService.getGuidedPracticeData(
      organisationId,
      exerciseId,
      user,
    );
  }

  // =========================================================================
  // 2. MOVEMENT PRACTICE SESSION LIFECYCLE
  // =========================================================================

  @Post('movement-practice-sessions')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary: 'Start a new movement practice session or resume an active session',
  })
  async startOrResumeSession(
    @Body() dto: StartMovementPracticeSessionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<MovementPracticeSessionResponseDto> {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.practiceService.startOrResumeSession(
      organisationId,
      dto.exerciseId,
      dto,
      user,
    );
  }

  @Get('movement-practice-sessions/active')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary: 'Get active in-progress movement practice session for member',
  })
  async getActiveSession(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<MovementPracticeSessionResponseDto | null> {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.practiceService.getActiveSession(organisationId, user);
  }

  @Get('movement-practice-sessions/:id')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary: 'Get movement practice session by ID',
  })
  async getSession(
    @Param('id') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<MovementPracticeSessionResponseDto> {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.practiceService.getSession(organisationId, sessionId, user);
  }

  @Patch('movement-practice-sessions/:id')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary: 'Update movement practice session step, phase pointer, or checklist state',
  })
  async updateSession(
    @Param('id') sessionId: string,
    @Body() dto: UpdateMovementPracticeSessionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<MovementPracticeSessionResponseDto> {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.practiceService.updateSession(organisationId, sessionId, dto, user);
  }

  @Post('movement-practice-sessions/:id/phases/:phaseId/practice')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary: 'Record phase practice execution (reps, duration)',
  })
  async recordPhasePractice(
    @Param('id') sessionId: string,
    @Param('phaseId') phaseId: string,
    @Body() dto: RecordPhasePracticeDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<MovementPracticeSessionResponseDto> {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.practiceService.recordPhasePractice(
      organisationId,
      sessionId,
      { ...dto, phaseId },
      user,
    );
  }

  @Post('movement-practice-sessions/:id/phases/:phaseId/review')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary: 'Mark a phase as reviewed and advance session progress',
  })
  async recordPhaseReview(
    @Param('id') sessionId: string,
    @Param('phaseId') phaseId: string,
    @Body() dto: RecordPhaseReviewDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<MovementPracticeSessionResponseDto> {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.practiceService.recordPhaseReview(
      organisationId,
      sessionId,
      { ...dto, phaseId },
      user,
    );
  }

  @Post('movement-practice-sessions/:id/complete')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary:
      'Complete movement practice session, sync learning progress, and advance mastery',
  })
  async completeSession(
    @Param('id') sessionId: string,
    @Body() dto: CompleteMovementPracticeSessionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<MovementPracticeSessionResponseDto> {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.practiceService.completeSession(organisationId, sessionId, dto, user);
  }
}
