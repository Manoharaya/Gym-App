import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MockSaasBillingProvider } from '../providers/mock-saas-billing.provider';
import {
  CreateSubscriptionDto,
  UpgradeSubscriptionDto,
  DowngradeSubscriptionDto,
  CancelSubscriptionDto,
} from '../dto/saas-billing.dto';
import { SaasProrationService } from '../proration/saas-proration.service';

@Injectable()
export class SaasSubscriptionsService {
  private readonly logger = new Logger(SaasSubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: MockSaasBillingProvider,
    private readonly prorationService: SaasProrationService,
  ) {}

  /**
   * Retrieves active or current SaaS subscription for an organisation.
   */
  async getSubscription(organisationId: string) {
    return this.prisma.saasSubscription.findFirst({
      where: { organisationId },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: true,
        planVersion: {
          include: {
            entitlements: {
              include: { entitlement: true },
            },
          },
        },
      },
    });
  }

  /**
   * Creates a subscription for an organisation.
   */
  async createSubscription(organisationId: string, dto: CreateSubscriptionDto) {
    const org = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
    });
    if (!org) {
      throw new NotFoundException(`Organisation ${organisationId} not found`);
    }

    const plan = await this.prisma.saasPlan.findUnique({
      where: { code: dto.planCode },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });
    if (!plan || plan.versions.length === 0) {
      throw new NotFoundException(`Plan ${dto.planCode} not found`);
    }

    const latestVersion = plan.versions[0];

    // Ensure customer record exists
    let customer = await this.prisma.saasBillingCustomer.findUnique({
      where: { organisationId },
    });

    if (!customer) {
      const custResult = await this.provider.createCustomer({
        organisationId,
        billingEmail: dto.billingEmail || org.contactEmail || 'billing@fitcore.internal',
        billingContactName: dto.billingContactName || org.name,
        currency: dto.currency || plan.currency,
      });

      customer = await this.prisma.saasBillingCustomer.create({
        data: {
          organisationId,
          provider: this.provider.providerName,
          externalCustomerReference: custResult.providerCustomerReference,
          billingEmail: dto.billingEmail || org.contactEmail || 'billing@fitcore.internal',
          billingContactName: dto.billingContactName || org.name,
          currency: dto.currency || plan.currency,
        },
      });
    }

    // Call provider
    const isTrial = dto.startTrial !== false && plan.trialDays > 0;
    const subResult = await this.provider.createSubscription({
      providerCustomerReference: customer.externalCustomerReference,
      planCode: plan.code,
      planVersion: latestVersion.version,
      baseAmountMinor: latestVersion.basePriceMinor,
      currency: latestVersion.currency,
      billingInterval: dto.billingInterval || latestVersion.billingInterval,
      trialDays: isTrial ? plan.trialDays : 0,
    });

    return this.prisma.$transaction(async (tx) => {
      // Mark any prior active subscriptions as EXPIRED
      await tx.saasSubscription.updateMany({
        where: { organisationId, status: { in: ['ACTIVE', 'TRIALING'] } },
        data: { status: 'EXPIRED', endedAt: new Date() },
      });

      const trialStart = isTrial ? subResult.currentPeriodStart : null;
      const trialEnd = isTrial ? subResult.currentPeriodEnd : null;

      const subscription = await tx.saasSubscription.create({
        data: {
          organisationId,
          planId: plan.id,
          planVersionId: latestVersion.id,
          status: isTrial ? 'TRIALING' : 'ACTIVE',
          billingInterval: dto.billingInterval || latestVersion.billingInterval,
          currency: latestVersion.currency,
          baseAmountMinor: latestVersion.basePriceMinor,
          currentPeriodStart: subResult.currentPeriodStart,
          currentPeriodEnd: subResult.currentPeriodEnd,
          trialStart,
          trialEnd,
          provider: this.provider.providerName,
          providerCustomerReference: customer.externalCustomerReference,
          providerSubscriptionReference: subResult.providerSubscriptionReference,
        },
      });

      // Create initial billing period
      await tx.saasBillingPeriod.create({
        data: {
          subscriptionId: subscription.id,
          organisationId,
          periodStart: subResult.currentPeriodStart,
          periodEnd: subResult.currentPeriodEnd,
          status: 'OPEN',
        },
      });

      return tx.saasSubscription.findUnique({
        where: { id: subscription.id },
        include: {
          plan: true,
          planVersion: {
            include: {
              entitlements: {
                include: { entitlement: true },
              },
            },
          },
        },
      });
    });
  }

  /**
   * Upgrades subscription immediately or with proration.
   */
  async upgradeSubscription(organisationId: string, dto: UpgradeSubscriptionDto) {
    const currentSub = await this.getSubscription(organisationId);
    if (!currentSub || !['ACTIVE', 'TRIALING'].includes(currentSub.status)) {
      throw new BadRequestException('No active subscription found to upgrade');
    }

    const targetPlan = await this.prisma.saasPlan.findUnique({
      where: { code: dto.targetPlanCode },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!targetPlan || targetPlan.versions.length === 0) {
      throw new NotFoundException(`Target plan ${dto.targetPlanCode} not found`);
    }

    const targetVersion = targetPlan.versions[0];

    // Compute proration
    const proration = this.prorationService.calculateProration({
      currentPlanCode: currentSub.plan.code,
      targetPlanCode: targetPlan.code,
      currentBasePriceMinor: currentSub.baseAmountMinor,
      targetBasePriceMinor: targetVersion.basePriceMinor,
      currency: currentSub.currency,
      currentPeriodStart: currentSub.currentPeriodStart,
      currentPeriodEnd: currentSub.currentPeriodEnd,
    });

    return this.prisma.$transaction(async (tx) => {
      // If immediate payment is needed, create proration invoice
      if (proration.immediatePaymentRequired && proration.netAdjustmentMinor > 0) {
        const invNumber = `INV-SAAS-${Date.now().toString().slice(-6)}`;
        const invoice = await tx.saasInvoice.create({
          data: {
            organisationId,
            subscriptionId: currentSub.id,
            invoiceNumber: invNumber,
            status: 'PAID', // collected in transaction
            currency: currentSub.currency,
            subtotalMinor: proration.chargeNewMinor,
            discountMinor: proration.unearnedCurrentMinor,
            totalMinor: proration.netAdjustmentMinor,
            amountPaidMinor: proration.netAdjustmentMinor,
            amountDueMinor: 0,
            periodStart: currentSub.currentPeriodStart,
            periodEnd: currentSub.currentPeriodEnd,
            dueDate: new Date(),
            paidAt: new Date(),
          },
        });

        await tx.saasInvoiceLine.create({
          data: {
            invoiceId: invoice.id,
            lineType: 'PRORATION',
            description: `Prorated upgrade from ${currentSub.plan.name} to ${targetPlan.name}`,
            quantity: 1,
            unitPriceMinor: proration.netAdjustmentMinor,
            amountMinor: proration.netAdjustmentMinor,
            currency: currentSub.currency,
          },
        });
      }

      // Update current subscription
      const updated = await tx.saasSubscription.update({
        where: { id: currentSub.id },
        data: {
          planId: targetPlan.id,
          planVersionId: targetVersion.id,
          baseAmountMinor: targetVersion.basePriceMinor,
          status: 'ACTIVE',
        },
        include: {
          plan: true,
          planVersion: {
            include: {
              entitlements: {
                include: { entitlement: true },
              },
            },
          },
        },
      });

      return {
        subscription: updated,
        proration,
      };
    });
  }

  /**
   * Checks resource compliance and downgrades plan.
   * If current resource counts exceed target quotas, downgrades are BLOCKED with actionable reasons.
   */
  async downgradeSubscription(organisationId: string, dto: DowngradeSubscriptionDto) {
    const currentSub = await this.getSubscription(organisationId);
    if (!currentSub || !['ACTIVE', 'TRIALING'].includes(currentSub.status)) {
      throw new BadRequestException('No active subscription found to downgrade');
    }

    const targetPlan = await this.prisma.saasPlan.findUnique({
      where: { code: dto.targetPlanCode },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: {
            entitlements: {
              include: { entitlement: true },
            },
          },
        },
      },
    });

    if (!targetPlan || targetPlan.versions.length === 0) {
      throw new NotFoundException(`Target plan ${dto.targetPlanCode} not found`);
    }

    const targetVersion = targetPlan.versions[0];

    // Check resource compliance against target plan quotas
    const outletCount = await this.prisma.outlet.count({
      where: { organisationId, status: { not: 'DELETED' } },
    });
    const memberCount = await this.prisma.memberProfile.count({
      where: { organisationId },
    });
    const staffCount = await this.prisma.staffProfile.count({
      where: { organisationId, employmentStatus: 'ACTIVE' },
    });

    const conflicts: string[] = [];

    for (const ent of targetVersion.entitlements) {
      if (ent.entitlement.code === 'OUTLET_LIMIT' && ent.includedAllowance > 0) {
        if (outletCount > ent.includedAllowance) {
          conflicts.push(`Active outlets (${outletCount}) exceeds target plan limit (${ent.includedAllowance})`);
        }
      }
      if (ent.entitlement.code === 'MEMBER_LIMIT' && ent.includedAllowance > 0) {
        if (memberCount > ent.includedAllowance) {
          conflicts.push(`Active members (${memberCount}) exceeds target plan limit (${ent.includedAllowance})`);
        }
      }
      if (ent.entitlement.code === 'STAFF_LIMIT' && ent.includedAllowance > 0) {
        if (staffCount > ent.includedAllowance) {
          conflicts.push(`Active staff (${staffCount}) exceeds target plan limit (${ent.includedAllowance})`);
        }
      }
    }

    if (conflicts.length > 0 && !dto.confirmResourceCompliance) {
      return {
        status: 'DOWNGRADE_BLOCKED',
        reasons: conflicts,
        targetPlanCode: targetPlan.code,
      };
    }

    // Apply downgrade
    const updated = await this.prisma.saasSubscription.update({
      where: { id: currentSub.id },
      data: {
        planId: targetPlan.id,
        planVersionId: targetVersion.id,
        baseAmountMinor: targetVersion.basePriceMinor,
      },
      include: {
        plan: true,
        planVersion: {
          include: {
            entitlements: {
              include: { entitlement: true },
            },
          },
        },
      },
    });

    return {
      status: 'DOWNGRADED',
      subscription: updated,
    };
  }

  /**
   * Cancels subscription either immediately or at period end.
   */
  async cancelSubscription(organisationId: string, dto: CancelSubscriptionDto) {
    const currentSub = await this.getSubscription(organisationId);
    if (!currentSub) {
      throw new NotFoundException('Subscription not found');
    }

    const immediate = dto.immediate ?? false;

    await this.provider.cancelSubscription(
      currentSub.providerSubscriptionReference || '',
      immediate,
    );

    return this.prisma.saasSubscription.update({
      where: { id: currentSub.id },
      data: {
        status: immediate ? 'CANCELLED' : 'CANCEL_AT_PERIOD_END',
        cancelAtPeriodEnd: !immediate,
        cancelledAt: new Date(),
        endedAt: immediate ? new Date() : null,
      },
      include: { plan: true },
    });
  }

  /**
   * Reactivates a cancelled or suspended subscription.
   */
  async reactivateSubscription(organisationId: string) {
    const currentSub = await this.getSubscription(organisationId);
    if (!currentSub) {
      throw new NotFoundException('Subscription not found');
    }

    return this.prisma.saasSubscription.update({
      where: { id: currentSub.id },
      data: {
        status: 'ACTIVE',
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      },
      include: { plan: true },
    });
  }
}
