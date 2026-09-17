import {
  Controller,
  Get,
  Param,
  Headers,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { ExerciseVisualDiscoveryService } from '../services/exercise-visual-discovery.service';
import { DiscoveryDimensionParamDto } from '../dto/exercise-discovery.dto';

@ApiTags('Exercise Discovery')
@ApiBearerAuth()
@Controller('exercise-discovery')
export class ExerciseDiscoveryController {
  constructor(
    private readonly discoveryService: ExerciseVisualDiscoveryService,
  ) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || (user as any).organisationId || user.roles?.[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  @Get('overview')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Get visual discovery landing data overview across all fitness dimensions' })
  async getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.discoveryService.getDiscoveryOverview(organisationId);
  }

  @Get('categories')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'List categories with active exercise counts and representative media' })
  async getCategories(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.discoveryService.getCategories(organisationId);
  }

  @Get('muscles')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'List muscle groups with anterior/posterior regions and primary/secondary counts' })
  async getMuscles(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.discoveryService.getMuscles(organisationId);
  }

  @Get('equipment')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'List equipment options with counts and explicit no-equipment support' })
  async getEquipment(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.discoveryService.getEquipment(organisationId);
  }

  @Get('movements')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'List foundational biomechanical movement patterns with descriptions' })
  async getMovements(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.discoveryService.getMovements(organisationId);
  }

  @Get('goals')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'List training goals with exercise distributions' })
  async getGoals(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.discoveryService.getGoals(organisationId);
  }

  @Get('difficulty')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'List difficulty levels with real active exercise counts' })
  async getDifficulty(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.discoveryService.getDifficulty(organisationId);
  }

  @Get(':dimension/:value')
  @RequirePermission('exercises', 'read')
  @ApiOperation({ summary: 'Deep dive into a specific discovery dimension with cross-discovery relationships' })
  async getDimensionDetail(
    @Param() params: DiscoveryDimensionParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrgId(user, headerOrgId);
    return this.discoveryService.getDimensionDetail(
      organisationId,
      params.dimension,
      params.value
    );
  }
}
