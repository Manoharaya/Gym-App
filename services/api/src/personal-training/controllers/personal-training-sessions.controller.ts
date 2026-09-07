import {
  Controller,
  Get,
  Post,
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
import { PersonalTrainingSessionService } from '../services/personal-training-session.service';
import { PersonalTrainingProcessor } from '../processors/personal-training.processor';
import {
  SchedulePTSessionDto,
  CancelPTSessionDto,
  QueryPTSessionsDto,
} from '../dto/personal-training.dto';

@ApiTags('Personal Training Sessions')
@ApiBearerAuth()
@Controller('personal-training')
export class PersonalTrainingSessionsController {
  constructor(
    private readonly sessionService: PersonalTrainingSessionService,
    private readonly processor: PersonalTrainingProcessor,
  ) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || (user as any).organisationId || user.roles[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  @Post('sessions')
  @RequirePermission('pt_sessions', 'manage')
  @ApiOperation({ summary: 'Schedule a 1-on-1 personal training session' })
  async scheduleSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SchedulePTSessionDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.sessionService.scheduleSession(organisationId, dto, user);
  }

  @Get('sessions')
  @RequirePermission('pt_sessions', 'read')
  @ApiOperation({ summary: 'Query scheduled personal training sessions' })
  async querySessions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryPTSessionsDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.sessionService.querySessions(organisationId, query, user);
  }

  @Get('sessions/:id')
  @RequirePermission('pt_sessions', 'read')
  @ApiOperation({ summary: 'Get details of a personal training session' })
  async findSessionById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.sessionService.findSessionById(organisationId, id, user);
  }

  @Post('sessions/:id/start')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('pt_sessions', 'manage')
  @ApiOperation({ summary: 'Mark a personal training session as in progress' })
  async startSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.sessionService.startSession(organisationId, id, user);
  }

  @Post('sessions/:id/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('pt_sessions', 'manage')
  @ApiOperation({ summary: 'Complete a session and record attendance' })
  async completeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.sessionService.completeSession(organisationId, id, user);
  }

  @Post('sessions/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('pt_sessions', 'manage')
  @ApiOperation({ summary: 'Cancel a scheduled personal training session' })
  async cancelSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelPTSessionDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.sessionService.cancelSession(organisationId, id, dto, user);
  }

  @Post('process-lifecycle')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('training_programs', 'manage')
  @ApiOperation({ summary: 'Trigger background coaching lifecycle processor scan' })
  async triggerLifecycleScan(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.processor.processCoachingLifecycle(organisationId);
  }
}
