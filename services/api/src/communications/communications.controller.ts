import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/request-with-user.interface';
import { CommunicationsService } from './communications.service';
import { SendCommunicationDto } from './dto/send-communication.dto';
import { UpdatePreferenceDto } from './dto/preference.dto';
import { RegisterDeviceDto } from './dto/device-token.dto';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  CreateTemplateVersionDto,
} from './dto/template.dto';

@ApiTags('Communications & Notification Engine')
@Controller('communications')
export class CommunicationsController {
  constructor(private readonly communicationsService: CommunicationsService) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId =
      headerOrgId ||
      (user as any).organisationId ||
      user.primaryOrganisationId ||
      user.roles?.[0]?.organisationId;

    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  // ---------------------------------------------------------------------------
  // WEBHOOKS (Public / Provider-Signed, Section 36, 37)
  // ---------------------------------------------------------------------------
  @Post('webhooks/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Provider delivery tracking webhook' })
  async handleWebhook(
    @Param('provider') provider: string,
    @Body() payload: unknown,
    @Headers('x-signature') signature?: string,
  ) {
    return this.communicationsService.handleWebhook(provider, payload, signature);
  }

  // ---------------------------------------------------------------------------
  // PREFERENCES (Member & Staff, Section 22, 50)
  // ---------------------------------------------------------------------------
  @Get('preferences')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get communication preferences for current user' })
  async getPreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.communicationsService.getPreferences(user.id, orgId);
  }

  @Patch('preferences')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update communication preference' })
  async updatePreference(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePreferenceDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.communicationsService.updatePreference(user.id, orgId, dto);
  }

  // ---------------------------------------------------------------------------
  // NOTIFICATIONS (In-App Member Center, Section 16, 49)
  // ---------------------------------------------------------------------------
  @Get('notifications')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get in-app notifications for authenticated member' })
  async getNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: any,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.communicationsService.getInAppNotifications(user.id, orgId, query);
  }

  @Post('notifications/:id/read')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark in-app notification as read' })
  async markNotificationRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.communicationsService.markNotificationRead(id, user.id, orgId);
  }

  // ---------------------------------------------------------------------------
  // PUSH DEVICES (Section 15)
  // ---------------------------------------------------------------------------
  @Post('devices')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Register push device token' })
  async registerDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterDeviceDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.communicationsService.registerDevice(user.id, orgId, dto);
  }

  // ---------------------------------------------------------------------------
  // TEMPLATES (Section 17, 18, 55)
  // ---------------------------------------------------------------------------
  @Get('templates')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List communication templates' })
  async getTemplates(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: any,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.communicationsService.getTemplates(orgId, query);
  }

  @Post('templates')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER')
  @ApiOperation({ summary: 'Create new communication template' })
  async createTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTemplateDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.communicationsService.createTemplate(dto, orgId, user.id);
  }

  @Patch('templates/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER')
  @ApiOperation({ summary: 'Update communication template' })
  async updateTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.communicationsService.updateTemplate(id, dto, orgId, user.id);
  }

  @Get('templates/:id/versions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List version history for a template' })
  async getTemplateVersions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.communicationsService.getTemplateVersions(id, orgId);
  }

  @Post('templates/:id/versions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER')
  @ApiOperation({ summary: 'Create new version for template' })
  async createTemplateVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateTemplateVersionDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.communicationsService.createTemplateVersion(id, dto, orgId, user.id);
  }

  // ---------------------------------------------------------------------------
  // ANALYTICS (Section 58, 59)
  // ---------------------------------------------------------------------------
  @Get('analytics')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER')
  @ApiOperation({ summary: 'Get communication delivery and cost analytics' })
  async getAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.communicationsService.getAnalytics(orgId, startDate, endDate);
  }

  // ---------------------------------------------------------------------------
  // COMMUNICATIONS ORCHESTRATION (Section 28, 72)
  // ---------------------------------------------------------------------------
  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Send or queue a communication' })
  async sendCommunication(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendCommunicationDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.communicationsService.sendCommunication(dto, orgId, user.id);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List communications history' })
  async getCommunications(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: any,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.communicationsService.getCommunications(orgId, query);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get single communication details' })
  async getCommunicationById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.communicationsService.getCommunicationById(id, orgId);
  }

  @Post(':id/approve')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a PENDING_APPROVAL communication' })
  async approveCommunication(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.communicationsService.approveCommunication(id, user.id, orgId);
  }

  @Post(':id/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending or scheduled communication' })
  async cancelCommunication(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.communicationsService.cancelCommunication(id, user.id, orgId);
  }

  @Post(':id/retry')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry a failed communication' })
  async retryCommunication(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.communicationsService.retryCommunication(id, user.id, orgId);
  }
}
