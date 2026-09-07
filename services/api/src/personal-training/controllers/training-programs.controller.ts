import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Headers,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { TrainingProgramService } from '../services/training-program.service';
import {
  CreateTrainingProgramDto,
  UpdateTrainingProgramDto,
  ProgramActionDto,
} from '../dto/personal-training.dto';

@ApiTags('Personal Training Programs')
@ApiBearerAuth()
@Controller()
export class TrainingProgramsController {
  constructor(private readonly programService: TrainingProgramService) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || (user as any).organisationId || user.roles[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  @Post('members/:memberId/training-programs')
  @RequirePermission('training_programs', 'manage')
  @ApiOperation({ summary: 'Create a training program for a member' })
  async createProgram(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Body() dto: CreateTrainingProgramDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.programService.createProgram(organisationId, memberId, dto, user);
  }

  @Get('members/:memberId/training-programs')
  @RequirePermission('training_programs', 'read')
  @ApiOperation({ summary: 'Get all training programs for a member' })
  async findMemberPrograms(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.programService.findMemberPrograms(organisationId, memberId, user);
  }

  @Get('training-programs/:id')
  @RequirePermission('training_programs', 'read')
  @ApiOperation({ summary: 'Get a training program by ID' })
  async findProgramById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.programService.findProgramById(organisationId, id, user);
  }

  @Patch('training-programs/:id')
  @RequirePermission('training_programs', 'manage')
  @ApiOperation({ summary: 'Update training program details' })
  async updateProgram(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTrainingProgramDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.programService.updateProgram(organisationId, id, dto, user);
  }

  @Post('training-programs/:id/activate')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('training_programs', 'manage')
  @ApiOperation({ summary: 'Activate a draft or paused training program' })
  async activateProgram(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.programService.activateProgram(organisationId, id, user);
  }

  @Post('training-programs/:id/pause')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('training_programs', 'manage')
  @ApiOperation({ summary: 'Pause an active training program' })
  async pauseProgram(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.programService.pauseProgram(organisationId, id, user);
  }

  @Post('training-programs/:id/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('training_programs', 'manage')
  @ApiOperation({ summary: 'Complete an active training program' })
  async completeProgram(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.programService.completeProgram(organisationId, id, user);
  }

  @Post('training-programs/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('training_programs', 'manage')
  @ApiOperation({ summary: 'Cancel a training program' })
  async cancelProgram(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ProgramActionDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.programService.cancelProgram(organisationId, id, dto, user);
  }
}
