import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { TrainingGoalService } from '../services/training-goal.service';
import {
  CreateTrainingGoalDto,
  UpdateTrainingGoalDto,
  UpdateGoalProgressDto,
} from '../dto/personal-training.dto';

@ApiTags('Training Goals')
@ApiBearerAuth()
@Controller()
export class TrainingGoalsController {
  constructor(private readonly goalService: TrainingGoalService) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || (user as any).organisationId || user.roles[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  @Post('members/:memberId/goals')
  @RequirePermission('training_goals', 'manage')
  @ApiOperation({ summary: 'Create a fitness goal for a member' })
  async createGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Body() dto: CreateTrainingGoalDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.goalService.createGoal(organisationId, memberId, dto, user);
  }

  @Get('members/:memberId/goals')
  @RequirePermission('training_goals', 'read')
  @ApiOperation({ summary: 'List all goals for a member' })
  async findMemberGoals(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Query('status') statusFilter?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.goalService.findMemberGoals(organisationId, memberId, user, statusFilter);
  }

  @Get('goals/:id')
  @RequirePermission('training_goals', 'read')
  @ApiOperation({ summary: 'Get a single goal by ID with historical records' })
  async findGoalById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.goalService.findGoalById(organisationId, id, user);
  }

  @Patch('goals/:id')
  @RequirePermission('training_goals', 'manage')
  @ApiOperation({ summary: 'Update goal target, dates, or priority' })
  async updateGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTrainingGoalDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.goalService.updateGoal(organisationId, id, dto, user);
  }

  @Post('goals/:id/progress')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('training_goals', 'manage')
  @ApiOperation({ summary: 'Record progress on a goal and update history' })
  async recordProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateGoalProgressDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.goalService.recordProgress(organisationId, id, dto, user);
  }

  @Post('goals/:id/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('training_goals', 'manage')
  @ApiOperation({ summary: 'Mark a goal as completed' })
  async completeGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.goalService.completeGoal(organisationId, id, user);
  }
}
