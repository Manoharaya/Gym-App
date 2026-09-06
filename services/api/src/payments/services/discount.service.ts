import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { DiscountType } from '@fitcore/types';

export interface CreateDiscountInput {
  organisationId: string;
  code: string;
  name: string;
  description?: string;
  type: DiscountType;
  valueMinor?: number;
  percentage?: number;
  validFrom?: Date;
  validUntil?: Date;
  usageLimit?: number;
}

@Injectable()
export class DiscountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async createDiscount(input: CreateDiscountInput, actorId: string) {
    const code = input.code.trim().toUpperCase();

    const existing = await this.prisma.discount.findUnique({
      where: {
        organisationId_code: {
          organisationId: input.organisationId,
          code,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`Discount code '${code}' already exists in this organisation`);
    }

    if (input.type === 'PERCENTAGE' && (!input.percentage || input.percentage <= 0 || input.percentage > 100)) {
      throw new BadRequestException('Percentage must be between 1 and 100');
    }

    if (input.type === 'FIXED_AMOUNT' && (!input.valueMinor || input.valueMinor <= 0)) {
      throw new BadRequestException('Fixed value amount must be greater than zero');
    }

    const discount = await this.prisma.discount.create({
      data: {
        organisationId: input.organisationId,
        code,
        name: input.name,
        type: input.type,
        valueMinor: input.valueMinor,
        percentage: input.percentage,
        startsAt: input.validFrom || new Date(),
        endsAt: input.validUntil,
        usageLimit: input.usageLimit,
        usedCount: 0,
        active: true,
        metadata: input.description ? { description: input.description } : {},
      },
    });

    await this.audit.log({
      action: 'DISCOUNT_CREATED',
      resource: 'discount',
      resourceId: discount.id,
      organisationId: input.organisationId,
      userId: actorId,
      metadata: { code: discount.code, type: discount.type },
    });

    return discount;
  }

  async listDiscounts(organisationId: string) {
    return this.prisma.discount.findMany({
      where: { organisationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDiscountByCode(organisationId: string, code: string) {
    const discount = await this.prisma.discount.findUnique({
      where: {
        organisationId_code: {
          organisationId,
          code: code.trim().toUpperCase(),
        },
      },
    });

    if (!discount) {
      throw new NotFoundException(`Discount code '${code}' not found`);
    }

    return discount;
  }
}
