import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { PrismaService } from '../../database/prisma.service';
import { AccessDecisionService } from '../services/access-decision.service';
import { CheckInService } from '../services/checkin.service';
import { CheckOutService } from '../services/checkout.service';
import { AccessCredentialService } from '../services/access-credential.service';
import { AccessOverrideService } from '../services/access-override.service';
import { AccessStatusService } from '../services/access-status.service';
import { AccessEventService } from '../services/access-event.service';
import { AccessCheckDto } from '../dto/access-check.dto';
import { CheckInDto } from '../dto/check-in.dto';
import { CheckOutDto } from '../dto/check-out.dto';
import { ManualCheckInDto, ManualCheckOutDto } from '../dto/manual-checkin.dto';
import { CreateAccessOverrideDto } from '../dto/access-override.dto';
import { CreateAccessCredentialDto, DynamicQRRequestDto } from '../dto/access-credential.dto';

@ApiTags('Physical Access & Check-In')
@ApiBearerAuth()
@Controller('access')
export class AccessController {
  constructor(
    private readonly decisionService: AccessDecisionService,
    private readonly checkinService: CheckInService,
    private readonly checkoutService: CheckOutService,
    private readonly credentialService: AccessCredentialService,
    private readonly overrideService: AccessOverrideService,
    private readonly statusService: AccessStatusService,
    private readonly eventService: AccessEventService,
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
      'SUPERADMIN',
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
  // 1. Physical Access Decision & Check-In / Check-Out
  // ==========================================

  @Post('check')
  @ApiOperation({ summary: 'Dry-run physical access authorization evaluation' })
  async checkAccess(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AccessCheckDto,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);

    // If caller is member and didn't provide memberProfileId, resolve from user session
    let memberProfileId = dto.memberProfileId;
    if (!memberProfileId && !dto.credentialReference) {
      const profile = await this.getMemberProfileForUser(user.id, orgId);
      memberProfileId = profile.id;
    }

    return this.decisionService.canAccess({
      memberProfileId,
      credentialReference: dto.credentialReference,
      outletId: dto.outletId,
      credentialId: dto.credentialId,
      accessPointId: dto.accessPointId,
      deviceId: dto.deviceId,
      requestedAt: dto.requestedAt ? new Date(dto.requestedAt) : new Date(),
    });
  }

  @Post('check-in')
  @ApiOperation({ summary: 'Perform physical or digital gym check-in' })
  async checkIn(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckInDto,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);

    let memberProfileId = dto.memberProfileId;
    if (!memberProfileId && !dto.credentialReference) {
      const profile = await this.getMemberProfileForUser(user.id, orgId);
      memberProfileId = profile.id;
    }

    return this.checkinService.checkIn(orgId, {
      ...dto,
      memberProfileId,
    });
  }

  @Post('check-out')
  @ApiOperation({ summary: 'Perform physical or digital gym check-out' })
  async checkOut(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckOutDto,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);

    let memberProfileId = dto.memberProfileId;
    if (!memberProfileId && !dto.credentialReference) {
      const profile = await this.getMemberProfileForUser(user.id, orgId);
      memberProfileId = profile.id;
    }

    return this.checkoutService.checkOut(orgId, {
      ...dto,
      memberProfileId,
    });
  }

  @Post('manual-checkin')
  @RequirePermission('access', 'MANUAL_CHECKIN')
  @ApiOperation({ summary: 'Reception staff manual check-in' })
  async manualCheckIn(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ManualCheckInDto,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.checkinService.manualCheckIn(orgId, dto, {
      id: user.id,
      email: user.email,
    });
  }

  @Post('manual-checkout')
  @RequirePermission('access', 'MANUAL_CHECKOUT')
  @ApiOperation({ summary: 'Reception staff manual check-out' })
  async manualCheckOut(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ManualCheckOutDto,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.checkoutService.manualCheckOut(orgId, dto, {
      id: user.id,
      email: user.email,
    });
  }

  // ==========================================
  // 2. Member Access Status & Visit Tracking
  // ==========================================

  @Get('status')
  @ApiOperation({ summary: 'Get current member physical access status and authorized facilities' })
  async getAccessStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Query('outletId') outletId?: string,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const profile = await this.getMemberProfileForUser(user.id, orgId);
    return this.statusService.getMemberAccessStatus(orgId, profile.id, outletId);
  }

  @Get('visits')
  @ApiOperation({ summary: 'Get visit history' })
  async getVisits(
    @CurrentUser() user: AuthenticatedUser,
    @Query('outletId') outletId?: string,
    @Query('memberProfileId') memberProfileId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const isStaff = this.isStaffOrAdmin(user);

    // Anti-IDOR: Non-staff can only query their own visits
    let targetMemberId = memberProfileId;
    if (!isStaff) {
      const profile = await this.getMemberProfileForUser(user.id, orgId);
      targetMemberId = profile.id;
    }

    return this.checkinService.getVisits(orgId, {
      outletId,
      memberProfileId: targetMemberId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('visits/active')
  @ApiOperation({ summary: 'Get current member active ongoing visit' })
  async getActiveVisit(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const profile = await this.getMemberProfileForUser(user.id, orgId);
    return this.checkinService.getActiveVisit(orgId, profile.id);
  }

  // ==========================================
  // 3. Credentials & Dynamic QR Pass
  // ==========================================

  @Get('credentials')
  @ApiOperation({ summary: 'List active access credentials for current member' })
  async getCredentials(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const profile = await this.getMemberProfileForUser(user.id, orgId);
    return this.credentialService.getMemberCredentials(orgId, profile.id);
  }

  @Post('credentials')
  @ApiOperation({ summary: 'Create new access credential' })
  async createCredential(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAccessCredentialDto,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const isStaff = this.isStaffOrAdmin(user);

    // Member can only create credentials for themselves
    if (!isStaff) {
      const profile = await this.getMemberProfileForUser(user.id, orgId);
      dto.memberProfileId = profile.id;
    }

    return this.credentialService.createCredential(orgId, dto);
  }

  @Post('credentials/qr')
  @ApiOperation({ summary: 'Generate or refresh dynamic rotating QR code token for turnstiles' })
  async generateDynamicQR(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DynamicQRRequestDto,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const profile = await this.getMemberProfileForUser(user.id, orgId);
    return this.credentialService.generateDynamicQRToken(orgId, profile.id);
  }

  @Patch('credentials/:id/revoke')
  @ApiOperation({ summary: 'Revoke an access credential' })
  async revokeCredential(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') credentialId: string,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.credentialService.revokeCredential(orgId, credentialId);
  }

  // ==========================================
  // 4. Staff Overrides & Audit Events
  // ==========================================

  @Post('overrides')
  @RequirePermission('access', 'OVERRIDE')
  @ApiOperation({ summary: 'Create temporary staff access override' })
  async createOverride(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAccessOverrideDto,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.overrideService.createOverride(orgId, dto, user.id);
  }

  @Get('overrides')
  @RequirePermission('access', 'VIEW')
  @ApiOperation({ summary: 'List staff access overrides' })
  async listOverrides(
    @CurrentUser() user: AuthenticatedUser,
    @Query('outletId') outletId?: string,
    @Query('memberProfileId') memberProfileId?: string,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.overrideService.listOverrides(orgId, { outletId, memberProfileId });
  }

  @Get('events')
  @RequirePermission('access', 'EVENT_VIEW')
  @ApiOperation({ summary: 'List immutable physical access audit events' })
  async listEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Query('outletId') outletId?: string,
    @Query('memberProfileId') memberProfileId?: string,
    @Query('eventType') eventType?: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.eventService.getEvents(orgId, {
      outletId,
      memberProfileId,
      eventType,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }
}
