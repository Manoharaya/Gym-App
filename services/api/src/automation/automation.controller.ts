/**
 * Day 30 — Automated Engagement Workflows Controller
 *
 * REST API for defining, managing, simulating, and executing engagement workflows,
 * human approval queues, seed templates, and non-causal outcome analytics.
 */

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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/request-with-user.interface';
import { AutomationService } from './automation.service';
import {
  CreateWorkflowRequestDto,
  UpdateWorkflowRequestDto,
  WorkflowFilterQueryDto,
  WorkflowTriggerEventDto,
  ApproveWorkflowActionRequestDto,
  RejectWorkflowActionRequestDto,
  DryRunWorkflowRequestDto,
  AIAssistWorkflowRequestDto,
  InstantiateTemplateRequestDto,
} from './dto/automation.dto';

const ALLOWED_STAFF_ROLES = [
  'SUPERADMIN',
  'ORGANISATION_OWNER',
  'OUTLET_MANAGER',
  'TRAINER',
  'RECEPTION',
];

@ApiTags('Automated Engagement Workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('automation')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

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

  private validateStaffRole(user: AuthenticatedUser): void {
    const hasRole = user.roles?.some((r) => ALLOWED_STAFF_ROLES.includes(r.role));
    if (!hasRole) {
      throw new ForbiddenException('Access denied: Staff role required for engagement workflows.');
    }
  }

  @Post('workflows')
  @ApiOperation({ summary: 'Create a new engagement workflow' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async createWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWorkflowRequestDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.validateStaffRole(user);
    const orgId = this.resolveOrgId(user, headerOrgId || dto.organisationId);
    return this.automationService.createWorkflow(orgId, dto, user.id);
  }

  @Get('workflows')
  @ApiOperation({ summary: 'List engagement workflows with filters' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async listWorkflows(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: WorkflowFilterQueryDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.validateStaffRole(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.automationService.listWorkflows(orgId, query);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List pre-configured engagement templates' })
  listTemplates(@CurrentUser() user: AuthenticatedUser) {
    this.validateStaffRole(user);
    return this.automationService.listTemplates();
  }

  @Post('templates/instantiate')
  @ApiOperation({ summary: 'Instantiate a seed template into an active workflow' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async instantiateTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InstantiateTemplateRequestDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.validateStaffRole(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.automationService.instantiateTemplate(
      dto.templateKey,
      orgId,
      dto.outletId,
      dto.customName,
      user.id,
    );
  }

  @Get('workflows/:id')
  @ApiOperation({ summary: 'Get workflow details with current version' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async getWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.validateStaffRole(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.automationService.getWorkflow(id, orgId);
  }

  @Patch('workflows/:id')
  @ApiOperation({ summary: 'Update a workflow, creating a new version if criteria change' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async updateWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateWorkflowRequestDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.validateStaffRole(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.automationService.updateWorkflow(id, orgId, dto, user.id);
  }

  @Post('workflows/:id/activate')
  @ApiOperation({ summary: 'Activate an engagement workflow' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async activateWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.validateStaffRole(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.automationService.activateWorkflow(id, orgId);
  }

  @Post('workflows/:id/publish')
  @ApiOperation({ summary: 'Publish a workflow to create an immutable active version snapshot' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async publishWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.validateStaffRole(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.automationService.publishWorkflow(id, orgId);
  }

  @Post('workflows/:id/pause')
  @ApiOperation({ summary: 'Pause an active workflow' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async pauseWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.validateStaffRole(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.automationService.pauseWorkflow(id, orgId);
  }

  @Post('workflows/:id/archive')
  @ApiOperation({ summary: 'Archive a workflow' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async archiveWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.validateStaffRole(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.automationService.archiveWorkflow(id, orgId);
  }

  @Post('workflows/:id/dry-run')
  @ApiOperation({ summary: 'Simulate workflow trigger without side-effects' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async dryRunWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: DryRunWorkflowRequestDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.validateStaffRole(user);
    this.resolveOrgId(user, headerOrgId);
    return this.automationService.dryRunWorkflow(id, dto.memberId, dto.triggerEventPayload);
  }

  @Post('workflows/:id/test')
  @ApiOperation({ summary: 'Test workflow trigger simulation' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async testWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: DryRunWorkflowRequestDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.validateStaffRole(user);
    this.resolveOrgId(user, headerOrgId);
    return this.automationService.testWorkflow(id, dto.memberId, dto.triggerEventPayload);
  }

  @Get('workflows/:id/analytics')
  @ApiOperation({ summary: 'Get non-causal outcome analytics following workflow execution' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async getWorkflowAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.validateStaffRole(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.automationService.getWorkflowAnalytics(id, orgId);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get aggregate organisation automation analytics' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async getAggregateAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.validateStaffRole(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.automationService.getAggregateAnalytics(orgId);
  }

  @Get('member/:memberId')
  @ApiOperation({ summary: 'Get member automation history and active workflows' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async getMemberAutomation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.validateStaffRole(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.automationService.getMemberAutomationProfile(orgId, memberId);
  }

  @Post('events/ingest')
  @ApiOperation({ summary: 'Ingest domain event to trigger automated workflows' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async ingestEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: WorkflowTriggerEventDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.validateStaffRole(user);
    const orgId = this.resolveOrgId(user, headerOrgId || dto.organisationId);
    return this.automationService.ingestEvent({
      organisationId: orgId,
      outletId: dto.outletId,
      memberId: dto.memberId,
      eventType: dto.eventType,
      occurredAt: dto.occurredAt,
      payload: dto.payload || {},
      idempotencyKey: dto.idempotencyKey,
    });
  }

  @Get('instances')
  @ApiOperation({ summary: 'List workflow runtime instances' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async listInstances(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: { workflowId?: string; memberId?: string; status?: string; outletId?: string },
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.validateStaffRole(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.automationService.listInstances(orgId, query);
  }

  @Get('instances/:id')
  @ApiOperation({ summary: 'Get instance detail with execution audit log' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async getInstance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.validateStaffRole(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.automationService.getInstance(id, orgId);
  }

  @Post('instances/:id/cancel')
  @ApiOperation({ summary: 'Cancel an active workflow instance' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async cancelInstance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('reason') reason?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.validateStaffRole(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.automationService.cancelInstance(id, orgId, reason);
  }

  @Get('executions')
  @ApiOperation({ summary: 'List workflow executions' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async listExecutions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: { workflowId?: string; memberId?: string; status?: string; outletId?: string },
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    return this.listInstances(user, query, headerOrgId);
  }

  @Get('executions/:id')
  @ApiOperation({ summary: 'Get execution details' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async getExecution(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    return this.getInstance(user, id, headerOrgId);
  }

  @Post('executions/:id/cancel')
  @ApiOperation({ summary: 'Cancel an execution' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async cancelExecution(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('reason') reason?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    return this.cancelInstance(user, id, reason, headerOrgId);
  }

  @Get('approvals')
  @ApiOperation({ summary: 'List workflow action steps awaiting human approval' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async getApprovals(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.validateStaffRole(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    const isTrainer = user.roles?.some((r) => r.role === 'TRAINER');
    return this.automationService.getPendingApprovals(orgId, isTrainer ? user.id : undefined);
  }

  @Post('instances/:id/approve')
  @ApiOperation({ summary: 'Approve a pending workflow action' })
  async approveAction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ApproveWorkflowActionRequestDto,
  ) {
    this.validateStaffRole(user);
    return this.automationService.approveAction(id, user.id, dto.notes);
  }

  @Post('instances/:id/reject')
  @ApiOperation({ summary: 'Reject a pending workflow action' })
  async rejectAction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RejectWorkflowActionRequestDto,
  ) {
    this.validateStaffRole(user);
    return this.automationService.rejectAction(id, user.id, dto.reason);
  }

  @Post('ai/draft')
  @ApiOperation({ summary: 'AI assistant to draft workflow from gym staff intent' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async draftWorkflowWithAI(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AIAssistWorkflowRequestDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.validateStaffRole(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.automationService.draftWithAI(
      {
        ...dto,
        organisationId: orgId,
      },
      user,
    );
  }

  @Post('scheduler/process')
  @ApiOperation({ summary: 'Process pending scheduled workflow instances' })
  async processScheduledQueue(@CurrentUser() user: AuthenticatedUser) {
    this.validateStaffRole(user);
    const processed = await this.automationService.processScheduledQueue();
    return { processed };
  }
}
