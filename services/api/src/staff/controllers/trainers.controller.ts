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
import { TrainerService } from '../trainer.service';
import {
  CreateTrainerProfileDto,
  UpdateTrainerProfileDto,
  CreateCertificationDto,
  UpdateCertificationDto,
  AssignClientDto,
  ReassignClientDto,
  QueryTrainersDto,
} from '../dto/staff-domain.dto';

@ApiTags('Trainer Management')
@ApiBearerAuth()
@Controller('trainers')
export class TrainersController {
  constructor(private readonly trainerService: TrainerService) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || user.roles[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  @Post()
  @RequirePermission('trainers', 'manage')
  @ApiOperation({ summary: 'Create trainer domain profile for an active staff member' })
  async createTrainerProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTrainerProfileDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.trainerService.createTrainerProfile(organisationId, dto, user);
  }

  @Get()
  @RequirePermission('trainers', 'read')
  @ApiOperation({ summary: 'Search and filter trainer directory' })
  async findAllTrainers(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryTrainersDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.trainerService.findAllTrainers(organisationId, query, user);
  }

  @Get('member/:memberProfileId')
  @RequirePermission('trainer_clients', 'read')
  @ApiOperation({ summary: 'Get assigned trainers for a member' })
  async findMemberTrainers(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberProfileId') memberProfileId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.trainerService.findMemberTrainers(organisationId, memberProfileId, user);
  }

  @Get(':id')
  @RequirePermission('trainers', 'read')
  @ApiOperation({ summary: 'Get detailed trainer profile by ID with certifications and client counts' })
  async findTrainerById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.trainerService.findTrainerById(organisationId, id, user);
  }

  @Patch(':id')
  @RequirePermission('trainers', 'update')
  @ApiOperation({ summary: 'Update trainer profile details' })
  async updateTrainerProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTrainerProfileDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.trainerService.updateTrainerProfile(organisationId, id, dto, user);
  }

  // --- Certifications ---

  @Post(':id/certifications')
  @RequirePermission('certifications', 'manage')
  @ApiOperation({ summary: 'Add a certification to a trainer profile' })
  async addCertification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateCertificationDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.trainerService.addCertification(organisationId, id, dto, user);
  }

  @Patch(':id/certifications/:certId')
  @RequirePermission('certifications', 'manage')
  @ApiOperation({ summary: 'Update certification details' })
  async updateCertification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('certId') certId: string,
    @Body() dto: UpdateCertificationDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.trainerService.updateCertification(organisationId, id, certId, dto, user);
  }

  @Delete(':id/certifications/:certId')
  @RequirePermission('certifications', 'manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a certification' })
  async deleteCertification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('certId') certId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.trainerService.deleteCertification(organisationId, id, certId, user);
  }

  // --- Client Assignments ---

  @Post(':id/clients')
  @RequirePermission('trainer_clients', 'manage')
  @ApiOperation({ summary: 'Assign a member client to a trainer (Primary Rule enforced)' })
  async assignClient(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AssignClientDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.trainerService.assignClient(organisationId, id, dto, user);
  }

  @Post(':id/clients/:assignmentId/reassign')
  @RequirePermission('trainer_clients', 'manage')
  @ApiOperation({ summary: 'Reassign client to another trainer, preserving history' })
  async reassignClient(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: ReassignClientDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.trainerService.reassignClient(organisationId, id, assignmentId, dto, user);
  }

  @Delete(':id/clients/:assignmentId')
  @RequirePermission('trainer_clients', 'manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Terminate client assignment' })
  async terminateClientAssignment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.trainerService.terminateClientAssignment(organisationId, id, assignmentId, user);
  }

  @Get(':id/clients')
  @RequirePermission('trainer_clients', 'read')
  @ApiOperation({ summary: 'List clients assigned to trainer (active & history)' })
  async findTrainerClients(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.trainerService.findTrainerClients(organisationId, id, user);
  }
}
