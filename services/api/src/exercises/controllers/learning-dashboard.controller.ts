import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Headers,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { LearningDashboardService } from '../services/learning-dashboard.service';
import {
  LearningDashboardResponseDto,
  ResumePositionDto,
  QueryLearningHistoryDto,
  ExerciseLearningMasteryStatusDto,
} from '../dto/learning-dashboard.dto';

@ApiTags('Member Learning Dashboard & Progress Intelligence')
@ApiBearerAuth()
@Controller('learning')
export class LearningDashboardController {
  constructor(private readonly service: LearningDashboardService) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || (user as any).organisationId || user.roles?.[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get consolidated member learning dashboard with resume pointer, streak, and stats' })
  @ApiResponse({ status: 200, type: LearningDashboardResponseDto })
  async getDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<LearningDashboardResponseDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.service.getMemberLearningDashboard(orgId, user.id);
  }

  @Get('resume')
  @ApiOperation({ summary: 'Get deterministic resume learning position for member active curriculum' })
  @ApiResponse({ status: 200, type: ResumePositionDto })
  async getResume(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<ResumePositionDto | null> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.service.getResumeLearningPosition(orgId, user.id);
  }

  @Get('progress')
  @ApiOperation({ summary: 'Get detailed member learning progress overview (active, completed, explored)' })
  async getProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.service.getLearningProgressOverview(orgId, user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get paginated audit log of completed lessons and masterclasses' })
  async getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryLearningHistoryDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.service.getLearningHistory(orgId, user.id, query);
  }

  @Get('exercises/:exerciseId/status')
  @ApiOperation({ summary: 'Get member learning mastery state and curriculum links for specific exercise' })
  @ApiResponse({ status: 200, type: ExerciseLearningMasteryStatusDto })
  async getExerciseMastery(
    @CurrentUser() user: AuthenticatedUser,
    @Param('exerciseId') exerciseId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<ExerciseLearningMasteryStatusDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.service.getExerciseLearningMastery(orgId, user.id, exerciseId);
  }

  @Post('collections/:collectionId/interact')
  @ApiOperation({ summary: 'Track user interaction with an exercise collection pack' })
  async trackCollection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('collectionId') collectionId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.service.trackCollectionInteraction(orgId, user.id, collectionId);
  }
}
