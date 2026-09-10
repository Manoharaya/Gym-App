/**
 * FitCore — Day 42: Member Self-Billing Controller
 *
 * Scoped exclusively to the authenticated member. Member cannot access
 * other members' invoices, attempts, or schedules.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  RecurringBillingPermissions,
  BillingRequestUser,
} from '../domain/recurring-billing.permissions';
import { BillingScheduleService } from '../services/billing-schedule.service';
import { RecurringMetricsService } from '../services/recurring-metrics.service';
import { PrismaService } from '../../database/prisma.service';
import { IsString, IsNotEmpty } from 'class-validator';

class UpdatePaymentMethodInput {
  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;
}

@Controller('me/billing')
@UseGuards(JwtAuthGuard)
export class MemberBillingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleService: BillingScheduleService,
    private readonly metricsService: RecurringMetricsService,
  ) {}

  private resolveUser(
    req: any,
    orgHeader?: string,
    userHeader?: string,
    roleHeader?: string,
  ): BillingRequestUser {
    return {
      id: userHeader || req.user?.id || 'system_user',
      organisationId: orgHeader || req.user?.primaryOrganisationId,
      role: roleHeader || 'MEMBER',
      roles: roleHeader ? [roleHeader] : ['MEMBER'],
      memberProfileId: userHeader || (req.user as any)?.memberProfileId || req.user?.id,
    };
  }

  @Get('status')
  async getStatus(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = RecurringBillingPermissions.resolveMemberScope(user);
    const memberProfile = await this.resolveMemberProfile(scope);
    return this.metricsService.getMemberBillingStatus(scope.organisationId, memberProfile.id);
  }

  @Get('schedule')
  async getSchedule(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = RecurringBillingPermissions.resolveMemberScope(user);
    const memberProfile = await this.resolveMemberProfile(scope);

    const schedule = await this.prisma.billingSchedule.findFirst({
      where: {
        organisationId: scope.organisationId,
        memberProfileId: memberProfile.id,
        status: { in: ['ACTIVE', 'PAST_DUE', 'PAUSED'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        membershipPlan: true,
        paymentMethod: true,
      },
    });

    if (!schedule) {
      return { schedule: null };
    }

    return {
      schedule: await this.scheduleService.getScheduleById(scope.organisationId, schedule.id),
    };
  }

  @Get('invoices')
  async getInvoices(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = RecurringBillingPermissions.resolveMemberScope(user);
    const memberProfile = await this.resolveMemberProfile(scope);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        organisationId: scope.organisationId,
        memberProfileId: memberProfile.id,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        lineItems: true,
      },
    });

    return {
      invoices: invoices.map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        status: i.status,
        currency: i.currency,
        totalMinor: i.totalMinor,
        total: i.totalMinor / 100,
        amountPaidMinor: i.amountPaidMinor,
        amountDueMinor: i.amountDueMinor,
        dueDate: i.dueDate.toISOString(),
        issuedAt: i.issuedAt.toISOString(),
      })),
    };
  }

  @Get('payment-attempts')
  async getPaymentAttempts(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = RecurringBillingPermissions.resolveMemberScope(user);
    const memberProfile = await this.resolveMemberProfile(scope);

    const attempts = await this.prisma.paymentAttempt.findMany({
      where: {
        organisationId: scope.organisationId,
        billingCycle: {
          memberProfileId: memberProfile.id,
        },
      },
      orderBy: { attemptedAt: 'desc' },
      take: 20,
    });

    return {
      attempts: attempts.map((a) => ({
        id: a.id,
        attemptNumber: a.attemptNumber,
        attemptedAt: a.attemptedAt.toISOString(),
        status: a.status,
        failureCategory: a.failureCategory,
        nextRetryAt: a.nextRetryAt?.toISOString() || null,
      })),
    };
  }

  @Post('payment-method')
  @HttpCode(HttpStatus.OK)
  async updatePaymentMethod(
    @Req() req: any,
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-user-id') userHeader: string,
    @Headers('x-role') roleHeader: string,
    @Body() body: UpdatePaymentMethodInput,
  ) {
    const user = this.resolveUser(req, orgHeader, userHeader, roleHeader);
    const scope = RecurringBillingPermissions.resolveMemberScope(user);
    const memberProfile = await this.resolveMemberProfile(scope);

    // Validate payment method belongs to member
    const pm = await this.prisma.paymentMethod.findFirst({
      where: {
        id: body.paymentMethodId,
        organisationId: scope.organisationId,
        memberProfileId: memberProfile.id,
        status: 'ACTIVE',
      },
    });

    if (!pm) {
      throw new BadRequestException('Payment method is invalid or does not belong to user');
    }

    const schedule = await this.prisma.billingSchedule.findFirst({
      where: {
        organisationId: scope.organisationId,
        memberProfileId: memberProfile.id,
        status: { in: ['ACTIVE', 'PAST_DUE'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!schedule) {
      throw new NotFoundException('No active billing schedule found for member');
    }

    const updated = await this.scheduleService.updateSchedule(
      scope.organisationId,
      schedule.id,
      { paymentMethodId: pm.id },
      user.id,
    );

    return { success: true, schedule: updated };
  }

  private async resolveMemberProfile(scope: any) {
    const memberProfile = await this.prisma.memberProfile.findFirst({
      where: {
        organisationId: scope.organisationId,
        OR: [
          { id: scope.memberProfileId },
          { userId: scope.memberProfileId },
        ],
      },
    });

    if (!memberProfile) {
      throw new NotFoundException('Member profile not found');
    }

    return memberProfile;
  }
}
