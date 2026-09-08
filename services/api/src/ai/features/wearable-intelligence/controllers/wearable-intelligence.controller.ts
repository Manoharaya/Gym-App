import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Headers,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../../common/interfaces/request-with-user.interface';
import { PrismaService } from '../../../../database/prisma.service';
import { WearableIntelligenceService } from '../services/wearable-intelligence.service';
import { WearableInsightQueryDto } from '../dto/wearable-insight-query.dto';
import { WearableInsightFeedbackDto } from '../dto/wearable-insight-feedback.dto';
import {
  WearableIntelligenceSummaryDto,
  WearableIntelligenceResponseDto,
  RecoverySummaryDto,
  WearableTrendDto,
  TrainingCorrelationDto,
  SleepMetricsDto,
  ActivityMetricsDto,
  WearablePrivacyViewDto,
  WearableTrainerClientSummaryDto,
} from '@fitcore/types';

@ApiTags('AI Wearable Intelligence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/wearables')
export class WearableIntelligenceController {
  constructor(
    private readonly wearableIntelligenceService: WearableIntelligenceService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Helper resolving organisation ID from user context or header.
   */
  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId =
      headerOrgId ||
      user.roles?.[0]?.organisationId ||
      (user as any).primaryOrganisationId ||
      (user as any).organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified.');
    }
    return orgId;
  }

  /**
   * Helper resolving MemberProfile.id from AuthenticatedUser.
   */
  private async resolveMemberProfileId(user: AuthenticatedUser, organisationId: string): Promise<string> {
    const profile = await this.prisma.memberProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, organisationId: true },
    });

    if (!profile || profile.organisationId !== organisationId) {
      throw new NotFoundException('Active member profile required for wearable intelligence.');
    }

    return profile.id;
  }

  // 1. Comprehensive Telemetry & Intelligence Summary
  @Get('summary')
  @ApiOperation({ summary: 'Get aggregated wearable metrics, recovery, trends, and correlations' })
  @ApiResponse({ status: 200, description: 'Aggregated deterministic wearable summary' })
  @ApiQuery({ name: 'refresh', required: false, type: Boolean, description: 'Force refresh cached summary' })
  async getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
    @Query('refresh') refresh?: string,
  ): Promise<WearableIntelligenceSummaryDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, orgId);
    return this.wearableIntelligenceService.getSummary(memberId, orgId, refresh === 'true');
  }

  // 2. Recovery & Readiness
  @Get('recovery')
  @ApiOperation({ summary: 'Get recovery & readiness score category (LOW, MODERATE, GOOD, INSUFFICIENT_DATA)' })
  @ApiResponse({ status: 200, description: 'Qualitative recovery assessment' })
  async getRecovery(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<RecoverySummaryDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, orgId);
    return this.wearableIntelligenceService.getRecovery(memberId, orgId);
  }

  // 3. Rolling Trends
  @Get('trends')
  @ApiOperation({ summary: 'Get rolling metric trends (resting HR, sleep duration, step counts, training volume)' })
  @ApiResponse({ status: 200, description: 'Deterministic multi-day trend indicators' })
  async getTrends(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<WearableTrendDto[]> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, orgId);
    return this.wearableIntelligenceService.getTrends(memberId, orgId);
  }

  // 4. Sleep Metrics
  @Get('sleep')
  @ApiOperation({ summary: 'Get aggregated sleep duration, stages, efficiency, and consistency' })
  @ApiResponse({ status: 200, description: 'Detailed sleep analytics' })
  async getSleep(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<SleepMetricsDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, orgId);
    return this.wearableIntelligenceService.getSleep(memberId, orgId);
  }

  // 5. Activity & Workouts
  @Get('activity')
  @ApiOperation({ summary: 'Get step counts, active calories, and activity volume indicators' })
  @ApiResponse({ status: 200, description: 'Detailed activity metrics' })
  async getActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<ActivityMetricsDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, orgId);
    return this.wearableIntelligenceService.getActivity(memberId, orgId);
  }

  // 6. Training & Wearable Correlation
  @Get('training-correlation')
  @ApiOperation({ summary: 'Get correlations between logged workouts and wearable recovery metrics' })
  @ApiResponse({ status: 200, description: 'Non-causal correlation insights' })
  async getTrainingCorrelation(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<TrainingCorrelationDto[]> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, orgId);
    return this.wearableIntelligenceService.getTrainingCorrelation(memberId, orgId);
  }

  // 7. AI Insight Generation
  @Post('insight')
  @ApiOperation({ summary: 'Generate safe, grounded AI wearable intelligence insight' })
  @ApiResponse({ status: 200, description: 'Structured AI recovery and training intelligence' })
  @ApiHeader({ name: 'idempotency-key', required: false, description: 'Optional request deduplication key' })
  async generateInsight(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: WearableInsightQueryDto,
    @Headers('x-organisation-id') headerOrgId?: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<{ insight: WearableIntelligenceResponseDto; insightId?: string; cached: boolean }> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, orgId);
    return this.wearableIntelligenceService.generateInsight({
      user,
      memberId,
      organisationId: orgId,
      dto,
      idempotencyKey,
    });
  }

  // 8. Past Insights History
  @Get('insights')
  @ApiOperation({ summary: 'Retrieve historical wearable intelligence insights' })
  @ApiResponse({ status: 200, description: 'List of past wearable insight records' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max records to fetch' })
  async getPastInsights(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
    @Query('limit') limit?: number,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, orgId);
    return this.wearableIntelligenceService.getPastInsights(memberId, orgId, limit ? Number(limit) : 10);
  }

  // 9. Member Feedback
  @Post('feedback')
  @ApiOperation({ summary: 'Submit member feedback (Helpful / Not Helpful) on a wearable insight' })
  @ApiResponse({ status: 200, description: 'Feedback recorded successfully' })
  async submitFeedback(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: WearableInsightFeedbackDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.wearableIntelligenceService.submitFeedback(user, orgId, dto);
  }

  // 10. Privacy Transparency
  @Get('privacy')
  @ApiOperation({ summary: 'Get member privacy transparency breakdown for wearable intelligence' })
  @ApiResponse({ status: 200, description: 'Member privacy and consent transparency summary' })
  async getPrivacyView(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<WearablePrivacyViewDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, orgId);
    return this.wearableIntelligenceService.getPrivacyView(memberId, orgId);
  }

  // 11. Scoped Trainer View
  @Get('trainer/client/:memberId')
  @ApiOperation({ summary: 'Scoped trainer summary of client wearable activity (strictly guarded)' })
  @ApiParam({ name: 'memberId', description: 'ID of the assigned member' })
  @ApiResponse({ status: 200, description: 'Coaching summary for assigned client' })
  async getTrainerClientSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') targetMemberId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<WearableTrainerClientSummaryDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.wearableIntelligenceService.getTrainerClientSummary(user.id, targetMemberId, orgId);
  }
}
