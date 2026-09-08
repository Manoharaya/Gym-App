import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { MembershipSignals } from '../engagement-intelligence.types';

@Injectable()
export class MembershipSignalsService {
  private readonly logger = new Logger(MembershipSignalsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reads commercial membership status as a signal only.
   * STRICT BOUNDARY: Never alters membership status, dates, or terms.
   */
  async collect(memberId: string, organisationId: string, now: Date = new Date()): Promise<MembershipSignals> {
    const membership = await this.prisma.memberMembership.findFirst({
      where: {
        memberProfileId: memberId,
        organisationId,
      },
      include: {
        membershipPlan: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!membership) {
      return {
        status: 'NONE',
        daysUntilExpiry: null,
        isExpiringSoon: false,
        isSuspended: false,
        isPastDue: false,
      };
    }

    let daysUntilExpiry: number | null = null;
    if (membership.endDate) {
      const diffMs = membership.endDate.getTime() - now.getTime();
      daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 14 && daysUntilExpiry >= 0;
    const isSuspended = membership.status === 'SUSPENDED';
    const isPastDue = daysUntilExpiry !== null && daysUntilExpiry < 0;

    return {
      status: membership.status,
      planName: membership.membershipPlan?.name,
      daysUntilExpiry,
      isExpiringSoon,
      isSuspended,
      isPastDue,
      startDate: membership.startDate,
      endDate: membership.endDate,
    };
  }
}
