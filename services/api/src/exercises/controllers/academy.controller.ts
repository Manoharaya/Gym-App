import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Headers,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { AcademyService } from '../services/academy.service';
import {
  CreateCurriculumDto,
  UpdateCurriculumDto,
  CurriculumQueryDto,
  CreateGlossaryTermDto,
  UpdateGlossaryTermDto,
  GlossaryQueryDto,
} from '../dto/academy.dto';

@ApiTags('Fitness Education Academy & Curriculum')
@ApiBearerAuth()
@Controller('learning')
export class AcademyController {
  constructor(private readonly academyService: AcademyService) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || (user as any).organisationId || user.roles?.[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  private isPlatformAdmin(user: AuthenticatedUser): boolean {
    const roles = user.roles || [];
    return roles.some((r: any) =>
      typeof r === 'string'
        ? r.toUpperCase() === 'SUPERADMIN'
        : r.role?.name?.toUpperCase() === 'SUPERADMIN',
    );
  }

  // ==========================================
  // 1. FITNESS ACADEMY HUB
  // ==========================================

  @Get('academy')
  @ApiOperation({ summary: 'Get aggregated Fitness Academy landing overview' })
  async getAcademyOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return await this.academyService.getAcademyOverview(orgId, user.id);
  }

  @Get('academy/categories')
  @ApiOperation({ summary: 'Get all curriculum categories with published counts' })
  async getCategories(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return await this.academyService.getCategoriesWithCounts(orgId);
  }

  @Post('academy/seed')
  @ApiOperation({ summary: 'Idempotently seed foundational curricula and glossary terms' })
  async seedAcademy(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    await this.academyService.seedFoundationalAcademyContent(orgId, user.id);
    return { success: true, message: 'Foundational academy content initialized successfully' };
  }

  // ==========================================
  // 2. CURRICULUM ENDPOINTS
  // ==========================================

  @Get('curricula')
  @ApiOperation({ summary: 'List published curricula with member progress' })
  async getCurricula(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CurriculumQueryDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return await this.academyService.getCurricula(orgId, user.id, query);
  }

  @Get('curricula/:idOrSlug')
  @ApiOperation({ summary: 'Get full curriculum detail and nested learning path syllabus' })
  async getCurriculumDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('idOrSlug') idOrSlug: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return await this.academyService.getCurriculumById(orgId, user.id, idOrSlug);
  }

  @Post('curricula')
  @ApiOperation({ summary: 'Create a new curriculum (Trainer/Admin)' })
  async createCurriculum(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCurriculumDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const isAdmin = this.isPlatformAdmin(user);
    return await this.academyService.createCurriculum(orgId, user.id, dto, isAdmin);
  }

  @Patch('curricula/:id')
  @ApiOperation({ summary: 'Update curriculum (Trainer/Admin)' })
  async updateCurriculum(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCurriculumDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const isAdmin = this.isPlatformAdmin(user);
    return await this.academyService.updateCurriculum(orgId, id, dto, isAdmin);
  }

  @Post('curricula/:id/publish')
  @ApiOperation({ summary: 'Validate and publish curriculum' })
  async publishCurriculum(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return await this.academyService.validateAndPublishCurriculum(orgId, id);
  }

  // ==========================================
  // 3. FITNESS TERMINOLOGY GLOSSARY ENDPOINTS
  // ==========================================

  @Get('glossary')
  @ApiOperation({ summary: 'Search and browse fitness terminology glossary' })
  async getGlossary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GlossaryQueryDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return await this.academyService.getGlossaryTerms(orgId, query);
  }

  @Get('glossary/:termOrSlug')
  @ApiOperation({ summary: 'Get single glossary term detail with related exercises and lessons' })
  async getGlossaryTerm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('termOrSlug') termOrSlug: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return await this.academyService.getGlossaryTermBySlugOrTerm(orgId, termOrSlug);
  }

  @Post('glossary')
  @ApiOperation({ summary: 'Create a glossary term' })
  async createGlossaryTerm(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateGlossaryTermDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const isAdmin = this.isPlatformAdmin(user);
    return await this.academyService.createGlossaryTerm(orgId, user.id, dto, isAdmin);
  }

  @Patch('glossary/:id')
  @ApiOperation({ summary: 'Update a glossary term' })
  async updateGlossaryTerm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateGlossaryTermDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return await this.academyService.updateGlossaryTerm(orgId, id, dto);
  }

  @Delete('glossary/:id')
  @ApiOperation({ summary: 'Delete a glossary term' })
  async deleteGlossaryTerm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return await this.academyService.deleteGlossaryTerm(orgId, id);
  }
}
