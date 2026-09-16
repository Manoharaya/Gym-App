import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { ExerciseInstructionsService } from '../services/exercise-instructions.service';
import {
  UpsertExerciseInstructionDto,
  CreateExerciseInstructionStepDto,
  UpdateExerciseInstructionStepDto,
  ReorderInstructionStepsDto,
  AttachStepMediaDto,
} from '../dto/exercise-instructions.dto';

@ApiTags('Exercise Instructions')
@ApiBearerAuth()
@Controller()
export class ExerciseInstructionsController {
  constructor(private readonly instructionsService: ExerciseInstructionsService) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || (user as any).organisationId || user.roles?.[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  @Get('exercises/:id/instruction')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Get exercise instruction guide with all steps and enriched media' })
  async getInstruction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.instructionsService.getInstruction(organisationId, id, user);
  }

  @Put('exercises/:id/instruction')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Upsert instruction overview guide and metadata for an exercise' })
  async upsertInstruction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpsertExerciseInstructionDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.instructionsService.upsertInstruction(organisationId, id, dto, user);
  }

  @Post('exercises/:id/instruction/steps')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Add a new step to the exercise instruction sequence' })
  async createStep(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateExerciseInstructionStepDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.instructionsService.createStep(organisationId, id, dto, user);
  }

  @Post('exercises/:id/instruction/reorder')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Reorder steps atomically' })
  async reorderSteps(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReorderInstructionStepsDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.instructionsService.reorderSteps(organisationId, id, dto, user);
  }

  @Post('exercises/:id/instruction/publish')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Publish instruction sequence and mark all steps live' })
  async publishInstruction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.instructionsService.publishInstruction(organisationId, id, user);
  }

  @Patch('exercise-instruction-steps/:id')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Update an individual instruction step' })
  async updateStep(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExerciseInstructionStepDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.instructionsService.updateStep(organisationId, id, dto, user);
  }

  @Delete('exercise-instruction-steps/:id')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Delete an individual instruction step and re-index sequence' })
  async deleteStep(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.instructionsService.deleteStep(organisationId, id, user);
  }

  @Post('exercise-instruction-steps/:id/media')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Bind media asset to an instruction step with optional video clip offsets' })
  async attachStepMedia(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AttachStepMediaDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.instructionsService.attachStepMedia(organisationId, id, dto, user);
  }
}
