import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Headers,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { VisualMovementCoachService } from '../services/visual-movement-coach.service';
import {
  CreateMovementExpectationDto,
  UpdateMovementExpectationDto,
  CreateMovementFeedbackRuleDto,
  UpdateMovementFeedbackRuleDto,
  VisualMovementCoachResponseDto,
  TechniqueChecklistItemDto,
} from '../dto/visual-movement-coach.dto';

@ApiTags('Visual Movement Coach')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class VisualMovementCoachController {
  constructor(
    private readonly coachService: VisualMovementCoachService,
  ) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId =
      headerOrgId ||
      (user as any).organisationId ||
      user.roles?.[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException(
        'Tenant context required: active organisation not identified',
      );
    }
    return orgId;
  }

  // =========================================================================
  // 1. CONSOLIDATED MOVEMENT COACH READ MODEL
  // =========================================================================

  @Get('exercises/:id/movement-coach')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary:
      'Get consolidated Visual Movement Coach payload including phases, prioritized expectations, cues, mistakes, and checklist',
  })
  async getMovementCoach(
    @Param('id') exerciseId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<VisualMovementCoachResponseDto> {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.coachService.getMovementCoachData(organisationId, exerciseId, user);
  }

  @Get('exercises/:id/technique-checklist')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary: 'Get technique checklist for an exercise',
  })
  async getTechniqueChecklist(
    @Param('id') exerciseId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<TechniqueChecklistItemDto[]> {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.coachService.getTechniqueChecklist(organisationId, exerciseId, user);
  }

  // =========================================================================
  // 2. MOVEMENT EXPECTATIONS CRUD (Trainers / Admins)
  // =========================================================================

  @Get('exercises/:id/movement-expectations')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary: 'List movement expectations for an exercise',
  })
  async getExpectations(
    @Param('id') exerciseId: string,
    @Query('phaseId') phaseId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.coachService.getExpectations(organisationId, exerciseId, phaseId, user);
  }

  @Post('exercises/:id/movement-expectations')
  @RequirePermission('exercises', 'update')
  @ApiOperation({
    summary: 'Create a new movement expectation for an exercise',
  })
  async createExpectation(
    @Param('id') exerciseId: string,
    @Body() dto: CreateMovementExpectationDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.coachService.createExpectation(organisationId, exerciseId, dto, user);
  }

  @Patch('movement-expectations/:id')
  @RequirePermission('exercises', 'update')
  @ApiOperation({
    summary: 'Update an existing movement expectation',
  })
  async updateExpectation(
    @Param('id') expectationId: string,
    @Body() dto: UpdateMovementExpectationDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.coachService.updateExpectation(organisationId, expectationId, dto, user);
  }

  @Delete('movement-expectations/:id')
  @RequirePermission('exercises', 'update')
  @ApiOperation({
    summary: 'Delete a movement expectation',
  })
  async deleteExpectation(
    @Param('id') expectationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.coachService.deleteExpectation(organisationId, expectationId, user);
  }

  // =========================================================================
  // 3. MOVEMENT FEEDBACK RULES CRUD (Trainers / Admins)
  // =========================================================================

  @Get('exercises/:id/movement-feedback-rules')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary: 'List movement feedback rules for an exercise',
  })
  async getFeedbackRules(
    @Param('id') exerciseId: string,
    @Query('phaseId') phaseId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.coachService.getFeedbackRules(organisationId, exerciseId, phaseId, user);
  }

  @Post('exercises/:id/movement-feedback-rules')
  @RequirePermission('exercises', 'update')
  @ApiOperation({
    summary: 'Create a movement feedback rule for future pose deviation comparison',
  })
  async createFeedbackRule(
    @Param('id') exerciseId: string,
    @Body() dto: CreateMovementFeedbackRuleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.coachService.createFeedbackRule(organisationId, exerciseId, dto, user);
  }

  @Patch('movement-feedback-rules/:id')
  @RequirePermission('exercises', 'update')
  @ApiOperation({
    summary: 'Update an existing movement feedback rule',
  })
  async updateFeedbackRule(
    @Param('id') ruleId: string,
    @Body() dto: UpdateMovementFeedbackRuleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.coachService.updateFeedbackRule(organisationId, ruleId, dto, user);
  }

  @Delete('movement-feedback-rules/:id')
  @RequirePermission('exercises', 'update')
  @ApiOperation({
    summary: 'Delete a movement feedback rule',
  })
  async deleteFeedbackRule(
    @Param('id') ruleId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.coachService.deleteFeedbackRule(organisationId, ruleId, user);
  }
}
