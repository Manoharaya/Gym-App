import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { PrismaService } from '../../database/prisma.service';
import { BodyMeasurementService } from '../services/body-measurement.service';
import { FitnessAssessmentService } from '../services/fitness-assessment.service';
import { PersonalRecordService } from '../services/personal-record.service';
import { AdherenceAnalyticsService } from '../services/adherence-analytics.service';
import { GoalProgressService } from '../services/goal-progress.service';
import { ProgressAnalyticsService } from '../services/progress-analytics.service';
import {
  RecordBodyMeasurementDto,
  QueryMeasurementsDto,
  CreateAssessmentTemplateDto,
  CreateAssessmentDto,
  QueryTimeRangeDto,
} from '../dto/progress.dto';

@ApiTags('Progress Tracking & Analytics')
@ApiBearerAuth()
@Controller()
export class ProgressController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly measurementService: BodyMeasurementService,
    private readonly assessmentService: FitnessAssessmentService,
    private readonly prService: PersonalRecordService,
    private readonly adherenceService: AdherenceAnalyticsService,
    private readonly goalService: GoalProgressService,
    private readonly analyticsService: ProgressAnalyticsService,
  ) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || (user as any).organisationId || user.roles[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  private async resolveMemberProfileId(
    organisationId: string,
    user: AuthenticatedUser,
    paramMemberId?: string,
  ): Promise<string> {
    if (paramMemberId && paramMemberId !== 'me') {
      return paramMemberId;
    }

    const profile = await this.prisma.memberProfile.findFirst({
      where: { userId: user.id, organisationId },
    });

    if (!profile) {
      throw new NotFoundException('Member profile not found for the authenticated user');
    }

    return profile.id;
  }

  // ==========================================
  // PROGRESS SUMMARY & OVERVIEW
  // ==========================================

  @Get('progress/summary')
  @RequirePermission('progress', 'read')
  @ApiOperation({ summary: 'Get unified member progress summary' })
  async getProgressSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('memberProfileId') memberProfileIdQuery?: string,
    @Query('period') period?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberProfileIdQuery);
    return this.analyticsService.getMemberProgressSummary(orgId, memberProfileId, period || '30D', user);
  }

  @Get('members/me/progress')
  @RequirePermission('progress', 'read')
  @ApiOperation({ summary: 'Get own progress summary for logged-in member' })
  async getMyProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, 'me');
    return this.analyticsService.getMemberProgressSummary(orgId, memberProfileId, period || '30D', user);
  }

  @Get('members/:memberId/progress')
  @RequirePermission('progress', 'read')
  @ApiOperation({ summary: 'Get progress summary for a specific member' })
  async getMemberProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Query('period') period?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberId);
    return this.analyticsService.getMemberProgressSummary(orgId, memberProfileId, period || '30D', user);
  }

  @Get('progress/compare')
  @RequirePermission('progress', 'read')
  @ApiOperation({ summary: 'Compare progress metrics between time periods' })
  async compareProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Query('memberProfileId') memberProfileIdQuery?: string,
    @Query('period') period?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberProfileIdQuery);
    return this.analyticsService.comparePeriods(orgId, memberProfileId, period || '30D', user);
  }

  @Post('progress/snapshots')
  @RequirePermission('progress', 'manage')
  @ApiOperation({ summary: 'Generate a point-in-time progress snapshot' })
  async createSnapshot(
    @CurrentUser() user: AuthenticatedUser,
    @Query('memberProfileId') memberProfileIdQuery?: string,
    @Query('period') period?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberProfileIdQuery);
    return this.analyticsService.createSnapshot(orgId, memberProfileId, period || '30D', user);
  }

  // ==========================================
  // BODY MEASUREMENTS
  // ==========================================

  @Post('members/:memberId/measurements')
  @RequirePermission('body_measurements', 'manage')
  @ApiOperation({ summary: 'Record a body measurement for a member' })
  async recordMeasurement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Body() dto: RecordBodyMeasurementDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberId);
    const measurement = await this.measurementService.recordMeasurement(orgId, memberProfileId, dto, user);

    // Sync active goals & invalidate progress cache
    await this.goalService.syncGoalProgressFromMeasurement(orgId, memberProfileId, dto.measurementType, dto.value);
    await this.analyticsService.invalidateMemberCache(orgId, memberProfileId);

    return measurement;
  }

  @Get('members/:memberId/measurements')
  @RequirePermission('body_measurements', 'read')
  @ApiOperation({ summary: 'Get body measurements history for a member' })
  async getMeasurements(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Query() query: QueryMeasurementsDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberId);
    return this.measurementService.getMeasurements(orgId, memberProfileId, query, user);
  }

  @Get('members/:memberId/measurements/:measurementType/trend')
  @RequirePermission('body_measurements', 'read')
  @ApiOperation({ summary: 'Get statistical trend for a measurement type' })
  async getMeasurementTrend(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Param('measurementType') measurementType: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberId);
    return this.measurementService.getMeasurementTrend(orgId, memberProfileId, measurementType, user);
  }

  // ==========================================
  // FITNESS ASSESSMENTS
  // ==========================================

  @Get('progress/assessment-templates')
  @RequirePermission('assessments', 'read')
  @ApiOperation({ summary: 'List available assessment templates' })
  async getAssessmentTemplates(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.assessmentService.getTemplates(orgId);
  }

  @Post('progress/assessment-templates')
  @RequirePermission('assessments', 'manage')
  @ApiOperation({ summary: 'Create a custom assessment template' })
  async createAssessmentTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAssessmentTemplateDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.assessmentService.createCustomTemplate(orgId, dto, user);
  }

  @Post('members/:memberId/assessments')
  @RequirePermission('assessments', 'manage')
  @ApiOperation({ summary: 'Record or complete an assessment for a member' })
  async recordAssessment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Body() dto: CreateAssessmentDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberId);
    const assessment = await this.assessmentService.recordAssessment(orgId, memberProfileId, dto, user);

    await this.analyticsService.invalidateMemberCache(orgId, memberProfileId);
    return assessment;
  }

  @Get('members/:memberId/assessments')
  @RequirePermission('assessments', 'read')
  @ApiOperation({ summary: 'Get member assessments history' })
  async getMemberAssessments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Query('category') category?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberId);
    return this.assessmentService.getMemberAssessments(orgId, memberProfileId, user, category);
  }

  @Get('members/:memberId/assessments/:assessmentId/comparison')
  @RequirePermission('assessments', 'read')
  @ApiOperation({ summary: 'Compare assessment with previous assessment' })
  async getAssessmentComparison(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assessmentId') assessmentId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.assessmentService.getAssessmentComparison(orgId, assessmentId, user);
  }

  // ==========================================
  // PERSONAL RECORDS
  // ==========================================

  @Get('members/:memberId/personal-records')
  @RequirePermission('personal_records', 'read')
  @ApiOperation({ summary: 'Get personal records for a member' })
  async getMemberPRs(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Query('exerciseId') exerciseId?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberId);
    return this.prService.getMemberPRs(orgId, memberProfileId, user, exerciseId);
  }

  @Post('members/:memberId/personal-records/recalculate')
  @RequirePermission('personal_records', 'manage')
  @ApiOperation({ summary: 'Recalculate PRs from all historical completed workouts' })
  async recalculatePRs(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberId);
    const result = await this.prService.recalculateMemberPRs(orgId, memberProfileId, user);
    await this.analyticsService.invalidateMemberCache(orgId, memberProfileId);
    return result;
  }

  // ==========================================
  // ADHERENCE, PERFORMANCE & GOALS
  // ==========================================

  @Get('members/:memberId/adherence')
  @RequirePermission('progress', 'read')
  @ApiOperation({ summary: 'Get detailed member adherence metrics' })
  async getMemberAdherence(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Query() query: QueryTimeRangeDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberId);
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    return this.adherenceService.calculateMemberAdherence(
      orgId,
      memberProfileId,
      query.period || '30D',
      startDate,
      endDate,
      user,
    );
  }

  @Get('members/:memberId/goals-progress')
  @RequirePermission('progress', 'read')
  @ApiOperation({ summary: 'Get member goal progress with linear calculations' })
  async getGoalsProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Query('status') status?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberId);
    return this.goalService.getMemberGoalProgress(orgId, memberProfileId, user, status);
  }

  @Get('members/:memberId/performance')
  @RequirePermission('progress', 'read')
  @ApiOperation({ summary: 'Get exercise performance and volume analytics' })
  async getPerformance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Query() query: QueryTimeRangeDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberId);
    const { rangeStart, rangeEnd } = this.adherenceService.resolveDateRange(
      query.period || '30D',
      query.startDate ? new Date(query.startDate) : undefined,
      query.endDate ? new Date(query.endDate) : undefined,
    );
    return this.analyticsService.calculateTrainingVolume(orgId, memberProfileId, rangeStart, rangeEnd);
  }
}
