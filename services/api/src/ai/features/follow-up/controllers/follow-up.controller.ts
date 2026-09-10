/**
 * Day 39 — Follow-Up REST Controller
 * Multi-tenant endpoints under /api/v1/follow-ups for sequence management,
 * enrollment, approvals, preview, and response recording.
 */

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
  BadRequestException,
} from '@nestjs/common';
import { FollowUpSequenceService } from '../services/follow-up-sequence.service';
import { FollowUpSchedulerService } from '../services/follow-up-scheduler.service';
import { FollowUpExecutionService } from '../services/follow-up-execution.service';
import { FollowUpResponseService } from '../services/follow-up-response.service';
import { FollowUpQueueService } from '../services/follow-up-queue.service';
import {
  CreateFollowUpSequenceDto,
  UpdateFollowUpSequenceDto,
  CreateFollowUpStepDto,
  UpdateFollowUpStepDto,
  EnrollLeadDto,
  PreviewFollowUpDto,
  ApproveExecutionDto,
  RejectExecutionDto,
  RecordResponseDto,
} from '../dto/follow-up.dto';
import { PrismaService } from '../../../../database/prisma.service';

@Controller('follow-ups')
export class FollowUpController {
  constructor(
    private readonly sequenceService: FollowUpSequenceService,
    private readonly schedulerService: FollowUpSchedulerService,
    private readonly executionService: FollowUpExecutionService,
    private readonly responseService: FollowUpResponseService,
    private readonly queueService: FollowUpQueueService,
    private readonly prisma: PrismaService,
  ) {}

  private resolveOrganisationId(orgHeader?: string): string {
    if (!orgHeader) {
      throw new BadRequestException('Missing required x-organisation-id header');
    }
    return orgHeader;
  }

  // ==========================================
  // Sequences
  // ==========================================

  @Get('sequences')
  async listSequences(
    @Headers('x-organisation-id') orgHeader: string,
    @Query('outletId') outletId?: string,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.sequenceService.listSequences(organisationId, outletId);
  }

  @Post('sequences')
  async createSequence(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-staff-id') staffHeader: string,
    @Body() dto: CreateFollowUpSequenceDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.sequenceService.createSequence(organisationId, dto, staffHeader);
  }

  @Get('sequences/:id')
  async getSequence(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') sequenceId: string,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.sequenceService.getSequence(organisationId, sequenceId);
  }

  @Patch('sequences/:id')
  async updateSequence(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-staff-id') staffHeader: string,
    @Param('id') sequenceId: string,
    @Body() dto: UpdateFollowUpSequenceDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.sequenceService.updateSequence(organisationId, sequenceId, dto, staffHeader);
  }

  @Post('sequences/:id/steps')
  async addStep(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') sequenceId: string,
    @Body() dto: CreateFollowUpStepDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.sequenceService.addStep(organisationId, sequenceId, dto);
  }

  @Patch('steps/:id')
  async updateStep(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') stepId: string,
    @Body() dto: UpdateFollowUpStepDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.sequenceService.updateStep(organisationId, stepId, dto);
  }

  // ==========================================
  // Enrollment & Lifecycle
  // ==========================================

  @Post('enroll')
  async enroll(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-staff-id') staffHeader: string,
    @Body() dto: EnrollLeadDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.schedulerService.enroll(organisationId, dto, staffHeader);
  }

  @Post('enrollments')
  async createEnrollment(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-staff-id') staffHeader: string,
    @Body() dto: EnrollLeadDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.schedulerService.enroll(organisationId, dto, staffHeader);
  }

  @Get('enrollments')
  async listEnrollments(
    @Headers('x-organisation-id') orgHeader: string,
    @Query('leadId') leadId?: string,
    @Query('status') status?: string,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.prisma.followUpEnrollment.findMany({
      where: {
        organisationId,
        ...(leadId ? { leadId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        sequence: true,
        executions: { orderBy: { scheduledAt: 'asc' } },
        outcomes: true,
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  @Get('enrollments/:id')
  async getEnrollment(
    @Headers('x-organisation-id') orgHeader: string,
    @Param('id') enrollmentId: string,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.prisma.followUpEnrollment.findFirst({
      where: { id: enrollmentId, organisationId },
      include: {
        sequence: true,
        sequenceVersion: { include: { steps: { orderBy: { stepOrder: 'asc' } } } },
        executions: { orderBy: { scheduledAt: 'asc' } },
        responses: { orderBy: { receivedAt: 'desc' } },
        outcomes: true,
      },
    });
  }

  @Post('enrollments/:id/pause')
  async pauseEnrollment(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-staff-id') staffHeader: string,
    @Param('id') enrollmentId: string,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.schedulerService.pauseEnrollment(organisationId, enrollmentId, staffHeader);
  }

  @Post('enrollments/:id/resume')
  async resumeEnrollment(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-staff-id') staffHeader: string,
    @Param('id') enrollmentId: string,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.schedulerService.resumeEnrollment(organisationId, enrollmentId, staffHeader);
  }

  @Post('enrollments/:id/stop')
  async stopEnrollment(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-staff-id') staffHeader: string,
    @Param('id') enrollmentId: string,
    @Body('stopReason') stopReason?: string,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.schedulerService.stopEnrollment(
      organisationId,
      enrollmentId,
      (stopReason as any) || 'MANUAL_STOP',
      'STAFF',
      staffHeader,
    );
  }

  // ==========================================
  // Queue, Preview, Approvals & Responses
  // ==========================================

  @Get('queue')
  async getQueue(
    @Headers('x-organisation-id') orgHeader: string,
    @Query('outletId') outletId?: string,
    @Query('status') status?: string,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.queueService.getQueue(organisationId, { outletId, status });
  }

  @Post('preview')
  async previewStep(
    @Headers('x-organisation-id') orgHeader: string,
    @Body() dto: PreviewFollowUpDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.queueService.previewStep(organisationId, dto);
  }

  @Post('approve')
  async approveExecution(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-staff-id') staffHeader: string,
    @Body() dto: ApproveExecutionDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.executionService.approveExecution(
      organisationId,
      dto.executionId,
      dto.overrideMessage,
      staffHeader,
    );
  }

  @Post('reject')
  async rejectExecution(
    @Headers('x-organisation-id') orgHeader: string,
    @Headers('x-staff-id') staffHeader: string,
    @Body() dto: RejectExecutionDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.executionService.rejectExecution(
      organisationId,
      dto.executionId,
      dto.rejectionReason,
      staffHeader,
    );
  }

  @Post('responses')
  async recordResponse(
    @Headers('x-organisation-id') orgHeader: string,
    @Body() dto: RecordResponseDto,
  ) {
    const organisationId = this.resolveOrganisationId(orgHeader);
    return this.responseService.recordResponse(organisationId, dto);
  }
}
