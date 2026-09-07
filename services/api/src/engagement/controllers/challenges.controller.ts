import {
  Controller,
  Get,
  Post,
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
import { PrismaService } from '../../database/prisma.service';
import { ChallengeService } from '../services/challenge.service';
import { QueryChallengesDto } from '../dto/engagement.dto';

@ApiTags('Challenges')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('challenges')
export class ChallengesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly challengeService: ChallengeService,
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

  @Get()
  @ApiOperation({ summary: 'List published and active challenges' })
  async getChallenges(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryChallengesDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    let memberId: string | undefined;
    try {
      memberId = await this.getMemberProfileId(user);
    } catch {
      // User may be staff browsing
    }
    return this.challengeService.getChallenges(orgId, query, memberId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get challenge details' })
  async getChallengeById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    let memberId: string | undefined;
    try {
      memberId = await this.getMemberProfileId(user);
    } catch (_ignored) {
      // Optional member profile for non-member callers
    }
    return this.challengeService.getChallengeById(id, orgId, memberId);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a challenge' })
  async joinChallenge(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') challengeId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.getMemberProfileId(user);
    return this.challengeService.joinChallenge(challengeId, memberId, orgId);
  }

  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave / withdraw from a challenge' })
  async leaveChallenge(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') challengeId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.getMemberProfileId(user);
    return this.challengeService.leaveChallenge(challengeId, memberId, orgId);
  }

  @Get(':id/progress')
  @ApiOperation({ summary: 'Get participant progress for a challenge' })
  async getProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') challengeId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.getMemberProfileId(user);
    const detail = await this.challengeService.getChallengeById(challengeId, orgId, memberId);
    return detail.myProgress;
  }

  @Get(':id/leaderboard')
  @ApiOperation({ summary: 'Get privacy-safe challenge leaderboard' })
  async getLeaderboard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') challengeId: string,
    @Query('limit') limitStr?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    return this.challengeService.getChallengeLeaderboard(challengeId, orgId, limit);
  }
}
