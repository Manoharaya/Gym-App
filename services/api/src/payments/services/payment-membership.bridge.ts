import { Injectable, Logger } from '@nestjs/common';
import { MembershipLifecycleService } from '../../memberships/membership-lifecycle.service';
import { MembershipRenewalService } from '../../memberships/membership-renewal.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PaymentMembershipBridge {
  private readonly logger = new Logger(PaymentMembershipBridge.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycleService: MembershipLifecycleService,
    private readonly renewalService: MembershipRenewalService
  ) {}

  /**
   * Called when an invoice linked to a member membership is paid.
   * Invokes the membership domain state machine in a controlled manner.
   */
  async onInvoicePaid(invoiceId: string): Promise<void> {
    const lineItems = await this.prisma.invoiceLineItem.findMany({
      where: { invoiceId },
      include: { invoice: true },
    });

    for (const item of lineItems) {
      if (!item.memberMembershipId) continue;

      const membership = await this.prisma.memberMembership.findUnique({
        where: { id: item.memberMembershipId },
        include: { memberProfile: true },
      });

      if (!membership) {
        this.logger.warn(
          `Line item ${item.id} references non-existent membership ${item.memberMembershipId}`
        );
        continue;
      }

      const actorUserId = membership.memberProfile.userId;

      // If pending, activate via state machine
      if (membership.status === 'PENDING') {
        this.logger.log(
          `Activating membership ${membership.id} upon payment confirmation for invoice ${item.invoice.invoiceNumber}`
        );
        try {
          await this.lifecycleService.activate(
            membership.id,
            { id: actorUserId, role: 'SYSTEM' },
            `Payment confirmed via invoice ${item.invoice.invoiceNumber}`
          );
        } catch (err: any) {
          this.logger.error(
            `Failed to activate membership ${membership.id}: ${err.message}`,
            err.stack
          );
        }
      } else if (membership.status === 'EXPIRED' && membership.autoRenew) {
        // If expired and renewal is configured
        this.logger.log(
          `Renewing expired membership ${membership.id} upon invoice payment confirmation`
        );
        try {
          await this.renewalService.renewMembership(
            membership.id,
            { id: actorUserId, role: 'SYSTEM' },
            `Automatic renewal via invoice payment ${item.invoice.invoiceNumber}`
          );
        } catch (err: any) {
          this.logger.error(
            `Failed to renew membership ${membership.id}: ${err.message}`,
            err.stack
          );
        }
      }
    }
  }
}
