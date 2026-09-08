import {
  WearableProviderType,
  WearableCapability,
  HealthDataType,
  SyncWearableRequestDto,
  IngestHealthDataRecordInput,
} from '@fitcore/types';

export interface ProviderAuthContext {
  memberId: string;
  organisationId: string;
  authCode?: string;
  redirectUri?: string;
  scopes?: string[];
  nativeAccessToken?: string;
  nativeRefreshToken?: string;
  tokenExpiresIn?: number;
}

export interface ProviderAuthResult {
  providerUserReference?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresInSeconds?: number;
  scopes: string[];
}

export interface ProviderTokenRefreshResult {
  accessToken: string;
  refreshToken?: string;
  expiresInSeconds?: number;
}

export interface ProviderFetchResult {
  records: IngestHealthDataRecordInput[];
  rawPayload?: any;
  hasMore?: boolean;
  nextSyncToken?: string;
}

export interface IWearableProvider {
  readonly providerType: WearableProviderType;

  getCapabilities(): WearableCapability[];

  getAuthorizationUrl?(context: { redirectUri: string; state: string }): Promise<string>;

  authorize(context: ProviderAuthContext): Promise<ProviderAuthResult>;

  refreshAuthorization?(connection: {
    encryptedAccessToken?: string | null;
    encryptedRefreshToken?: string | null;
  }): Promise<ProviderTokenRefreshResult>;

  revokeAuthorization?(connection: {
    providerUserReference?: string | null;
    encryptedAccessToken?: string | null;
  }): Promise<void>;

  fetchData(
    connection: {
      id: string;
      providerUserReference?: string | null;
      lastSuccessfulSyncAt?: Date | null;
    },
    request: SyncWearableRequestDto,
  ): Promise<ProviderFetchResult>;
}
