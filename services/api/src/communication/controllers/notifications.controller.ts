import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { NotificationService } from '../services/notification.service';
import { NotificationPreferenceService } from '../services/notification-preference.service';
import { PushDeviceService } from '../services/push-device.service';
import {
  QueryNotificationsDto,
  MarkNotificationReadDto,
  UpdateNotificationPreferencesDto,
  RegisterPushDeviceDto,
} from '../dto/communication.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class NotificationsController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly preferenceService: NotificationPreferenceService,
    private readonly pushDeviceService: PushDeviceService,
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

  @Get('notifications')
  @ApiOperation({ summary: 'Get paginated notifications for current user' })
  async getNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryNotificationsDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.notificationService.getNotifications(user.id, orgId, query);
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: 'Get unread notification count for current user' })
  async getUnreadCount(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.notificationService.getUnreadCount(user.id, orgId);
  }

  @Get('notifications/:id')
  @ApiOperation({ summary: 'Get single notification by ID' })
  async getNotificationById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.notificationService.getNotificationById(user.id, orgId, id);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Mark notification as read or unread' })
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: MarkNotificationReadDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.notificationService.markAsRead(user.id, orgId, id, dto.read);
  }

  @Patch('notifications/read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  async markAllAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.notificationService.markAllAsRead(user.id, orgId);
  }

  @Delete('notifications/:id')
  @ApiOperation({ summary: 'Delete a notification' })
  async deleteNotification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.notificationService.deleteNotification(user.id, orgId, id);
  }

  @Get('notification-preferences')
  @ApiOperation({ summary: 'Get notification preferences for current user' })
  async getPreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.preferenceService.getUserPreferences(user.id, orgId);
  }

  @Put('notification-preferences')
  @ApiOperation({ summary: 'Update notification preferences for a category/channel' })
  async updatePreference(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateNotificationPreferencesDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.preferenceService.updatePreference(user.id, orgId, dto);
  }

  @Post('push-devices')
  @ApiOperation({ summary: 'Register a device push notification token' })
  async registerPushDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterPushDeviceDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.pushDeviceService.registerDevice(user.id, orgId, dto);
  }

  @Get('push-devices')
  @ApiOperation({ summary: 'List registered push devices for current user' })
  async listPushDevices(@CurrentUser() user: AuthenticatedUser) {
    return this.pushDeviceService.getUserDevices(user.id);
  }

  @Delete('push-devices/:id')
  @ApiOperation({ summary: 'Revoke a registered push device' })
  async revokePushDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') deviceId: string,
  ) {
    return this.pushDeviceService.revokeDevice(user.id, deviceId);
  }
}
