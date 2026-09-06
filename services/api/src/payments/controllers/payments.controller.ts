import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentTransactionService } from '../services/payment-transaction.service';
import { RefundService } from '../services/refund.service';
import { PaymentMethodService } from '../services/payment-method.service';
import { DiscountService } from '../services/discount.service';
import {
  ProcessPaymentDto,
  ProcessManualPaymentDto,
  CreateRefundDto,
  CreatePaymentMethodDto,
  CreateDiscountDto,
} from '../dto/payment-domain.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('Payments & Transactions')
@ApiBearerAuth()
@Controller()
export class PaymentsController {
  constructor(
    private readonly transactionService: PaymentTransactionService,
    private readonly refundService: RefundService,
    private readonly paymentMethodService: PaymentMethodService,
    private readonly discountService: DiscountService,
    private readonly prisma: PrismaService
  ) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || user.roles[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  private async getMemberProfileForUser(userId: string, organisationId: string) {
    const profile = await this.prisma.memberProfile.findFirst({
      where: { userId, organisationId },
    });
    if (!profile) {
      throw new NotFoundException('Member profile not found for user in this organisation');
    }
    return profile;
  }

  private isStaffOrAdmin(user: AuthenticatedUser): boolean {
    const staffRoles = [
      'SUPER_ADMIN',
      'ORGANISATION_OWNER',
      'FINANCE',
      'OUTLET_MANAGER',
      'RECEPTION',
      'TRAINER',
    ];
    return user.roles.some((r) => staffRoles.includes(r.role));
  }

  // ==========================================
  // 1. Payment Processing & Transactions
  // ==========================================

  @Post('payments/charge')
  @ApiOperation({ summary: 'Process an online payment charge' })
  async charge(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ProcessPaymentDto,
    @Headers('x-organisation-id') headerOrgId?: string,
    @Headers('idempotency-key') headerIdempotencyKey?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);

    // If caller is purely a member, they can only charge for themselves
    if (!this.isStaffOrAdmin(user)) {
      const profile = await this.getMemberProfileForUser(user.id, orgId);
      if (dto.memberProfileId !== profile.id) {
        throw new ForbiddenException('Cannot process payments on behalf of another member');
      }
    }

    return this.transactionService.processPayment(
      {
        ...dto,
        organisationId: orgId,
        idempotencyKey: headerIdempotencyKey || dto.idempotencyKey,
      },
      user.id
    );
  }

  @Post('payments/manual')
  @ApiOperation({ summary: 'Record an in-gym manual payment (Cash, POS, Bank Transfer)' })
  async recordManualPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ProcessManualPaymentDto,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    if (!this.isStaffOrAdmin(user)) {
      throw new ForbiddenException('Only staff or receptionists can record manual in-gym payments');
    }

    return this.transactionService.processManualPayment({
      ...dto,
      organisationId: orgId,
      actorId: user.id,
    });
  }

  @Post('payments/refund')
  @ApiOperation({ summary: 'Process a full or partial refund' })
  async refund(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRefundDto,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    if (!this.isStaffOrAdmin(user)) {
      throw new ForbiddenException('Only staff or finance administrators can issue refunds');
    }

    return this.refundService.processRefund({
      ...dto,
      organisationId: orgId,
      actorId: user.id,
    });
  }

  @Get('payments')
  @ApiOperation({ summary: 'List payment transactions' })
  async listTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('memberProfileId') memberProfileId?: string,
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);

    if (!this.isStaffOrAdmin(user)) {
      const profile = await this.getMemberProfileForUser(user.id, orgId);
      return this.transactionService.listTransactions(orgId, {
        memberProfileId: profile.id,
        status,
        skip: skip ? parseInt(skip, 10) : undefined,
        take: take ? parseInt(take, 10) : undefined,
      });
    }

    return this.transactionService.listTransactions(orgId, {
      memberProfileId,
      status,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('payments/:id')
  @ApiOperation({ summary: 'Get payment transaction by ID' })
  async getTransactionById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') txId: string,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);

    if (!this.isStaffOrAdmin(user)) {
      const profile = await this.getMemberProfileForUser(user.id, orgId);
      return this.transactionService.getTransactionById(orgId, txId, profile.id);
    }

    return this.transactionService.getTransactionById(orgId, txId);
  }

  @Get('members/me/payments')
  @ApiOperation({ summary: 'Get current member payment transaction history' })
  async getMyPayments(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const profile = await this.getMemberProfileForUser(user.id, orgId);
    return this.transactionService.listTransactions(orgId, { memberProfileId: profile.id });
  }

  @Get('members/me/payments/:id')
  @ApiOperation({ summary: 'Get current member payment transaction details' })
  async getMyPaymentById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') txId: string,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const profile = await this.getMemberProfileForUser(user.id, orgId);
    return this.transactionService.getTransactionById(orgId, txId, profile.id);
  }

  // ==========================================
  // 2. Tokenized Payment Methods
  // ==========================================

  @Get('payment-methods')
  @ApiOperation({ summary: 'List saved payment methods for member' })
  async listPaymentMethods(
    @CurrentUser() user: AuthenticatedUser,
    @Query('memberProfileId') memberProfileId?: string,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);

    let targetMemberId = memberProfileId;
    if (!this.isStaffOrAdmin(user) || !targetMemberId) {
      const profile = await this.getMemberProfileForUser(user.id, orgId);
      targetMemberId = profile.id;
    }

    return this.paymentMethodService.listPaymentMethods(orgId, targetMemberId);
  }

  @Post('payment-methods')
  @ApiOperation({ summary: 'Add a tokenized payment method (Zero sensitive card data)' })
  async addPaymentMethod(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePaymentMethodDto,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);

    if (!this.isStaffOrAdmin(user)) {
      const profile = await this.getMemberProfileForUser(user.id, orgId);
      if (dto.memberProfileId !== profile.id) {
        throw new ForbiddenException('Cannot save payment methods for another member');
      }
    }

    return this.paymentMethodService.addPaymentMethod(
      {
        ...dto,
        organisationId: orgId,
      },
      user.id
    );
  }

  @Patch('payment-methods/:id/default')
  @ApiOperation({ summary: 'Set default payment method' })
  async setDefaultPaymentMethod(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') paymentMethodId: string,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const profile = await this.getMemberProfileForUser(user.id, orgId);

    return this.paymentMethodService.setDefaultPaymentMethod(
      orgId,
      profile.id,
      paymentMethodId,
      user.id
    );
  }

  @Delete('payment-methods/:id')
  @ApiOperation({ summary: 'Remove a saved payment method' })
  async removePaymentMethod(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') paymentMethodId: string,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const profile = await this.getMemberProfileForUser(user.id, orgId);

    return this.paymentMethodService.removePaymentMethod(
      orgId,
      profile.id,
      paymentMethodId,
      user.id
    );
  }

  // ==========================================
  // 3. Discounts & Promotions
  // ==========================================

  @Post('discounts')
  @ApiOperation({ summary: 'Create a discount code (Staff/Admin)' })
  async createDiscount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDiscountDto,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    if (!this.isStaffOrAdmin(user)) {
      throw new ForbiddenException('Only staff can create discount codes');
    }

    return this.discountService.createDiscount(
      {
        ...dto,
        organisationId: orgId,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      },
      user.id
    );
  }

  @Get('discounts')
  @ApiOperation({ summary: 'List discounts in organisation (Staff/Admin)' })
  async listDiscounts(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    if (!this.isStaffOrAdmin(user)) {
      throw new ForbiddenException('Only staff can view full discount lists');
    }

    return this.discountService.listDiscounts(orgId);
  }

  @Get('discounts/:code')
  @ApiOperation({ summary: 'Validate a discount code' })
  async getDiscountByCode(
    @CurrentUser() user: AuthenticatedUser,
    @Param('code') code: string,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.discountService.getDiscountByCode(orgId, code);
  }
}
