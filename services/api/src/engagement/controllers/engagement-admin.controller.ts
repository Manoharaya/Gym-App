import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { EngagementAnalyticsService } from '../services/engagement-analytics.service';
import { ChallengeService } from '../services/challenge.service';
import { RewardService } from '../services/reward.service';
import { DailyEngagementProcessor } from '../processors/daily-engagement.processor';
import {
  CreateChallengeDto,
  UpdateChallengeDto,
  QueryChallengesDto,
  CreateRewardDto,
  QueryAnalyticsDto,
} from '../dto/engagement.dto';

@ApiTags('Admin Engagement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class EngagementAdminController {
  constructor(
    private readonly analyticsService: EngagementAnalyticsService,
    private readonly challengeService: ChallengeService,
    private readonly rewardService: RewardService,
    private readonly dailyProcessor: DailyEngagementProcessor,
  ) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId =
      headerOrgId ||
      (user as any).organisationId ||
      (user as any).activeOrganisationId;
    if (!orgId) throw new ForbiddenException('Organisation context required');
    return orgId;
  }

  private requireAdminRole(user: AuthenticatedUser): void {
    const role = (user as any).role || (user as any).activeRole;
    if (role !== 'SUPERADMIN' && role !== 'ORGANISATION_OWNER' && role !== 'OUTLET_MANAGER') {
      throw new ForbiddenException('Admin access required');
    }
  }

  @Get('engagement')
  @ApiOperation({ summary: 'Get organisation-wide engagement analytics dashboard' })
  async getOrganisationEngagement(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryAnalyticsDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.requireAdminRole(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.analyticsService.getOrganisationDashboard(orgId, query);
  }

  @Get('engagement/outlet/:outletId')
  @ApiOperation({ summary: 'Get outlet-scoped engagement dashboard' })
  async getOutletEngagement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('outletId') outletId: string,
    @Query() query: QueryAnalyticsDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.requireAdminRole(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.analyticsService.getOutletDashboard(orgId, outletId, query);
  }

  @Get('challenges')
  @ApiOperation({ summary: 'Admin list all organisation challenges' })
  async listChallenges(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryChallengesDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.requireAdminRole(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.challengeService.getChallenges(orgId, query);
  }

  @Post('challenges')
  @ApiOperation({ summary: 'Admin create a challenge' })
  async createChallenge(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateChallengeDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.requireAdminRole(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.challengeService.createChallenge(orgId, dto, user.id);
  }

  @Put('challenges/:id')
  @ApiOperation({ summary: 'Admin update a challenge' })
  async updateChallenge(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateChallengeDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.requireAdminRole(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.challengeService.updateChallenge(id, orgId, dto, user.id);
  }

  @Post('rewards')
  @ApiOperation({ summary: 'Admin create a reward catalog entry' })
  async createReward(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRewardDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.requireAdminRole(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.rewardService.createReward(orgId, dto, user.id);
  }

  @Post('engagement/daily-process')
  @ApiOperation({ summary: 'Admin trigger daily engagement batch recalculation' })
  async runDailyProcess(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    this.requireAdminRole(user);
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.dailyProcessor.runDailyProcess(orgId);
  }
}
