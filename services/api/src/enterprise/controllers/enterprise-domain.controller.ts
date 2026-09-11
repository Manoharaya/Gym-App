import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { EnterpriseDomainService } from '../services/enterprise-domain.service';
import { RegisterCustomDomainDto } from '../dto/custom-domain.dto';

@Controller('enterprise/domains')
@UseGuards(JwtAuthGuard)
export class EnterpriseDomainController {
  constructor(private readonly domainService: EnterpriseDomainService) {}

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

  @Post()
  async registerDomain(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Body() dto: RegisterCustomDomainDto,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.domainService.registerDomain(orgId, dto, user.id);
  }

  @Get()
  async getDomains(@CurrentUser() user: AuthenticatedUser, @Req() req: any) {
    const orgId = this.extractOrgId(user, req);
    return this.domainService.getDomains(orgId);
  }

  @Post(':id/verify')
  async verifyDomain(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.domainService.verifyDomain(orgId, id, user.id);
  }

  @Delete(':id')
  async deleteDomain(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.domainService.deleteDomain(orgId, id, user.id);
  }
}
