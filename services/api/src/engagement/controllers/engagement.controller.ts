import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { PrismaService } from '../../database/prisma.service';
import { EngagementEventService } from '../services/engagement-event.service';
import { EngagementContextService } from '../services/engagement-context.service';
import { EngagementEventProcessor } from '../processors/engagement-event.processor';
import {
  CreateEngagementEventDto,
  QueryEngagementHistoryDto,
} from '../dto/engagement.dto';

@ApiTags('Engagement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('engagement')
export class EngagementController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventService: EngagementEventService,
    private readonly contextService: EngagementContextService,
    private readonly eventProcessor: EngagementEventProcessor,
  ) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId =
      headerOrgId ||
      (user as any).organisationId ||
      (user as any).activeOrganisationId;
    if (!orgId) throw new ForbiddenException('Organisation context required');
    return orgId;
  }

  private async getMemberProfileId(user: AuthenticatedUser): Promise<string> {
    const member = await this.prisma.memberProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!member) throw new ForbiddenException('Member profile not found for user');
    return member.id;
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current member engagement profile' })
  async getMyEngagement(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.getMemberProfileId(user);
    const summary = await this.eventService.getMemberEngagementSummary(memberId, orgId);
    return summary.profile;
  }

  @Get('me/summary')
  @ApiOperation({ summary: 'Get current member engagement dashboard summary' })
  async getMyEngagementSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.getMemberProfileId(user);
    return this.eventService.getMemberEngagementSummary(memberId, orgId);
  }

  @Get('me/history')
  @ApiOperation({ summary: 'Get current member engagement event history' })
  async getMyEngagementHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryEngagementHistoryDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.getMemberProfileId(user);
    return this.eventService.getMemberEventHistory(memberId, orgId, query);
  }

  @Get('me/context')
  @ApiOperation({ summary: 'Get MemberEngagementContext data contract for future AI boundary (Slice 37)' })
  async getMyEngagementContext(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.getMemberProfileId(user);
    return this.contextService.buildMemberContext(memberId, orgId);
  }

  @Post('events')
  @ApiOperation({ summary: 'Record an engagement event' })
  async recordEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEngagementEventDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.getMemberProfileId(user);

    const event = await this.eventService.recordEvent(orgId, memberId, dto);
    await this.eventProcessor.processEvent(event as any);

    return event;
  }
}
