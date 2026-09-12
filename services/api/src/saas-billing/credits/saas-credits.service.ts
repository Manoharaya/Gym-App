import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GrantCreditDto } from '../dto/saas-billing.dto';

@Injectable()
export class SaasCreditsService {
  private readonly logger = new Logger(SaasCreditsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves credit balance and recent transactions for an organisation.
   */
  async getCreditBalance(organisationId: string) {
    let credit = await this.prisma.saasCreditBalance.findUnique({
      where: { organisationId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!credit) {
      credit = await this.prisma.saasCreditBalance.create({
        data: {
          organisationId,
          currency: 'AUD',
          balanceMinor: 0,
        },
        include: {
          transactions: true,
        },
      });
    }

    return credit;
  }

  /**
   * Grants auditable credit to an organisation's SaaS account.
   */
  async grantCredit(
    organisationId: string,
    dto: GrantCreditDto,
    performedByUserId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      let credit = await tx.saasCreditBalance.findUnique({
        where: { organisationId },
      });

      if (!credit) {
        credit = await tx.saasCreditBalance.create({
          data: {
            organisationId,
            currency: 'AUD',
            balanceMinor: 0,
          },
        });
      }

      const newBalance = credit.balanceMinor + dto.amountMinor;

      await tx.saasCreditBalance.update({
        where: { id: credit.id },
        data: { balanceMinor: newBalance },
      });

      const transaction = await tx.saasCreditTransaction.create({
        data: {
          creditBalanceId: credit.id,
          type: 'GRANTED',
          amountMinor: dto.amountMinor,
          balanceAfterMinor: newBalance,
          reason: dto.reason,
          performedByUserId,
        },
      });

      return {
        balanceMinor: newBalance,
        transaction,
      };
    });
  }
}
