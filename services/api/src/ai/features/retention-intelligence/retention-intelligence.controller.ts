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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/interfaces/request-with-user.interface';
import { PrismaService } from '../../../database/prisma.service';
import { RetentionIntelligenceService } from './retention-intelligence.service';
import {
  AnalyzeRetentionDto,
  RetentionRiskQueryDto,
  RetentionFactorsQueryDto,
  RetentionQueueQueryDto,
  RetentionSummaryQueryDto,
  CreateFollowUpTaskDto,
  UpdateFollowUpTaskDto,
} from './dto/retention-analysis.dto';
import { SubmitRetentionFeedbackDto } from './dto/retention-feedback.dto';
import {
  RetentionDashboardSummaryDto,
  RetentionRiskAssessment,
  RetentionRiskFactor,
  RetentionPositiveSignal,
  RetentionRiskTrend,
  RetentionQueueItemDto,
  RetentionFollowUpTaskDto,
} from '@fitcore/types';
import { RETENTION_STAFF_ROLES } from './retention-intelligence.constants';

@ApiTags('AI Retention Intelligence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/retention')
export class RetentionIntelligenceController {
  constructor(
    private readonly retentionService: RetentionIntelligenceService,
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

  private verifyStaffAuthorization(user: AuthenticatedUser): void {
    if (!user.roles || user.roles.length === 0) {
      throw new ForbiddenException('Role assignment required to access Retention Intelligence.');
    }

    const hasStaffRole = user.roles.some((r) =>
      (RETENTION_STAFF_ROLES as readonly string[]).includes(r.role),
    );

    if (!hasStaffRole) {
      throw new ForbiddenException(
        'Access denied: Retention Intelligence is restricted to authorized gym staff and trainers.',
      );
    }
  }

  private async verifyTrainerMemberAssignment(
    user: AuthenticatedUser,
    memberId: string,
    organisationId: string,
  ): Promise<void> {
    const isTrainerOnly = user.roles.every(
      (r) => r.role === 'TRAINER' || r.role === 'MEMBER',
    );

    if (isTrainerOnly) {
      const trainerProfile = await this.prisma.trainerProfile.findFirst({
        where: {
          organisationId,
          staffProfile: { userId: user.id },
        },
      });

      if (!trainerProfile) {
        throw new ForbiddenException('Trainer profile not found.');
      }

      const assignment = await this.prisma.trainerClientAssignment.findFirst({
        where: {
          trainerProfileId: trainerProfile.id,
          memberProfileId: memberId,
          status: 'ACTIVE',
        },
      });

      if (!assignment) {
        throw new ForbiddenException(
          'Trainer is authorized to access retention intelligence only for actively assigned clients.',
        );
      }
    }
  }

  // 1. GET /api/v1/ai/retention/summary
  @Get('summary')
  @ApiOperation({ summary: 'Get aggregate retention dashboard metrics and risk distributions' })
  @ApiResponse({ status: 200, description: 'Retention intelligence dashboard summary' })
  async getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
    @Query() query?: RetentionSummaryQueryDto,
  ): Promise<RetentionDashboardSummaryDto> {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.retentionService.getSummary(orgId, query);
  }

  // 2. GET /api/v1/ai/retention/risk
  @Get('risk')
  @ApiOperation({ summary: 'Get deterministic retention risk assessment for a member' })
  @ApiResponse({ status: 200, description: 'Retention risk assessment' })
  async getRisk(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RetentionRiskQueryDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<RetentionRiskAssessment & { trend: RetentionRiskTrend }> {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    await this.verifyTrainerMemberAssignment(user, query.memberId, orgId);
    return this.retentionService.getRisk(query.memberId, orgId, query.refresh);
  }

  // 3. GET /api/v1/ai/retention/factors
  @Get('factors')
  @ApiOperation({ summary: 'Get explainable structured risk factors and positive signals' })
  @ApiResponse({ status: 200, description: 'Structured risk factors with evidence' })
  async getFactors(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RetentionFactorsQueryDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<{
    primaryFactors: RetentionRiskFactor[];
    positiveSignals: RetentionPositiveSignal[];
    riskTrend: RetentionRiskTrend;
  }> {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    await this.verifyTrainerMemberAssignment(user, query.memberId, orgId);
    return this.retentionService.getFactors(query.memberId, orgId);
  }

  // 4. GET /api/v1/ai/retention/queue
  @Get('queue')
  @ApiOperation({ summary: 'Get staff retention follow-up queue with filters' })
  @ApiResponse({ status: 200, description: 'Retention follow-up queue' })
  async getQueue(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
    @Query() query?: RetentionQueueQueryDto,
  ): Promise<{ items: RetentionQueueItemDto[]; total: number; limit: number; offset: number }> {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.retentionService.getQueue(orgId, query || {});
  }

  // 5. POST /api/v1/ai/retention/analyze
  @Post('analyze')
  @ApiOperation({ summary: 'Generate or retrieve AI Retention Intelligence analysis' })
  @ApiHeader({ name: 'idempotency-key', required: false })
  @ApiResponse({ status: 200, description: 'Grounded retention analysis & recommendations' })
  async analyze(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AnalyzeRetentionDto,
    @Headers('x-organisation-id') headerOrgId?: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    await this.verifyTrainerMemberAssignment(user, dto.memberId, orgId);
    return this.retentionService.analyze({
      user,
      organisationId: orgId,
      dto,
      idempotencyKey,
    });
  }

  // 6. POST /api/v1/ai/retention/feedback
  @Post('feedback')
  @ApiOperation({ summary: 'Submit staff rating and feedback on AI recommendations' })
  @ApiResponse({ status: 200, description: 'Feedback recorded' })
  async submitFeedback(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitRetentionFeedbackDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.retentionService.submitFeedback({
      user,
      organisationId: orgId,
      dto,
    });
  }

  // 7. POST /api/v1/ai/retention/follow-ups
  @Post('follow-ups')
  @ApiOperation({ summary: 'Create a human follow-up task from a recommendation' })
  @ApiResponse({ status: 201, description: 'Follow-up task created' })
  async createFollowUp(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFollowUpTaskDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<RetentionFollowUpTaskDto> {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    await this.verifyTrainerMemberAssignment(user, dto.memberId, orgId);
    return this.retentionService.createFollowUpTask({
      user,
      organisationId: orgId,
      dto,
    });
  }

  // 8. PATCH /api/v1/ai/retention/follow-ups/:id
  @Patch('follow-ups/:id')
  @ApiOperation({ summary: 'Update retention follow-up task status, assignment, or completion' })
  @ApiParam({ name: 'id', description: 'Follow-up Task ID' })
  @ApiResponse({ status: 200, description: 'Task updated' })
  async updateFollowUp(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateFollowUpTaskDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<RetentionFollowUpTaskDto> {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.retentionService.updateFollowUpTask({
      user,
      taskId: id,
      organisationId: orgId,
      dto,
    });
  }
}
