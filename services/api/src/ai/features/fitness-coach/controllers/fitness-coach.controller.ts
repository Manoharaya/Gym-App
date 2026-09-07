import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../../common/interfaces/request-with-user.interface';
import { FitnessCoachService } from '../services/fitness-coach.service';
import { PrismaService } from '../../../../database/prisma.service';
import {
  CreateConversationDto,
  SendMessageDto,
  UpdateCoachProfileDto,
  SubmitCoachFeedbackDto,
  ConversationQueryDto,
} from '../dto/fitness-coach.dto';

@ApiTags('AI Fitness Coach')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ai/fitness-coach')
export class FitnessCoachController {
  constructor(
    private readonly fitnessCoachService: FitnessCoachService,
    private readonly prisma: PrismaService,
  ) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || (user as any).organisationId || user.roles?.[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  private async resolveMemberProfileId(user: AuthenticatedUser, organisationId: string): Promise<string> {
    const profile = await this.prisma.memberProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile || profile.organisationId !== organisationId) {
      throw new ForbiddenException('Member profile required to access AI Fitness Coach');
    }

    return profile.id;
  }

  @Post('conversations')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Create a new AI Fitness Coach conversation session' })
  async createConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConversationDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    return this.fitnessCoachService.createConversation(memberId, organisationId, dto);
  }

  @Get('conversations')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'List all conversations for the authenticated member' })
  async listConversations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ConversationQueryDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    return this.fitnessCoachService.listConversations(memberId, organisationId, query);
  }

  @Get('conversations/:id')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Get conversation history and messages by ID' })
  async getConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    return this.fitnessCoachService.getConversation(id, memberId, organisationId);
  }

  @Post('conversations/:id/messages')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Send a prompt or training question to the AI Fitness Coach' })
  async sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    return this.fitnessCoachService.sendMessage(id, memberId, organisationId, user, dto);
  }

  @Delete('conversations/:id')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Delete (soft-delete) an AI Fitness Coach conversation' })
  async deleteConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    return this.fitnessCoachService.deleteConversation(id, memberId, organisationId);
  }

  @Get('profile')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Get member AI coaching preferences' })
  async getProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    return this.fitnessCoachService.getOrCreateProfile(memberId, organisationId);
  }

  @Put('profile')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Update member AI coaching preferences' })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCoachProfileDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    return this.fitnessCoachService.updateProfile(memberId, organisationId, dto);
  }

  @Get('context-summary')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Get transparent data context summary used by the AI Coach' })
  async getContextSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    return this.fitnessCoachService.getContextSummary(memberId, organisationId);
  }

  @Post('feedback')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Submit feedback for a coaching message or response' })
  async submitFeedback(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitCoachFeedbackDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    return this.fitnessCoachService.submitFeedback(memberId, organisationId, dto);
  }

  @Get('trainer/preview/:memberId')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Trainer preview of client AI insights and coaching adherence' })
  async getTrainerPreview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.fitnessCoachService.getTrainerPreview(memberId, user.id, organisationId);
  }
}
