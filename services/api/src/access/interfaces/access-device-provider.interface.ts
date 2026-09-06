import { DeviceStatus, AccessDecisionResult } from '@fitcore/types';

export const ACCESS_DEVICE_PROVIDER = 'ACCESS_DEVICE_PROVIDER';

export interface IAccessDeviceProvider {
  getProviderName(): string;
  getDeviceStatus(providerDeviceId: string): Promise<DeviceStatus>;
  unlock(providerDeviceId: string, durationMs?: number): Promise<boolean>;
  lock(providerDeviceId: string): Promise<boolean>;
  sendAccessDecision(providerDeviceId: string, decision: AccessDecisionResult): Promise<void>;
}
