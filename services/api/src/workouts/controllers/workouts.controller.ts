import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { WorkoutsService } from '../services/workouts.service';
import { WorkoutPerformanceService } from '../services/workout-performance.service';
import {
  AssignWorkoutDto,
  CompleteWorkoutDto,
  WorkoutQueryDto,
  LogWorkoutSetDto,
  CorrectWorkoutSetDto,
} from '../dto/workout.dto';
import {
  CreateExerciseGroupDto,
  UpdateExerciseGroupDto,
} from '../../training-plans/dto/exercise-group.dto';

@ApiTags('Workouts')
@ApiBearerAuth()
@Controller('workouts')
export class WorkoutsController {
  constructor(
    private readonly workoutsService: WorkoutsService,
    private readonly performanceService: WorkoutPerformanceService,
  ) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || (user as any).organisationId || user.roles?.[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  @Get()
  @RequirePermission('workouts', 'read')
  @ApiOperation({ summary: 'List workouts matching query filters' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: WorkoutQueryDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.workoutsService.findAll(organisationId, query, user);
  }

  @Get(':id')
  @RequirePermission('workouts', 'read')
  @ApiOperation({ summary: 'Get workout details by ID' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.workoutsService.findById(organisationId, id, user);
  }

  @Post('assign')
  @RequirePermission('workouts', 'create')
  @ApiOperation({ summary: 'Assign a workout to a member' })
  async assignWorkout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AssignWorkoutDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.workoutsService.assignWorkout(organisationId, dto, user);
  }

  @Post('process-overdue')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('workouts', 'manage')
  @ApiOperation({ summary: 'Process overdue scheduled workouts (background worker trigger)' })
  async processOverdueWorkouts(
    @CurrentUser() user: AuthenticatedUser,
    @Query('thresholdDays') thresholdDays?: number,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.workoutsService.processOverdueWorkouts(organisationId, thresholdDays ? Number(thresholdDays) : 2);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('workouts', 'update')
  @ApiOperation({ summary: 'Start a workout' })
  async startWorkout(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.workoutsService.startWorkout(organisationId, id, user);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('workouts', 'update')
  @ApiOperation({ summary: 'Complete a workout' })
  async completeWorkout(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CompleteWorkoutDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.workoutsService.completeWorkout(organisationId, id, dto, user);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('workouts', 'update')
  @ApiOperation({ summary: 'Cancel a workout' })
  async cancelWorkout(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.workoutsService.cancelWorkout(organisationId, id, user);
  }

  @Post('exercises/:exerciseId/sets')
  @RequirePermission('workouts', 'update')
  @ApiOperation({ summary: 'Log a completed or performed set' })
  async logSet(
    @CurrentUser() user: AuthenticatedUser,
    @Param('exerciseId') workoutExerciseId: string,
    @Body() dto: LogWorkoutSetDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.performanceService.logSet(organisationId, workoutExerciseId, dto, user);
  }

  @Patch('sets/:setId/correct')
  @RequirePermission('workouts', 'update')
  @ApiOperation({ summary: 'Retroactively correct a logged set with audited justification' })
  async correctSet(
    @CurrentUser() user: AuthenticatedUser,
    @Param('setId') setId: string,
    @Body() dto: CorrectWorkoutSetDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.performanceService.correctSet(organisationId, setId, dto, user);
  }

  @Delete('sets/:setId')
  @RequirePermission('workouts', 'update')
  @ApiOperation({ summary: 'Delete an erroneous logged set' })
  async deleteSet(
    @CurrentUser() user: AuthenticatedUser,
    @Param('setId') setId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.performanceService.deleteSet(organisationId, setId, user);
  }

  @Post(':id/groups')
  @RequirePermission('workouts', 'manage')
  @ApiOperation({ summary: 'Create an exercise group (superset, circuit, etc.) in a workout' })
  async createExerciseGroup(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateExerciseGroupDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.workoutsService.createExerciseGroup(organisationId, id, dto, user);
  }

  @Patch(':id/groups/:groupId')
  @RequirePermission('workouts', 'manage')
  @ApiOperation({ summary: 'Update an exercise group in a workout' })
  async updateExerciseGroup(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @Body() dto: UpdateExerciseGroupDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.workoutsService.updateExerciseGroup(organisationId, id, groupId, dto, user);
  }

  @Delete(':id/groups/:groupId')
  @RequirePermission('workouts', 'manage')
  @ApiOperation({ summary: 'Delete an exercise group from a workout' })
  async deleteExerciseGroup(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.workoutsService.deleteExerciseGroup(organisationId, id, groupId, user);
  }
}
