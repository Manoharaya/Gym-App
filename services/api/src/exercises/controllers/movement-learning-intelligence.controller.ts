import {
  Controller,
  Get,
  Post,
  Param,
  Query,
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
import { MovementLearningIntelligenceService } from '../services/movement-learning-intelligence.service';
import {
  QueryLearningGapsDto,
  ResolveLearningGapDto,
  CreateTargetedReviewSessionDto,
} from '../dto/movement-learning-intelligence.dto';

@ApiTags('Movement Learning Intelligence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class MovementLearningIntelligenceController {
  constructor(
    private readonly intelligenceService: MovementLearningIntelligenceService,
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
  // 1. CONSOLIDATED MEMBER MOVEMENT LEARNING DASHBOARD
  // =========================================================================

  @Get('movement-learning/me')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary:
      'Get consolidated member movement learning dashboard including active gaps, recommendations, and quick refresh items',
  })
  async getMyMovementLearning(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.intelligenceService.getMovementLearningDashboard(orgId, user.id);
  }

  // =========================================================================
  // 2. LEARNING GAPS
  // =========================================================================

  @Get('movement-learning/gaps')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary: 'Query active educational learning gaps for the authenticated member',
  })
  async getMemberGaps(
    @Query() query: QueryLearningGapsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.intelligenceService.getMemberGaps(orgId, user.id, query);
  }

  @Post('movement-learning/gaps/:id/resolve')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary: 'Mark an educational learning gap resolved or dismissed',
  })
  async resolveGap(
    @Param('id') gapId: string,
    @Body() dto: ResolveLearningGapDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.intelligenceService.resolveGap(orgId, gapId, dto, user);
  }

  // =========================================================================
  // 3. TARGETED PRACTICE SESSION
  // =========================================================================

  @Post('movement-learning/targeted-session')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary:
      'Generate an adaptive movement practice session focused specifically on learning gaps',
  })
  async createTargetedSession(
    @Body() dto: CreateTargetedReviewSessionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.intelligenceService.createTargetedPracticeSession(
      orgId,
      user.id,
      dto,
      user,
    );
  }

  // =========================================================================
  // 4. QUICK REFRESH
  // =========================================================================

  @Get('movement-learning/quick-refresh/:exerciseId')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary:
      'Retrieve rapid 30-60s refresher payload with setup, essential cues, and cadence',
  })
  async getQuickRefresh(
    @Param('exerciseId') exerciseId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.intelligenceService.getQuickRefresh(orgId, exerciseId);
  }

  // =========================================================================
  // 5. EXERCISE-SPECIFIC LEARNING INTELLIGENCE
  // =========================================================================

  @Get('exercises/:id/learning-intelligence')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary:
      'Get exercise-specific learning gaps, phase progress status, and recommended next action',
  })
  async getExerciseLearningIntelligence(
    @Param('id') exerciseId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.intelligenceService.getExerciseLearningIntelligence(
      orgId,
      exerciseId,
      user.id,
    );
  }

  // =========================================================================
  // 6. TRAINER & ADMIN VIEWS
  // =========================================================================

  @Get('movement-learning/trainer/member/:memberId')
  @RequirePermission('members', 'read')
  @ApiOperation({
    summary:
      'Trainer view of member movement learning progress, active gaps, and review needs',
  })
  async getTrainerMemberInsights(
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.intelligenceService.getTrainerMemberLearningInsights(
      orgId,
      memberId,
      user,
    );
  }

  @Get('movement-learning/admin/analytics')
  @RequirePermission('exercises', 'manage')
  @ApiOperation({
    summary:
      'Admin aggregate analytics on educational content quality, drop-off rates, and learning gaps',
  })
  async getAdminAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.intelligenceService.getAdminLearningQualityInsights(orgId, user);
  }
}
