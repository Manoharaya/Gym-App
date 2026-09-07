import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { NotificationTemplateService } from '../services/notification-template.service';
import { NotificationSchedulerService } from '../services/notification-scheduler.service';
import {
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
  CreateNotificationScheduleDto,
} from '../dto/communication.dto';

@ApiTags('Communication Administration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('communication')
export class CommunicationAdminController {
  constructor(
    private readonly templateService: NotificationTemplateService,
    private readonly schedulerService: NotificationSchedulerService,
  ) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId =
      headerOrgId ||
      (user as any).organisationId ||
      user.primaryOrganisationId ||
      user.roles[0]?.organisationId;

    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  @Get('templates')
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER')
  @ApiOperation({ summary: 'List notification templates for organisation' })
  async getTemplates(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.templateService.getTemplates(orgId);
  }

  @Post('templates')
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER')
  @ApiOperation({ summary: 'Create custom organisation notification template' })
  async createTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateNotificationTemplateDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.templateService.createTemplate(orgId, dto, user);
  }

  @Put('templates/:id')
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER')
  @ApiOperation({ summary: 'Update custom organisation notification template' })
  async updateTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateNotificationTemplateDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.templateService.updateTemplate(orgId, id, dto, user);
  }

  @Get('schedules')
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER', 'TRAINER')
  @ApiOperation({ summary: 'List scheduled notifications' })
  async getSchedules(
    @CurrentUser() user: AuthenticatedUser,
    @Query('recipientUserId') recipientUserId?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.schedulerService.getSchedules(orgId, recipientUserId);
  }

  @Post('schedules')
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER', 'TRAINER')
  @ApiOperation({ summary: 'Schedule a notification' })
  async createSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateNotificationScheduleDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.schedulerService.scheduleNotification(orgId, dto);
  }

  @Delete('schedules/:id')
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER', 'TRAINER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a scheduled notification' })
  async cancelSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.schedulerService.cancelSchedule(orgId, id);
  }
}
