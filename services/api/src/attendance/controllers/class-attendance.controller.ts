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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { PrismaService } from '../../database/prisma.service';
import { CheckInService } from '../services/check-in.service';
import { WalkInService } from '../services/walk-in.service';
import { RosterService } from '../services/roster.service';
import { NoShowProcessorService } from '../services/no-show-processor.service';
import { CheckInDto, CheckOutDto } from '../dto/check-in.dto';
import { RecordWalkInDto } from '../dto/record-walk-in.dto';
import { CorrectAttendanceDto } from '../dto/correct-attendance.dto';

@ApiTags('Class Attendance & Operations')
@ApiBearerAuth()
@Controller()
export class ClassAttendanceController {
  constructor(
    private readonly checkInService: CheckInService,
    private readonly walkInService: WalkInService,
    private readonly rosterService: RosterService,
    private readonly noShowProcessor: NoShowProcessorService,
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

  @Post('class-sessions/:id/check-in')
  @ApiOperation({ summary: 'Check in a booked member to a class session (Self-service or Staff)' })
  async checkInMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') classSessionId: string,
    @Body() dto: CheckInDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);

    let targetMemberProfileId: string;
    let isStaffAction = false;

    if (dto.memberProfileId) {
      targetMemberProfileId = dto.memberProfileId;
      isStaffAction = true;
    } else {
      const profile = await this.getMemberProfile(user.id, organisationId);
      targetMemberProfileId = profile.id;
    }

    return this.checkInService.checkInBookedMember(
      classSessionId,
      targetMemberProfileId,
      dto.method || (isStaffAction ? 'STAFF' : 'MEMBER_SELF_SERVICE'),
      {
        staffUserId: isStaffAction ? user.id : undefined,
        allowWindowOverride: dto.allowWindowOverride,
        notes: dto.notes,
      },
    );
  }

  @Post('class-sessions/:id/check-out')
  @ApiOperation({ summary: 'Check out an attendee from a class session' })
  async checkOutMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') classSessionId: string,
    @Body() dto: CheckOutDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);

    let targetMemberProfileId: string;
    let isStaffAction = false;

    if (dto?.memberProfileId) {
      targetMemberProfileId = dto.memberProfileId;
      isStaffAction = true;
    } else {
      const profile = await this.getMemberProfile(user.id, organisationId);
      targetMemberProfileId = profile.id;
    }

    return this.checkInService.checkOutMember(
      classSessionId,
      targetMemberProfileId,
      dto?.method || (isStaffAction ? 'STAFF' : 'MEMBER_SELF_SERVICE'),
      {
        staffUserId: isStaffAction ? user.id : undefined,
      },
    );
  }

  @Post('class-sessions/:id/walk-in')
  @RequirePermission('attendance', 'CREATE', 'OUTLET')
  @ApiOperation({ summary: 'Admit a walk-in member without prior reservation (Staff)' })
  async recordWalkIn(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') classSessionId: string,
    @Body() dto: RecordWalkInDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);

    // Fetch session to determine outlet context
    const session = await this.prisma.classSession.findFirst({
      where: { id: classSessionId, organisationId },
      select: { outletId: true },
    });

    if (!session) {
      throw new NotFoundException('Class session not found in this organisation');
    }

    return this.walkInService.recordWalkIn(
      organisationId,
      session.outletId,
      classSessionId,
      dto,
      user.id,
    );
  }

  @Get('class-sessions/:id/roster')
  @RequirePermission('attendance', 'VIEW', 'OUTLET')
  @ApiOperation({ summary: 'Get operational class roster with live attendance KPIs (Staff/Trainer)' })
  async getSessionRoster(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') classSessionId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.rosterService.getSessionRoster(classSessionId, organisationId);
  }

  @Post('attendance/:id/correct')
  @RequirePermission('attendance', 'UPDATE', 'OUTLET')
  @ApiOperation({ summary: 'Correct an attendance record with mandatory justification (Staff)' })
  async correctAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') attendanceId: string,
    @Body() dto: CorrectAttendanceDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.rosterService.correctAttendance(attendanceId, organisationId, dto, user.id);
  }

  @Get('members/me/attendance')
  @ApiOperation({ summary: 'List past attendance history for the authenticated member' })
  async getMyAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const profile = await this.getMemberProfile(user.id, organisationId);

    const take = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 50;
    const skip = offset ? Math.max(0, parseInt(offset, 10)) : 0;

    return this.checkInService.getMemberAttendanceHistory(profile.id, take, skip);
  }

  @Post('class-sessions/:id/process-no-shows')
  @RequirePermission('attendance', 'UPDATE', 'OUTLET')
  @ApiOperation({ summary: 'Trigger no-show processing for an ended class session (Staff/Admin)' })
  async processSessionNoShows(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') classSessionId: string,
    @Query('gracePeriodMinutes') gracePeriodMinutes?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.resolveOrgId(user, headerOrgId);
    const graceMinutes = gracePeriodMinutes ? parseInt(gracePeriodMinutes, 10) : 15;
    return this.noShowProcessor.processSessionNoShows(classSessionId, graceMinutes);
  }

  @Post('attendance/process-no-shows')
  @RequirePermission('attendance', 'UPDATE', 'ORGANISATION')
  @ApiOperation({ summary: 'Sweep and process all pending no-shows across organisation (Admin)' })
  async processAllNoShows(
    @CurrentUser() user: AuthenticatedUser,
    @Query('gracePeriodMinutes') gracePeriodMinutes?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const graceMinutes = gracePeriodMinutes ? parseInt(gracePeriodMinutes, 10) : 15;
    return this.noShowProcessor.processAllPendingNoShows(organisationId, graceMinutes);
  }
}
