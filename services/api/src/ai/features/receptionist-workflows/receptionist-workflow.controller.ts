/**
 * Day 35 — Receptionist Workflow Controller
 * REST endpoints for canonical interactions, staff handoffs, follow-ups, callbacks,
 * configuration, operations dashboard, and staff inbox.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Headers,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/interfaces/request-with-user.interface';
import { ReceptionistInteractionService } from './receptionist-interaction.service';
import { ReceptionistHandoffWorkflowService } from './receptionist-handoff-workflow.service';
import { ReceptionistFollowUpService } from './receptionist-followup.service';
import { ReceptionistCallbackService } from './receptionist-callback.service';
import { ReceptionistConfigService } from './receptionist-config.service';
import { ReceptionistAnalyticsService } from './receptionist-analytics.service';
import {
  ReceptionistChannel,
  ReceptionistInteractionStatus,
  ReceptionistOutcome,
  WorkflowHandoffPriority,
  WorkflowHandoffReason,
  WorkflowHandoffStatus,
  FollowUpTaskStatus,
  FollowUpTaskPriority,
  FollowUpTaskOutcome,
  CallbackStatus,
  CallbackChannel,
  ReceptionistWorkflowConfigDto,
} from '@fitcore/types';

@ApiTags('AI Receptionist Workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('receptionist')
export class ReceptionistWorkflowController {
  constructor(
    private readonly interactionService: ReceptionistInteractionService,
    private readonly handoffService: ReceptionistHandoffWorkflowService,
    private readonly followUpService: ReceptionistFollowUpService,
    private readonly callbackService: ReceptionistCallbackService,
    private readonly configService: ReceptionistConfigService,
    private readonly analyticsService: ReceptionistAnalyticsService,
  ) {}

  private resolveOrgId(user?: AuthenticatedUser, headerOrgId?: string): string {
    const orgId =
      headerOrgId ||
      user?.roles?.[0]?.organisationId ||
      (user as any)?.primaryOrganisationId ||
      (user as any)?.organisationId;

    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified.');
    }
    return orgId;
  }

  // ==========================================
  // 1. INTERACTIONS
  // ==========================================

  @Get('interactions')
  @ApiOperation({ summary: 'List receptionist interactions' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async listInteractions(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
    @Query('outletId') outletId?: string,
    @Query('channel') channel?: ReceptionistChannel,
    @Query('status') status?: ReceptionistInteractionStatus,
    @Query('outcome') outcome?: ReceptionistOutcome,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.interactionService.listInteractions({
      organisationId,
      outletId,
      channel,
      status,
      outcome,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
  }

  @Get('interactions/:id')
  @ApiOperation({ summary: 'Get interaction detail' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async getInteraction(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
    @Query('outletId') outletId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.interactionService.getInteraction({
      interactionId: id,
      organisationId,
      outletId,
      userId: user.id,
    });
  }

  @Get('interactions/:id/outcome')
  @ApiOperation({ summary: 'Get authoritative interaction outcome' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async getInteractionOutcome(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const interaction = await this.interactionService.getInteraction({
      interactionId: id,
      organisationId,
      userId: user.id,
    });
    return {
      interactionId: interaction.id,
      status: interaction.status,
      outcome: interaction.outcome,
      outcomeSource: interaction.outcomeSource,
      endedAt: interaction.endedAt,
    };
  }

  // ==========================================
  // 2. HANDOFFS
  // ==========================================

  @Get('handoffs')
  @ApiOperation({ summary: 'List receptionist handoffs' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async listHandoffs(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
    @Query('outletId') outletId?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: WorkflowHandoffPriority,
    @Query('assignedStaffId') assignedStaffId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.handoffService.listHandoffs({
      organisationId,
      outletId,
      status,
      priority,
      assignedStaffId,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
  }

  @Post('handoffs')
  @ApiOperation({ summary: 'Create receptionist handoff' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async createHandoff(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      conversationId: string;
      interactionId?: string;
      outletId?: string;
      memberId?: string;
      reason: WorkflowHandoffReason;
      priority?: WorkflowHandoffPriority;
      customerSummary: string;
      suggestedAction?: string;
    },
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.handoffService.createHandoff({
      organisationId,
      outletId: body.outletId,
      conversationId: body.conversationId,
      interactionId: body.interactionId,
      memberId: body.memberId,
      reason: body.reason,
      priority: body.priority,
      customerSummary: body.customerSummary,
      suggestedAction: body.suggestedAction,
      userId: user.id,
    });
  }

  @Patch('handoffs/:id')
  @ApiOperation({ summary: 'Update handoff status and assignment' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async updateHandoff(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      status: WorkflowHandoffStatus;
      notes?: string;
      assignedStaffId?: string;
    },
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.handoffService.updateHandoffStatus({
      organisationId,
      handoffId: id,
      status: body.status,
      notes: body.notes,
      assignedStaffId: body.assignedStaffId,
      userId: user.id,
    });
  }

  // ==========================================
  // 3. FOLLOW-UPS
  // ==========================================

  @Get('follow-ups')
  @ApiOperation({ summary: 'List follow-up tasks' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async listFollowUps(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
    @Query('outletId') outletId?: string,
    @Query('status') status?: FollowUpTaskStatus,
    @Query('priority') priority?: FollowUpTaskPriority,
    @Query('assignedStaffId') assignedStaffId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.followUpService.listFollowUpTasks({
      organisationId,
      outletId,
      status,
      priority,
      assignedStaffId,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
  }

  @Post('follow-ups')
  @ApiOperation({ summary: 'Create follow-up task' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async createFollowUp(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      outletId?: string;
      interactionId?: string;
      leadId?: string;
      memberId?: string;
      priority?: FollowUpTaskPriority;
      reason: string;
      notes?: string;
      dueAt?: string;
    },
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.followUpService.createFollowUpTask({
      organisationId,
      outletId: body.outletId,
      interactionId: body.interactionId,
      leadId: body.leadId,
      memberId: body.memberId,
      priority: body.priority,
      reason: body.reason,
      notes: body.notes,
      dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
      userId: user.id,
    });
  }

  @Patch('follow-ups/:id')
  @ApiOperation({ summary: 'Update follow-up task status and outcome' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async updateFollowUp(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      status?: FollowUpTaskStatus;
      outcome?: FollowUpTaskOutcome;
      notes?: string;
      assignedStaffId?: string;
    },
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.followUpService.updateFollowUpTask({
      organisationId,
      taskId: id,
      status: body.status,
      outcome: body.outcome,
      notes: body.notes,
      assignedStaffId: body.assignedStaffId,
      userId: user.id,
    });
  }

  // ==========================================
  // 4. CALLBACKS
  // ==========================================

  @Get('callbacks')
  @ApiOperation({ summary: 'List callback requests' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async listCallbacks(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
    @Query('outletId') outletId?: string,
    @Query('status') status?: CallbackStatus,
    @Query('assignedStaffId') assignedStaffId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.callbackService.listCallbacks({
      organisationId,
      outletId,
      status,
      assignedStaffId,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
  }

  @Post('callbacks')
  @ApiOperation({ summary: 'Create callback request' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async createCallback(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      outletId?: string;
      memberId?: string;
      leadId?: string;
      interactionId?: string;
      phoneNumber?: string;
      preferredTime?: string;
      preferredTimeNote?: string;
      preferredChannel?: CallbackChannel;
      reason: string;
    },
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.callbackService.createCallbackRequest({
      organisationId,
      outletId: body.outletId,
      memberId: body.memberId,
      leadId: body.leadId,
      interactionId: body.interactionId,
      phoneNumber: body.phoneNumber,
      preferredTime: body.preferredTime ? new Date(body.preferredTime) : undefined,
      preferredTimeNote: body.preferredTimeNote,
      preferredChannel: body.preferredChannel,
      reason: body.reason,
      userId: user.id,
    });
  }

  @Patch('callbacks/:id')
  @ApiOperation({ summary: 'Update callback request status' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async updateCallback(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      status: CallbackStatus;
      notes?: string;
      assignedStaffId?: string;
    },
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.callbackService.updateCallbackStatus({
      organisationId,
      callbackId: id,
      status: body.status,
      notes: body.notes,
      assignedStaffId: body.assignedStaffId,
      userId: user.id,
    });
  }

  // ==========================================
  // 5. CONFIGURATION
  // ==========================================

  @Get('config')
  @ApiOperation({ summary: 'Get effective organisation or outlet configuration' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async getConfig(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
    @Query('outletId') outletId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.configService.getEffectiveConfig({
      organisationId,
      outletId,
    });
  }

  @Patch('config')
  @ApiOperation({ summary: 'Update organisation default or outlet override configuration' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async updateConfig(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Partial<ReceptionistWorkflowConfigDto>,
    @Headers('x-organisation-id') headerOrgId?: string,
    @Query('outletId') outletId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.configService.updateConfig({
      organisationId,
      outletId,
      dto: body,
      userId: user.id,
    });
  }

  // ==========================================
  // 6. OPERATIONS INBOX & ANALYTICS
  // ==========================================

  @Get('inbox')
  @ApiOperation({ summary: 'Receptionist staff inbox triage' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async getInbox(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
    @Query('outletId') outletId?: string,
    @Query('priority') priority?: WorkflowHandoffPriority,
    @Query('status') status?: string,
    @Query('type') type?: 'HANDOFF' | 'FOLLOW_UP' | 'CALLBACK' | 'ALL',
    @Query('assignedStaffId') assignedStaffId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.analyticsService.getStaffInbox({
      organisationId,
      outletId,
      priority,
      status,
      type,
      assignedStaffId,
      limit: limit ? Number(limit) : 20,
      offset: offset ? Number(offset) : 0,
    });
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Receptionist operational analytics and KPIs' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async getAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
    @Query('outletId') outletId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.analyticsService.getOperationsDashboard({
      organisationId,
      outletId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }
}
