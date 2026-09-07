import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SubmitAIFeedbackDto } from '../dto/ai.dto';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';

@Injectable()
export class AIFeedbackService {
  private readonly logger = new Logger(AIFeedbackService.name);

  constructor(private readonly prisma: PrismaService) {}

  async submitFeedback(user: AuthenticatedUser, dto: SubmitAIFeedbackDto) {
    const response = await this.prisma.aIResponse.findUnique({
      where: { id: dto.aiResponseId },
      include: { aiRequest: true },
    });

    if (!response) {
      throw new NotFoundException(`AI Response '${dto.aiResponseId}' not found`);
    }

    // Resolve member profile if any
    const member = await this.prisma.memberProfile.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    const feedback = await this.prisma.aIFeedback.create({
      data: {
        aiResponseId: response.id,
        userId: user.id,
        memberId: member?.id || response.aiRequest.memberId,
        rating: dto.rating,
        reason: dto.reason,
        comment: dto.comment,
      },
    });

    this.logger.log(`Received AI feedback '${dto.rating}' for response '${dto.aiResponseId}'`);
    return feedback;
  }

  async listFeedbackForResponse(aiResponseId: string) {
    return this.prisma.aIFeedback.findMany({
      where: { aiResponseId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
