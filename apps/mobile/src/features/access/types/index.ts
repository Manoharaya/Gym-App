import type {
  CredentialType,
  CredentialStatus,
  CheckInMethod,
  CheckInStatus,
  AccessDecisionReason,
  AccessDecisionResult,
  MemberAccessStatusResponse,
  DynamicQRCredentialResponse,
  CheckIn,
  AccessCredential,
} from '@fitcore/types';

export type {
  CredentialType,
  CredentialStatus,
  CheckInMethod,
  CheckInStatus,
  AccessDecisionReason,
  AccessDecisionResult,
  MemberAccessStatusResponse,
  DynamicQRCredentialResponse,
  CheckIn,
  AccessCredential,
};

export interface CheckInRequestPayload {
  outletId: string;
  method?: CheckInMethod;
  credentialReference?: string;
  metadata?: Record<string, unknown>;
}

export interface CheckOutRequestPayload {
  outletId: string;
  credentialReference?: string;
}
