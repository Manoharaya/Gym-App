import { WearableProviderType, WearableSyncType } from '@fitcore/types';

export class WearableConnectedEvent {
  constructor(
    public readonly connectionId: string,
    public readonly memberId: string,
    public readonly organisationId: string,
    public readonly provider: WearableProviderType,
  ) {}
}

export class WearableDisconnectedEvent {
  constructor(
    public readonly connectionId: string,
    public readonly memberId: string,
    public readonly organisationId: string,
    public readonly provider: WearableProviderType,
  ) {}
}

export class WearableSyncCompletedEvent {
  constructor(
    public readonly connectionId: string,
    public readonly memberId: string,
    public readonly organisationId: string,
    public readonly provider: WearableProviderType,
    public readonly syncType: WearableSyncType,
    public readonly recordsInserted: number,
  ) {}
}

export class WearableSyncFailedEvent {
  constructor(
    public readonly connectionId: string,
    public readonly memberId: string,
    public readonly organisationId: string,
    public readonly provider: WearableProviderType,
    public readonly errorCode: string,
    public readonly errorMessage: string,
  ) {}
}

export class WearableConsentRevokedEvent {
  constructor(
    public readonly memberId: string,
    public readonly organisationId: string,
    public readonly revokedAt: Date,
  ) {}
}
