/**
 * Day 31 — AI Receptionist Controller
 * Exposes REST endpoints for conversational chat, knowledge base management, handoff triage, and metrics.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/interfaces/request-with-user.interface';
import { ReceptionistService } from './receptionist.service';
import { ReceptionistConversationService } from './conversation/receptionist-conversation.service';
import { ReceptionistMessageService } from './conversation/receptionist-message.service';
import { ReceptionistHandoffService } from './handoff/receptionist-handoff.service';
import { ReceptionistKnowledgeService } from './knowledge/receptionist-knowledge.service';
import {
  ReceptionistChatDto,
  CreateAIReceptionistDto,
  UpdateAIReceptionistDto,
  CreateKnowledgeSourceDto,
  UpdateKnowledgeSourceDto,
  CreateHandoffDto,
  UpdateHandoffDto,
  ReceptionistFeedbackDto,
} from './dto/receptionist.dto';
import { ConversationChannel, ConversationStatus, HandoffStatus } from '@fitcore/types';

@ApiTags('AI Receptionist')
@Controller('ai/receptionist')
export class ReceptionistController {
  constructor(
    private readonly receptionistService: ReceptionistService,
    private readonly conversationService: ReceptionistConversationService,
    private readonly messageService: ReceptionistMessageService,
    private readonly handoffService: ReceptionistHandoffService,
    private readonly knowledgeService: ReceptionistKnowledgeService,
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
  // 1. CONVERSATIONAL CHAT
  // ==========================================

  @Public()
  @Post('chat')
  @ApiOperation({ summary: 'Send message to AI receptionist (Omnichannel chat)' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async chat(
    @Body() dto: ReceptionistChatDto,
    @Headers('x-organisation-id') headerOrgId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.receptionistService.chat(orgId, dto, user);
  }

  @Public()
  @Post('feedback')
  @ApiOperation({ summary: 'Submit user feedback rating for conversation or response' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async submitFeedback(
    @Body() dto: ReceptionistFeedbackDto,
    @Headers('x-organisation-id') headerOrgId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.receptionistService.recordFeedback(orgId, dto);
  }

  // ==========================================
  // 2. CONFIGURATION (Staff / Admin)
  // ==========================================

  @Get('config')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get active AI receptionist configuration' })
  async getConfig(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
    @Query('outletId') outletId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.receptionistService.getOrCreateReceptionist(orgId, outletId);
  }

  @Post('config')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create new AI receptionist configuration' })
  async createConfig(
    @Body() dto: CreateAIReceptionistDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.receptionistService.createReceptionist(orgId, dto);
  }

  @Patch('config/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update AI receptionist configuration' })
  async updateConfig(
    @Param('id') id: string,
    @Body() dto: UpdateAIReceptionistDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.receptionistService.updateReceptionist(orgId, id, dto);
  }

  // ==========================================
  // 3. CONVERSATIONS & TRANSCRIPTS
  // ==========================================

  @Get('conversations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List receptionist conversations' })
  async listConversations(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
    @Query('outletId') outletId?: string,
    @Query('status') status?: ConversationStatus,
    @Query('channel') channel?: ConversationChannel,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.conversationService.listConversations({
      organisationId: orgId,
      outletId,
      status,
      channel,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('conversations/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get conversation details and transcripts' })
  async getConversation(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.conversationService.getConversation(orgId, id);
  }

  @Get('conversations/:id/messages')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get messages for a conversation' })
  async getMessages(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    // Asserts conversation belongs to org
    await this.conversationService.getConversation(orgId, id);
    return this.messageService.getMessages(id);
  }

  @Post('conversations/:id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update conversation status' })
  async updateConversationStatus(
    @Param('id') id: string,
    @Body('status') status: ConversationStatus,
    @Body('summary') summary: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.conversationService.updateStatus(orgId, id, status, summary);
  }

  // ==========================================
  // 4. HUMAN HANDOFFS
  // ==========================================

  @Post('handoffs')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Request human staff handoff' })
  async createHandoff(
    @Body() dto: CreateHandoffDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.handoffService.createHandoff(orgId, dto);
  }

  @Get('handoffs')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List pending or active human handoffs' })
  async listHandoffs(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
    @Query('outletId') outletId?: string,
    @Query('status') status?: HandoffStatus,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.handoffService.listHandoffs({
      organisationId: orgId,
      outletId,
      status,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Patch('handoffs/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update handoff status or assign staff member' })
  async updateHandoff(
    @Param('id') id: string,
    @Body() dto: UpdateHandoffDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.handoffService.updateHandoff(orgId, id, dto);
  }

  // ==========================================
  // 5. KNOWLEDGE BASE MANAGEMENT
  // ==========================================

  @Get('knowledge')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List knowledge sources' })
  async listKnowledge(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
    @Query('outletId') outletId?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.knowledgeService.listKnowledgeSources({
      organisationId: orgId,
      outletId,
      type,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Post('knowledge')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create new knowledge source' })
  async createKnowledge(
    @Body() dto: CreateKnowledgeSourceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.knowledgeService.createKnowledgeSource(orgId, dto, user.id);
  }

  @Get('knowledge/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get knowledge source by ID' })
  async getKnowledge(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.knowledgeService.getKnowledgeSource(orgId, id);
  }

  @Patch('knowledge/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update knowledge source' })
  async updateKnowledge(
    @Param('id') id: string,
    @Body() dto: UpdateKnowledgeSourceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.knowledgeService.updateKnowledgeSource(orgId, id, dto, user.id);
  }

  @Delete('knowledge/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete knowledge source' })
  async deleteKnowledge(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.knowledgeService.deleteKnowledgeSource(orgId, id);
  }

  @Get('knowledge-gaps')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List unresolved customer knowledge gaps' })
  async listKnowledgeGaps(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.knowledgeService.listKnowledgeGaps(orgId);
  }

  // ==========================================
  // 6. METRICS
  // ==========================================

  @Get('metrics')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get receptionist operational metrics' })
  async getMetrics(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.receptionistService.getMetrics(orgId);
  }
}
