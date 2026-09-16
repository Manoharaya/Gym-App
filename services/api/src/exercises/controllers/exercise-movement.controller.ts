import {
  Controller,
  Get,
  Post,
  Put,
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
import { ExerciseMovementService } from '../services/exercise-movement.service';
import {
  CreateMovementPhaseDto,
  UpdateMovementPhaseDto,
  ReorderMovementPhasesDto,
  AttachPhaseMediaDto,
  LinkPhaseInstructionStepsDto,
  UpdateExerciseMovementStructureDto,
} from '../dto/exercise-movement.dto';

@ApiTags('Exercise Movement & Phases')
@ApiBearerAuth()
@Controller()
export class ExerciseMovementController {
  constructor(private readonly movementService: ExerciseMovementService) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || (user as any).organisationId || user.roles?.[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  @Get('exercises/:id/movement')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Get full exercise movement structure, phases lifecycle, and AI intelligence' })
  async getMovementStructure(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.movementService.getMovementStructure(organisationId, id, user);
  }

  @Put('exercises/:id/movement')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Update exercise top-level movement blueprint (secondary patterns, repetition type, tempo)' })
  async updateMovementStructure(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExerciseMovementStructureDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.movementService.updateExerciseMovementStructure(organisationId, id, dto, user);
  }

  @Post('exercises/:id/movement/publish')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Publish all movement phases for an exercise' })
  async publishMovementStructure(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.movementService.publishMovementStructure(organisationId, id, user);
  }

  @Get('exercises/:id/movement/phases')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Get all movement phases for an exercise ordered by sequence' })
  async getPhases(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.movementService.getPhases(organisationId, id, user);
  }

  @Post('exercises/:id/movement/phases')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Add a new movement phase to an exercise' })
  async createPhase(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateMovementPhaseDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.movementService.createPhase(organisationId, id, dto, user);
  }

  @Post('exercises/:id/movement/phases/reorder')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Reorder movement phases sequence' })
  async reorderPhases(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReorderMovementPhasesDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.movementService.reorderPhases(organisationId, id, dto, user);
  }

  @Get('exercises/:id/movement/phases/:phaseId')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Get specific movement phase details with checkpoints, cues, and media' })
  async getPhaseById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('phaseId') phaseId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.movementService.getPhaseById(organisationId, id, phaseId, user);
  }

  @Put('exercises/:id/movement/phases/:phaseId')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Update movement phase parameters, alignments, tempo, or checkpoints' })
  async updatePhase(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('phaseId') phaseId: string,
    @Body() dto: UpdateMovementPhaseDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.movementService.updatePhase(organisationId, id, phaseId, dto, user);
  }

  @Delete('exercises/:id/movement/phases/:phaseId')
  @RequirePermission('exercises', 'update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a movement phase from an exercise' })
  async deletePhase(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('phaseId') phaseId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.movementService.deletePhase(organisationId, id, phaseId, user);
  }

  @Post('exercises/:id/movement/phases/:phaseId/media')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Attach media with start/end loop timestamps to a movement phase' })
  async attachPhaseMedia(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('phaseId') phaseId: string,
    @Body() dto: AttachPhaseMediaDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.movementService.attachPhaseMedia(organisationId, id, phaseId, dto, user);
  }

  @Post('exercises/:id/movement/phases/:phaseId/steps')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Link instruction steps to this movement phase' })
  async linkPhaseSteps(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('phaseId') phaseId: string,
    @Body() dto: LinkPhaseInstructionStepsDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.movementService.linkPhaseSteps(organisationId, id, phaseId, dto, user);
  }
}
