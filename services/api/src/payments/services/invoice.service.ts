import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { BillingCalculationService, LineItemInput } from './billing-calculation.service';
import { PaymentMembershipBridge } from './payment-membership.bridge';
import { MoneyUtil } from '../utils/money.util';
import * as crypto from 'crypto';

export interface CreateInvoiceInput {
  organisationId: string;
  memberProfileId: string;
  currency?: string;
  dueDate?: Date;
  notes?: string;
  discountCode?: string;
  taxRatePercentage?: number;
  feeMinor?: number;
  items: LineItemInput[];
  idempotencyKey?: string;
}

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly calculationService: BillingCalculationService,
    private readonly membershipBridge: PaymentMembershipBridge
  ) {}

  private async generateInvoiceNumber(organisationId: string): Promise<string> {
    const now = new Date();
    const prefix = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = await this.prisma.invoice.count({
      where: { organisationId },
    });
    const seq = String(count + 1).padStart(4, '0');
    const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `${prefix}-${seq}-${randomSuffix}`;
  }

  async createInvoice(input: CreateInvoiceInput, actorId: string) {
    const member = await this.prisma.memberProfile.findFirst({
      where: { id: input.memberProfileId, organisationId: input.organisationId },
    });

    if (!member) {
      throw new NotFoundException('Member profile not found in organisation');
    }

    let invoiceDiscountMinor = 0;
    let appliedDiscount: any = null;

    if (input.discountCode) {
      const discount = await this.prisma.discount.findFirst({
        where: {
          organisationId: input.organisationId,
          code: input.discountCode.toUpperCase(),
          active: true,
        },
      });

      if (!discount) {
        throw new BadRequestException(`Discount code '${input.discountCode}' is invalid or inactive`);
      }

      if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
        throw new BadRequestException(`Discount code '${input.discountCode}' usage limit has been reached`);
      }

      if (discount.endsAt && discount.endsAt < new Date()) {
        throw new BadRequestException(`Discount code '${input.discountCode}' has expired`);
      }

      appliedDiscount = discount;
      if (discount.type === 'FIXED_AMOUNT' && discount.valueMinor) {
        invoiceDiscountMinor = discount.valueMinor;
      } else if (discount.type === 'PERCENTAGE' && discount.percentage) {
        const subtotal = input.items.reduce(
          (acc, item) => acc + MoneyUtil.multiply(item.unitAmountMinor, item.quantity),
          0
        );
        invoiceDiscountMinor = MoneyUtil.percentage(subtotal, discount.percentage);
      }
    }

    const calculation = this.calculationService.calculateInvoice(
      input.items,
      invoiceDiscountMinor,
      input.feeMinor || 0,
      input.taxRatePercentage || 0
    );

    const invoiceNumber = await this.generateInvoiceNumber(input.organisationId);
    const dueDate = input.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const currency = (input.currency || 'AUD').toUpperCase();

    // Check if any line item links to a memberMembershipId
    const primaryMembershipId = input.items.find((i) => i.memberMembershipId)?.memberMembershipId;

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          organisationId: input.organisationId,
          memberProfileId: input.memberProfileId,
          memberMembershipId: primaryMembershipId,
          invoiceNumber,
          status: 'OPEN',
          currency,
          subtotalMinor: calculation.subtotalMinor,
          discountMinor: calculation.discountMinor,
          taxMinor: calculation.taxMinor,
          feeMinor: calculation.feeMinor,
          totalMinor: calculation.totalMinor,
          amountPaidMinor: 0,
          amountDueMinor: calculation.totalMinor,
          dueDate,
          description: input.notes,
          metadata: input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {},
          lineItems: {
            create: calculation.lineItems.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitAmountMinor: item.unitAmountMinor,
              discountMinor: item.discountMinor || 0,
              taxMinor: item.taxMinor || 0,
              totalMinor: item.totalMinor,
              membershipPlanId: item.membershipPlanId,
              memberMembershipId: item.memberMembershipId,
              metadata: item.metadata || {},
            })),
          },
        },
        include: {
          lineItems: true,
        },
      });

      if (appliedDiscount) {
        await tx.discount.update({
          where: { id: appliedDiscount.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      await this.audit.log({
        action: 'INVOICE_CREATED',
        resource: 'invoice',
        resourceId: invoice.id,
        organisationId: input.organisationId,
        userId: actorId,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          totalMinor: invoice.totalMinor,
          currency: invoice.currency,
        },
      });

      return invoice;
    });
  }

  async listInvoices(
    organisationId: string,
    filter?: { memberProfileId?: string; status?: string; skip?: number; take?: number }
  ) {
    const where: any = { organisationId };
    if (filter?.memberProfileId) {
      where.memberProfileId = filter.memberProfileId;
    }
    if (filter?.status) {
      where.status = filter.status;
    }

    return this.prisma.invoice.findMany({
      where,
      include: {
        lineItems: true,
        transactions: {
          include: { refunds: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: filter?.skip || 0,
      take: filter?.take || 50,
    });
  }

  async getInvoiceById(organisationId: string, id: string, memberProfileId?: string) {
    const where: any = { id, organisationId };
    if (memberProfileId) {
      where.memberProfileId = memberProfileId;
    }

    const invoice = await this.prisma.invoice.findFirst({
      where,
      include: {
        lineItems: true,
        transactions: {
          include: { refunds: true, paymentMethod: true },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    return invoice;
  }

  async voidInvoice(organisationId: string, id: string, actorId: string, reason?: string) {
    const invoice = await this.getInvoiceById(organisationId, id);

    if (invoice.status === 'PAID') {
      throw new BadRequestException('Cannot void an invoice that has already been paid. Process a refund instead.');
    }

    if (invoice.status === 'VOID') {
      return invoice;
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: 'VOID',
        voidedAt: new Date(),
        description: invoice.description
          ? `${invoice.description} | Void reason: ${reason || 'N/A'}`
          : reason,
      },
      include: { lineItems: true },
    });

    await this.audit.log({
      action: 'INVOICE_VOIDED',
      resource: 'invoice',
      resourceId: id,
      organisationId,
      userId: actorId,
      metadata: { reason },
    });

    return updated;
  }

  async applyPayment(
    invoiceId: string,
    paidAmountMinor: number,
    txPrisma?: any
  ) {
    const client = txPrisma || this.prisma;
    const invoice = await client.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    const newAmountPaid = invoice.amountPaidMinor + paidAmountMinor;
    const newAmountDue = Math.max(0, invoice.totalMinor - newAmountPaid);
    const isFullyPaid = newAmountDue === 0;

    const updated = await client.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaidMinor: newAmountPaid,
        amountDueMinor: newAmountDue,
        status: isFullyPaid ? 'PAID' : invoice.status,
        paidAt: isFullyPaid ? new Date() : invoice.paidAt,
      },
      include: { lineItems: true },
    });

    if (isFullyPaid) {
      await this.membershipBridge.onInvoicePaid(invoiceId);
    }

    return updated;
  }
}
