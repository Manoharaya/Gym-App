import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { EnterpriseBrandingService } from '../services/enterprise-branding.service';
import { SetBrandingDto } from '../dto/enterprise-branding.dto';

@Controller('enterprise/branding')
@UseGuards(JwtAuthGuard)
export class EnterpriseBrandingController {
  constructor(private readonly brandingService: EnterpriseBrandingService) {}

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
  async setBranding(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Body() dto: SetBrandingDto,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.brandingService.setBranding(orgId, dto, user.id);
  }

  @Get('effective')
  async getEffectiveBranding(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Query('brandId') brandId?: string,
    @Query('outletId') outletId?: string,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.brandingService.getEffectiveBranding({
      organisationId: orgId,
      brandId,
      outletId,
    });
  }
}
