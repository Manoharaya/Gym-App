/**
 * FitCore — Day 42: Recurring Billing & Collections Controller
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Headers,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  RecurringBillingPermissions,
  BillingRequestUser,
} from '../domain/recurring-billing.permissions';
import { BillingScheduleService } from '../services/billing-schedule.service';
import { BillingCycleService } from '../services/billing-cycle.service';
import { RecurringPaymentService } from '../services/recurring-payment.service';
import { DunningService } from '../services/dunning.service';
import { CollectionQueueService } from '../services/collection-queue.service';
import { RetryPolicyService } from '../services/retry-policy.service';
import { RecurringMetricsService } from '../services/recurring-metrics.service';
import { CreateBillingScheduleDtoInput } from '../dto/create-schedule.dto';
import { UpdateBillingScheduleDtoInput } from '../dto/update-schedule.dto';
import {
  BillingScheduleFilterDto,
  BillingCycleFilterDto,
  DunningFilterDto,
  CollectionFilterDto,
} from '../dto/schedule-filter.dto';
import { ResolveDunningInputDto, AssignStaffTaskInputDto } from '../dto/dunning-action.dto';
import { UpdateBillingPolicyInputDto } from '../dto/billing-policy.dto';

@Controller('recurring-billing')
@UseGuards(JwtAuthGuard)
export class RecurringBillingController {
  constructor(
    private readonly scheduleService: BillingScheduleService,
    private readonly cycleService: BillingCycleService,
    private readonly paymentService: RecurringPaymentService,
    private readonly dunningService: DunningService,
    private readonly collectionQueueService: CollectionQueueService,
    private readonly retryPolicyService: RetryPolicyService,
    private readonly metricsService: RecurringMetricsService,
  ) {}

  private resolveUser(
    req: any,
    orgHeader?: string,
    userHeader?: string,
    roleHeader?: string,
    outletHeader?: string,
  ): BillingRequestUser {
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
  // Schedules
  // ---------------------------------------------------------------------------

  @Post('schedules')
  @HttpCode(HttpStatus.CREATED)
  async createSchedule(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Body() body: CreateBillingScheduleDtoInput,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = RecurringBillingPermissions.resolveAdminScope(user, body.originOutletId);
    return this.scheduleService.createSchedule(scope.organisationId, body, user.id);
  }

  @Get('schedules')
  async listSchedules(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filter: BillingScheduleFilterDto,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = RecurringBillingPermissions.resolveAdminScope(user, filter.outletId);
    return this.scheduleService.listSchedules(scope, filter);
  }

  @Get('schedules/:id')
  async getScheduleById(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Param('id') id: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = RecurringBillingPermissions.resolveAdminScope(user);
    return this.scheduleService.getScheduleById(scope.organisationId, id);
  }

  @Patch('schedules/:id')
  async updateSchedule(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Param('id') id: string,
    @Body() body: UpdateBillingScheduleDtoInput,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = RecurringBillingPermissions.resolveAdminScope(user);
    return this.scheduleService.updateSchedule(scope.organisationId, id, body, user.id);
  }

  @Post('schedules/:id/pause')
  @HttpCode(HttpStatus.OK)
  async pauseSchedule(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Param('id') id: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = RecurringBillingPermissions.resolveAdminScope(user);
    return this.scheduleService.pauseSchedule(scope.organisationId, id, user.id);
  }

  @Post('schedules/:id/resume')
  @HttpCode(HttpStatus.OK)
  async resumeSchedule(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Param('id') id: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = RecurringBillingPermissions.resolveAdminScope(user);
    return this.scheduleService.resumeSchedule(scope.organisationId, id, user.id);
  }

  @Post('schedules/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSchedule(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Param('id') id: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = RecurringBillingPermissions.resolveAdminScope(user);
    return this.scheduleService.cancelSchedule(scope.organisationId, id, user.id);
  }

  @Post('schedules/generate-cycles')
  @HttpCode(HttpStatus.OK)
  async generateDueCycles(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = RecurringBillingPermissions.resolveAdminScope(user);
    return this.cycleService.processDueSchedules(scope.organisationId, 50, user.id);
  }

  // ---------------------------------------------------------------------------
  // Cycles
  // ---------------------------------------------------------------------------

  @Get('cycles')
  async listCycles(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filter: BillingCycleFilterDto,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = RecurringBillingPermissions.resolveAdminScope(user);
    return this.cycleService.listCycles(scope, filter);
  }

  @Get('cycles/:id')
  async getCycleById(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Param('id') id: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = RecurringBillingPermissions.resolveAdminScope(user);
    return this.cycleService.getCycleById(scope.organisationId, id);
  }

  @Post('cycles/:id/collect')
  @HttpCode(HttpStatus.OK)
  async collectPaymentForCycle(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Param('id') id: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = RecurringBillingPermissions.resolveAdminScope(user);
    await this.cycleService.getCycleById(scope.organisationId, id);
    return this.paymentService.collectPaymentForCycle(id, user.id);
  }

  // ---------------------------------------------------------------------------
  // Dunning
  // ---------------------------------------------------------------------------

  @Get('dunning')
  async listDunningCases(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filter: DunningFilterDto,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = RecurringBillingPermissions.resolveAdminScope(user);
    return this.dunningService.listDunningCases(scope, filter);
  }

  @Get('dunning/:id')
  async getDunningCaseById(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Param('id') id: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = RecurringBillingPermissions.resolveAdminScope(user);
    return this.dunningService.getDunningCaseById(scope.organisationId, id);
  }

  @Post('dunning/:id/retry')
  @HttpCode(HttpStatus.OK)
  async retryDunningPayment(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Param('id') id: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = RecurringBillingPermissions.resolveAdminScope(user);
    const dunningCase = await this.dunningService.getDunningCaseById(scope.organisationId, id);
    return this.paymentService.collectPaymentForCycle(dunningCase.billingCycleId, user.id);
  }

  @Post('dunning/:id/resolve')
  @HttpCode(HttpStatus.OK)
  async resolveDunningCase(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Param('id') id: string,
    @Body() body: ResolveDunningInputDto,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = RecurringBillingPermissions.resolveAdminScope(user);
    const dunningCase = await this.dunningService.getDunningCaseById(scope.organisationId, id);
    await this.dunningService.resolveDunningForCycle(
      dunningCase.billingCycleId,
      body.resolutionType,
      body.notes,
      user.id,
    );
    return { success: true, message: `Dunning case resolved via ${body.resolutionType}` };
  }

  // ---------------------------------------------------------------------------
  // Collections Queue
  // ---------------------------------------------------------------------------

  @Get('collections')
  async getCollectionQueue(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Query() filter: CollectionFilterDto,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = RecurringBillingPermissions.resolveAdminScope(user, filter.outletId);
    return this.collectionQueueService.getCollectionQueue(scope, filter);
  }

  @Post('collections/:id/assign')
  @HttpCode(HttpStatus.OK)
  async assignCollectionTask(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Headers('x-outlet-id') outletHeader: string,
    @Param('id') id: string,
    @Body() body: AssignStaffTaskInputDto,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader, outletHeader);
    const scope = RecurringBillingPermissions.resolveAdminScope(user);
    return this.collectionQueueService.assignTask(
      scope.organisationId,
      id,
      body.assignedStaffId,
      user.id,
    );
  }

  // ---------------------------------------------------------------------------
  // Policies
  // ---------------------------------------------------------------------------

  @Get('policies')
  async getPolicy(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = RecurringBillingPermissions.resolveAdminScope(user);
    return this.retryPolicyService.getPolicy(scope.organisationId);
  }

  @Patch('policies')
  async updatePolicy(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Body() body: UpdateBillingPolicyInputDto,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = RecurringBillingPermissions.resolveAdminScope(user);
    return this.retryPolicyService.updatePolicy(scope.organisationId, body);
  }

  // ---------------------------------------------------------------------------
  // Metrics
  // ---------------------------------------------------------------------------

  @Get('metrics')
  async getMetrics(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Query('currency') currency?: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = RecurringBillingPermissions.resolveAdminScope(user);
    return this.metricsService.getMetrics(scope, currency || 'AUD');
  }
}
