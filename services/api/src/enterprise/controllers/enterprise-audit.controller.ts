import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { PrismaService } from '../../database/prisma.service';

@Controller('enterprise/audit')
@UseGuards(JwtAuthGuard)
export class EnterpriseAuditController {
  constructor(private readonly prisma: PrismaService) {}

  private extractOrgId(user: AuthenticatedUser, req: any): string {
    const orgId =
      req?.headers?.['x-organisation-id'] ||
      req?.headers?.['X-Organisation-Id'] ||
      user?.primaryOrganisationId ||
      user?.roles?.[0]?.organisationId;

    if (!orgId) {
      throw new BadRequestException('Organisation context is required');
    }
    return orgId;
  }

  @Get()
  async getEnterpriseAuditLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Query('resource') resource?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
  ) {
    const orgId = this.extractOrgId(user, req);
    const take = limit ? Math.min(100, parseInt(limit, 10)) : 50;

    return this.prisma.auditLog.findMany({
      where: {
        organisationId: orgId,
        ...(resource ? { resource } : { action: { startsWith: 'enterprise.' } }),
        ...(action ? { action } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
