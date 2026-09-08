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
import { ReactivationService } from './reactivation.service';
import {
  AnalyzeReactivationDto,
  ReactivationQueueQueryDto,
  ReactivationSummaryQueryDto,
  CreateRecoveryPlanRequestDto,
  UpdateRecoveryPlanRequestDto,
} from './dto/reactivation-analysis.dto';
import { SubmitReactivationFeedbackRequestDto } from './dto/reactivation-feedback.dto';
import { REACTIVATION_STAFF_ROLES } from './reactivation.constants';
import { RecoveryPlanStatus } from '@fitcore/types';

@ApiTags('AI Reactivation & Member Recovery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/reactivation')
export class ReactivationController {
  constructor(
    private readonly reactivationService: ReactivationService,
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
      throw new ForbiddenException('Role assignment required to access Reactivation Intelligence.');
    }

    const hasStaffRole = user.roles.some((r) =>
      (REACTIVATION_STAFF_ROLES as readonly string[]).includes(r.role),
    );

    if (!hasStaffRole) {
      throw new ForbiddenException(
        'Access denied: Reactivation Intelligence is restricted to authorized gym staff and trainers.',
      );
    }
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get aggregate reactivation and recovery metrics' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
    @Query() query?: ReactivationSummaryQueryDto,
  ) {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.reactivationService.getSummary(orgId, query);
  }

  @Get('queue')
  @ApiOperation({ summary: 'Get staff reactivation follow-up queue' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async getQueue(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
    @Query() query?: ReactivationQueueQueryDto,
  ) {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.reactivationService.getQueue(orgId, query || {}, user);
  }

  @Get('members/:memberId')
  @ApiOperation({ summary: 'Get member reactivation profile and active recovery plan' })
  @ApiParam({ name: 'memberId', type: 'string' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async getMemberReactivation(
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.reactivationService.getMemberReactivation(orgId, memberId, user);
  }

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze member for reactivation & generate AI recovery recommendations' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async analyzeMember(
    @Body() dto: AnalyzeReactivationDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.reactivationService.analyzeMember(orgId, dto, user);
  }

  @Post('plans')
  @ApiOperation({ summary: 'Create a human-approved MemberRecoveryPlan' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async createRecoveryPlan(
    @Body() dto: CreateRecoveryPlanRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.reactivationService.createRecoveryPlan(orgId, user, dto);
  }

  @Get('plans/:planId')
  @ApiOperation({ summary: 'Get recovery plan details by ID' })
  @ApiParam({ name: 'planId', type: 'string' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async getRecoveryPlan(
    @Param('planId') planId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.reactivationService.getRecoveryPlan(orgId, planId, user);
  }

  @Patch('plans/:planId')
  @ApiOperation({ summary: 'Update recovery plan metadata or transition status' })
  @ApiParam({ name: 'planId', type: 'string' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async updateRecoveryPlan(
    @Param('planId') planId: string,
    @Body() dto: UpdateRecoveryPlanRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.reactivationService.updateRecoveryPlan(orgId, planId, user, dto);
  }

  @Post('plans/:planId/transition')
  @ApiOperation({ summary: 'Transition recovery plan status through the state machine' })
  @ApiParam({ name: 'planId', type: 'string' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async transitionPlan(
    @Param('planId') planId: string,
    @Body() body: { targetStatus: RecoveryPlanStatus; dismissalReason?: string; notes?: string },
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.reactivationService.transitionPlanStatus(
      orgId,
      planId,
      user,
      body.targetStatus,
      body.dismissalReason,
      body.notes,
    );
  }

  @Post('feedback')
  @ApiOperation({ summary: 'Submit staff feedback on AI reactivation recommendations' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async submitFeedback(
    @Body() dto: SubmitReactivationFeedbackRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.reactivationService.submitFeedback(orgId, user, dto);
  }

  @Get('member-state')
  @ApiOperation({ summary: 'Get safe member recovery state (strictly zero risk or churn metrics exposed)' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async getMemberRecoveryState(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const member = await this.prisma.memberProfile.findFirst({
      where: { userId: user.id, organisationId: orgId },
    });
    if (!member) {
      throw new NotFoundException('Member profile not found for authenticated user.');
    }
    return this.reactivationService.getMemberSafeRecoveryState(orgId, member.id);
  }
}
