import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InvoiceService } from '../services/invoice.service';
import { CreateInvoiceDto, VoidInvoiceDto } from '../dto/payment-domain.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('Payments & Invoices')
@ApiBearerAuth()
@Controller()
export class InvoicesController {
  constructor(
    private readonly invoiceService: InvoiceService,
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
  // Member Self-Service Invoices
  // ==========================================

  @Get('members/me/invoices')
  @ApiOperation({ summary: 'Get current member invoices' })
  async getMyInvoices(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const profile = await this.getMemberProfileForUser(user.id, orgId);
    return this.invoiceService.listInvoices(orgId, { memberProfileId: profile.id });
  }

  @Get('members/me/invoices/:id')
  @ApiOperation({ summary: 'Get member invoice details' })
  async getMyInvoiceById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') invoiceId: string,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const profile = await this.getMemberProfileForUser(user.id, orgId);
    return this.invoiceService.getInvoiceById(orgId, invoiceId, profile.id);
  }

  // ==========================================
  // Organisation Invoices (Staff / Admin / Member)
  // ==========================================

  @Post('invoices')
  @ApiOperation({ summary: 'Create invoice (Staff/Admin)' })
  async createInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInvoiceDto,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    if (!this.isStaffOrAdmin(user)) {
      throw new ForbiddenException('Only staff or finance administrators can create invoices');
    }

    return this.invoiceService.createInvoice(
      {
        organisationId: orgId,
        memberProfileId: dto.memberProfileId,
        currency: dto.currency,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        notes: dto.notes,
        discountCode: dto.discountCode,
        taxRatePercentage: dto.taxRatePercentage,
        feeMinor: dto.feeMinor,
        items: dto.items,
        idempotencyKey: dto.idempotencyKey,
      },
      user.id
    );
  }

  @Get('invoices')
  @ApiOperation({ summary: 'List invoices within organisation' })
  async listInvoices(
    @CurrentUser() user: AuthenticatedUser,
    @Query('memberProfileId') memberProfileId?: string,
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);

    // Member IDOR protection: if user is purely a member, restrict strictly to their profile
    if (!this.isStaffOrAdmin(user)) {
      const profile = await this.getMemberProfileForUser(user.id, orgId);
      return this.invoiceService.listInvoices(orgId, {
        memberProfileId: profile.id,
        status,
        skip: skip ? parseInt(skip, 10) : undefined,
        take: take ? parseInt(take, 10) : undefined,
      });
    }

    return this.invoiceService.listInvoices(orgId, {
      memberProfileId,
      status,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  async getInvoiceById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') invoiceId: string,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);

    if (!this.isStaffOrAdmin(user)) {
      const profile = await this.getMemberProfileForUser(user.id, orgId);
      return this.invoiceService.getInvoiceById(orgId, invoiceId, profile.id);
    }

    return this.invoiceService.getInvoiceById(orgId, invoiceId);
  }

  @Post('invoices/:id/void')
  @ApiOperation({ summary: 'Void an open invoice (Staff/Admin)' })
  async voidInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') invoiceId: string,
    @Body() dto: VoidInvoiceDto,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    if (!this.isStaffOrAdmin(user)) {
      throw new ForbiddenException('Only staff or finance administrators can void invoices');
    }

    return this.invoiceService.voidInvoice(orgId, invoiceId, user.id, dto.reason);
  }
}
