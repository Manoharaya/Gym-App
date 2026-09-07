import {
  Controller,
  Get,
  Param,
  Headers,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { PrismaService } from '../../database/prisma.service';
import { EngagementEventService } from '../services/engagement-event.service';
import { UserRole } from '@fitcore/types';

@ApiTags('Staff Engagement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('staff/members')
export class EngagementStaffController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventService: EngagementEventService,
  ) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId =
      headerOrgId ||
      (user as any).organisationId ||
      (user as any).activeOrganisationId;
    if (!orgId) throw new ForbiddenException('Organisation context required');
    return orgId;
  }

  @Get(':memberId/engagement')
  @ApiOperation({ summary: 'Get operational engagement summary for a member' })
  async getMemberEngagement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);

    const targetMember = await this.prisma.memberProfile.findUnique({
      where: { id: memberId },
      select: { id: true, organisationId: true },
    });

    if (!targetMember || targetMember.organisationId !== orgId) {
      throw new NotFoundException('Member not found in organisation');
    }

    const role = (user as any).role || (user as any).activeRole;

    // Trainer scope check (Slice 31, 39, 40)
    if (role === 'TRAINER') {
      const trainer = await this.prisma.trainerProfile.findFirst({
        where: { staffProfile: { userId: user.id }, organisationId: orgId },
      });

      if (!trainer) {
        throw new ForbiddenException('Trainer profile not found');
      }

      const assignment = await this.prisma.trainerClientAssignment.findFirst({
        where: {
          trainerProfileId: trainer.id,
          memberProfileId: memberId,
          status: 'ACTIVE',
        },
      });

      if (!assignment) {
        throw new ForbiddenException(
          'Trainer can only access engagement data for assigned clients within coaching scope',
        );
      }
    }

    return this.eventService.getMemberEngagementSummary(memberId, orgId);
  }
}
