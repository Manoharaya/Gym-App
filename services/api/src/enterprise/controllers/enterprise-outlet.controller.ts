import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { EnterpriseOutletService } from '../services/enterprise-outlet.service';
import {
  CreateEnterpriseOutletDto,
  UpdateEnterpriseOutletDto,
  TransferOutletDto,
} from '../dto/create-outlet-enterprise.dto';

@Controller('enterprise/outlets')
@UseGuards(JwtAuthGuard)
export class EnterpriseOutletController {
  constructor(private readonly outletService: EnterpriseOutletService) {}

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
  async createOutlet(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Body() dto: CreateEnterpriseOutletDto,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.outletService.createOutlet(orgId, dto, user.id);
  }

  @Get()
  async getOutlets(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Query('brandId') brandId?: string,
    @Query('region') region?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.outletService.getOutlets(orgId, { brandId, region, status, search });
  }

  @Get(':id')
  async getOutletById(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.outletService.getOutletById(orgId, id);
  }

  @Patch(':id')
  async updateOutlet(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateEnterpriseOutletDto,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.outletService.updateOutlet(orgId, id, dto, user.id);
  }

  @Post(':id/transfer')
  async transferOutletBrand(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: TransferOutletDto,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.outletService.transferOutletBrand(orgId, id, dto, user.id);
  }

  @Delete(':id')
  async archiveOutlet(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.outletService.archiveOutlet(orgId, id, user.id);
  }
}
