import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
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

@Injectable()
export class KnowledgeCheckService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------
  // Member Assessment & Player Engine
  // -------------------------------------------------------------

  /**
   * Retrieves player-ready Knowledge Check for a lesson with answer keys stripped.
   */
  async getLessonKnowledgeCheck(
    organisationId: string,
    userId: string,
    lessonId: string,
  ): Promise<KnowledgeCheckPlayerDto | null> {
    const check = await this.prisma.knowledgeCheck.findFirst({
      where: {
        lessonId,
        contentStatus: 'PUBLISHED',
        OR: [{ tenantId: organisationId }, { tenantId: null }],
      },
      include: {
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            answers: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        lesson: {
          select: {
            id: true,
            pathId: true,
            title: true,
          },
        },
      },
    });

    if (!check) {
      return null;
    }

    return this.buildPlayerDto(check, userId);
  }

  /**
   * Retrieves player-ready Knowledge Check by ID with answer keys stripped.
   */
  async getKnowledgeCheckPlayer(
    organisationId: string,
    userId: string,
    checkId: string,
  ): Promise<KnowledgeCheckPlayerDto> {
    const check = await this.prisma.knowledgeCheck.findFirst({
      where: {
        id: checkId,
        contentStatus: 'PUBLISHED',
        OR: [{ tenantId: organisationId }, { tenantId: null }],
      },
      include: {
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            answers: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        lesson: {
          select: {
            id: true,
            pathId: true,
            title: true,
          },
        },
      },
    });

    if (!check) {
      throw new NotFoundException(`Knowledge check with ID ${checkId} not found`);
    }

    return this.buildPlayerDto(check, userId);
  }

  /**
   * Starts a new attempt for a knowledge check, verifying attempt limits.
   */
  async startAttempt(
    organisationId: string,
    userId: string,
    checkId: string,
  ): Promise<{ attemptId: string; attemptNumber: number; status: string }> {
    const check = await this.prisma.knowledgeCheck.findFirst({
      where: {
        id: checkId,
        contentStatus: 'PUBLISHED',
        OR: [{ tenantId: organisationId }, { tenantId: null }],
      },
      include: {
        lesson: true,
      },
    });

    if (!check) {
      throw new NotFoundException(`Knowledge check ${checkId} not found`);
    }

    // Check for an active in-progress attempt to resume
    const activeAttempt = await this.prisma.knowledgeAttempt.findFirst({
      where: {
        checkId,
        userId,
        status: 'IN_PROGRESS',
      },
      orderBy: { startedAt: 'desc' },
    });

    if (activeAttempt) {
      return {
        attemptId: activeAttempt.id,
        attemptNumber: activeAttempt.attemptNumber,
        status: activeAttempt.status,
      };
    }

    // Check attempt limits
    if (check.attemptLimit && check.attemptLimit > 0) {
      const completedAttemptsCount = await this.prisma.knowledgeAttempt.count({
        where: {
          checkId,
          userId,
          status: { in: ['PASSED', 'FAILED', 'COMPLETED'] },
        },
      });

      if (completedAttemptsCount >= check.attemptLimit) {
        throw new BadRequestException(
          `Maximum attempt limit (${check.attemptLimit}) reached for this knowledge check`,
        );
      }
    }

    const previousAttemptsCount = await this.prisma.knowledgeAttempt.count({
      where: { checkId, userId },
    });

    const attempt = await this.prisma.knowledgeAttempt.create({
      data: {
        userId,
        tenantId: organisationId,
        checkId,
        lessonId: check.lessonId,
        pathId: check.lesson?.pathId || null,
        attemptNumber: previousAttemptsCount + 1,
        status: 'IN_PROGRESS',
        questionCount: check.questionCount,
      },
    });

    return {
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
    };
  }

  /**
   * Evaluates and records a member's response to a single question.
   * Authoritative server-side grading for all supported question types.
   */
  async submitResponse(
    organisationId: string,
    userId: string,
    attemptId: string,
    dto: SubmitQuestionResponseDto,
  ): Promise<QuestionFeedbackDto> {
    const attempt = await this.prisma.knowledgeAttempt.findFirst({
      where: {
        id: attemptId,
        userId,
        status: 'IN_PROGRESS',
      },
      include: {
        knowledgeCheck: {
          include: {
            questions: {
              orderBy: { sortOrder: 'asc' },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException(`Active knowledge attempt ${attemptId} not found`);
    }

    const question = await this.prisma.knowledgeQuestion.findFirst({
      where: {
        id: dto.questionId,
        checkId: attempt.checkId,
      },
      include: {
        answers: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!question) {
      throw new NotFoundException(`Question ${dto.questionId} not found in this assessment`);
    }

    // Server-side authoritative grading
    let isCorrect = false;

    switch (question.questionType) {
      case 'MULTIPLE_CHOICE':
      case 'TRUE_FALSE':
      case 'IMAGE_CHOICE': {
        const selectedId = dto.selectedAnswerIds?.[0];
        const correctAnswer = question.answers.find((a: any) => a.isCorrect);
        isCorrect = Boolean(selectedId && correctAnswer && selectedId === correctAnswer.id);
        break;
      }

      case 'MULTI_SELECT': {
        const correctIds = question.answers.filter((a: any) => a.isCorrect).map((a: any) => a.id);
        const selectedIds = dto.selectedAnswerIds || [];
        const matchesCount = correctIds.length === selectedIds.length;
        const allCorrectSelected = correctIds.every((id: any) => selectedIds.includes(id));
        isCorrect = matchesCount && allCorrectSelected;
        break;
      }

      case 'ORDERING': {
        const expectedOrderIds = [...question.answers]
          .sort((a: any, b: any) => (a.correctOrderIndex ?? 0) - (b.correctOrderIndex ?? 0))
          .map((a: any) => a.id);
        const submittedOrderIds = dto.orderedItemIds || [];
        isCorrect =
          expectedOrderIds.length > 0 &&
          expectedOrderIds.length === submittedOrderIds.length &&
          expectedOrderIds.every((id: any, idx: number) => id === submittedOrderIds[idx]);
        break;
      }

      case 'MATCHING': {
        const submittedPairs = dto.matchingPairs || {};
        const allMatched = question.answers.every((a: any) => {
          if (!a.matchTarget) return true;
          return submittedPairs[a.id] === a.matchTarget;
        });
        isCorrect = question.answers.length > 0 && allMatched;
        break;
      }

      default:
        isCorrect = false;
    }

    // Upsert response
    await this.prisma.knowledgeResponse.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId: question.id,
        },
      },
      create: {
        attemptId,
        questionId: question.id,
        selectedAnswerIds: dto.selectedAnswerIds || [],
        orderedItemIds: dto.orderedItemIds || [],
        matchingPairs: dto.matchingPairs ? (dto.matchingPairs as any) : undefined,
        isCorrect,
        hintsUsed: Boolean(dto.hintsUsed),
      },
      update: {
        selectedAnswerIds: dto.selectedAnswerIds || [],
        orderedItemIds: dto.orderedItemIds || [],
        matchingPairs: dto.matchingPairs ? (dto.matchingPairs as any) : undefined,
        isCorrect,
        hintsUsed: Boolean(dto.hintsUsed),
        answeredAt: new Date(),
      },
    });

    // Compute progress within attempt
    const answeredCount = await this.prisma.knowledgeResponse.count({
      where: { attemptId },
    });

    const questionIds = attempt.knowledgeCheck.questions.map((q: any) => q.id);
    const currentIndex = questionIds.indexOf(question.id);
    const nextQuestionIndex = currentIndex + 1 < questionIds.length ? currentIndex + 1 : null;

    const feedbackText = isCorrect
      ? question.correctFeedback || 'Correct! Great understanding of this concept.'
      : question.incorrectFeedback || 'Not quite. Review the explanation to reinforce your understanding.';

    return {
      questionId: question.id,
      isCorrect,
      explanation: question.explanation,
      feedback: feedbackText,
      nextQuestionIndex,
      totalQuestions: questionIds.length,
      answeredCount,
    };
  }

  /**
   * Finalizes an attempt, calculates score %, checks passing criteria,
   * updates associated lesson completion if required, and returns results.
   */
  async completeAttempt(
    organisationId: string,
    userId: string,
    attemptId: string,
    dto: CompleteKnowledgeAttemptDto,
  ): Promise<AttemptResultDto> {
    const attempt = await this.prisma.knowledgeAttempt.findFirst({
      where: {
        id: attemptId,
        userId,
        status: 'IN_PROGRESS',
      },
      include: {
        knowledgeCheck: {
          include: {
            questions: {
              select: { id: true, questionText: true },
            },
          },
        },
        responses: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException(`In-progress attempt ${attemptId} not found`);
    }

    const totalQuestions = attempt.knowledgeCheck.questions.length;
    const correctCount = attempt.responses.filter((r: any) => r.isCorrect).length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100 * 10) / 10 : 0;
    const passed = score >= attempt.knowledgeCheck.passingScore;
    const status = passed ? 'PASSED' : 'FAILED';

    const updated = await this.prisma.knowledgeAttempt.update({
      where: { id: attemptId },
      data: {
        score,
        correctCount,
        questionCount: totalQuestions,
        passed,
        status,
        timeSpentSeconds: dto.timeSpentSeconds || 0,
        completedAt: new Date(),
      },
    });

    // If assessment is required for lesson completion and member passed, complete the lesson
    if (attempt.knowledgeCheck.isRequiredForLesson && passed && attempt.lessonId && attempt.pathId) {
      const existingLessonCompletion = await this.prisma.userLessonCompletion.findUnique({
        where: {
          userId_lessonId: {
            userId,
            lessonId: attempt.lessonId,
          },
        },
      });

      if (!existingLessonCompletion) {
        await this.prisma.userLessonCompletion.create({
          data: {
            userId,
            pathId: attempt.pathId,
            lessonId: attempt.lessonId,
          },
        });

        // Update overall path progress
        const totalLessons = await this.prisma.learningPathLesson.count({
          where: { pathId: attempt.pathId },
        });
        const completedLessons = await this.prisma.userLessonCompletion.count({
          where: { userId, pathId: attempt.pathId },
        });
        const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100 * 10) / 10 : 0;
        const pathCompleted = completedLessons >= totalLessons;

        await this.prisma.userLearningPathProgress.upsert({
          where: {
            userId_pathId: {
              userId,
              pathId: attempt.pathId,
            },
          },
          create: {
            userId,
            pathId: attempt.pathId,
            organisationId,
            status: pathCompleted ? 'COMPLETED' : 'IN_PROGRESS',
            completedLessons,
            totalLessons,
            percentComplete: progressPercent,
            currentLessonId: attempt.lessonId,
            completedAt: pathCompleted ? new Date() : null,
          },
          update: {
            status: pathCompleted ? 'COMPLETED' : 'IN_PROGRESS',
            completedLessons,
            totalLessons,
            percentComplete: progressPercent,
            currentLessonId: attempt.lessonId,
            completedAt: pathCompleted ? new Date() : undefined,
            lastInteractedAt: new Date(),
          },
        });
      }
    }

    // Generate deterministic review recommendations if member missed questions
    const reviewRecommendations: string[] = [];
    if (!passed || score < 100) {
      const incorrectResponses = attempt.responses.filter((r: any) => !r.isCorrect);
      const missedQuestionIds = new Set(incorrectResponses.map((r: any) => r.questionId));
      const missedQuestions = attempt.knowledgeCheck.questions.filter((q: any) => missedQuestionIds.has(q.id));

      for (const q of missedQuestions.slice(0, 3)) {
        reviewRecommendations.push(`Review key coaching cues: "${q.questionText}"`);
      }
      if (reviewRecommendations.length === 0 && !passed) {
        reviewRecommendations.push('Review the foundational movement instructions before retaking');
      }
    }

    return {
      attemptId: updated.id,
      checkId: attempt.checkId,
      title: attempt.knowledgeCheck.title,
      status,
      score: updated.score,
      correctCount: updated.correctCount,
      questionCount: updated.questionCount,
      passed: updated.passed,
      passingScore: attempt.knowledgeCheck.passingScore,
      timeSpentSeconds: updated.timeSpentSeconds,
      lessonId: attempt.lessonId,
      pathId: attempt.pathId,
      reviewRecommendations,
    };
  }

  /**
   * Post-completion answer review.
   * Only now are correct answers and detailed explanations revealed.
   */
  async getAttemptReview(
    organisationId: string,
    userId: string,
    attemptId: string,
  ): Promise<AttemptReviewDto> {
    const attempt = await this.prisma.knowledgeAttempt.findFirst({
      where: {
        id: attemptId,
        userId,
      },
      include: {
        knowledgeCheck: {
          include: {
            questions: {
              orderBy: { sortOrder: 'asc' },
              include: {
                answers: {
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
        },
        responses: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt ${attemptId} not found`);
    }

    const responseMap = new Map((attempt.responses as any[]).map((r: any) => [r.questionId, r]));

    const items = attempt.knowledgeCheck.questions.map((q: any) => {
      const resp = responseMap.get(q.id);
      let yourAnswer: any = null;
      let correctAnswer: any = null;

      switch (q.questionType) {
        case 'MULTIPLE_CHOICE':
        case 'TRUE_FALSE':
        case 'IMAGE_CHOICE': {
          const selectedAns = q.answers.find((a: any) => a.id === (resp as any)?.selectedAnswerIds?.[0]);
          const correctAns = q.answers.find((a: any) => a.isCorrect);
          yourAnswer = selectedAns ? selectedAns.answerText : null;
          correctAnswer = correctAns ? correctAns.answerText : null;
          break;
        }

        case 'MULTI_SELECT': {
          yourAnswer = q.answers
            .filter((a: any) => (resp as any)?.selectedAnswerIds?.includes(a.id))
            .map((a: any) => a.answerText);
          correctAnswer = q.answers.filter((a: any) => a.isCorrect).map((a: any) => a.answerText);
          break;
        }

        case 'ORDERING': {
          const orderedMap = new Map(q.answers.map((a: any) => [a.id, a.answerText]));
          yourAnswer = ((resp as any)?.orderedItemIds || []).map((id: any) => orderedMap.get(id) || id);
          correctAnswer = [...q.answers]
            .sort((a: any, b: any) => (a.correctOrderIndex ?? 0) - (b.correctOrderIndex ?? 0))
            .map((a: any) => a.answerText);
          break;
        }

        case 'MATCHING': {
          yourAnswer = (resp as any)?.matchingPairs || {};
          const expectedPairs: Record<string, string> = {};
          for (const a of (q.answers as any[])) {
            if (a.matchTarget) {
              expectedPairs[a.answerText] = a.matchTarget;
            }
          }
          correctAnswer = expectedPairs;
          break;
        }

        default:
          yourAnswer = null;
          correctAnswer = null;
      }

      return {
        questionId: q.id,
        questionText: q.questionText,
        questionType: q.questionType as any,
        isCorrect: Boolean((resp as any)?.isCorrect),
        yourAnswer,
        correctAnswer,
        explanation: q.explanation,
        hintUsed: Boolean((resp as any)?.hintsUsed),
      };
    });

    return {
      attemptId: attempt.id,
      checkId: attempt.checkId,
      title: attempt.knowledgeCheck.title,
      score: attempt.score,
      passed: attempt.passed,
      completedAt: (attempt.completedAt || attempt.updatedAt).toISOString(),
      items,
    };
  }

  // -------------------------------------------------------------
  // Trainer / Admin Curriculum Authoring
  // -------------------------------------------------------------

  async createKnowledgeCheck(
    organisationId: string,
    userId: string,
    dto: CreateKnowledgeCheckDto,
  ) {
    return this.prisma.knowledgeCheck.create({
      data: {
        tenantId: organisationId,
        createdById: userId,
        title: dto.title,
        description: dto.description,
        instructions: dto.instructions,
        passingScore: dto.passingScore ?? 70,
        attemptLimit: dto.attemptLimit,
        timeLimitMinutes: dto.timeLimitMinutes,
        isRequiredForLesson: Boolean(dto.isRequiredForLesson),
        lessonId: dto.lessonId,
        exerciseId: dto.exerciseId,
      },
    });
  }

  async updateKnowledgeCheck(
    organisationId: string,
    checkId: string,
    dto: UpdateKnowledgeCheckDto,
  ) {
    const existing = await this.prisma.knowledgeCheck.findFirst({
      where: {
        id: checkId,
        OR: [{ tenantId: organisationId }, { tenantId: null }],
      },
    });

    if (!existing) {
      throw new NotFoundException(`Knowledge check ${checkId} not found`);
    }

    return this.prisma.knowledgeCheck.update({
      where: { id: checkId },
      data: {
        title: dto.title,
        description: dto.description,
        instructions: dto.instructions,
        passingScore: dto.passingScore,
        attemptLimit: dto.attemptLimit,
        timeLimitMinutes: dto.timeLimitMinutes,
        isRequiredForLesson: dto.isRequiredForLesson,
        contentStatus: dto.contentStatus,
      },
    });
  }

  async addQuestion(
    organisationId: string,
    checkId: string,
    dto: CreateKnowledgeQuestionDto,
  ) {
    const check = await this.prisma.knowledgeCheck.findFirst({
      where: {
        id: checkId,
        OR: [{ tenantId: organisationId }, { tenantId: null }],
      },
    });

    if (!check) {
      throw new NotFoundException(`Knowledge check ${checkId} not found`);
    }

    const question = await this.prisma.knowledgeQuestion.create({
      data: {
        checkId,
        questionText: dto.questionText,
        questionType: dto.questionType,
        difficulty: dto.difficulty ?? 'BEGINNER',
        sortOrder: dto.sortOrder ?? 0,
        explanation: dto.explanation,
        correctFeedback: dto.correctFeedback,
        incorrectFeedback: dto.incorrectFeedback,
        hint: dto.hint,
        mediaId: dto.mediaId,
        mediaUrl: dto.mediaUrl,
        mediaAltText: dto.mediaAltText,
        exercisePhaseId: dto.exercisePhaseId,
        metadata: dto.metadata ? (dto.metadata as any) : undefined,
        answers: {
          create: (dto.answers || []).map((ans, idx) => ({
            answerText: ans.answerText,
            isCorrect: Boolean(ans.isCorrect),
            explanation: ans.explanation,
            mediaUrl: ans.mediaUrl,
            mediaId: ans.mediaId,
            sortOrder: ans.sortOrder ?? idx,
            matchTarget: ans.matchTarget,
            correctOrderIndex: ans.correctOrderIndex,
          })),
        },
      },
      include: {
        answers: true,
      },
    });

    // Update questionCount on check
    const count = await this.prisma.knowledgeQuestion.count({
      where: { checkId },
    });
    await this.prisma.knowledgeCheck.update({
      where: { id: checkId },
      data: { questionCount: count },
    });

    return question;
  }

  async updateQuestion(
    organisationId: string,
    questionId: string,
    dto: UpdateKnowledgeQuestionDto,
  ) {
    const question = await this.prisma.knowledgeQuestion.findFirst({
      where: {
        id: questionId,
        knowledgeCheck: {
          OR: [{ tenantId: organisationId }, { tenantId: null }],
        },
      },
    });

    if (!question) {
      throw new NotFoundException(`Question ${questionId} not found`);
    }

    return this.prisma.$transaction(async (tx: any) => {
      if (dto.answers) {
        await tx.knowledgeAnswer.deleteMany({
          where: { questionId },
        });

        await tx.knowledgeAnswer.createMany({
          data: dto.answers.map((ans, idx) => ({
            questionId,
            answerText: ans.answerText,
            isCorrect: Boolean(ans.isCorrect),
            explanation: ans.explanation,
            mediaUrl: ans.mediaUrl,
            mediaId: ans.mediaId,
            sortOrder: ans.sortOrder ?? idx,
            matchTarget: ans.matchTarget,
            correctOrderIndex: ans.correctOrderIndex,
          })),
        });
      }

      return tx.knowledgeQuestion.update({
        where: { id: questionId },
        data: {
          questionText: dto.questionText,
          questionType: dto.questionType,
          difficulty: dto.difficulty,
          sortOrder: dto.sortOrder,
          explanation: dto.explanation,
          correctFeedback: dto.correctFeedback,
          incorrectFeedback: dto.incorrectFeedback,
          hint: dto.hint,
          mediaUrl: dto.mediaUrl,
          mediaAltText: dto.mediaAltText,
        },
        include: {
          answers: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });
  }

  async deleteQuestion(organisationId: string, questionId: string) {
    const question = await this.prisma.knowledgeQuestion.findFirst({
      where: {
        id: questionId,
        knowledgeCheck: {
          OR: [{ tenantId: organisationId }, { tenantId: null }],
        },
      },
    });

    if (!question) {
      throw new NotFoundException(`Question ${questionId} not found`);
    }

    await this.prisma.knowledgeQuestion.delete({
      where: { id: questionId },
    });

    const count = await this.prisma.knowledgeQuestion.count({
      where: { checkId: question.checkId },
    });
    await this.prisma.knowledgeCheck.update({
      where: { id: question.checkId },
      data: { questionCount: count },
    });

    return { success: true, message: 'Question deleted' };
  }

  async reorderQuestions(
    organisationId: string,
    checkId: string,
    questionIds: string[],
  ) {
    const check = await this.prisma.knowledgeCheck.findFirst({
      where: {
        id: checkId,
        OR: [{ tenantId: organisationId }, { tenantId: null }],
      },
    });

    if (!check) {
      throw new NotFoundException(`Knowledge check ${checkId} not found`);
    }

    await this.prisma.$transaction(
      questionIds.map((id, index) =>
        this.prisma.knowledgeQuestion.updateMany({
          where: { id, checkId },
          data: { sortOrder: index },
        }),
      ),
    );

    return { success: true, message: 'Questions reordered successfully' };
  }

  async validateAndPublishCheck(organisationId: string, checkId: string) {
    const check = await this.prisma.knowledgeCheck.findFirst({
      where: {
        id: checkId,
        OR: [{ tenantId: organisationId }, { tenantId: null }],
      },
      include: {
        questions: {
          include: {
            answers: true,
          },
        },
      },
    });

    if (!check) {
      throw new NotFoundException(`Knowledge check ${checkId} not found`);
    }

    if (check.questions.length === 0) {
      throw new BadRequestException('Cannot publish assessment with 0 questions');
    }

    for (const q of check.questions) {
      if (!q.questionText || q.questionText.trim().length === 0) {
        throw new BadRequestException(`Question ${q.id} has empty prompt text`);
      }

      switch (q.questionType) {
        case 'MULTIPLE_CHOICE':
        case 'TRUE_FALSE':
        case 'IMAGE_CHOICE': {
          if (q.answers.length < 2) {
            throw new BadRequestException(`Question "${q.questionText}" requires at least 2 answer choices`);
          }
          const correctCount = q.answers.filter((a: any) => a.isCorrect).length;
          if (correctCount !== 1) {
            throw new BadRequestException(
              `Question "${q.questionText}" must have exactly 1 correct answer (found ${correctCount})`,
            );
          }
          break;
        }

        case 'MULTI_SELECT': {
          if (q.answers.length < 2) {
            throw new BadRequestException(`Multi-select question "${q.questionText}" requires at least 2 choices`);
          }
          const correctCount = q.answers.filter((a: any) => a.isCorrect).length;
          if (correctCount < 1) {
            throw new BadRequestException(
              `Multi-select question "${q.questionText}" must have at least 1 correct answer configured`,
            );
          }
          break;
        }

        case 'ORDERING': {
          if (q.answers.length < 2) {
            throw new BadRequestException(`Ordering question "${q.questionText}" requires at least 2 items to sequence`);
          }
          const hasIndices = q.answers.every((a: any) => typeof a.correctOrderIndex === 'number');
          if (!hasIndices) {
            throw new BadRequestException(
              `Ordering question "${q.questionText}" is missing correct order sequence indices`,
            );
          }
          break;
        }

        case 'MATCHING': {
          if (q.answers.length < 2) {
            throw new BadRequestException(`Matching question "${q.questionText}" requires at least 2 pairs`);
          }
          const hasTargets = q.answers.every((a: any) => a.matchTarget && a.matchTarget.trim().length > 0);
          if (!hasTargets) {
            throw new BadRequestException(`Matching question "${q.questionText}" is missing target match values`);
          }
          break;
        }
      }
    }

    return this.prisma.knowledgeCheck.update({
      where: { id: checkId },
      data: {
        contentStatus: 'PUBLISHED',
        questionCount: check.questions.length,
      },
    });
  }

  // -------------------------------------------------------------
  // Private Helper Methods
  // -------------------------------------------------------------

  private async buildPlayerDto(
    check: any,
    userId: string,
  ): Promise<KnowledgeCheckPlayerDto> {
    const activeAttempt = await this.prisma.knowledgeAttempt.findFirst({
      where: {
        checkId: check.id,
        userId,
        status: 'IN_PROGRESS',
      },
      select: { id: true },
    });

    const sanitizedQuestions = check.questions.map((q: any) => {
      // Strip answer keys from choices
      const answers = q.answers.map((a: any) => ({
        id: a.id,
        questionId: a.questionId,
        answerText: a.answerText,
        mediaUrl: a.mediaUrl,
        sortOrder: a.sortOrder,
      }));

      // Extract target terms for matching questions
      let matchTargets: string[] | undefined = undefined;
      if (q.questionType === 'MATCHING') {
        const targetsSet = new Set<string>();
        for (const a of q.answers) {
          if (a.matchTarget) targetsSet.add(a.matchTarget);
        }
        // Shuffle targets deterministically
        matchTargets = Array.from(targetsSet).sort();
      }

      return {
        id: q.id,
        checkId: q.checkId,
        questionText: q.questionText,
        questionType: q.questionType,
        difficulty: q.difficulty,
        sortOrder: q.sortOrder,
        hint: q.hint,
        mediaUrl: q.mediaUrl,
        mediaAltText: q.mediaAltText,
        answers,
        matchTargets,
        metadata: q.metadata,
      };
    });

    return {
      id: check.id,
      title: check.title,
      description: check.description,
      instructions: check.instructions,
      passingScore: check.passingScore,
      questionCount: check.questions.length,
      isRequiredForLesson: check.isRequiredForLesson,
      attemptLimit: check.attemptLimit,
      timeLimitMinutes: check.timeLimitMinutes,
      activeAttemptId: activeAttempt?.id || null,
      lessonId: check.lessonId,
      pathId: check.lesson?.pathId || null,
      questions: sanitizedQuestions,
    };
  }
}
