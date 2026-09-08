/**
 * Day 32 — AI Receptionist Booking Controller
 * Exposes versioned endpoints for class discovery, member booking management,
 * confirmation lifecycle, transactional mutations, dry-run simulations, and telemetry.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Headers,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/interfaces/request-with-user.interface';
import { ReceptionistBookingService } from './booking/receptionist-booking.service';
import { ReceptionistMemberIdentityService } from './identity/receptionist-member-identity.service';
import { ConfirmationStateService } from './confirmation/confirmation-state.service';
import {
  ClassAvailabilityQueryRequestDto,
  CreateConfirmationRequestDto,
  ExecuteConfirmationRequestDto,
  CancelBookingRequestDto,
  RescheduleBookingRequestDto,
  JoinWaitlistRequestDto,
  DryRunBookingRequestDto,
} from './dto/receptionist-booking.dto';

@ApiTags('AI Receptionist Booking')
@Controller('ai/receptionist/booking')
export class ReceptionistBookingController {
  constructor(
    private readonly bookingService: ReceptionistBookingService,
    private readonly identityService: ReceptionistMemberIdentityService,
    private readonly confirmationService: ConfirmationStateService,
  ) {}

  private resolveOrgId(user?: AuthenticatedUser, headerOrgId?: string): string {
    const orgId =
      headerOrgId ||
      user?.roles?.[0]?.organisationId ||
      (user as any)?.primaryOrganisationId ||
      (user as any)?.organisationId;

    if (!orgId) {
      throw new ForbiddenException(
        'Organisation context is required. Pass x-organisation-id header or authenticate.',
      );
    }
    return orgId;
  }

  // ---------------------------------------------------------------------------
  // 1. Class Availability Discovery (Public: Prospects & Members)
  // ---------------------------------------------------------------------------
  @Get('availability')
  @Public()
  @ApiOperation({ summary: 'Search live class session availability and schedules' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async searchAvailability(
    @Query() query: ClassAvailabilityQueryRequestDto,
    @Headers('x-organisation-id') headerOrgId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberIdentity = await this.identityService.resolveMemberIdentity(orgId, user);

    return this.bookingService.searchAvailability(
      orgId,
      query,
      memberIdentity.isMember ? memberIdentity.memberProfileId : undefined,
    );
  }

  // ---------------------------------------------------------------------------
  // 2. Member Bookings List (Authenticated Member)
  // ---------------------------------------------------------------------------
  @Get('my-bookings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List upcoming or past bookings for authenticated member' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async listMemberBookings(
    @Query('upcomingOnly') upcomingOnly?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const identity = await this.identityService.resolveMemberIdentity(orgId, user);
    this.identityService.assertVerifiedMember(identity);

    return this.bookingService.getMemberBookings(orgId, identity.memberProfileId, {
      upcomingOnly: upcomingOnly === 'true',
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Single Booking Details & Policy (Authenticated Member)
  // ---------------------------------------------------------------------------
  @Get('bookings/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get booking details with cancellation policy evaluation' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async getBookingDetails(
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const identity = await this.identityService.resolveMemberIdentity(orgId, user);
    this.identityService.assertVerifiedMember(identity);

    return this.bookingService.getBookingDetails(orgId, id, identity.memberProfileId);
  }

  // ---------------------------------------------------------------------------
  // 4. Create Confirmation State Token (Authenticated Member)
  // ---------------------------------------------------------------------------
  @Post('confirmations/create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate single-use cryptographic confirmation token' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async createConfirmation(
    @Body() dto: CreateConfirmationRequestDto,
    @Headers('x-organisation-id') headerOrgId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const identity = await this.identityService.resolveMemberIdentity(orgId, user);
    this.identityService.assertVerifiedMember(identity);

    return this.confirmationService.createConfirmationState(
      orgId,
      identity.memberProfileId,
      dto.outletId,
      {
        conversationId: dto.conversationId || 'api-direct',
        classSessionId: dto.classSessionId,
        action: dto.action,
        existingBookingId: dto.existingBookingId,
        displayedDetails: dto.notes ? { notes: dto.notes } : undefined,
        ttlSeconds: dto.ttlMinutes ? dto.ttlMinutes * 60 : undefined,
      },
    );
  }

  // ---------------------------------------------------------------------------
  // 5. Execute Confirmed Booking (Authenticated Member)
  // ---------------------------------------------------------------------------
  @Post('confirmations/execute')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Execute confirmed class booking using single-use token' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async executeConfirmation(
    @Body() dto: ExecuteConfirmationRequestDto,
    @Headers('x-organisation-id') headerOrgId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const identity = await this.identityService.resolveMemberIdentity(orgId, user);
    this.identityService.assertVerifiedMember(identity);

    return this.bookingService.executeConfirmedBooking(orgId, identity.memberProfileId, dto);
  }

  // ---------------------------------------------------------------------------
  // 6. Cancel Booking (Authenticated Member)
  // ---------------------------------------------------------------------------
  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel booking using confirmation token' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async cancelBooking(
    @Body() dto: CancelBookingRequestDto,
    @Headers('x-organisation-id') headerOrgId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const identity = await this.identityService.resolveMemberIdentity(orgId, user);
    this.identityService.assertVerifiedMember(identity);

    return this.bookingService.executeConfirmedCancellation(
      orgId,
      identity.memberProfileId,
      dto.confirmationToken,
      dto.reason,
    );
  }

  // ---------------------------------------------------------------------------
  // 7. Reschedule Booking (Authenticated Member)
  // ---------------------------------------------------------------------------
  @Post('reschedule')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atomically reschedule booking to new session using token' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async rescheduleBooking(
    @Body() dto: RescheduleBookingRequestDto,
    @Headers('x-organisation-id') headerOrgId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const identity = await this.identityService.resolveMemberIdentity(orgId, user);
    this.identityService.assertVerifiedMember(identity);

    return this.bookingService.executeConfirmedReschedule(
      orgId,
      identity.memberProfileId,
      dto.confirmationToken,
    );
  }

  // ---------------------------------------------------------------------------
  // 8. Join Waitlist (Authenticated Member)
  // ---------------------------------------------------------------------------
  @Post('waitlist')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join waitlist for a full class session using confirmation token' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async joinWaitlist(
    @Body() dto: JoinWaitlistRequestDto,
    @Headers('x-organisation-id') headerOrgId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const identity = await this.identityService.resolveMemberIdentity(orgId, user);
    this.identityService.assertVerifiedMember(identity);

    return this.bookingService.executeConfirmedBooking(orgId, identity.memberProfileId, {
      confirmationToken: dto.confirmationToken,
      notes: dto.notes,
    });
  }

  // ---------------------------------------------------------------------------
  // 9. Dry Run Simulation (Zero Side-Effects)
  // ---------------------------------------------------------------------------
  @Post('dry-run')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Simulate booking evaluation and state without writing to DB' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async dryRunBooking(
    @Body() dto: DryRunBookingRequestDto,
    @Headers('x-organisation-id') headerOrgId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const identity = await this.identityService.resolveMemberIdentity(
      orgId,
      user,
      dto.memberProfileId,
    );

    return this.bookingService.runDryRun(
      orgId,
      identity.isMember ? identity.memberProfileId : undefined,
      dto.classSessionId,
    );
  }

  // ---------------------------------------------------------------------------
  // 10. Booking Telemetry & Funnel Metrics (Staff / Admin)
  // ---------------------------------------------------------------------------
  @Get('metrics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve booking metrics and conversion funnel analytics' })
  @ApiHeader({ name: 'x-organisation-id', required: false })
  async getMetrics(
    @Query('outletId') outletId?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.bookingService.getBookingMetrics(orgId, outletId);
  }
}
