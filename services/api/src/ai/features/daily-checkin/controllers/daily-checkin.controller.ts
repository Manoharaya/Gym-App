import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Headers,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../../common/interfaces/request-with-user.interface';
import { PrismaService } from '../../../../database/prisma.service';
import { DailyCheckInService } from '../services/daily-checkin.service';
import { CreateDailyCheckInDto } from '../dto/create-daily-checkin.dto';
import { SubmitDailyCheckInDto } from '../dto/submit-daily-checkin.dto';
import { DailyCheckInFeedbackDto } from '../dto/daily-checkin-feedback.dto';
import { UpdateDailyCheckInSettingsDto } from '../dto/daily-checkin-settings.dto';

@ApiTags('AI Daily Check-In')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ai/daily-checkin')
export class DailyCheckInController {
  constructor(
    private readonly dailyCheckInService: DailyCheckInService,
    private readonly prisma: PrismaService,
  ) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || (user as any).organisationId || user.roles?.[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  private async resolveMemberProfileId(user: AuthenticatedUser, organisationId: string): Promise<string> {
    const profile = await this.prisma.memberProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile || profile.organisationId !== organisationId) {
      throw new ForbiddenException('Active member profile required for daily check-in');
    }

    return profile.id;
  }

  @Post('start')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Initialize or resume a daily check-in session for today' })
  async startCheckIn(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId: string,
    @Body() dto: CreateDailyCheckInDto,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    return this.dailyCheckInService.startCheckIn(memberId, organisationId, dto);
  }

  @Post('submit')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiHeader({ name: 'idempotency-key', required: false, description: 'Optional unique request idempotency key' })
  @ApiOperation({ summary: 'Submit daily check-in responses and generate safe daily intelligence' })
  async submitCheckIn(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() dto: SubmitDailyCheckInDto,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    return this.dailyCheckInService.submitCheckIn(memberId, organisationId, dto, idempotencyKey);
  }

  @Get('today')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Get current calendar day check-in status and intelligence' })
  async getToday(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId: string,
    @Query('date') date?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    return this.dailyCheckInService.getTodayCheckIn(memberId, organisationId, date);
  }

  @Get('history')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Get past daily check-ins and trend indicators' })
  async getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    const take = limit ? parseInt(limit, 10) : 14;
    const skip = offset ? parseInt(offset, 10) : 0;
    return this.dailyCheckInService.getCheckInHistory(memberId, organisationId, take, skip);
  }

  @Get('settings')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Get member daily check-in and reminder preferences' })
  async getSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    return this.dailyCheckInService.getSettings(memberId, organisationId);
  }

  @Patch('settings')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Update member daily check-in preferences and reminder time' })
  async updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId: string,
    @Body() dto: UpdateDailyCheckInSettingsDto,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    return this.dailyCheckInService.updateSettings(memberId, organisationId, dto);
  }

  @Get('trainer/client/:memberId')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Authorized trainer scoped overview of client check-in' })
  async getTrainerClientSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId: string,
    @Param('memberId') targetMemberId: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.dailyCheckInService.getTrainerClientSummary(targetMemberId, user.id, organisationId);
  }

  @Get(':id/privacy')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Transparent privacy view of data sources used vs excluded' })
  async getPrivacyView(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId: string,
    @Param('id') id: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    return this.dailyCheckInService.getPrivacyView(id, memberId, organisationId);
  }

  @Post(':id/regenerate')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Regenerate daily intelligence for a completed check-in' })
  async regenerate(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId: string,
    @Param('id') id: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    return this.dailyCheckInService.regenerateCheckIn(id, memberId, organisationId);
  }

  @Post(':id/feedback')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Submit feedback on daily check-in recommendations' })
  async submitFeedback(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId: string,
    @Param('id') id: string,
    @Body() dto: DailyCheckInFeedbackDto,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    return this.dailyCheckInService.submitFeedback(id, memberId, organisationId, dto);
  }

  @Get(':id')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Get daily check-in details by ID' })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId: string,
    @Param('id') id: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    return this.dailyCheckInService.getCheckInById(id, memberId, organisationId);
  }
}
