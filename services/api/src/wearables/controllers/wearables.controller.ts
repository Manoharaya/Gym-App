import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { PrismaService } from '../../database/prisma.service';
import { WearableCapabilitiesRegistry } from '../domain/wearable-capabilities.registry';
import { WearableConnectionService } from '../services/wearable-connection.service';
import { WearableSyncService } from '../services/wearable-sync.service';
import { HealthDataService } from '../services/health-data.service';
import { HealthDataSummaryService } from '../services/health-data-summary.service';
import { WearablePrivacyService } from '../services/wearable-privacy.service';
import { WearableTrainerService } from '../services/wearable-trainer.service';
import { WearableDataDeletionService } from '../security/wearable-data-deletion.service';
import { ConnectProviderDto, ReauthorizeProviderDto } from '../dto/connect-provider.dto';
import { SyncRequestDto } from '../dto/sync-request.dto';
import { QueryHealthDataDto } from '../dto/query-health-data.dto';
import {
  WearableProviderType,
  WearableProviderInfo,
  WearableConnectionDto,
  SyncWearableResultDto,
  HealthDataSummaryDto,
  WearablePrivacyViewDto,
  WearableTrainerClientSummaryDto,
} from '@fitcore/types';
import { PaginatedHealthDataResponseDto } from '../dto/wearable-response.dto';

@ApiTags('Wearables & Health Data Sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wearables')
export class WearablesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly capabilities: WearableCapabilitiesRegistry,
    private readonly connectionService: WearableConnectionService,
    private readonly syncService: WearableSyncService,
    private readonly healthDataService: HealthDataService,
    private readonly summaryService: HealthDataSummaryService,
    private readonly privacyService: WearablePrivacyService,
    private readonly trainerService: WearableTrainerService,
    private readonly deletionService: WearableDataDeletionService,
  ) {}

  /**
   * Helper resolving MemberProfile.id from AuthenticatedUser.
   */
  private async getMemberProfileId(userId: string): Promise<string> {
    const profile = await this.prisma.memberProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException('Member profile not found for user.');
    }
    return profile.id;
  }

  // 1. Providers Registry
  @Get('providers')
  @ApiOperation({ summary: 'List all supported wearable providers and capabilities' })
  @ApiResponse({ status: 200, description: 'List of providers with Wave 1/2 capabilities' })
  getProviders(): WearableProviderInfo[] {
    return this.capabilities.getAllProviders();
  }

  @Get('providers/:provider')
  @ApiOperation({ summary: 'Get details and capabilities for a specific provider' })
  @ApiResponse({ status: 200, description: 'Provider capability details' })
  getProvider(@Param('provider') provider: WearableProviderType): WearableProviderInfo {
    const info = this.capabilities.getProvider(provider);
    if (!info) {
      throw new NotFoundException(`Provider '${provider}' not found.`);
    }
    return info;
  }

  // 2. Connection Lifecycle
  @Post('connect')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Connect a wearable platform (requires WEARABLE_DATA consent)' })
  @ApiResponse({ status: 201, description: 'Connection established successfully' })
  async connect(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConnectProviderDto,
  ): Promise<WearableConnectionDto> {
    const memberId = await this.getMemberProfileId(user.id);
    const orgId = user.roles[0]?.organisationId || user.primaryOrganisationId!;
    return this.connectionService.connect(dto, memberId, orgId, user.id);
  }

  @Get('connections')
  @ApiOperation({ summary: 'List all active wearable connections for current member' })
  @ApiResponse({ status: 200, description: 'List of member connections' })
  async getConnections(@CurrentUser() user: AuthenticatedUser): Promise<WearableConnectionDto[]> {
    const memberId = await this.getMemberProfileId(user.id);
    const orgId = user.roles[0]?.organisationId || user.primaryOrganisationId!;
    return this.connectionService.getMemberConnections(memberId, orgId);
  }

  @Get('connections/:id')
  @ApiOperation({ summary: 'Get details for a specific wearable connection' })
  @ApiResponse({ status: 200, description: 'Connection details' })
  async getConnection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') connectionId: string,
  ): Promise<WearableConnectionDto> {
    const memberId = await this.getMemberProfileId(user.id);
    const orgId = user.roles[0]?.organisationId || user.primaryOrganisationId!;
    return this.connectionService.getConnectionById(connectionId, memberId, orgId);
  }

  @Post('connections/:id/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger synchronization for a wearable connection' })
  @ApiResponse({ status: 200, description: 'Sync completed with telemetry counts' })
  async sync(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') connectionId: string,
    @Body() body: SyncRequestDto,
  ): Promise<SyncWearableResultDto> {
    const memberId = await this.getMemberProfileId(user.id);
    const orgId = user.roles[0]?.organisationId || user.primaryOrganisationId!;
    return this.syncService.sync(connectionId, memberId, orgId, body, user.id);
  }

  @Post('connections/:id/reauthorize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reauthorize an expired wearable connection' })
  @ApiResponse({ status: 200, description: 'Connection reauthorized' })
  async reauthorize(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') connectionId: string,
    @Body() dto: ReauthorizeProviderDto,
  ): Promise<WearableConnectionDto> {
    const memberId = await this.getMemberProfileId(user.id);
    const orgId = user.roles[0]?.organisationId || user.primaryOrganisationId!;
    return this.connectionService.reauthorize(connectionId, dto, memberId, orgId, user.id);
  }

  @Post('connections/:id/disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect and revoke a wearable connection' })
  @ApiResponse({ status: 200, description: 'Connection revoked and credentials cleared' })
  async disconnect(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') connectionId: string,
  ): Promise<WearableConnectionDto> {
    const memberId = await this.getMemberProfileId(user.id);
    const orgId = user.roles[0]?.organisationId || user.primaryOrganisationId!;
    return this.connectionService.disconnect(connectionId, memberId, orgId, user.id);
  }

  // 3. Health Data Queries & Summaries
  @Get('data')
  @ApiOperation({ summary: 'Query normalized health telemetry records with pagination' })
  @ApiResponse({ status: 200, description: 'Paginated health records' })
  async getHealthData(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryHealthDataDto,
  ): Promise<PaginatedHealthDataResponseDto> {
    const memberId = await this.getMemberProfileId(user.id);
    const orgId = user.roles[0]?.organisationId || user.primaryOrganisationId!;
    return this.healthDataService.getMemberHealthData(memberId, orgId, query);
  }

  @Get('data/summary')
  @ApiOperation({ summary: 'Get deterministic normalized health summary (daily/weekly)' })
  @ApiResponse({ status: 200, description: 'Daily metrics, averages, and provider sources' })
  async getHealthSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<HealthDataSummaryDto> {
    const memberId = await this.getMemberProfileId(user.id);
    const orgId = user.roles[0]?.organisationId || user.primaryOrganisationId!;
    return this.summaryService.getMemberSummary(memberId, orgId, startDate, endDate);
  }

  // 4. Privacy & Transparency
  @Get('privacy')
  @ApiOperation({ summary: 'Get member privacy transparency view for wearable data' })
  @ApiResponse({ status: 200, description: 'Full transparency breakdown of held data and trainer access' })
  async getPrivacyView(@CurrentUser() user: AuthenticatedUser): Promise<WearablePrivacyViewDto> {
    const memberId = await this.getMemberProfileId(user.id);
    const orgId = user.roles[0]?.organisationId || user.primaryOrganisationId!;
    return this.privacyService.getPrivacyView(memberId, orgId);
  }

  @Delete('data')
  @ApiOperation({ summary: 'Delete member wearable health data (Privacy Centre self-service)' })
  @ApiResponse({ status: 200, description: 'Wearable data deleted according to policy' })
  async deleteWearableData(
    @CurrentUser() user: AuthenticatedUser,
    @Query('provider') provider?: WearableProviderType,
    @Query('connectionId') connectionId?: string,
  ) {
    const memberId = await this.getMemberProfileId(user.id);
    const orgId = user.roles[0]?.organisationId || user.primaryOrganisationId!;

    if (connectionId) {
      return this.deletionService.deleteConnectionData(connectionId, memberId, orgId, user.id);
    }
    if (provider) {
      return this.deletionService.deleteProviderData(provider, memberId, orgId, user.id);
    }
    return this.deletionService.deleteAllMemberWearableData(memberId, orgId, user.id);
  }

  // 5. Scoped Trainer View
  @Get('trainer/client/:memberId')
  @ApiOperation({ summary: 'Get summarized wearable activity for assigned personal training client' })
  @ApiResponse({ status: 200, description: 'High-level activity summary for coach' })
  async getTrainerClientSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') targetMemberId: string,
  ): Promise<WearableTrainerClientSummaryDto> {
    const orgId = user.roles[0]?.organisationId || user.primaryOrganisationId!;
    return this.trainerService.getTrainerClientWearableSummary(targetMemberId, user.id, orgId);
  }
}
