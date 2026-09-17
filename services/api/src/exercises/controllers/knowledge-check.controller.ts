import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Headers,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { KnowledgeCheckService } from '../services/knowledge-check.service';
import {
  CreateKnowledgeCheckDto,
  UpdateKnowledgeCheckDto,
  CreateKnowledgeQuestionDto,
  UpdateKnowledgeQuestionDto,
  SubmitQuestionResponseDto,
  CompleteKnowledgeAttemptDto,
  KnowledgeCheckPlayerDto,
  QuestionFeedbackDto,
  AttemptResultDto,
  AttemptReviewDto,
} from '../dto/knowledge-check.dto';

@ApiTags('Interactive Fitness Education & Knowledge Checks')
@ApiBearerAuth()
@Controller('learning')
export class KnowledgeCheckController {
  constructor(private readonly service: KnowledgeCheckService) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || (user as any).organisationId || user.roles?.[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  // -------------------------------------------------------------
  // Member Assessment & Player Endpoints
  // -------------------------------------------------------------

  @Get('lessons/:lessonId/knowledge-check')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Get published knowledge check for a lesson with answers stripped' })
  @ApiResponse({ status: 200, type: KnowledgeCheckPlayerDto })
  async getLessonKnowledgeCheck(
    @CurrentUser() user: AuthenticatedUser,
    @Param('lessonId') lessonId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<KnowledgeCheckPlayerDto | null> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.service.getLessonKnowledgeCheck(orgId, user.id, lessonId);
  }

  @Get('knowledge-checks/:id/player')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Get knowledge check player data with answer keys stripped' })
  @ApiResponse({ status: 200, type: KnowledgeCheckPlayerDto })
  async getKnowledgeCheckPlayer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') checkId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<KnowledgeCheckPlayerDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.service.getKnowledgeCheckPlayer(orgId, user.id, checkId);
  }

  @Post('knowledge-checks/:id/attempts')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Start a new assessment attempt or resume an active one' })
  async startAttempt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') checkId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.service.startAttempt(orgId, user.id, checkId);
  }

  @Post('attempts/:attemptId/responses')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Submit response for a question and receive instant authored feedback' })
  @ApiResponse({ status: 200, type: QuestionFeedbackDto })
  async submitResponse(
    @CurrentUser() user: AuthenticatedUser,
    @Param('attemptId') attemptId: string,
    @Body() dto: SubmitQuestionResponseDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<QuestionFeedbackDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.service.submitResponse(orgId, user.id, attemptId, dto);
  }

  @Post('attempts/:attemptId/complete')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Finalize assessment attempt, compute score, and check passing criteria' })
  @ApiResponse({ status: 200, type: AttemptResultDto })
  async completeAttempt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('attemptId') attemptId: string,
    @Body() dto: CompleteKnowledgeAttemptDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<AttemptResultDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.service.completeAttempt(orgId, user.id, attemptId, dto);
  }

  @Get('attempts/:attemptId/review')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Review submitted assessment with user choices and correct answers' })
  @ApiResponse({ status: 200, type: AttemptReviewDto })
  async getAttemptReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('attemptId') attemptId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ): Promise<AttemptReviewDto> {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.service.getAttemptReview(orgId, user.id, attemptId);
  }

  // -------------------------------------------------------------
  // Trainer / Admin Curriculum Authoring Endpoints
  // -------------------------------------------------------------

  @Post('knowledge-checks')
  @RequirePermission('exercises', 'create')
  @ApiOperation({ summary: 'Create a new knowledge check' })
  async createKnowledgeCheck(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateKnowledgeCheckDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.service.createKnowledgeCheck(orgId, user.id, dto);
  }

  @Put('knowledge-checks/:id')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Update knowledge check settings and status' })
  async updateKnowledgeCheck(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') checkId: string,
    @Body() dto: UpdateKnowledgeCheckDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.service.updateKnowledgeCheck(orgId, checkId, dto);
  }

  @Post('knowledge-checks/:id/questions')
  @RequirePermission('exercises', 'create')
  @ApiOperation({ summary: 'Add a question with answer options to a knowledge check' })
  async addQuestion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') checkId: string,
    @Body() dto: CreateKnowledgeQuestionDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.service.addQuestion(orgId, checkId, dto);
  }

  @Put('knowledge-checks/questions/:questionId')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Update a question and replace its answer options' })
  async updateQuestion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('questionId') questionId: string,
    @Body() dto: UpdateKnowledgeQuestionDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.service.updateQuestion(orgId, questionId, dto);
  }

  @Delete('knowledge-checks/questions/:questionId')
  @RequirePermission('exercises', 'delete')
  @ApiOperation({ summary: 'Delete a question from a knowledge check' })
  async deleteQuestion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('questionId') questionId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.service.deleteQuestion(orgId, questionId);
  }

  @Post('knowledge-checks/:id/reorder-questions')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Reorder questions within a knowledge check' })
  async reorderQuestions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') checkId: string,
    @Body('questionIds') questionIds: string[],
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.service.reorderQuestions(orgId, checkId, questionIds);
  }

  @Post('knowledge-checks/:id/publish')
  @RequirePermission('exercises', 'update')
  @ApiOperation({ summary: 'Validate questions and publish a knowledge check' })
  async publishKnowledgeCheck(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') checkId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.service.validateAndPublishCheck(orgId, checkId);
  }
}
