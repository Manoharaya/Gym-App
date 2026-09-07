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
import { PrismaService } from '../../database/prisma.service';
import { HabitService } from '../services/habit.service';
import {
  CreateHabitDto,
  AssignMemberHabitDto,
  LogHabitCompletionDto,
} from '../dto/engagement.dto';
import { HabitCategory, HabitStatus } from '@fitcore/types';

@ApiTags('Habits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('habits')
export class HabitsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly habitService: HabitService,
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
  @ApiOperation({ summary: 'List catalog and organisation habits' })
  async getHabitCatalog(
    @CurrentUser() user: AuthenticatedUser,
    @Query('category') category?: HabitCategory,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.habitService.getHabits(orgId, category);
  }

  @Get('my')
  @ApiOperation({ summary: 'List current member assigned habits' })
  async getMyHabits(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: HabitStatus,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.getMemberProfileId(user);
    return this.habitService.getMemberHabits(memberId, orgId, status);
  }

  @Post()
  @ApiOperation({ summary: 'Assign a habit to oneself' })
  async assignHabit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AssignMemberHabitDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.getMemberProfileId(user);
    return this.habitService.assignMemberHabit(orgId, memberId, dto, user.id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Log completion for a member habit' })
  async completeHabit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') memberHabitId: string,
    @Body() dto: LogHabitCompletionDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.getMemberProfileId(user);
    return this.habitService.logCompletion(orgId, memberId, memberHabitId, dto);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause a member habit' })
  async pauseHabit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') memberHabitId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.getMemberProfileId(user);
    return this.habitService.updateMemberHabitStatus(orgId, memberId, memberHabitId, HabitStatus.PAUSED);
  }

  @Post(':id/resume')
  @ApiOperation({ summary: 'Resume a member habit' })
  async resumeHabit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') memberHabitId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.getMemberProfileId(user);
    return this.habitService.updateMemberHabitStatus(orgId, memberId, memberHabitId, HabitStatus.ACTIVE);
  }
}
