import { apiClient } from '../../../services/api';
import type {
  WearableProviderInfo,
  WearableConnectionDto,
  ConnectWearableDto,
  ReauthorizeWearableDto,
  SyncWearableRequestDto,
  SyncWearableResultDto,
  HealthDataRecordDto,
  HealthDataQueryDto,
  HealthDataSummaryDto,
  WearablePrivacyViewDto,
  WearableProviderType,
} from '@fitcore/types';

export interface PaginatedHealthDataResponse {
  records: HealthDataRecordDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class WearablesService {
  /**
   * Retrieves all available wearable providers with capability matrices.
   */
  static async getProviders(): Promise<WearableProviderInfo[]> {
    const res = await apiClient.get<WearableProviderInfo[]>('/wearables/providers');
    return res.data;
  }

  /**
   * Retrieves capability details for a specific provider.
   */
  static async getProvider(provider: WearableProviderType): Promise<WearableProviderInfo> {
    const res = await apiClient.get<WearableProviderInfo>(`/wearables/providers/${provider}`);
    return res.data;
  }

  /**
   * Connects a wearable provider.
   */
  static async connect(dto: ConnectWearableDto): Promise<WearableConnectionDto> {
    const res = await apiClient.post<WearableConnectionDto>('/wearables/connect', dto);
    return res.data;
  }

  /**
   * Lists all active wearable connections for the current member.
   */
  static async getConnections(): Promise<WearableConnectionDto[]> {
    const res = await apiClient.get<WearableConnectionDto[]>('/wearables/connections');
    return res.data;
  }

  /**
   * Retrieves single connection details by ID.
   */
  static async getConnection(id: string): Promise<WearableConnectionDto> {
    const res = await apiClient.get<WearableConnectionDto>(`/wearables/connections/${id}`);
    return res.data;
  }

  /**
   * Triggers manual or forward synchronization for a connection.
   */
  static async syncConnection(
    connectionId: string,
    request: SyncWearableRequestDto = {},
  ): Promise<SyncWearableResultDto> {
    const res = await apiClient.post<SyncWearableResultDto>(
      `/wearables/connections/${connectionId}/sync`,
      request,
    );
    return res.data;
  }

  /**
   * Reauthorizes an expired connection.
   */
  static async reauthorize(
    connectionId: string,
    dto: ReauthorizeWearableDto,
  ): Promise<WearableConnectionDto> {
    const res = await apiClient.post<WearableConnectionDto>(
      `/wearables/connections/${connectionId}/reauthorize`,
      dto,
    );
    return res.data;
  }

  /**
   * Disconnects a provider and invalidates credentials.
   */
  static async disconnect(connectionId: string): Promise<WearableConnectionDto> {
    const res = await apiClient.post<WearableConnectionDto>(
      `/wearables/connections/${connectionId}/disconnect`,
      {},
    );
    return res.data;
  }

  /**
   * Queries paginated normalized health telemetry records.
   */
  static async getHealthData(query: HealthDataQueryDto = {}): Promise<PaginatedHealthDataResponse> {
    const params = new URLSearchParams();
    if (query.dataType) params.append('dataType', query.dataType);
    if (query.provider) params.append('provider', query.provider);
    if (query.startDate) params.append('startDate', query.startDate);
    if (query.endDate) params.append('endDate', query.endDate);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const qs = params.toString();
    const url = `/wearables/data${qs ? `?${qs}` : ''}`;
    const res = await apiClient.get<PaginatedHealthDataResponse>(url);
    return res.data;
  }

  /**
   * Retrieves deterministic health metrics summary (daily/weekly).
   */
  static async getHealthSummary(
    startDate?: string,
    endDate?: string,
  ): Promise<HealthDataSummaryDto> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const qs = params.toString();

    const res = await apiClient.get<HealthDataSummaryDto>(`/wearables/data/summary${qs ? `?${qs}` : ''}`);
    return res.data;
  }

  /**
   * Retrieves member privacy transparency breakdown.
   */
  static async getPrivacyView(): Promise<WearablePrivacyViewDto> {
    const res = await apiClient.get<WearablePrivacyViewDto>('/wearables/privacy');
    return res.data;
  }

  /**
   * Self-service data deletion (Privacy Centre foundation).
   */
  static async deleteWearableData(params: {
    provider?: WearableProviderType;
    connectionId?: string;
  } = {}): Promise<{ recordsDeleted: number }> {
    const q = new URLSearchParams();
    if (params.provider) q.append('provider', params.provider);
    if (params.connectionId) q.append('connectionId', params.connectionId);
    const qs = q.toString();

    const res = await apiClient.delete<{ recordsDeleted: number }>(`/wearables/data${qs ? `?${qs}` : ''}`);
    return res.data;
  }
}
