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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { LearningDashboardService } from '../services/learning-dashboard.service';
import { ExerciseLearningPersonalizationService } from '../services/exercise-learning-personalization.service';
import { ExerciseLearningMasteryService } from '../services/exercise-learning-mastery.service';
import {
  LearningDashboardResponseDto,
  ResumePositionDto,
  QueryLearningHistoryDto,
  ExerciseLearningMasteryStatusDto,
} from '../dto/learning-dashboard.dto';
import {
  UpdateLearningPreferencesDto,
  LearningPreferencesResponseDto,
  LearningRecommendationsResponseDto,
} from '../dto/learning-personalization.dto';
import {
  TrackLearningEventDto,
  LearningMasteryResponseDto,
  LearningSummaryResponseDto,
  ContentMasteryAnalyticsDto,
  PlatformLearningAnalyticsDto,
  QueryLearningMasteryDto,
  LearningContentType,
} from '../dto/learning-mastery.dto';
import { LearningHubService } from '../services/learning-hub.service';
import {
  LearningHubResponseDto,
  LearningHubSearchQueryDto,
  LearningHubSearchResponseDto,
} from '../dto/learning-hub.dto';

@ApiTags('Member Learning Dashboard & Progress Intelligence')
@ApiBearerAuth()
@Controller('learning')
export class LearningDashboardController {
  constructor(
    private readonly service: LearningDashboardService,
    private readonly personalizationService: ExerciseLearningPersonalizationService,
    private readonly masteryService: ExerciseLearningMasteryService,
    private readonly hubService: LearningHubService,
  ) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || (user as any).organisationId || user.roles?.[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get consolidated member learning dashboard with resume pointer, streak, and stats' })
  @ApiResponse({ status: 200, type: LearningDashboardResponseDto })
  async getDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<LearningDashboardResponseDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.service.getMemberLearningDashboard(orgId, user.id);
  }

  @Get('resume')
  @ApiOperation({ summary: 'Get deterministic resume learning position for member active curriculum' })
  @ApiResponse({ status: 200, type: ResumePositionDto })
  async getResume(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<ResumePositionDto | null> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.service.getResumeLearningPosition(orgId, user.id);
  }

  @Get('progress')
  @ApiOperation({ summary: 'Get detailed member learning progress overview (active, completed, explored)' })
  async getProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.service.getLearningProgressOverview(orgId, user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get paginated audit log of completed lessons and masterclasses' })
  async getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryLearningHistoryDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.service.getLearningHistory(orgId, user.id, query);
  }

  @Get('exercises/:exerciseId/status')
  @ApiOperation({ summary: 'Get member learning mastery state and curriculum links for specific exercise' })
  @ApiResponse({ status: 200, type: ExerciseLearningMasteryStatusDto })
  async getExerciseMastery(
    @CurrentUser() user: AuthenticatedUser,
    @Param('exerciseId') exerciseId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<ExerciseLearningMasteryStatusDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.service.getExerciseLearningMastery(orgId, user.id, exerciseId);
  }

  @Post('collections/:collectionId/interact')
  @ApiOperation({ summary: 'Track user interaction with an exercise collection pack' })
  async trackCollection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('collectionId') collectionId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.service.trackCollectionInteraction(orgId, user.id, collectionId);
  }

  // =========================================================================
  // DAY 78: LEARNING PERSONALIZATION PREFERENCES & RECOMMENDATIONS
  // =========================================================================

  @Get('preferences')
  @ApiOperation({ summary: 'Get current member educational learning personalization preferences' })
  @ApiResponse({ status: 200, type: LearningPreferencesResponseDto })
  async getLearningPreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<LearningPreferencesResponseDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.personalizationService.getPreferences(orgId, user.id);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update member educational learning personalization preferences' })
  @ApiResponse({ status: 200, type: LearningPreferencesResponseDto })
  async updateLearningPreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateLearningPreferencesDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<LearningPreferencesResponseDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.personalizationService.updatePreferences(orgId, user.id, dto);
  }

  @Post('preferences/reset')
  @ApiOperation({ summary: 'Reset member educational learning preferences to system defaults' })
  @ApiResponse({ status: 200, type: LearningPreferencesResponseDto })
  async resetLearningPreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<LearningPreferencesResponseDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.personalizationService.resetPreferences(orgId, user.id);
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Get personalized exercise learning recommendations (continue, review, mastered)' })
  @ApiResponse({ status: 200, type: LearningRecommendationsResponseDto })
  async getLearningRecommendations(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<LearningRecommendationsResponseDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.personalizationService.getRecommendations(orgId, user.id);
  }

  // =========================================================================
  // DAY 79: LEARNING MASTERY, ANALYTICS & DROPOFF INTELLIGENCE
  // =========================================================================

  @Post('events')
  @ApiOperation({ summary: 'Track learning telemetry event and deterministically update educational mastery' })
  async trackEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TrackLearningEventDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.masteryService.recordLearningEvent(orgId, user.id, dto);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get unified member educational learning summary (mastered, review, continue)' })
  @ApiResponse({ status: 200, type: LearningSummaryResponseDto })
  async getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<LearningSummaryResponseDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.masteryService.getMemberLearningSummary(orgId, user.id);
  }

  @Get('mastery')
  @ApiOperation({ summary: 'Get paginated list of educational mastery records for member' })
  async getMasteryList(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryLearningMasteryDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.masteryService.getMemberMasteryList(orgId, user.id, query);
  }

  @Get('mastery/:contentType/:contentId')
  @ApiOperation({ summary: 'Get exact educational mastery status and section checkpoints for specific content' })
  @ApiResponse({ status: 200, type: LearningMasteryResponseDto })
  async getContentMastery(
    @CurrentUser() user: AuthenticatedUser,
    @Param('contentType') contentType: LearningContentType,
    @Param('contentId') contentId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<LearningMasteryResponseDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.masteryService.getMemberContentMastery(orgId, user.id, contentType, contentId);
  }

  @Get('review-queue')
  @ApiOperation({ summary: 'Get prioritized queue of exercises and lessons recommended for educational review' })
  @ApiResponse({ status: 200, type: [LearningMasteryResponseDto] })
  async getReviewQueue(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<LearningMasteryResponseDto[]> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.masteryService.getReviewQueue(orgId, user.id);
  }

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Get aggregate platform learning analytics and drop-off metrics for tenant' })
  @ApiResponse({ status: 200, type: PlatformLearningAnalyticsDto })
  async getPlatformAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<PlatformLearningAnalyticsDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.masteryService.getPlatformLearningAnalytics(orgId);
  }

  @Get('analytics/content/:contentType/:contentId')
  @ApiOperation({ summary: 'Get content-specific educational performance and drop-off funnel analytics' })
  @ApiResponse({ status: 200, type: ContentMasteryAnalyticsDto })
  async getContentAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Param('contentType') contentType: LearningContentType,
    @Param('contentId') contentId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<ContentMasteryAnalyticsDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.masteryService.getContentAnalytics(orgId, contentType, contentId);
  }

  @Get('trainer/members/:memberId')
  @ApiOperation({ summary: 'Trainer view of assigned member educational progress and mastery' })
  @ApiResponse({ status: 200, type: LearningSummaryResponseDto })
  async getTrainerMemberMastery(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<LearningSummaryResponseDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.masteryService.getTrainerMemberMastery(orgId, user.id, memberId);
  }

  // =========================================================================
  // DAY 80: FITBEAT LEARNING HUB & UNIFIED EDUCATIONAL SEARCH
  // =========================================================================

  @Get('hub')
  @ApiOperation({ summary: 'Get consolidated FitBeat Learning Hub orchestration payload' })
  @ApiResponse({ status: 200, type: LearningHubResponseDto })
  async getLearningHub(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<LearningHubResponseDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.hubService.getLearningHubData(orgId, user.id);
  }

  @Get('hub/search')
  @ApiOperation({ summary: 'Unified search across exercises, movements, muscles, equipment, and curriculum' })
  @ApiResponse({ status: 200, type: LearningHubSearchResponseDto })
  async searchLearningHub(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LearningHubSearchQueryDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<LearningHubSearchResponseDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.hubService.searchLearningHub(orgId, user.id, query);
  }
}
