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
import { TrainingPlansService } from '../services/training-plans.service';
import { TrainingPlanGenerationService } from '../services/training-plan-generation.service';
import { TrainingAdherenceService } from '../services/training-adherence.service';
import {
  CreateTrainingPlanDto,
  UpdateTrainingPlanDto,
  CreateTrainingPlanWeekDto,
  UpdateTrainingPlanWeekDto,
  CreateTrainingPlanDayDto,
  UpdateTrainingPlanDayDto,
  GenerateWorkoutsFromTemplateDto,
  TrainingPlanQueryDto,
  TrainingPlanStatusEnum,
} from '../dto/training-plan.dto';
import {
  CreateProgressionRuleDto,
  UpdateProgressionRuleDto,
} from '../dto/progression-rule.dto';

@ApiTags('Training Plans')
@ApiBearerAuth()
@Controller('training-plans')
export class TrainingPlansController {
  constructor(
    private readonly plansService: TrainingPlansService,
    private readonly generationService: TrainingPlanGenerationService,
    private readonly adherenceService: TrainingAdherenceService,
  ) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || (user as any).organisationId || user.roles?.[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  @Get()
  @RequirePermission('training_plans', 'read')
  @ApiOperation({ summary: 'List training plans with filtering and pagination' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TrainingPlanQueryDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.plansService.findAll(organisationId, query, user);
  }

  @Get(':id')
  @RequirePermission('training_plans', 'read')
  @ApiOperation({ summary: 'Get training plan details by ID' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.plansService.findOne(organisationId, id, user);
  }

  @Post()
  @RequirePermission('training_plans', 'manage')
  @ApiOperation({ summary: 'Create a new multi-week training plan' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTrainingPlanDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.plansService.create(organisationId, dto, user);
  }

  @Patch(':id')
  @RequirePermission('training_plans', 'manage')
  @ApiOperation({ summary: 'Update training plan details' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTrainingPlanDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.plansService.update(organisationId, id, dto, user);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('training_plans', 'manage')
  @ApiOperation({ summary: 'Activate a training plan' })
  async activate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.plansService.update(
      organisationId,
      id,
      { status: TrainingPlanStatusEnum.ACTIVE },
      user,
    );
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('training_plans', 'manage')
  @ApiOperation({ summary: 'Pause an active training plan' })
  async pause(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.plansService.update(
      organisationId,
      id,
      { status: TrainingPlanStatusEnum.PAUSED },
      user,
    );
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('training_plans', 'manage')
  @ApiOperation({ summary: 'Archive a training plan' })
  async archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.plansService.update(
      organisationId,
      id,
      { status: TrainingPlanStatusEnum.ARCHIVED },
      user,
    );
  }

  @Post(':id/weeks')
  @RequirePermission('training_plans', 'manage')
  @ApiOperation({ summary: 'Add a periodized week to a training plan' })
  async addWeek(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateTrainingPlanWeekDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.plansService.addWeek(organisationId, id, dto, user);
  }

  @Patch(':id/weeks/:weekId')
  @RequirePermission('training_plans', 'manage')
  @ApiOperation({ summary: 'Update a training plan week' })
  async updateWeek(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('weekId') weekId: string,
    @Body() dto: UpdateTrainingPlanWeekDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.plansService.updateWeek(organisationId, id, weekId, dto, user);
  }

  @Post(':id/weeks/:weekId/days')
  @RequirePermission('training_plans', 'manage')
  @ApiOperation({ summary: 'Add a day schedule to a training plan week' })
  async addDay(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('weekId') weekId: string,
    @Body() dto: CreateTrainingPlanDayDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.plansService.addDay(organisationId, id, weekId, dto, user);
  }

  @Patch(':id/days/:dayId')
  @RequirePermission('training_plans', 'manage')
  @ApiOperation({ summary: 'Update a training plan day (schedule workout or rest day)' })
  async updateDay(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('dayId') dayId: string,
    @Body() dto: UpdateTrainingPlanDayDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.plansService.updateDay(organisationId, id, dayId, dto, user);
  }

  @Post(':id/generate-workouts')
  @RequirePermission('training_plans', 'manage')
  @ApiOperation({ summary: 'Generate multi-week workouts from template with progression rules' })
  async generateWorkouts(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: GenerateWorkoutsFromTemplateDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.generationService.generateWorkouts(organisationId, id, dto, user);
  }

  @Get(':id/adherence')
  @RequirePermission('training_plans', 'read')
  @ApiOperation({ summary: 'Get adherence metrics and completion breakdown for training plan' })
  async getAdherence(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.adherenceService.calculateAdherence(organisationId, id, user);
  }

  @Get(':id/calendar')
  @RequirePermission('training_plans', 'read')
  @ApiOperation({ summary: 'Get calendar view of scheduled workouts and rest days for plan' })
  async getCalendar(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.plansService.getCalendar(organisationId, id, startDate, endDate, user);
  }

  @Post(':id/progression-rules')
  @RequirePermission('training_plans', 'manage')
  @ApiOperation({ summary: 'Add a progression rule to a training plan' })
  async addProgressionRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateProgressionRuleDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.plansService.addProgressionRule(organisationId, id, dto, user);
  }

  @Patch(':id/progression-rules/:ruleId')
  @RequirePermission('training_plans', 'manage')
  @ApiOperation({ summary: 'Update a progression rule configuration (historical workouts unchanged)' })
  async updateProgressionRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdateProgressionRuleDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.plansService.updateProgressionRule(organisationId, id, ruleId, dto, user);
  }
}
