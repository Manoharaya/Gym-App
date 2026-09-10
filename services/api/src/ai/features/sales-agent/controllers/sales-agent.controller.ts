/**
 * Day 36 — AI Sales Agent Controller
 * Versioned REST API under /api/v1/ai/sales/
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
  BadRequestException,
} from '@nestjs/common';
import { SalesAgentService } from '../application/sales-agent.service';
import { SalesRecommendationService } from '../application/sales-recommendation.service';
import {
  CreateSalesConversationInputDto,
  SalesMessageDto,
  SalesHandoffRequestDto,
  SalesFeedbackDto,
  UpdateSalesAgentConfigDto,
  ComparePlansInputDto,
} from '../dto/sales-agent.dto';

@Controller('ai/sales')
export class SalesAgentController {
  constructor(
    private readonly salesService: SalesAgentService,
    private readonly recommendationService: SalesRecommendationService,
  ) {}

  private resolveOrganisationId(orgHeader?: string): string {
    if (!orgHeader) {
      throw new BadRequestException('Missing required x-organisation-id header');
    }
    return orgHeader;
  }

  /**
   * 1. Start or resume sales conversation.
   * POST /api/v1/ai/sales/conversations
   */
  @Post('conversations')
  async createConversation(
    @Headers('x-organisation-id') orgHeader: string,
    @Body() dto: CreateSalesConversationInputDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.salesService.createConversation(organisationId, dto);
  }

  /**
   * 2. Get conversation details, messages, recommendations, and handoffs.
   * GET /api/v1/ai/sales/conversations/:id
   */
  @Get('conversations/:id')
  async getConversation(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') conversationId: string,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.salesService.getConversation(organisationId, conversationId);
  }

  /**
   * 3. Send prospect message turn and get grounded sales response.
   * POST /api/v1/ai/sales/conversations/:id/message
   */
  @Post('conversations/:id/message')
  async processMessage(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') conversationId: string,
    @Body() dto: SalesMessageDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.salesService.processMessage(organisationId, conversationId, dto);
  }

  /**
   * 4. Get structured Sales AI Context.
   * GET /api/v1/ai/sales/conversations/:id/context
   */
  @Get('conversations/:id/context')
  async getContext(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') conversationId: string,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.salesService.getContext(organisationId, conversationId);
  }

  /**
   * 5. Get recommendations generated for a conversation.
   * GET /api/v1/ai/sales/conversations/:id/recommendations
   */
  @Get('conversations/:id/recommendations')
  async getRecommendations(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') conversationId: string,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.salesService.getRecommendations(organisationId, conversationId);
  }

  /**
   * 6. Request human handoff.
   * POST /api/v1/ai/sales/conversations/:id/handoff
   */
  @Post('conversations/:id/handoff')
  async requestHandoff(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') conversationId: string,
    @Body() dto: SalesHandoffRequestDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.salesService.requestHandoff(organisationId, conversationId, dto);
  }

  /**
   * 7. Complete conversation.
   * POST /api/v1/ai/sales/conversations/:id/complete
   */
  @Post('conversations/:id/complete')
  async completeConversation(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') conversationId: string,
    @Body('outcome') outcome?: 'CONVERTED' | 'LOST' | 'COMPLETED',
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.salesService.completeConversation(organisationId, conversationId, outcome);
  }

  /**
   * 8. Record user feedback.
   * POST /api/v1/ai/sales/conversations/:id/feedback
   */
  @Post('conversations/:id/feedback')
  async recordFeedback(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') conversationId: string,
    @Body() dto: SalesFeedbackDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.salesService.recordFeedback(organisationId, conversationId, dto);
  }

  /**
   * 9. Get Agent Profile configuration.
   * GET /api/v1/ai/sales/agent/config
   */
  @Get('agent/config')
  async getAgentConfig(
    @Headers('x-organisation-id') orgHeader: string,
    @Query('outletId') outletId?: string,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.salesService.getAgentProfile(organisationId, outletId);
  }

  /**
   * 10. Update Agent Profile configuration.
   * PATCH /api/v1/ai/sales/agent/config
   */
  @Patch('agent/config')
  async updateAgentConfig(
    @Headers('x-organisation-id') orgHeader: string,
    @Query('outletId') outletId: string | undefined,
    @Body() dto: UpdateSalesAgentConfigDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.salesService.updateAgentProfile(organisationId, outletId, dto);
  }

  /**
   * 11. Staff Sales Dashboard metrics foundation.
   * GET /api/v1/ai/sales/dashboard
   */
  @Get('dashboard')
  async getDashboard(
    @Headers('x-organisation-id') orgHeader: string,
    @Query('outletId') outletId?: string,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.salesService.getDashboardMetrics(organisationId, outletId);
  }

  /**
   * 12. Staff Lead Summary view (lead -> summary -> needs -> qualification -> recommendation -> next action).
   * GET /api/v1/ai/sales/leads/:leadId/summary
   */
  @Get('leads/:leadId/summary')
  async getStaffLeadSummary(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('leadId') leadId: string,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.salesService.getStaffLeadSummary(organisationId, leadId);
  }

  /**
   * 13. Compare Membership Plans.
   * POST /api/v1/ai/sales/plans/compare
   */
  @Post('plans/compare')
  async comparePlans(
    @Headers('x-organisation-id') orgHeader: string,
    @Body() dto: ComparePlansInputDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.recommendationService.comparePlans(organisationId, dto.planIds);
  }
}
