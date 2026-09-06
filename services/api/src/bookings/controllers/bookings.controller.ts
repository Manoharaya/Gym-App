import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { PrismaService } from '../../database/prisma.service';
import { BookingService } from '../services/booking.service';
import { WaitlistService } from '../services/waitlist.service';
import { CreateBookingDto, CancelBookingDto } from '../dto';

@ApiTags('Member Bookings')
@ApiBearerAuth()
@Controller()
export class BookingsController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly waitlistService: WaitlistService,
    private readonly prisma: PrismaService,
  ) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || user.roles[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  private async getMemberProfile(userId: string, organisationId: string) {
    const profile = await this.prisma.memberProfile.findFirst({
      where: { userId, organisationId },
    });
    if (!profile) {
      throw new NotFoundException('Member profile not found in this organisation');
    }
    return profile;
  }

  @Post('class-sessions/:id/book')
  @ApiOperation({ summary: 'Book a class session or join waitlist (Member)' })
  async bookSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') classSessionId: string,
    @Body() dto: CreateBookingDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const profile = await this.getMemberProfile(user.id, organisationId);

    return this.bookingService.bookSession(
      organisationId,
      profile.id,
      classSessionId,
      {
        idempotencyKey,
        notes: dto.notes,
      },
    );
  }

  @Delete('class-sessions/:id/book')
  @ApiOperation({ summary: 'Cancel booking for a class session (Member)' })
  async cancelSessionBooking(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') classSessionId: string,
    @Query('reason') reason?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const profile = await this.getMemberProfile(user.id, organisationId);

    const booking = await this.prisma.booking.findFirst({
      where: {
        classSessionId,
        memberProfileId: profile.id,
        status: { in: ['CONFIRMED', 'WAITLISTED'] },
      },
    });

    if (!booking) {
      throw new NotFoundException('Active booking not found for this session');
    }

    return this.bookingService.cancelBooking(booking.id, profile.id, { reason });
  }

  @Post('bookings/:id/cancel')
  @ApiOperation({ summary: 'Cancel a booking by booking ID (Member)' })
  async cancelBookingById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') bookingId: string,
    @Body() dto: CancelBookingDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const profile = await this.getMemberProfile(user.id, organisationId);

    return this.bookingService.cancelBooking(bookingId, profile.id, {
      reason: dto.reason,
    });
  }

  @Get('members/me/bookings')
  @ApiOperation({ summary: 'List current member bookings' })
  async getMyBookings(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: any,
    @Query('upcomingOnly') upcomingOnly?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const profile = await this.getMemberProfile(user.id, organisationId);

    return this.bookingService.listMemberBookings(profile.id, {
      status,
      upcomingOnly: upcomingOnly === 'true',
    });
  }

  @Get('members/me/waitlists')
  @ApiOperation({ summary: 'List current member waitlist entries' })
  async getMyWaitlists(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const profile = await this.getMemberProfile(user.id, organisationId);

    return this.prisma.waitlistEntry.findMany({
      where: {
        memberProfileId: profile.id,
        status: 'PENDING',
      },
      include: {
        classSession: {
          include: {
            classType: true,
            outlet: { select: { id: true, name: true, code: true } },
            trainer: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  @Delete('class-sessions/:id/waitlist')
  @ApiOperation({ summary: 'Leave the waitlist for a class session' })
  async leaveWaitlist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') classSessionId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const profile = await this.getMemberProfile(user.id, organisationId);

    const result = await this.waitlistService.leaveWaitlist(classSessionId, profile.id);
    if (!result) {
      throw new NotFoundException('Active waitlist entry not found');
    }

    return { message: 'Successfully removed from waitlist' };
  }
}
