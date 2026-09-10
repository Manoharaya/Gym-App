/**
 * FitCore — Day 44: AI Finance Assistant Controller
 *
 * Exposes conversational AI endpoints and read-only financial intelligence summaries
 * under /api/v1/ai/finance/*.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { FinanceAssistantService } from '../services/finance-assistant.service';
import { FinancePermissionService } from '../domain/finance-permission.service';
import { FinanceToolRegistry } from '../tools/finance-tool-registry';
import {
  FinanceChatDto,
  SubmitFinanceFeedbackDto,
  FinanceFilterQueryDto,
} from '../dto/finance-chat.dto';
import { AuthenticatedUser } from '../../../../common/interfaces/request-with-user.interface';

@Controller('ai/finance')
@UseGuards(JwtAuthGuard)
export class FinanceAssistantController {
  constructor(
    private readonly assistantService: FinanceAssistantService,
    private readonly permissionService: FinancePermissionService,
    private readonly toolRegistry: FinanceToolRegistry,
  ) {}

  private resolveUser(
    req: any,
    orgHeader?: string,
    userHeader?: string,
    roleHeader?: string,
    outletHeader?: string,
  ): AuthenticatedUser {
    if (roleHeader || orgHeader || userHeader || outletHeader) {
      const roleStr = roleHeader || 'ORGANISATION_OWNER';
      const orgId = orgHeader || req.user?.primaryOrganisationId || '';
      const outletId = outletHeader || req.user?.primaryOutletId || null;
      return {
        id: userHeader || req.user?.id || 'system_user',
        email: req.user?.email || 'finance@fitcore.io',
        firstName: req.user?.firstName || 'Finance',
        lastName: req.user?.lastName || 'User',
        status: 'ACTIVE',
        roles: [{ role: roleStr, organisationId: orgId, outletId }],
        permissions: [],
        primaryOrganisationId: orgId,
        primaryOutletId: outletId,
        isSuperAdmin: roleHeader ? roleHeader === 'SUPERADMIN' : req.user?.isSuperAdmin || false,
      };
    }
    return req.user;
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Body() body: FinanceChatDto,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    return this.assistantService.chat(user, body);
  }

  @Get('conversations')
  async listConversations(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = this.permissionService.resolveScope(user);
    return this.assistantService.listConversations(scope, user.id);
  }

  @Get('conversations/:id')
  async getConversation(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Param('id') id: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = this.permissionService.resolveScope(user);
    return this.assistantService.getConversation(scope, id, user.id);
  }

  @Get('summary')
  async getSummary(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query('currency') currency?: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = this.permissionService.resolveScope(user);
    this.permissionService.assertCanQueryOrganisationFinances(scope);
    return this.assistantService.getHealthSummary(scope, currency);
  }

  @Get('revenue')
  async getRevenue(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() query: FinanceFilterQueryDto,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = this.permissionService.resolveScope(user, undefined, query.outletId);
    this.permissionService.assertCanQueryOrganisationFinances(scope);
    return this.toolRegistry.getRevenueSummary(scope, query);
  }

  @Get('payments')
  async getPayments(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() query: FinanceFilterQueryDto,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = this.permissionService.resolveScope(user, undefined, query.outletId);
    this.permissionService.assertCanQueryOrganisationFinances(scope);
    return this.toolRegistry.getPaymentSummary(scope, query);
  }

  @Get('invoices')
  async getInvoices(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() query: FinanceFilterQueryDto,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = this.permissionService.resolveScope(user, undefined, query.outletId);
    this.permissionService.assertCanQueryOrganisationFinances(scope);
    return this.toolRegistry.getInvoiceSummary(scope, query);
  }

  @Get('outlets')
  async getOutlets(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() query: FinanceFilterQueryDto,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = this.permissionService.resolveScope(user, undefined, query.outletId);
    this.permissionService.assertCanQueryOrganisationFinances(scope);
    return this.toolRegistry.getOutletRevenue(scope, query);
  }

  @Get('plans')
  async getPlans(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() query: FinanceFilterQueryDto,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = this.permissionService.resolveScope(user, undefined, query.outletId);
    this.permissionService.assertCanQueryOrganisationFinances(scope);
    return this.toolRegistry.getPlanRevenue(scope, query);
  }

  @Get('collections')
  async getCollections(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query('currency') currency?: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = this.permissionService.resolveScope(user);
    this.permissionService.assertCanQueryOrganisationFinances(scope);
    return this.toolRegistry.getRecurringBillingSummary(scope, { currency });
  }

  @Get('refunds')
  async getRefunds(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() query: FinanceFilterQueryDto,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = this.permissionService.resolveScope(user, undefined, query.outletId);
    this.permissionService.assertCanQueryOrganisationFinances(scope);
    return this.toolRegistry.getRefundSummary(scope, query);
  }

  @Get('reconciliation')
  async getReconciliation(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = this.permissionService.resolveScope(user);
    this.permissionService.assertCanQueryOrganisationFinances(scope);
    return this.toolRegistry.getAccountingReconciliationSummary(scope);
  }

  @Get('data-quality')
  async getDataQuality(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = this.permissionService.resolveScope(user);
    this.permissionService.assertCanQueryOrganisationFinances(scope);
    return this.toolRegistry.getFinancialDataQuality(scope);
  }

  @Get('metric-definitions')
  async getMetricDefinitions(
    @Query('metric') metric?: string,
  ) {
    return this.toolRegistry.getFinancialMetricDefinition(metric || 'net_revenue');
  }

  @Post('feedback')
  @HttpCode(HttpStatus.OK)
  async submitFeedback(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Body() body: SubmitFinanceFeedbackDto,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    return this.assistantService.submitFeedback(user, body);
  }
}
