import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { PrismaService } from '../../database/prisma.service';
import { BookingService } from '../services/booking.service';
import { ClassSessionService } from '../services/class-session.service';
import { TrainerAvailabilityService } from '../services/trainer-availability.service';
import { ManualBookingDto } from '../dto';

@ApiTags('Staff & Trainer Scheduling')
@ApiBearerAuth()
@Controller('staff')
export class StaffScheduleController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly sessionService: ClassSessionService,
    private readonly trainerService: TrainerAvailabilityService,
    private readonly prisma: PrismaService,
  ) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || user.roles[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  @Get('schedule/outlet/:outletId')
  @RequirePermission('schedules', 'VIEW', 'ORGANISATION')
  @ApiOperation({ summary: 'View outlet class timetable for a date range (Staff)' })
  async getOutletSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('outletId') outletId: string,
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);

    const startDate = startDateStr ? new Date(startDateStr) : new Date();
    const endDate = endDateStr
      ? new Date(endDateStr)
      : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    return this.prisma.classSession.findMany({
      where: {
        organisationId,
        outletId,
        startsAt: { gte: startDate, lte: endDate },
        status: { not: 'CANCELLED' },
      },
      include: {
        classType: true,
        trainer: { select: { id: true, firstName: true, lastName: true, email: true } },
        resource: true,
        _count: {
          select: { bookings: true, waitlistEntries: true },
        },
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  @Get('schedule/trainer/:trainerId')
  @RequirePermission('schedules', 'VIEW', 'ORGANISATION')
  @ApiOperation({ summary: 'View trainer schedule and availability (Staff / Trainer)' })
  async getTrainerSchedule(
    @Param('trainerId') trainerId: string,
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
  ) {
    const startDate = startDateStr ? new Date(startDateStr) : new Date();
    const endDate = endDateStr
      ? new Date(endDateStr)
      : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    return this.trainerService.getTrainerSchedule(trainerId, startDate, endDate);
  }

  @Post('trainers/availability')
  @RequirePermission('schedules', 'MANAGE', 'ORGANISATION')
  @ApiOperation({ summary: 'Set recurring weekly availability slot for a trainer (Staff)' })
  async setTrainerAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: any,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.trainerService.setAvailability(organisationId, dto);
  }

  @Post('trainers/unavailability')
  @RequirePermission('schedules', 'MANAGE', 'ORGANISATION')
  @ApiOperation({ summary: 'Record trainer blockout, vacation, or time-off (Staff)' })
  async recordTrainerUnavailability(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: any,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.trainerService.recordUnavailability(organisationId, dto, user.id);
  }

  @Get('class-sessions/:id/bookings')
  @RequirePermission('bookings', 'VIEW', 'ORGANISATION')
  @ApiOperation({ summary: 'List all member bookings and attendees for a session (Staff)' })
  async getSessionBookings(@Param('id') classSessionId: string) {
    return this.bookingService.listSessionBookings(classSessionId);
  }

  @Post('bookings/manual')
  @RequirePermission('bookings', 'MANUAL', 'ORGANISATION')
  @ApiOperation({ summary: 'Receptionist manual booking for an eligible member' })
  async manualBook(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ManualBookingDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);

    return this.bookingService.bookSession(
      organisationId,
      dto.memberProfileId,
      dto.classSessionId,
      {
        isStaffManual: true,
        notes: dto.notes,
      },
    );
  }

  @Post('bookings/:id/check-in')
  @RequirePermission('bookings', 'CHECK_IN', 'ORGANISATION')
  @ApiOperation({ summary: 'Mark booking attendance as CHECKED_IN (Staff)' })
  async checkInBooking(@Param('id') bookingId: string) {
    return this.bookingService.checkInBooking(bookingId);
  }

  @Post('bookings/:id/no-show')
  @RequirePermission('bookings', 'NO_SHOW', 'ORGANISATION')
  @ApiOperation({ summary: 'Mark booking as NO_SHOW (Staff)' })
  async markNoShow(@Param('id') bookingId: string) {
    return this.bookingService.markNoShow(bookingId);
  }

  @Post('bookings/:id/cancel')
  @RequirePermission('bookings', 'CANCEL', 'ORGANISATION')
  @ApiOperation({ summary: 'Staff manual cancellation of a booking' })
  async staffCancelBooking(
    @Param('id') bookingId: string,
    @Query('reason') reason?: string,
  ) {
    return this.bookingService.cancelBooking(bookingId, '', {
      isStaffOverride: true,
      reason: reason || 'Cancelled by gym staff/reception',
    });
  }
}
