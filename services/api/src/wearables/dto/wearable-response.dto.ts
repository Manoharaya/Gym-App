import {
  WearableConnectionDto,
  HealthDataRecordDto,
  HealthDataSummaryDto,
  WearablePrivacyViewDto,
  WearableTrainerClientSummaryDto,
  SyncWearableResultDto,
  WearableProviderInfo,
} from '@fitcore/types';

export class WearableConnectionResponseDto {
  connection: WearableConnectionDto;
}

export class PaginatedHealthDataResponseDto {
  records: HealthDataRecordDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
