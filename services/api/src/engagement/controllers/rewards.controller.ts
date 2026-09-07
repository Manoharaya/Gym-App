import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Headers,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { PrismaService } from '../../database/prisma.service';
import { RewardService } from '../services/reward.service';
import { RedeemRewardDto } from '../dto/engagement.dto';

@ApiTags('Rewards & Achievements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class RewardsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rewardService: RewardService,
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

  @Get('rewards')
  @ApiOperation({ summary: 'List available rewards' })
  async getRewards(
    @CurrentUser() user: AuthenticatedUser,
    @Query('outletId') outletId?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.rewardService.getRewards(orgId, outletId);
  }

  @Get('rewards/:id')
  @ApiOperation({ summary: 'Get reward details' })
  async getRewardById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const reward = await this.prisma.reward.findUnique({ where: { id } });
    if (!reward || reward.organisationId !== orgId) {
      throw new NotFoundException('Reward not found');
    }
    return reward;
  }

  @Post('rewards/:id/redeem')
  @ApiOperation({ summary: 'Redeem a member reward' })
  async redeemReward(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') memberRewardId: string,
    @Body() dto: RedeemRewardDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.getMemberProfileId(user);
    return this.rewardService.redeemReward(orgId, memberId, memberRewardId, dto.redemptionNotes);
  }

  @Get('achievements')
  @ApiOperation({ summary: 'Get current member badges and rewards' })
  async getAchievements(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.getMemberProfileId(user);
    return this.rewardService.getMemberAchievements(memberId, orgId);
  }
}
