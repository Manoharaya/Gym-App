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
import { RetentionAgentService } from './retention-agent.service';
import {
  RetentionAgentQueueQueryDto,
  AnalyzeRetentionAgentMemberDto,
  CreateRetentionOutreachDto,
  ApproveRetentionOutreachDto,
  RejectRetentionOutreachDto,
  RescheduleRetentionOutreachDto,
  SubmitRetentionOutreachFeedbackDto,
  RecordRetentionOutcomeDto,
} from './dto/retention-agent.dto';

const ALLOWED_STAFF_ROLES = [
  'SUPERADMIN',
  'ORGANISATION_OWNER',
  'OUTLET_MANAGER',
  'TRAINER',
  'RECEPTION',
];

@ApiTags('AI Retention Agent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/retention-agent')
export class RetentionAgentController {
  constructor(private readonly retentionAgentService: RetentionAgentService) {}

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
      throw new ForbiddenException('Role assignment required to access Retention Agent.');
    }

    const hasStaffRole = user.roles.some((r) =>
      ALLOWED_STAFF_ROLES.includes(r.role),
    );

    if (!hasStaffRole) {
      throw new ForbiddenException(
        'Access denied: Retention Agent is restricted to authorized gym staff and personal trainers.',
      );
    }
  }

  /**
   * 1. GET /api/v1/ai/retention-agent/queue
   */
  @Get('queue')
  @ApiOperation({ summary: 'List retention outreach queue for staff review' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async getQueue(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RetentionAgentQueueQueryDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.retentionAgentService.getQueue(orgId, query, user);
  }

  /**
   * 2. GET /api/v1/ai/retention-agent/member/:memberId
   */
  @Get('member/:memberId')
  @ApiOperation({ summary: 'Get member retention analysis and active outreach status' })
  @ApiParam({ name: 'memberId', description: 'Member Profile ID' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async getMemberAnalysis(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.retentionAgentService.getMemberAnalysis(memberId, orgId, user);
  }

  /**
   * 2b. GET /api/v1/ai/retention-agent/member/:memberId/metrics
   */
  @Get('member/:memberId/metrics')
  @ApiOperation({ summary: 'Retrieve deterministic retention metrics and evidence points for member (Section 7A)' })
  @ApiParam({ name: 'memberId', description: 'Member Profile ID' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async getMemberMetrics(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.retentionAgentService.getMemberMetrics(memberId, orgId, user);
  }

  /**
   * 3. POST /api/v1/ai/retention-agent/analyze/:memberId
   */
  @Post('analyze/:memberId')
  @ApiOperation({ summary: 'Trigger AI retention analysis & draft outreach for member' })
  @ApiParam({ name: 'memberId', description: 'Member Profile ID' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async analyzeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Body() dto?: AnalyzeRetentionAgentMemberDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.retentionAgentService.analyzeMember(memberId, orgId, user, dto);
  }

  /**
   * 4. POST /api/v1/ai/retention-agent/outreach
   */
  @Post('outreach')
  @ApiOperation({ summary: 'Create manual retention outreach draft' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async createOutreach(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRetentionOutreachDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.retentionAgentService.createOutreach(dto, user, orgId);
  }

  /**
   * 5. GET /api/v1/ai/retention-agent/outreach/:id
   */
  @Get('outreach/:id')
  @ApiOperation({ summary: 'Get retention outreach detail by ID' })
  @ApiParam({ name: 'id', description: 'Outreach ID' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async getOutreachById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.retentionAgentService.getOutreachById(id, orgId, user);
  }

  /**
   * 6. POST /api/v1/ai/retention-agent/outreach/:id/approve
   */
  @Post('outreach/:id/approve')
  @ApiOperation({ summary: 'Approve retention outreach and submit to Communication Engine' })
  @ApiParam({ name: 'id', description: 'Outreach ID' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async approveOutreach(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ApproveRetentionOutreachDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.retentionAgentService.approveOutreach(id, dto, user, orgId);
  }

  /**
   * 7. POST /api/v1/ai/retention-agent/outreach/:id/reject
   */
  @Post('outreach/:id/reject')
  @ApiOperation({ summary: 'Reject retention outreach recommendation' })
  @ApiParam({ name: 'id', description: 'Outreach ID' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async rejectOutreach(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RejectRetentionOutreachDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.retentionAgentService.rejectOutreach(id, dto, user, orgId);
  }

  /**
   * 8. POST /api/v1/ai/retention-agent/outreach/:id/cancel
   */
  @Post('outreach/:id/cancel')
  @ApiOperation({ summary: 'Cancel pending or scheduled retention outreach' })
  @ApiParam({ name: 'id', description: 'Outreach ID' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async cancelOutreach(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.retentionAgentService.cancelOutreach(id, user, orgId);
  }

  /**
   * 9. POST /api/v1/ai/retention-agent/outreach/:id/reschedule
   */
  @Post('outreach/:id/reschedule')
  @ApiOperation({ summary: 'Reschedule retention outreach delivery' })
  @ApiParam({ name: 'id', description: 'Outreach ID' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async rescheduleOutreach(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RescheduleRetentionOutreachDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.retentionAgentService.rescheduleOutreach(id, dto, user, orgId);
  }

  /**
   * 10. POST /api/v1/ai/retention-agent/outreach/:id/feedback
   */
  @Post('outreach/:id/feedback')
  @ApiOperation({ summary: 'Submit staff feedback on outreach recommendation' })
  @ApiParam({ name: 'id', description: 'Outreach ID' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async submitFeedback(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SubmitRetentionOutreachFeedbackDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.retentionAgentService.submitFeedback(id, dto, user, orgId);
  }

  /**
   * 11. POST /api/v1/ai/retention-agent/outcome
   */
  @Post('outcome')
  @ApiOperation({ summary: 'Record observed re-engagement outcome' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async recordOutcome(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RecordRetentionOutcomeDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.retentionAgentService.recordOutcome(dto, user, orgId);
  }

  /**
   * 12. GET /api/v1/ai/retention-agent/analytics
   */
  @Get('analytics')
  @ApiOperation({ summary: 'Retention agent operational analytics' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async getAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query('outletId') outletId?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.verifyStaffAuthorization(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.retentionAgentService.getAnalytics(orgId, outletId);
  }
}
