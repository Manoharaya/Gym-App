import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { SaasBillingService } from './saas-billing.service';
import { SaasPlansService } from './plans/saas-plans.service';
import { SaasSubscriptionsService } from './subscriptions/saas-subscriptions.service';
import { SaasUsageService } from './usage/saas-usage.service';
import { SaasUsageLimitService } from './limits/saas-usage-limit.service';
import { SaasInvoicesService } from './invoices/saas-invoices.service';
import { SaasCreditsService } from './credits/saas-credits.service';
import { SaasDunningService } from './dunning/saas-dunning.service';
import { SaasReconciliationService } from './reconciliation/saas-reconciliation.service';
import { MockSaasBillingProvider } from './providers/mock-saas-billing.provider';
import {
  CreateSaasPlanDto,
  CreatePlanVersionDto,
  CreateSubscriptionDto,
  UpgradeSubscriptionDto,
  DowngradeSubscriptionDto,
  CancelSubscriptionDto,
  RecordUsageEventDto,
  UpdateBillingContactDto,
  GrantCreditDto,
} from './dto/saas-billing.dto';

@ApiTags('SaaS Billing & Organisation Plans')
@ApiBearerAuth()
@Controller('saas-billing')
export class SaasBillingController {
  constructor(
    private readonly billingService: SaasBillingService,
    private readonly plansService: SaasPlansService,
    private readonly subscriptionsService: SaasSubscriptionsService,
    private readonly usageService: SaasUsageService,
    private readonly limitService: SaasUsageLimitService,
    private readonly invoicesService: SaasInvoicesService,
    private readonly creditsService: SaasCreditsService,
    private readonly dunningService: SaasDunningService,
    private readonly reconciliationService: SaasReconciliationService,
    private readonly provider: MockSaasBillingProvider,
  ) {}

  private getOrgId(req: RequestWithUser): string {
    return req.tenantContext?.organisationId || req.user?.primaryOrganisationId || '';
  }

  // -------------------------------------------------------------
  // PLANS (Public / Gym visible)
  // -------------------------------------------------------------

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'List public SaaS plans for gyms' })
  async getPlans() {
    return this.plansService.listPlans(false);
  }

  @Public()
  @Get('plans/:idOrCode')
  @ApiOperation({ summary: 'Get SaaS plan details by ID or code' })
  async getPlan(@Param('idOrCode') idOrCode: string) {
    return this.plansService.getPlanByIdOrCode(idOrCode);
  }

  // -------------------------------------------------------------
  // ORGANISATION SUBSCRIPTION & BILLING
  // -------------------------------------------------------------

  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('ORGANISATION_OWNER', 'FINANCE', 'SUPERADMIN')
  @Get('subscription')
  @ApiOperation({ summary: 'Get current organisation SaaS subscription' })
  async getSubscription(@Req() req: RequestWithUser) {
    return this.subscriptionsService.getSubscription(this.getOrgId(req));
  }

  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('ORGANISATION_OWNER', 'SUPERADMIN')
  @Post('subscription')
  @ApiOperation({ summary: 'Create or select SaaS subscription' })
  async createSubscription(
    @Req() req: RequestWithUser,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.subscriptionsService.createSubscription(
      this.getOrgId(req),
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('ORGANISATION_OWNER', 'SUPERADMIN')
  @Post('subscription/upgrade')
  @ApiOperation({ summary: 'Upgrade SaaS subscription with proration' })
  async upgradeSubscription(
    @Req() req: RequestWithUser,
    @Body() dto: UpgradeSubscriptionDto,
  ) {
    return this.subscriptionsService.upgradeSubscription(
      this.getOrgId(req),
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('ORGANISATION_OWNER', 'SUPERADMIN')
  @Post('subscription/downgrade')
  @ApiOperation({ summary: 'Downgrade SaaS subscription with resource conflict validation' })
  async downgradeSubscription(
    @Req() req: RequestWithUser,
    @Body() dto: DowngradeSubscriptionDto,
  ) {
    return this.subscriptionsService.downgradeSubscription(
      this.getOrgId(req),
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('ORGANISATION_OWNER', 'SUPERADMIN')
  @Post('subscription/cancel')
  @ApiOperation({ summary: 'Cancel SaaS subscription' })
  async cancelSubscription(
    @Req() req: RequestWithUser,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.subscriptionsService.cancelSubscription(
      this.getOrgId(req),
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('ORGANISATION_OWNER', 'SUPERADMIN')
  @Post('subscription/reactivate')
  @ApiOperation({ summary: 'Reactivate cancelled SaaS subscription' })
  async reactivateSubscription(@Req() req: RequestWithUser) {
    return this.subscriptionsService.reactivateSubscription(
      this.getOrgId(req),
    );
  }

  // -------------------------------------------------------------
  // BILLING DASHBOARD & OVERVIEW
  // -------------------------------------------------------------

  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('ORGANISATION_OWNER', 'FINANCE', 'SUPERADMIN')
  @Get('overview')
  @ApiOperation({ summary: 'Get SaaS billing dashboard overview' })
  async getOverview(@Req() req: RequestWithUser) {
    return this.billingService.getOrganisationBillingOverview(
      this.getOrgId(req),
    );
  }

  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('ORGANISATION_OWNER', 'FINANCE', 'SUPERADMIN')
  @Get('usage')
  @ApiOperation({ summary: 'Get organisation SaaS usage meters & remaining allowance' })
  async getUsage(@Req() req: RequestWithUser) {
    return this.usageService.getUsageSummary(this.getOrgId(req));
  }

  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('ORGANISATION_OWNER', 'FINANCE', 'SUPERADMIN')
  @Get('usage/limits/:entitlementCode')
  @ApiOperation({ summary: 'Check real-time limit status for entitlement' })
  async checkLimit(
    @Req() req: RequestWithUser,
    @Param('entitlementCode') code: string,
  ) {
    return this.limitService.checkLimit(this.getOrgId(req), code);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('ORGANISATION_OWNER', 'FINANCE', 'SUPERADMIN')
  @Get('invoices')
  @ApiOperation({ summary: 'List organisation SaaS invoices' })
  async listInvoices(@Req() req: RequestWithUser) {
    return this.invoicesService.listInvoices(this.getOrgId(req));
  }

  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('ORGANISATION_OWNER', 'FINANCE', 'SUPERADMIN')
  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get single SaaS invoice' })
  async getInvoice(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    return this.invoicesService.getInvoice(id, this.getOrgId(req));
  }

  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('ORGANISATION_OWNER', 'FINANCE', 'SUPERADMIN')
  @Get('credits')
  @ApiOperation({ summary: 'Get organisation SaaS credits ledger' })
  async getCredits(@Req() req: RequestWithUser) {
    return this.creditsService.getCreditBalance(this.getOrgId(req));
  }

  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('ORGANISATION_OWNER', 'SUPERADMIN')
  @Patch('billing-contact')
  @ApiOperation({ summary: 'Update organisation billing contact & address' })
  async updateBillingContact(
    @Req() req: RequestWithUser,
    @Body() dto: UpdateBillingContactDto,
  ) {
    return this.billingService.updateBillingContact(
      this.getOrgId(req),
      dto,
    );
  }

  // -------------------------------------------------------------
  // USAGE INGESTION
  // -------------------------------------------------------------

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Post('usage/events')
  @ApiOperation({ summary: 'Record idempotent billable usage event' })
  async recordUsageEvent(
    @Req() req: RequestWithUser,
    @Body() dto: RecordUsageEventDto,
  ) {
    return this.usageService.recordUsageEvent(
      this.getOrgId(req),
      dto,
    );
  }

  // -------------------------------------------------------------
  // SUPERADMIN CONTROL PLANE
  // -------------------------------------------------------------

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Get('admin/plans')
  @ApiOperation({ summary: 'Superadmin list all plans including internal and draft' })
  async adminListPlans() {
    return this.plansService.listPlans(true);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Post('admin/plans')
  @ApiOperation({ summary: 'Superadmin create new SaaS plan' })
  async adminCreatePlan(@Body() dto: CreateSaasPlanDto) {
    return this.plansService.createPlan(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Post('admin/plans/:id/versions')
  @ApiOperation({ summary: 'Superadmin create new immutable version of plan' })
  async adminCreatePlanVersion(
    @Param('id') id: string,
    @Body() dto: CreatePlanVersionDto,
  ) {
    return this.plansService.createPlanVersion(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Post('admin/plans/:id/retire')
  @ApiOperation({ summary: 'Superadmin retire a plan' })
  async adminRetirePlan(@Param('id') id: string) {
    return this.plansService.retirePlan(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Get('admin/revenue')
  @ApiOperation({ summary: 'Superadmin SaaS revenue, MRR, ARR, and health metrics' })
  async adminGetRevenue() {
    return this.billingService.getSuperadminBillingMetrics();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Post('admin/dunning/process')
  @ApiOperation({ summary: 'Trigger SaaS dunning & collection workflow' })
  async adminProcessDunning() {
    return this.dunningService.processDunningCycle();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Get('admin/reconciliation')
  @ApiOperation({ summary: 'Run SaaS billing provider reconciliation' })
  async adminReconciliation() {
    return this.reconciliationService.runReconciliation();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Post('admin/credits/:organisationId')
  @ApiOperation({ summary: 'Grant account credit to organisation' })
  async adminGrantCredit(
    @Param('organisationId') orgId: string,
    @Body() dto: GrantCreditDto,
    @Req() req: RequestWithUser,
  ) {
    return this.creditsService.grantCredit(orgId, dto, req.user?.id);
  }

  // -------------------------------------------------------------
  // WEBHOOK ADAPTER
  // -------------------------------------------------------------

  @Public()
  @Post('webhooks/:provider')
  @ApiOperation({ summary: 'Receive SaaS billing provider webhooks' })
  async handleWebhook(
    @Param('provider') providerName: string,
    @Req() req: any,
  ) {
    const rawBody = req.body;
    const headers = req.headers;
    const verified = await this.provider.verifyWebhook(headers, rawBody);
    return {
      received: true,
      valid: verified.isValid,
      eventId: verified.event?.eventId,
    };
  }
}
