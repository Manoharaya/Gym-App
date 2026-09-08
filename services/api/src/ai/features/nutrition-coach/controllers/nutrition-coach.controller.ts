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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../../common/interfaces/request-with-user.interface';
import { NutritionCoachService } from '../services/nutrition-coach.service';
import { NutritionContextBuilder } from '../nutrition-context/nutrition-context.builder';
import { PrismaService } from '../../../../database/prisma.service';
import {
  CreateNutritionConversationDto,
  AskNutritionDto,
  UpdateNutritionCoachProfileDto,
  NutritionConversationQueryDto,
  ParseFoodLogDto,
} from '../dto/ask-nutrition.dto';
import { SubmitNutritionFeedbackDto } from '../dto/nutrition-feedback.dto';

@ApiTags('AI Nutrition Coach')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ai/nutrition')
export class NutritionCoachController {
  constructor(
    private readonly nutritionCoachService: NutritionCoachService,
    private readonly contextBuilder: NutritionContextBuilder,
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
      throw new ForbiddenException('Member profile required to access AI Nutrition Coach');
    }

    return profile.id;
  }

  @Post('conversations')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Create a new AI Nutrition Coach conversation session' })
  async createConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateNutritionConversationDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    return this.nutritionCoachService.createConversation(memberId, organisationId, dto);
  }

  @Get('conversations')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'List all conversations for the authenticated member' })
  async listConversations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: NutritionConversationQueryDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    return this.nutritionCoachService.listConversations(memberId, organisationId, query);
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
    return this.nutritionCoachService.getConversation(id, memberId, organisationId);
  }

  @Post('conversations/:id/messages')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Send a prompt or nutrition question to the AI Nutrition Coach' })
  async sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AskNutritionDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    return this.nutritionCoachService.sendMessage(id, memberId, organisationId, user, dto);
  }

  @Post('chat')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Send a message, creating a conversation automatically if not provided' })
  async chat(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AskNutritionDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);

    let conversationId = dto.conversationId;
    if (!conversationId) {
      const conv = await this.nutritionCoachService.createConversation(memberId, organisationId, {
        title: dto.content.slice(0, 40),
      });
      conversationId = conv.id;
    }

    return this.nutritionCoachService.sendMessage(conversationId, memberId, organisationId, user, dto);
  }

  @Delete('conversations/:id')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Delete (soft-delete) an AI Nutrition Coach conversation' })
  async deleteConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    return this.nutritionCoachService.deleteConversation(id, memberId, organisationId);
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
    return this.nutritionCoachService.getOrCreateProfile(memberId, organisationId);
  }

  @Put('profile')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Update member AI coaching preferences' })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateNutritionCoachProfileDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    return this.nutritionCoachService.updateProfile(memberId, organisationId, dto);
  }

  @Get('summary/today')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Get structured AI-assisted daily nutrition summary' })
  async getTodaySummary(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    return this.nutritionCoachService.getTodaySummary(memberId, organisationId, user);
  }

  @Get('insights')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Get personalized AI nutrition insights' })
  async getInsights(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    const summary = await this.nutritionCoachService.getTodaySummary(memberId, organisationId, user);
    return {
      insights: summary.insights,
      adherenceMessage: summary.adherenceMessage,
      generatedAt: new Date().toISOString(),
    };
  }

  @Post('food-log/parse')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({
    summary:
      'Parse natural language food text into a structured proposal requiring user confirmation before saving',
  })
  async parseFoodLog(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ParseFoodLogDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    return this.nutritionCoachService.parseFoodLog(dto, memberId, organisationId, user);
  }

  @Get('context/preview')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Get transparent data context preview used by the AI Nutrition Coach' })
  async getContextPreview(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    const memberId = await this.resolveMemberProfileId(user, organisationId);
    const coachProfile = await this.nutritionCoachService.getOrCreateProfile(memberId, organisationId);
    return this.contextBuilder.buildContext(memberId, organisationId, coachProfile, user, {
      includeTrainingContext: true,
    });
  }

  @Get('trainer/preview/:memberId')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Trainer preview of assigned client nutrition adherence and discussion topics' })
  async getTrainerPreview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.nutritionCoachService.getTrainerPreview(memberId, user.id, organisationId);
  }

  @Post('feedback')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Submit feedback for a nutrition coaching response' })
  async submitFeedback(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitNutritionFeedbackDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.nutritionCoachService.submitFeedback(dto, user, organisationId);
  }
}
