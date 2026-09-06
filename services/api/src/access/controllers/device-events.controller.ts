import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { AccessDeviceService } from '../services/access-device.service';
import { CheckInService } from '../services/checkin.service';
import { RegisterAccessDeviceDto, DeviceEventDto } from '../dto/device-event.dto';

@ApiTags('Access Devices & Hardware')
@ApiBearerAuth()
@Controller('access/devices')
export class DeviceEventsController {
  constructor(
    private readonly deviceService: AccessDeviceService,
    private readonly checkinService: CheckInService
  ) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || user.roles[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  @Post('events')
  @ApiOperation({ summary: 'Device webhook endpoint for hardware scanners and turnstiles' })
  async handleDeviceEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DeviceEventDto,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);

    // Section 34 & 35: Device Tenant Isolation
    // Verifies the device actually belongs to the authenticated organisation
    const device = await this.deviceService.validateDeviceTenant(dto.deviceId, orgId);

    if (dto.eventType === 'ACCESS_REQUESTED' || dto.eventType === 'CHECK_IN') {
      return this.checkinService.checkIn(orgId, {
        outletId: device.outletId,
        deviceId: device.id,
        deviceEventId: dto.deviceEventId,
        credentialReference: dto.credentialReference,
        method: 'DEVICE',
        metadata: dto.metadata,
      });
    }

    return { received: true, eventId: dto.deviceEventId };
  }

  @Post(':id/heartbeat')
  @ApiOperation({ summary: 'Hardware device heartbeat signal' })
  async recordHeartbeat(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') deviceId: string,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    await this.deviceService.validateDeviceTenant(deviceId, orgId);
    return this.deviceService.recordHeartbeat(deviceId, 'ONLINE');
  }

  @Post()
  @RequirePermission('access_devices', 'MANAGE')
  @ApiOperation({ summary: 'Register a new access control device' })
  async registerDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterAccessDeviceDto,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.deviceService.registerDevice(orgId, dto);
  }

  @Get()
  @RequirePermission('access_devices', 'READ')
  @ApiOperation({ summary: 'List access control devices for an outlet' })
  async listDevices(
    @CurrentUser() user: AuthenticatedUser,
    @Query('outletId') outletId?: string,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.deviceService.listDevices(orgId, outletId);
  }

  @Get(':id')
  @RequirePermission('access_devices', 'READ')
  @ApiOperation({ summary: 'Get single access control device status' })
  async getDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') deviceId: string,
    @Headers('x-organisation-id') headerOrgId?: string
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.deviceService.getDevice(orgId, deviceId);
  }
}
