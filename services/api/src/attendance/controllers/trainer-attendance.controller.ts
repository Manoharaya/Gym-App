import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { TrainerOperationsService } from '../services/trainer-operations.service';
import { SubstituteTrainerDto } from '../dto/substitute-trainer.dto';

@ApiTags('Trainer Attendance & Operations')
@ApiBearerAuth()
@Controller('class-sessions')
export class TrainerAttendanceController {
  constructor(
    private readonly trainerOperationsService: TrainerOperationsService,
  ) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || user.roles[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  @Post(':id/trainer-check-in')
  @ApiOperation({ summary: 'Record trainer arrival and session check-in' })
  async trainerCheckIn(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') classSessionId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const isStaff = user.roles.some((r) =>
      ['SUPER_ADMIN', 'ORG_ADMIN', 'RECEPTIONIST', 'MANAGER'].includes(r.role),
    );

    return this.trainerOperationsService.trainerCheckIn(
      classSessionId,
      organisationId,
      user.id,
      isStaff,
    );
  }

  @Post(':id/trainer-check-out')
  @ApiOperation({ summary: 'Record trainer session check-out and completion' })
  async trainerCheckOut(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') classSessionId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const isStaff = user.roles.some((r) =>
      ['SUPER_ADMIN', 'ORG_ADMIN', 'RECEPTIONIST', 'MANAGER'].includes(r.role),
    );

    return this.trainerOperationsService.trainerCheckOut(
      classSessionId,
      organisationId,
      user.id,
      isStaff,
    );
  }

  @Post(':id/substitute-trainer')
  @RequirePermission('schedules', 'UPDATE', 'OUTLET')
  @ApiOperation({ summary: 'Substitute trainer for a specific class session instance' })
  async substituteTrainer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') classSessionId: string,
    @Body() dto: SubstituteTrainerDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.trainerOperationsService.substituteTrainer(
      classSessionId,
      organisationId,
      dto,
      user.id,
    );
  }
}
