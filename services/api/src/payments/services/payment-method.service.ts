import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { PaymentMethodType } from '@fitcore/types';

export interface CreatePaymentMethodInput {
  organisationId: string;
  memberProfileId: string;
  type: PaymentMethodType;
  provider: string;
  providerPaymentMethodId: string;
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault?: boolean;
  metadata?: Record<string, any>;
}

@Injectable()
export class PaymentMethodService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  /**
   * Registers a securely tokenized payment method.
   * Zero sensitive card data (full PAN, CVV) is ever stored.
   */
  async addPaymentMethod(input: CreatePaymentMethodInput, actorId: string) {
    if (input.last4 && input.last4.length !== 4) {
      throw new BadRequestException('last4 must be exactly 4 digits');
    }

    // Check if this is the user's first payment method
    const existingCount = await this.prisma.paymentMethod.count({
      where: {
        organisationId: input.organisationId,
        memberProfileId: input.memberProfileId,
        status: 'ACTIVE',
      },
    });

    const isDefault = input.isDefault ?? (existingCount === 0);

    return this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.paymentMethod.updateMany({
          where: {
            organisationId: input.organisationId,
            memberProfileId: input.memberProfileId,
          },
          data: { isDefault: false },
        });
      }

      const method = await tx.paymentMethod.create({
        data: {
          organisationId: input.organisationId,
          memberProfileId: input.memberProfileId,
          type: input.type,
          provider: input.provider,
          providerPaymentMethodId: input.providerPaymentMethodId,
          brand: input.brand?.toUpperCase(),
          last4: input.last4,
          expiryMonth: input.expiryMonth,
          expiryYear: input.expiryYear,
          isDefault,
          status: 'ACTIVE',
          metadata: input.metadata || {},
        },
      });

      await this.audit.log({
        action: 'PAYMENT_METHOD_ADDED',
        resource: 'payment_method',
        resourceId: method.id,
        organisationId: input.organisationId,
        userId: actorId,
        metadata: {
          brand: method.brand,
          last4: method.last4,
          type: method.type,
          isDefault: method.isDefault,
        },
      });

      return method;
    });
  }

  async listPaymentMethods(organisationId: string, memberProfileId: string) {
    return this.prisma.paymentMethod.findMany({
      where: {
        organisationId,
        memberProfileId,
        status: 'ACTIVE',
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async setDefaultPaymentMethod(
    organisationId: string,
    memberProfileId: string,
    paymentMethodId: string,
    actorId: string
  ) {
    const existing = await this.prisma.paymentMethod.findFirst({
      where: {
        id: paymentMethodId,
        organisationId,
        memberProfileId,
        status: 'ACTIVE',
      },
    });

    if (!existing) {
      throw new NotFoundException('Payment method not found');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.paymentMethod.updateMany({
        where: { organisationId, memberProfileId },
        data: { isDefault: false },
      });

      const updated = await tx.paymentMethod.update({
        where: { id: paymentMethodId },
        data: { isDefault: true },
      });

      await this.audit.log({
        action: 'PAYMENT_METHOD_DEFAULT_SET',
        resource: 'payment_method',
        resourceId: paymentMethodId,
        organisationId,
        userId: actorId,
      });

      return updated;
    });
  }

  async removePaymentMethod(
    organisationId: string,
    memberProfileId: string,
    paymentMethodId: string,
    actorId: string
  ) {
    const existing = await this.prisma.paymentMethod.findFirst({
      where: {
        id: paymentMethodId,
        organisationId,
        memberProfileId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Payment method not found');
    }

    const updated = await this.prisma.paymentMethod.update({
      where: { id: paymentMethodId },
      data: { status: 'DELETED', isDefault: false },
    });

    await this.audit.log({
      action: 'PAYMENT_METHOD_REMOVED',
      resource: 'payment_method',
      resourceId: paymentMethodId,
      organisationId,
      userId: actorId,
    });

    return updated;
  }
}
