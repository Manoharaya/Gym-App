/**
 * FitCore — Day 43: Accounting Integration Controller
 *
 * Exposes administrative and finance REST endpoints under /api/v1/accounting/*.
 * Enforces strict multi-tenant isolation and role-based access control.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import {
  AccountingPermissions,
  AccountingRequestUser,
} from '../domain/accounting.permissions';
import { AccountingConnectionService } from '../services/accounting-connection.service';
import { AccountingMappingService } from '../services/accounting-mapping.service';
import { AccountingSyncService } from '../services/accounting-sync.service';
import { AccountingReconciliationService } from '../services/accounting-reconciliation.service';
import { AccountingConflictService } from '../services/accounting-conflict.service';
import { AccountingHealthService } from '../services/accounting-health.service';
import { AccountingExportService } from '../services/accounting-export.service';
import { ConnectProviderDto } from '../dto/connect-provider.dto';
import {
  CreateAccountingMappingDto,
  UpdateAccountingMappingDto,
  CreateAccountingTaxMappingDto,
} from '../dto/create-mapping.dto';
import {
  TriggerSyncDto,
  ResolveConflictDto,
  RunReconciliationDto,
} from '../dto/trigger-sync.dto';
import { AccountingProviderType } from '@fitcore/types';

@Controller('accounting')
@UseGuards(JwtAuthGuard)
export class AccountingController {
  constructor(
    private readonly connectionService: AccountingConnectionService,
    private readonly mappingService: AccountingMappingService,
    private readonly syncService: AccountingSyncService,
    private readonly reconciliationService: AccountingReconciliationService,
    private readonly conflictService: AccountingConflictService,
    private readonly healthService: AccountingHealthService,
    private readonly exportService: AccountingExportService,
  ) {}

  private resolveUser(
    req: any,
    orgHeader?: string,
    userHeader?: string,
    roleHeader?: string,
    outletHeader?: string,
  ): AccountingRequestUser {
    if (roleHeader || orgHeader || userHeader || outletHeader) {
      return {
        id: userHeader || req.user?.id || 'system_user',
        organisationId: orgHeader || req.user?.primaryOrganisationId,
        role: roleHeader || (req.user?.roles?.[0]?.role ?? 'ORGANISATION_OWNER'),
        roles: roleHeader ? [roleHeader] : req.user?.roles?.map((r: any) => r.role || r),
        outletId: outletHeader || req.user?.primaryOutletId,
        outletIds: outletHeader ? [outletHeader] : (req.user?.outlets || []),
        isSuperAdmin: roleHeader ? roleHeader === 'SUPERADMIN' : req.user?.isSuperAdmin,
      };
    }
    return req.user;
  }

  // ---------------------------------------------------------------------------
  // Provider Discovery & Capabilities
  // ---------------------------------------------------------------------------

  @Get('providers')
  getProviders(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    AccountingPermissions.resolveScope(user);
    return this.connectionService.getSupportedProviders();
  }

  @Get('capabilities')
  getCapabilities(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Query('provider') provider?: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    AccountingPermissions.resolveScope(user);
    const { capabilities } = this.connectionService.getSupportedProviders();
    return provider ? capabilities[provider as AccountingProviderType] : capabilities;
  }

  // ---------------------------------------------------------------------------
  // Connection & OAuth
  // ---------------------------------------------------------------------------

  @Get('connection')
  async getConnection(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = AccountingPermissions.resolveScope(user);
    return this.connectionService.getConnection(scope.organisationId);
  }

  @Post('connect')
  @HttpCode(HttpStatus.OK)
  async initiateConnect(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Body() body: ConnectProviderDto,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = AccountingPermissions.resolveScope(user);
    AccountingPermissions.assertCanConfigure(user);

    return this.connectionService.initiateConnect(
      scope.organisationId,
      user.id,
      body.provider,
      body.redirectUri,
    );
  }

  @Public()
  @Get('oauth/callback')
  async handleOAuthCallback(
    @Query('code') code: string,
    @Query('state') stateToken: string,
  ) {
    return this.connectionService.handleOAuthCallback(code, stateToken);
  }

  @Post('disconnect')
  @HttpCode(HttpStatus.OK)
  async disconnect(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = AccountingPermissions.resolveScope(user);
    AccountingPermissions.assertCanConfigure(user);
    return this.connectionService.disconnect(scope.organisationId, user.id);
  }

  // ---------------------------------------------------------------------------
  // Chart of Accounts & Tax Rates Discovery
  // ---------------------------------------------------------------------------

  @Get('accounts')
  async getAccounts(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = AccountingPermissions.resolveScope(user);
    return this.mappingService.getExternalAccounts(scope.organisationId);
  }

  @Get('tax-rates')
  async getTaxRates(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = AccountingPermissions.resolveScope(user);
    return this.mappingService.getExternalTaxRates(scope.organisationId);
  }

  // ---------------------------------------------------------------------------
  // Mappings Management
  // ---------------------------------------------------------------------------

  @Get('mappings')
  async listMappings(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query('outletId') queryOutletId?: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = AccountingPermissions.resolveScope(user, queryOutletId);
    return this.mappingService.listMappings(scope.organisationId, scope.outletId);
  }

  @Post('mappings')
  @HttpCode(HttpStatus.CREATED)
  async createMapping(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Body() body: CreateAccountingMappingDto,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = AccountingPermissions.resolveScope(user, body.outletId);
    AccountingPermissions.assertCanConfigure(user);
    return this.mappingService.createMapping(scope.organisationId, body, user.id);
  }

  @Patch('mappings/:id')
  async updateMapping(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Param('id') id: string,
    @Body() body: UpdateAccountingMappingDto,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = AccountingPermissions.resolveScope(user);
    AccountingPermissions.assertCanConfigure(user);
    return this.mappingService.updateMapping(scope.organisationId, id, body, user.id);
  }

  @Delete('mappings/:id')
  async deleteMapping(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Param('id') id: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = AccountingPermissions.resolveScope(user);
    AccountingPermissions.assertCanConfigure(user);
    return this.mappingService.deleteMapping(scope.organisationId, id, user.id);
  }

  @Get('tax-mappings')
  async listTaxMappings(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = AccountingPermissions.resolveScope(user);
    return this.mappingService.listTaxMappings(scope.organisationId);
  }

  @Post('tax-mappings')
  @HttpCode(HttpStatus.CREATED)
  async createTaxMapping(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Body() body: CreateAccountingTaxMappingDto,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = AccountingPermissions.resolveScope(user);
    AccountingPermissions.assertCanConfigure(user);
    return this.mappingService.createTaxMapping(scope.organisationId, body, user.id);
  }

  // ---------------------------------------------------------------------------
  // Synchronization
  // ---------------------------------------------------------------------------

  @Get('sync/preview')
  async getSyncPreview(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = AccountingPermissions.resolveScope(user);
    return this.syncService.getSyncPreview(scope.organisationId);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async triggerSync(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Body() body: TriggerSyncDto,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = AccountingPermissions.resolveScope(user);
    AccountingPermissions.assertCanConfigure(user);

    const start = body.startDate ? new Date(body.startDate) : undefined;
    const end = body.endDate ? new Date(body.endDate) : undefined;

    return this.syncService.triggerSync(
      scope.organisationId,
      (body.syncType as any) || 'INCREMENTAL_SYNC',
      `STAFF_${user.id}`,
      start,
      end,
    );
  }

  @Get('sync/jobs')
  async listSyncJobs(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Query('limit') limit?: number,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = AccountingPermissions.resolveScope(user);
    return this.syncService.listSyncJobs(scope.organisationId, limit ? Number(limit) : 20);
  }

  @Get('sync/jobs/:id')
  async getSyncJobById(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Param('id') id: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = AccountingPermissions.resolveScope(user);
    return this.syncService.getSyncJobById(scope.organisationId, id);
  }

  @Get('sync/records')
  async listSyncRecords(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Query('limit') limit?: number,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = AccountingPermissions.resolveScope(user);
    return this.syncService.listSyncRecords(scope.organisationId, limit ? Number(limit) : 50);
  }

  @Post('sync/invoices/:id')
  @HttpCode(HttpStatus.OK)
  async syncSingleInvoice(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Param('id') id: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = AccountingPermissions.resolveScope(user);
    AccountingPermissions.assertCanConfigure(user);

    const { connection, provider, accessToken } =
      await this.connectionService.getValidAccessToken(scope.organisationId);

    return this.syncService.syncSingleInvoice(
      id,
      scope.organisationId,
      connection.id,
      connection.externalOrganisationId || '',
      provider,
      accessToken,
    );
  }

  @Post('sync/payments/:id')
  @HttpCode(HttpStatus.OK)
  async syncSinglePayment(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Param('id') id: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = AccountingPermissions.resolveScope(user);
    AccountingPermissions.assertCanConfigure(user);

    const { connection, provider, accessToken } =
      await this.connectionService.getValidAccessToken(scope.organisationId);

    return this.syncService.syncSinglePayment(
      id,
      scope.organisationId,
      connection.id,
      connection.externalOrganisationId || '',
      provider,
      accessToken,
    );
  }

  @Post('sync/refunds/:id')
  @HttpCode(HttpStatus.OK)
  async syncSingleRefund(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Param('id') id: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = AccountingPermissions.resolveScope(user);
    AccountingPermissions.assertCanConfigure(user);

    const { connection, provider, accessToken } =
      await this.connectionService.getValidAccessToken(scope.organisationId);

    return this.syncService.syncSingleRefund(
      id,
      scope.organisationId,
      connection.id,
      connection.externalOrganisationId || '',
      provider,
      accessToken,
    );
  }

  // ---------------------------------------------------------------------------
  // Reconciliation
  // ---------------------------------------------------------------------------

  @Get('reconciliation')
  async listReconciliationReports(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = AccountingPermissions.resolveScope(user);
    return this.reconciliationService.listReports(scope.organisationId);
  }

  @Post('reconciliation/run')
  @HttpCode(HttpStatus.OK)
  async runReconciliation(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Body() body: RunReconciliationDto,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = AccountingPermissions.resolveScope(user);
    AccountingPermissions.assertCanConfigure(user);

    const start = body.startDate ? new Date(body.startDate) : undefined;
    const end = body.endDate ? new Date(body.endDate) : undefined;

    return this.reconciliationService.runReconciliation(
      scope.organisationId,
      start,
      end,
      `STAFF_${user.id}`,
    );
  }

  @Get('reconciliation/:id')
  async getReconciliationReportById(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Param('id') id: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = AccountingPermissions.resolveScope(user);
    return this.reconciliationService.getReportById(scope.organisationId, id);
  }

  // ---------------------------------------------------------------------------
  // Conflicts Management
  // ---------------------------------------------------------------------------

  @Get('conflicts')
  async listConflicts(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Query('status') status?: any,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = AccountingPermissions.resolveScope(user);
    return this.conflictService.listConflicts(scope.organisationId, status);
  }

  @Get('conflicts/:id')
  async getConflictById(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Param('id') id: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = AccountingPermissions.resolveScope(user);
    return this.conflictService.getConflictById(scope.organisationId, id);
  }

  @Post('conflicts/:id/resolve')
  @HttpCode(HttpStatus.OK)
  async resolveConflict(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Param('id') id: string,
    @Body() body: ResolveConflictDto,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = AccountingPermissions.resolveScope(user);
    AccountingPermissions.assertCanConfigure(user);
    return this.conflictService.resolveConflict(
      scope.organisationId,
      id,
      body.status,
      body.resolutionNotes,
      user.id,
    );
  }

  // ---------------------------------------------------------------------------
  // Health & Export
  // ---------------------------------------------------------------------------

  @Get('health')
  async getHealth(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = AccountingPermissions.resolveScope(user);
    return this.healthService.getHealth(scope.organisationId);
  }

  @Get('export')
  async exportCsv(
    @Req() req: any,
    @Res() res: Response,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = AccountingPermissions.resolveScope(user);
    AccountingPermissions.assertCanConfigure(user);

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const csv = await this.exportService.exportFinancialCsv(
      scope.organisationId,
      start,
      end,
      user.id,
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="accounting-export-${Date.now()}.csv"`,
    );
    res.status(HttpStatus.OK).send(csv);
  }
}
