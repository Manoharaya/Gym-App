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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { PrismaService } from '../../database/prisma.service';
import { ClassSessionService } from '../services/class-session.service';
import { CreateClassSessionDto, UpdateClassSessionDto, QuerySessionsDto } from '../dto';

@ApiTags('Class Sessions')
@ApiBearerAuth()
@Controller('class-sessions')
export class ClassSessionsController {
  constructor(
    private readonly sessionService: ClassSessionService,
    private readonly prisma: PrismaService,
  ) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || user.roles[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  private async getMemberProfileId(userId: string, organisationId: string): Promise<string | undefined> {
    const profile = await this.prisma.memberProfile.findFirst({
      where: { userId, organisationId },
      select: { id: true },
    });
    return profile?.id;
  }

  @Get()
  @ApiOperation({ summary: 'List scheduled class sessions matching query filters' })
  async listSessions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QuerySessionsDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.getMemberProfileId(user.id, organisationId);

    return this.sessionService.listSessions(organisationId, query, memberProfileId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get class session details with spots remaining' })
  async getSessionDetails(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.getMemberProfileId(user.id, organisationId);

    return this.sessionService.getSessionDetails(id, memberProfileId);
  }

  @Post()
  @RequirePermission('class_sessions', 'CREATE', 'ORGANISATION')
  @ApiOperation({ summary: 'Schedule a new class session (Staff)' })
  async createSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateClassSessionDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.sessionService.createSession(organisationId, dto);
  }

  @Patch(':id')
  @RequirePermission('class_sessions', 'UPDATE', 'ORGANISATION')
  @ApiOperation({ summary: 'Update a scheduled class session (Staff)' })
  async updateSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateClassSessionDto,
  ) {
    return this.sessionService.updateSession(id, dto);
  }

  @Delete(':id')
  @RequirePermission('class_sessions', 'DELETE', 'ORGANISATION')
  @ApiOperation({ summary: 'Cancel a scheduled class session (Staff)' })
  async cancelSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('reason') reason?: string,
  ) {
    return this.sessionService.cancelSession(id, reason);
  }
}
