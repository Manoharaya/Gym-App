import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
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
import { GuidedSessionService } from '../services/guided-session.service';
import {
  QueryGuidedSessionsDto,
  CreateGuidedSessionDto,
  UpdateGuidedSessionDto,
  CreateGuidedSessionSectionDto,
  UpdateGuidedSessionSectionDto,
  CreateGuidedSessionItemDto,
  UpdateGuidedSessionItemDto,
  ReorderGuidedSessionItemsDto,
  StartGuidedSessionDto,
  UpdateGuidedSessionProgressDto,
  CompleteGuidedSessionDto,
} from '../dto/guided-session.dto';

@ApiTags('Guided Exercise Sessions & Practice Programs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('guided-sessions')
export class GuidedSessionController {
  constructor(private readonly sessionService: GuidedSessionService) {}

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
  // 1. MEMBER & DISCOVERY ENDPOINTS
  // =========================================================================

  @Get()
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary: 'List and search guided exercise sessions with member progress',
  })
  async findSessions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryGuidedSessionsDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.sessionService.findSessions(orgId, query, user);
  }

  @Get('resume')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary: 'Get active in-progress guided session resume state for member dashboard',
  })
  async getResumeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.sessionService.getResumeSession(orgId, user.id);
  }

  @Get(':id')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary:
      'Get comprehensive aggregated guided session detail with sections, items, exercises, and progress',
  })
  async getSessionDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.sessionService.getSessionDetail(orgId, id, user);
  }

  @Get(':id/progress')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary: 'Get current member progress for guided session',
  })
  async getSessionProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.sessionService.getSessionProgress(orgId, id, user.id);
  }

  // =========================================================================
  // 2. PROGRESSION & EXECUTION ENDPOINTS
  // =========================================================================

  @Post(':id/start')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary: 'Start or restart a guided learning session',
  })
  async startSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: StartGuidedSessionDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.sessionService.startSession(orgId, id, user.id, dto);
  }

  @Post(':id/progress')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary: 'Record incremental progress or item completion within a guided session',
  })
  async updateProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateGuidedSessionProgressDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.sessionService.updateProgress(orgId, id, user.id, dto);
  }

  @Post(':id/complete')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary: 'Complete a guided learning session and record mastery stats',
  })
  async completeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CompleteGuidedSessionDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.sessionService.completeSession(orgId, id, user.id, dto);
  }

  // =========================================================================
  // 3. TRAINER & ADMIN AUTHORING ENDPOINTS
  // =========================================================================

  @Post()
  @RequirePermission('exercises', 'create')
  @ApiOperation({
    summary: 'Create a new guided session draft',
  })
  async createSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateGuidedSessionDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.sessionService.createSession(orgId, user, dto);
  }

  @Patch(':id')
  @RequirePermission('exercises', 'update')
  @ApiOperation({
    summary: 'Update guided session metadata and status',
  })
  async updateSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateGuidedSessionDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.sessionService.updateSession(orgId, id, user, dto);
  }

  @Post(':id/sections')
  @RequirePermission('exercises', 'update')
  @ApiOperation({
    summary: 'Add a section to a guided session',
  })
  async addSection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateGuidedSessionSectionDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.sessionService.addSection(orgId, id, user, dto);
  }

  @Patch(':id/sections/:sectionId')
  @RequirePermission('exercises', 'update')
  @ApiOperation({
    summary: 'Update a section in a guided session',
  })
  async updateSection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateGuidedSessionSectionDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.sessionService.updateSection(orgId, id, sectionId, user, dto);
  }

  @Delete(':id/sections/:sectionId')
  @RequirePermission('exercises', 'update')
  @ApiOperation({
    summary: 'Delete a section from a guided session',
  })
  async deleteSection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.sessionService.deleteSection(orgId, id, sectionId, user);
  }

  @Post(':id/items')
  @RequirePermission('exercises', 'update')
  @ApiOperation({
    summary: 'Add an item to a guided session',
  })
  async addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateGuidedSessionItemDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.sessionService.addItem(orgId, id, user, dto);
  }

  @Patch(':id/items/:itemId')
  @RequirePermission('exercises', 'update')
  @ApiOperation({
    summary: 'Update an item in a guided session',
  })
  async updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateGuidedSessionItemDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.sessionService.updateItem(orgId, id, itemId, user, dto);
  }

  @Delete(':id/items/:itemId')
  @RequirePermission('exercises', 'update')
  @ApiOperation({
    summary: 'Delete an item from a guided session',
  })
  async deleteItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.sessionService.deleteItem(orgId, id, itemId, user);
  }

  @Post(':id/reorder')
  @RequirePermission('exercises', 'update')
  @ApiOperation({
    summary: 'Reorder items in a guided session',
  })
  async reorderItems(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReorderGuidedSessionItemsDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.sessionService.reorderItems(orgId, id, user, dto);
  }

  @Get(':id/validate')
  @RequirePermission('exercises', 'read')
  @ApiOperation({
    summary: 'Validate session before publishing',
  })
  async validateSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.sessionService.validateSessionForPublishing(orgId, id);
  }

  @Post(':id/publish')
  @RequirePermission('exercises', 'publish')
  @ApiOperation({
    summary: 'Publish a validated guided session',
  })
  async publishSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.sessionService.publishSession(orgId, id, user);
  }

  @Post(':id/duplicate')
  @RequirePermission('exercises', 'create')
  @ApiOperation({
    summary: 'Duplicate an existing guided session with sections and items',
  })
  async duplicateSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.sessionService.duplicateSession(orgId, id, user);
  }
}
