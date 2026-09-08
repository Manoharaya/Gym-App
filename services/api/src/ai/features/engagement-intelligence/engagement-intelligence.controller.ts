import {
  Controller,
  Get,
  Post,
  Patch,
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
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/interfaces/request-with-user.interface';
import { PrismaService } from '../../../database/prisma.service';
import { EngagementIntelligenceService } from './services/engagement-intelligence.service';
import { EngagementAnalyticsService } from './analytics/engagement-analytics.service';
import { AppEngagementService } from './signals/app-engagement.service';
import { EngagementQueryDto } from './dto/engagement-query.dto';
import { GenerateEngagementInsightDto } from './dto/engagement-insight.dto';
import { EngagementFeedbackDto } from './dto/engagement-feedback.dto';
import { RecordAppEngagementEventDto } from './dto/app-event.dto';
import { UpdateReactivationWorkflowDto } from './dto/workflow-update.dto';
import {
  MemberEngagementProfileDto,
  EngagementTrendItem,
  RetentionRiskAssessment,
  EngagementIntelligenceResponse,
  OrganisationEngagementAnalyticsDto,
  TrainerClientEngagementDto,
  EngagementPrivacyViewDto,
} from '@fitcore/types';

const STAFF_ROLES = new Set(['OWNER', 'ADMIN', 'SUPERADMIN', 'CLUB_MANAGER', 'STAFF', 'TRAINER']);

@ApiTags('AI Engagement Intelligence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/engagement')
export class EngagementIntelligenceController {
  constructor(
    private readonly engagementService: EngagementIntelligenceService,
    private readonly analyticsService: EngagementAnalyticsService,
    private readonly appEngagementService: AppEngagementService,
    private readonly prisma: PrismaService,
  ) {}

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

  private async resolveMemberProfileId(user: AuthenticatedUser, organisationId: string): Promise<string> {
    const profile = await this.prisma.memberProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, organisationId: true },
    });

    if (!profile || profile.organisationId !== organisationId) {
      throw new NotFoundException('Active member profile required for engagement intelligence.');
    }

    return profile.id;
  }

  private isStaffOrTrainer(user: AuthenticatedUser): boolean {
    if (!user.roles || user.roles.length === 0) return false;
    return user.roles.some((r) => STAFF_ROLES.has(r.role));
  }

  // 1. GET /api/v1/ai/engagement/summary
  @Get('summary')
  @ApiOperation({ summary: 'Get member engagement profile and frequencies' })
  @ApiResponse({ status: 200, description: 'Deterministic member engagement profile' })
  async getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
    @Query() query?: EngagementQueryDto,
  ): Promise<MemberEngagementProfileDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    let targetMemberId: string;

    if (query?.memberId) {
      if (!this.isStaffOrTrainer(user)) {
        throw new ForbiddenException('Only authorized staff or trainers may query another member engagement summary.');
      }
      targetMemberId = query.memberId;
    } else {
      targetMemberId = await this.resolveMemberProfileId(user, orgId);
    }

    return this.engagementService.getSummary(targetMemberId, orgId, query?.refresh);
  }

  // 2. GET /api/v1/ai/engagement/trends
  @Get('trends')
  @ApiOperation({ summary: 'Get multi-pillar engagement trends compared against personal baseline' })
  @ApiResponse({ status: 200, description: 'Array of detected multi-pillar engagement trends' })
  async getTrends(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
    @Query() query?: EngagementQueryDto,
  ): Promise<EngagementTrendItem[]> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    let targetMemberId: string;

    if (query?.memberId) {
      if (!this.isStaffOrTrainer(user)) {
        throw new ForbiddenException('Only authorized staff or trainers may query another member trends.');
      }
      targetMemberId = query.memberId;
    } else {
      targetMemberId = await this.resolveMemberProfileId(user, orgId);
    }

    return this.engagementService.getTrends(targetMemberId, orgId, query?.refresh);
  }

  // 3. GET /api/v1/ai/engagement/retention-risk
  @Get('retention-risk')
  @ApiOperation({ summary: 'Get explainable retention risk assessment (STAFF & TRAINER only)' })
  @ApiResponse({ status: 200, description: 'Retention risk foundation with contributing observable reasons' })
  async getRetentionRisk(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
    @Query() query?: EngagementQueryDto,
  ): Promise<RetentionRiskAssessment> {
    const orgId = this.resolveOrgId(user, headerOrgId);

    if (!this.isStaffOrTrainer(user)) {
      throw new ForbiddenException('Retention risk evaluation is restricted to authorized staff and trainers.');
    }

    let targetMemberId = query?.memberId;
    if (!targetMemberId) {
      // If staff user queries without memberId, require memberId parameter
      throw new ForbiddenException('memberId query parameter is required to evaluate retention risk.');
    }

    return this.engagementService.getRetentionRisk(targetMemberId, orgId, query?.refresh);
  }

  // 4. POST /api/v1/ai/engagement/insight
  @Post('insight')
  @ApiOperation({ summary: 'Generate structured AI engagement intelligence insight' })
  @ApiResponse({ status: 200, description: 'AI-synthesized narrative insight and recommendations' })
  @ApiHeader({ name: 'idempotency-key', required: false, description: 'Request deduplication key' })
  async generateInsight(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateEngagementInsightDto,
    @Headers('x-organisation-id') headerOrgId?: string,
    @Headers('idempotency-key') headerIdempotencyKey?: string,
  ): Promise<{ insight: EngagementIntelligenceResponse; insightId?: string; cached: boolean }> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    let targetMemberId: string;

    if (dto.memberId) {
      if (!this.isStaffOrTrainer(user)) {
        throw new ForbiddenException('Only authorized staff or trainers may generate insights for another member.');
      }
      targetMemberId = dto.memberId;
    } else {
      targetMemberId = await this.resolveMemberProfileId(user, orgId);
    }

    return this.engagementService.generateInsight({
      user,
      memberId: targetMemberId,
      organisationId: orgId,
      promptQuery: dto.promptQuery,
      idempotencyKey: dto.idempotencyKey || headerIdempotencyKey,
    });
  }

  // 5. POST /api/v1/ai/engagement/feedback
  @Post('feedback')
  @ApiOperation({ summary: 'Submit feedback on an engagement insight' })
  @ApiResponse({ status: 200, description: 'Feedback recorded successfully' })
  async submitFeedback(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: EngagementFeedbackDto,
  ) {
    return this.engagementService.submitFeedback(dto.insightId, dto.rating, dto.comment, user);
  }

  // 6. GET /api/v1/ai/engagement/privacy
  @Get('privacy')
  @ApiOperation({ summary: 'Get privacy policy and data governance overview for engagement intelligence' })
  @ApiResponse({ status: 200, description: 'Engagement privacy view' })
  getPrivacy(): EngagementPrivacyViewDto {
    return this.engagementService.getPrivacyPolicy();
  }

  // 7. POST /api/v1/ai/engagement/events
  @Post('events')
  @ApiOperation({ summary: 'Record intentional app engagement event' })
  @ApiResponse({ status: 201, description: 'Event recorded successfully' })
  async recordAppEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RecordAppEngagementEventDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, orgId);

    const event = await this.appEngagementService.recordEvent(orgId, memberId, {
      eventType: dto.eventType,
      outletId: dto.outletId,
      metadata: dto.metadata,
      idempotencyKey: dto.idempotencyKey,
      occurredAt: dto.occurredAt,
      source: 'APP',
    });

    return { success: true, eventId: event.id };
  }

  // 8. GET /api/v1/ai/engagement/analytics
  @Get('analytics')
  @ApiOperation({ summary: 'Get aggregate organisation engagement metrics (STAFF/MANAGER only)' })
  @ApiResponse({ status: 200, description: 'Aggregate engagement business metrics' })
  async getAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
    @Query('outletId') outletId?: string,
  ): Promise<OrganisationEngagementAnalyticsDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);

    if (!this.isStaffOrTrainer(user)) {
      throw new ForbiddenException('Aggregate engagement analytics are restricted to staff and managers.');
    }

    return this.analyticsService.getOrganisationAnalytics(orgId, outletId);
  }

  // 9. GET /api/v1/ai/engagement/trainer/clients/:memberId
  @Get('trainer/clients/:memberId')
  @ApiOperation({ summary: 'Trainer view of assigned client engagement momentum' })
  @ApiParam({ name: 'memberId', description: 'Assigned member ID' })
  @ApiResponse({ status: 200, description: 'Trainer coaching momentum card' })
  async getTrainerClientView(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<TrainerClientEngagementDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.engagementService.getTrainerClientView(user.id, memberId, orgId);
  }

  // 10. PATCH /api/v1/ai/engagement/retention-risk/:memberId/workflow
  @Patch('retention-risk/:memberId/workflow')
  @ApiOperation({ summary: 'Update internal reactivation workflow state for member (STAFF only)' })
  @ApiParam({ name: 'memberId', description: 'Target member ID' })
  @ApiResponse({ status: 200, description: 'Workflow state updated' })
  async updateWorkflowState(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateReactivationWorkflowDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);

    if (!this.isStaffOrTrainer(user)) {
      throw new ForbiddenException('Reactivation workflow management is restricted to authorized staff.');
    }

    return this.engagementService.updateWorkflowState(memberId, orgId, dto.workflowState);
  }
}
