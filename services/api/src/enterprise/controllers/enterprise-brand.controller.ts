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
import { EnterpriseBrandService } from '../services/enterprise-brand.service';
import { CreateBrandDto, UpdateBrandDto } from '../dto/create-brand.dto';

@Controller('enterprise/brands')
@UseGuards(JwtAuthGuard)
export class EnterpriseBrandController {
  constructor(private readonly brandService: EnterpriseBrandService) {}

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
  async createBrand(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Body() dto: CreateBrandDto,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.brandService.createBrand(orgId, dto, user.id);
  }

  @Get()
  async getBrands(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Query('includeArchived') includeArchived?: string,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.brandService.getBrands(orgId, includeArchived === 'true');
  }

  @Get(':id')
  async getBrandById(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.brandService.getBrandById(orgId, id);
  }

  @Patch(':id')
  async updateBrand(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.brandService.updateBrand(orgId, id, dto, user.id);
  }

  @Delete(':id')
  async archiveBrand(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const orgId = this.extractOrgId(user, req);
    return this.brandService.archiveBrand(orgId, id, user.id);
  }
}
