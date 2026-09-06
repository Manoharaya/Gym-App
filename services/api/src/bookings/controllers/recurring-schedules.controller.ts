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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { RecurringScheduleService } from '../services/recurring-schedule.service';
import {
  CreateRecurringScheduleDto,
  UpdateRecurringScheduleDto,
  GenerateScheduleSessionsDto,
} from '../dto';

@ApiTags('Recurring Schedules')
@ApiBearerAuth()
@Controller('recurring-schedules')
export class RecurringSchedulesController {
  constructor(private readonly recurringService: RecurringScheduleService) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || user.roles[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  @Post()
  @RequirePermission('schedules', 'MANAGE', 'ORGANISATION')
  @ApiOperation({ summary: 'Create a new recurring class schedule (Staff)' })
  async createSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRecurringScheduleDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);

    return this.recurringService.createSchedule(organisationId, {
      outletId: dto.outletId,
      classTemplateId: dto.classTemplateId,
      trainerId: dto.trainerId,
      resourceId: dto.resourceId,
      frequency: dto.frequency,
      dayOfWeek: dto.dayOfWeek,
      daysOfWeek: dto.daysOfWeek,
      startTime: dto.startTime,
      durationMinutes: dto.durationMinutes,
      customCapacity: dto.customCapacity,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      timezone: dto.timezone,
    });
  }

  @Get()
  @RequirePermission('schedules', 'VIEW', 'ORGANISATION')
  @ApiOperation({ summary: 'List recurring schedules for an organisation (Staff)' })
  async listSchedules(
    @CurrentUser() user: AuthenticatedUser,
    @Query('outletId') outletId?: string,
    @Query('isActive') isActiveStr?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const isActive = isActiveStr !== undefined ? isActiveStr === 'true' : undefined;

    return this.recurringService.listSchedules(organisationId, outletId, isActive);
  }

  @Get(':id')
  @RequirePermission('schedules', 'VIEW', 'ORGANISATION')
  @ApiOperation({ summary: 'Get recurring schedule details by ID (Staff)' })
  async getSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.recurringService.getSchedule(id, organisationId);
  }

  @Patch(':id')
  @RequirePermission('schedules', 'MANAGE', 'ORGANISATION')
  @ApiOperation({ summary: 'Update a recurring schedule (Staff)' })
  async updateSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringScheduleDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);

    return this.recurringService.updateSchedule(id, organisationId, {
      trainerId: dto.trainerId,
      resourceId: dto.resourceId,
      frequency: dto.frequency,
      dayOfWeek: dto.dayOfWeek,
      daysOfWeek: dto.daysOfWeek,
      startTime: dto.startTime,
      durationMinutes: dto.durationMinutes,
      customCapacity: dto.customCapacity,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      isActive: dto.isActive,
    });
  }

  @Get(':id/preview')
  @RequirePermission('schedules', 'VIEW', 'ORGANISATION')
  @ApiOperation({ summary: 'Preview upcoming session occurrences without writing to database' })
  async previewOccurrences(
    @Param('id') id: string,
    @Query('fromDate') fromDateStr: string,
    @Query('toDate') toDateStr: string,
  ) {
    const fromDate = fromDateStr ? new Date(fromDateStr) : new Date();
    const toDate = toDateStr
      ? new Date(toDateStr)
      : new Date(fromDate.getTime() + 14 * 24 * 60 * 60 * 1000);

    return this.recurringService.previewOccurrences(id, fromDate, toDate);
  }

  @Post(':id/generate')
  @RequirePermission('schedules', 'MANAGE', 'ORGANISATION')
  @ApiOperation({ summary: 'Generate concrete ClassSession records for a date range' })
  async generateSessions(
    @Param('id') id: string,
    @Body() dto: GenerateScheduleSessionsDto,
  ) {
    return this.recurringService.generateSessionsForSchedule(
      id,
      new Date(dto.fromDate),
      new Date(dto.toDate),
    );
  }

  @Post('generate-all')
  @RequirePermission('schedules', 'MANAGE', 'ORGANISATION')
  @ApiOperation({ summary: 'Batch generate sessions for all active schedules' })
  async generateAll(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateScheduleSessionsDto,
    @Query('outletId') outletId?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);

    return this.recurringService.generateAllActiveSchedules(
      organisationId,
      new Date(dto.fromDate),
      new Date(dto.toDate),
      outletId,
    );
  }
}
