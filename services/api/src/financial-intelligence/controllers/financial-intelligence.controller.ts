import {
  Controller,
  Get,
  Post,
  HttpCode,
  Query,
  Headers,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FinancialIntelligenceService } from '../services/financial-intelligence.service';
import { FinancialFilterDto } from '../dto/financial-filter.dto';
import { FinancialRequestUser } from '../domain/financial-intelligence.permissions';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('financial-intelligence')
@UseGuards(JwtAuthGuard)
export class FinancialIntelligenceController {
  constructor(private readonly service: FinancialIntelligenceService) {}

  private resolveUser(
    orgHeader?: string,
    userHeader?: string,
    roleHeader?: string,
    outletHeader?: string,
  ): FinancialRequestUser {
    return {
      id: userHeader || 'system_user',
      organisationId: orgHeader,
      role: roleHeader || 'ORGANISATION_OWNER',
      roles: roleHeader ? [roleHeader] : ['ORGANISATION_OWNER'],
      outletId: outletHeader,
      outletIds: outletHeader ? [outletHeader] : [],
    };
  }

  @Get('overview')
  async getOverview(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: FinancialFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getOverview(user, filters);
  }

  @Get('revenue')
  async getRevenue(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: FinancialFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    const overview = await this.service.getOverview(user, filters);
    return {
      period: overview.period,
      currencies: overview.currencies.map((c) => ({
        currency: c.currency,
        grossRevenue: c.grossRevenue,
        grossRevenueMinor: c.grossRevenueMinor,
        refunds: c.refunds,
        refundsMinor: c.refundsMinor,
        netRevenue: c.netRevenue,
        netRevenueMinor: c.netRevenueMinor,
      })),
      kpis: {
        grossRevenue: overview.kpis.grossRevenue,
        refunds: overview.kpis.refunds,
        netRevenue: overview.kpis.netRevenue,
      },
    };
  }

  @Get('payments')
  async getPayments(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: FinancialFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    const overview = await this.service.getOverview(user, filters);
    return {
      period: overview.period,
      currencies: overview.currencies.map((c) => ({
        currency: c.currency,
        successfulPayments: c.successfulPayments,
        failedPayments: c.failedPayments,
        paymentSuccessRate: c.paymentSuccessRate,
        averageTransactionValue: c.averageTransactionValue,
      })),
      kpis: {
        successfulPayments: overview.kpis.successfulPayments,
        failedPayments: overview.kpis.failedPayments,
      },
    };
  }

  @Get('invoices')
  async getInvoices(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: FinancialFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getInvoices(user, filters);
  }

  @Get('refunds')
  async getRefunds(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: FinancialFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getRefunds(user, filters);
  }

  @Get('membership-revenue')
  async getMembershipRevenue(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: FinancialFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    const [overview, planBreakdown] = await Promise.all([
      this.service.getOverview(user, filters),
      this.service.getPlanPerformance(user, filters),
    ]);

    return {
      period: overview.period,
      membershipRevenue: overview.kpis.membershipRevenue,
      plans: planBreakdown,
    };
  }

  @Get('outlets')
  async getOutlets(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: FinancialFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getOutletPerformance(user, filters);
  }

  @Get('plans')
  async getPlans(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: FinancialFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getPlanPerformance(user, filters);
  }

  @Get('trends')
  async getTrends(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: FinancialFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getRevenueTrends(user, filters);
  }

  @Get(['transactions', 'drill-down'])
  async getTransactions(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: FinancialFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getTransactionsDrillDown(user, filters);
  }

  @Get(['metric-definitions', 'definitions'])
  getMetricDefinitions() {
    return this.service.getMetricDefinitions();
  }

  @Get('data-quality')
  async getDataQuality(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.assessDataQuality(user);
  }

  @Get('reconciliation')
  async getReconciliation(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query('currency') currency?: string,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.runReconciliation(user, currency);
  }

  @Post('reconciliation/sync')
  @HttpCode(200)
  async syncReconciliation(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.syncProjections(user);
  }

  @Get('context')
  async getFinancialContext(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: FinancialFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.buildFinancialContext(user, filters);
  }

  @Get('export')
  async exportCsv(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: FinancialFilterDto,
    @Res() res: Response,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    const csv = await this.service.exportTransactionsCsv(user, filters);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="financial_transactions.csv"');
    return res.status(200).send(csv);
  }

  @Get(['me', 'member/my-finances'])
  async getMemberSelfHistory(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filters: FinancialFilterDto,
  ) {
    const user = this.resolveUser(orgHeader, userHeader, roleHeader, outletHeader);
    return this.service.getMemberSelfHistory(user, filters);
  }
}
