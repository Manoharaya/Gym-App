import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SaveParqDraftDto, SubmitParqDto } from './dto/member-domain.dto';

@Injectable()
export class ParqService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  /**
   * Fetches active PAR-Q questionnaire with ordered questions.
   */
  async getActiveQuestionnaire() {
    const questionnaire = await this.prisma.questionnaire.findFirst({
      where: { type: 'PARQ', status: 'ACTIVE' },
      include: {
        questions: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!questionnaire) {
      throw new NotFoundException('Active PAR-Q questionnaire not found');
    }

    return questionnaire;
  }

  /**
   * Retrieves the member's current PAR-Q submission or draft.
   */
  async getMemberSubmission(userId: string) {
    const profile = await this.prisma.memberProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Member profile not found');
    }

    const submission = await this.prisma.parqSubmission.findFirst({
      where: { memberProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
      include: {
        questionnaire: {
          include: {
            questions: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        responses: true,
      },
    });

    return submission;
  }

  /**
   * Persists draft PAR-Q responses without finalizing.
   */
  async saveDraft(userId: string, dto: SaveParqDraftDto) {
    const profile = await this.prisma.memberProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Member profile not found');
    }

    // Find or create draft
    let draft = await this.prisma.parqSubmission.findFirst({
      where: {
        memberProfileId: profile.id,
        questionnaireId: dto.questionnaireId,
        status: 'DRAFT',
      },
    });

    if (!draft) {
      draft = await this.prisma.parqSubmission.create({
        data: {
          memberProfileId: profile.id,
          questionnaireId: dto.questionnaireId,
          status: 'DRAFT',
        },
      });
    }

    // Upsert draft responses
    for (const r of dto.responses) {
      await this.prisma.parqResponse.upsert({
        where: {
          submissionId_questionId: {
            submissionId: draft.id,
            questionId: r.questionId,
          },
        },
        update: {
          answer: r.answer as any,
          notes: r.notes,
        },
        create: {
          submissionId: draft.id,
          questionId: r.questionId,
          answer: r.answer as any,
          notes: r.notes,
        },
      });
    }

    return this.prisma.parqSubmission.findUnique({
      where: { id: draft.id },
      include: { responses: true },
    });
  }

  /**
   * Finalizes and submits PAR-Q responses immutably.
   */
  async submitParq(
    userId: string,
    dto: SubmitParqDto,
    ipAddress?: string,
    userAgent?: string
  ) {
    const profile = await this.prisma.memberProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Member profile not found');
    }

    const questionnaire = await this.prisma.questionnaire.findUnique({
      where: { id: dto.questionnaireId },
      include: { questions: true },
    });

    if (!questionnaire) {
      throw new NotFoundException('Questionnaire not found');
    }

    // Validate that all required questions have been answered
    const answeredQuestionIds = new Set(dto.responses.map((r) => r.questionId));
    const missingRequired = questionnaire.questions.filter(
      (q) => q.required && !answeredQuestionIds.has(q.id)
    );

    if (missingRequired.length > 0) {
      throw new BadRequestException({
        message: 'All required questions must be answered',
        missingQuestions: missingRequired.map((q) => q.questionKey),
      });
    }

    // Check if any "YES" answers trigger review
    let requiresReview = false;
    for (const resp of dto.responses) {
      const q = questionnaire.questions.find((quest) => quest.id === resp.questionId);
      const answerVal = (resp.answer as any)?.value;
      if (q && answerVal === true) {
        requiresReview = true;
      }
    }

    const finalStatus = requiresReview ? 'REQUIRES_REVIEW' : 'APPROVED';

    // Transactionally create immutable submission and responses
    const submission = await this.prisma.$transaction(async (tx) => {
      // Remove any prior draft for this questionnaire
      await tx.parqSubmission.deleteMany({
        where: {
          memberProfileId: profile.id,
          questionnaireId: dto.questionnaireId,
          status: 'DRAFT',
        },
      });

      const sub = await tx.parqSubmission.create({
        data: {
          memberProfileId: profile.id,
          questionnaireId: dto.questionnaireId,
          status: finalStatus,
          submittedAt: new Date(),
        },
      });

      for (const r of dto.responses) {
        await tx.parqResponse.create({
          data: {
            submissionId: sub.id,
            questionId: r.questionId,
            answer: r.answer as any,
            notes: r.notes,
          },
        });
      }

      return sub;
    });

    // Emits audit log WITHOUT logging sensitive medical answers
    await this.audit.log({
      userId,
      organisationId: profile.organisationId,
      action: 'PARQ_SUBMITTED',
      resource: 'parq_submissions',
      resourceId: submission.id,
      metadata: {
        questionnaireVersion: questionnaire.version,
        status: finalStatus,
        requiresReview,
      },
      ipAddress,
      userAgent,
    });

    return this.prisma.parqSubmission.findUnique({
      where: { id: submission.id },
      include: { responses: true, questionnaire: true },
    });
  }
}
