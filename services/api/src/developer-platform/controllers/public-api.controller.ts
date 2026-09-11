/**
 * FitCore — Day 49: Public Developer API Controller
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  UseGuards,
  Req,
} from '@nestjs/common';
import { DeveloperApiAuthGuard } from '../guards/developer-api-auth.guard';
import { DeveloperScopeGuard } from '../guards/developer-scope.guard';
import { RequireScopes } from '../decorators/require-scopes.decorator';
import { CurrentDeveloperContext } from '../decorators/developer-context.decorator';
import { DeveloperSecurityContext } from '../services/api-authorization.service';
import { PrismaService } from '../../database/prisma.service';
import { BookingService } from '../../bookings/services/booking.service';
import {
  CreatePublicBookingDto,
  PublicBookingDto,
  PublicClassDto,
  PublicMemberDto,
  PublicMembershipPlanDto,
  PublicPaginationMeta,
  PublicResponseEnvelope,
  PublicTrainerDto,
  PublicAttendanceRecordDto,
} from '@fitcore/types';
import { PublicPaginationQueryDto } from '../dto/pagination-query.dto';
import { DeveloperError } from '../domain/developer-errors';

@Controller('api/v1/public')
@UseGuards(DeveloperApiAuthGuard, DeveloperScopeGuard)
export class PublicApiController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingService: BookingService,
  ) {}

  private envelope<T>(data: T, req: any, page = 1, limit = 20, total = 1): PublicResponseEnvelope<T> {
    const meta: PublicPaginationMeta = {
      requestId: req.requestId || `req_${Date.now()}`,
      page,
      limit,
      total,
      hasMore: page * limit < total,
    };
    return { data, meta };
  }

  // =========================================================================
  // 1. MEMBERS API (Scoped: members:read)
  // Strict Privacy Boundary: Zero health, PAR-Q, medical, or wearable data returned.
  // =========================================================================
  @Get('members')
  @RequireScopes('members:read')
  async listMembers(
    @CurrentDeveloperContext() ctx: DeveloperSecurityContext,
    @Query() query: PublicPaginationQueryDto,
    @Req() req: any,
  ): Promise<PublicResponseEnvelope<PublicMemberDto[]>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { organisationId: ctx.organisationId };
    if (ctx.outletId) where.primaryOutletId = ctx.outletId;

    const [members, total] = await Promise.all([
      this.prisma.memberProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.memberProfile.count({ where }),
    ]);

    const data: PublicMemberDto[] = members.map((m) => ({
      id: m.id,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      email: m.user.email,
      phone: m.user.phone,
      status: m.user.status,
      membershipStatus: m.status,
      joinedAt: m.createdAt.toISOString(),
    }));

    return this.envelope(data, req, page, limit, total);
  }

  @Get('members/:id')
  @RequireScopes('members:read')
  async getMember(
    @Param('id') id: string,
    @CurrentDeveloperContext() ctx: DeveloperSecurityContext,
    @Req() req: any,
  ): Promise<PublicResponseEnvelope<PublicMemberDto>> {
    const member = await this.prisma.memberProfile.findFirst({
      where: {
        id,
        organisationId: ctx.organisationId, // Cross-tenant IDOR protection
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            status: true,
          },
        },
      },
    });

    if (!member) {
      throw DeveloperError.notFound('Member', id);
    }

    const data: PublicMemberDto = {
      id: member.id,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      email: member.user.email,
      phone: member.user.phone,
      status: member.user.status,
      membershipStatus: member.status,
      joinedAt: member.createdAt.toISOString(),
    };

    return this.envelope(data, req);
  }

  // =========================================================================
  // 2. CLASSES API (Scoped: classes:read)
  // =========================================================================
  @Get('classes')
  @RequireScopes('classes:read')
  async listClasses(
    @CurrentDeveloperContext() ctx: DeveloperSecurityContext,
    @Query() query: PublicPaginationQueryDto,
    @Req() req: any,
  ): Promise<PublicResponseEnvelope<PublicClassDto[]>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { organisationId: ctx.organisationId };
    if (ctx.outletId) where.outletId = ctx.outletId;

    const [sessions, total] = await Promise.all([
      this.prisma.classSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startsAt: 'asc' },
        include: {
          classType: true,
          trainer: { select: { firstName: true, lastName: true } },
          resource: { select: { name: true } },
          bookings: { where: { status: 'CONFIRMED' }, select: { id: true } },
        },
      }),
      this.prisma.classSession.count({ where }),
    ]);

    const data: PublicClassDto[] = sessions.map((s) => ({
      id: s.id,
      name: s.name || s.classType.name,
      classType: s.classType.name,
      trainerName: s.trainer ? `${s.trainer.firstName} ${s.trainer.lastName}` : null,
      roomName: s.resource?.name || null,
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      capacity: s.capacity,
      bookedCount: s.bookings.length,
      isFull: s.bookings.length >= s.capacity,
      status: s.status,
    }));

    return this.envelope(data, req, page, limit, total);
  }

  @Get('classes/:id')
  @RequireScopes('classes:read')
  async getClass(
    @Param('id') id: string,
    @CurrentDeveloperContext() ctx: DeveloperSecurityContext,
    @Req() req: any,
  ): Promise<PublicResponseEnvelope<PublicClassDto>> {
    const s = await this.prisma.classSession.findFirst({
      where: { id, organisationId: ctx.organisationId },
      include: {
        classType: true,
        trainer: { select: { firstName: true, lastName: true } },
        resource: { select: { name: true } },
        bookings: { where: { status: 'CONFIRMED' }, select: { id: true } },
      },
    });

    if (!s) {
      throw DeveloperError.notFound('ClassSession', id);
    }

    const data: PublicClassDto = {
      id: s.id,
      name: s.name || s.classType.name,
      classType: s.classType.name,
      trainerName: s.trainer ? `${s.trainer.firstName} ${s.trainer.lastName}` : null,
      roomName: s.resource?.name || null,
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      capacity: s.capacity,
      bookedCount: s.bookings.length,
      isFull: s.bookings.length >= s.capacity,
      status: s.status,
    };

    return this.envelope(data, req);
  }

  // =========================================================================
  // 3. BOOKINGS API (Scoped: bookings:read & bookings:write)
  // Authoritative Domain Service Integration + Idempotency-Key
  // =========================================================================
  @Get('bookings')
  @RequireScopes('bookings:read')
  async listBookings(
    @CurrentDeveloperContext() ctx: DeveloperSecurityContext,
    @Query('memberId') memberId: string,
    @Query() query: PublicPaginationQueryDto,
    @Req() req: any,
  ): Promise<PublicResponseEnvelope<PublicBookingDto[]>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { organisationId: ctx.organisationId };
    if (memberId) where.memberProfileId = memberId;
    if (ctx.outletId) where.outletId = ctx.outletId;

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { bookedAt: 'desc' },
        include: {
          classSession: {
            include: { classType: true },
          },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    const data: PublicBookingDto[] = bookings.map((b) => ({
      id: b.id,
      classSessionId: b.classSessionId,
      memberId: b.memberProfileId,
      status: b.status,
      bookedAt: b.bookedAt.toISOString(),
      className: b.classSession?.name || b.classSession?.classType?.name,
      startsAt: b.classSession?.startsAt?.toISOString(),
    }));

    return this.envelope(data, req, page, limit, total);
  }

  @Post('bookings')
  @RequireScopes('bookings:write')
  async createBooking(
    @Body() dto: CreatePublicBookingDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentDeveloperContext() ctx: DeveloperSecurityContext,
    @Req() req: any,
  ): Promise<PublicResponseEnvelope<PublicBookingDto>> {
    // Assert member belongs to this organisation
    const member = await this.prisma.memberProfile.findFirst({
      where: { id: dto.memberId, organisationId: ctx.organisationId },
    });
    if (!member) {
      throw DeveloperError.notFound('Member', dto.memberId);
    }

    // Delegate to authoritative Domain BookingService
    const booking = await this.bookingService.bookSession(
      ctx.organisationId,
      dto.memberId,
      dto.classSessionId,
      { idempotencyKey },
    );

    const data: PublicBookingDto = {
      id: booking.id,
      classSessionId: booking.classSessionId,
      memberId: booking.memberProfileId,
      status: booking.status,
      bookedAt: booking.bookedAt.toISOString(),
    };

    return this.envelope(data, req);
  }

  @Delete('bookings/:id')
  @RequireScopes('bookings:write')
  async cancelBooking(
    @Param('id') id: string,
    @CurrentDeveloperContext() ctx: DeveloperSecurityContext,
    @Req() req: any,
  ): Promise<PublicResponseEnvelope<{ success: boolean; cancelledId: string }>> {
    const booking = await this.prisma.booking.findFirst({
      where: { id, organisationId: ctx.organisationId },
    });
    if (!booking) {
      throw DeveloperError.notFound('Booking', id);
    }

    // Delegate to authoritative Domain BookingService
    await this.bookingService.cancelBooking(id, booking.memberProfileId);

    return this.envelope({ success: true, cancelledId: id }, req);
  }

  // =========================================================================
  // 4. MEMBERSHIPS API (Scoped: memberships:read)
  // =========================================================================
  @Get('memberships')
  @RequireScopes('memberships:read')
  async listMemberships(
    @CurrentDeveloperContext() ctx: DeveloperSecurityContext,
    @Req() req: any,
  ): Promise<PublicResponseEnvelope<PublicMembershipPlanDto[]>> {
    const plans = await this.prisma.membershipPlan.findMany({
      where: { organisationId: ctx.organisationId },
      orderBy: { name: 'asc' },
    });

    const data: PublicMembershipPlanDto[] = plans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      type: p.membershipType,
      priceMinor: Math.round(p.price * 100),
      currency: p.currency,
      billingFrequency: p.billingType,
      status: p.status,
    }));

    return this.envelope(data, req);
  }

  // =========================================================================
  // 5. TRAINERS API (Scoped: trainers:read)
  // =========================================================================
  @Get('trainers')
  @RequireScopes('trainers:read')
  async listTrainers(
    @CurrentDeveloperContext() ctx: DeveloperSecurityContext,
    @Req() req: any,
  ): Promise<PublicResponseEnvelope<PublicTrainerDto[]>> {
    const trainers = await this.prisma.trainerProfile.findMany({
      where: { organisationId: ctx.organisationId },
      include: {
        staffProfile: { select: { displayName: true } },
      },
    });

    const data: PublicTrainerDto[] = trainers.map((t) => ({
      id: t.id,
      name: t.professionalName || t.staffProfile.displayName,
      bio: t.bio,
      specialties: t.specialties,
      status: t.status,
    }));

    return this.envelope(data, req);
  }

  // =========================================================================
  // 6. ATTENDANCE API (Scoped: attendance:read)
  // =========================================================================
  @Get('attendance')
  @RequireScopes('attendance:read')
  async listAttendance(
    @CurrentDeveloperContext() ctx: DeveloperSecurityContext,
    @Query('memberId') memberId: string,
    @Query() query: PublicPaginationQueryDto,
    @Req() req: any,
  ): Promise<PublicResponseEnvelope<PublicAttendanceRecordDto[]>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { organisationId: ctx.organisationId };
    if (memberId) where.memberProfileId = memberId;
    if (ctx.outletId) where.outletId = ctx.outletId;

    const [records, total] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.attendanceRecord.count({ where }),
    ]);

    const data: PublicAttendanceRecordDto[] = records.map((r) => ({
      id: r.id,
      memberId: r.memberProfileId,
      classSessionId: r.classSessionId,
      status: r.status,
      checkInMethod: r.checkInMethod,
      checkedInAt: r.checkedInAt ? r.checkedInAt.toISOString() : r.createdAt.toISOString(),
    }));

    return this.envelope(data, req, page, limit, total);
  }
}
