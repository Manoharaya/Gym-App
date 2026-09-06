import { Injectable, Logger } from '@nestjs/common';
import { IAccessDeviceProvider } from '../interfaces/access-device-provider.interface';
import { DeviceStatus, AccessDecisionResult } from '@fitcore/types';

@Injectable()
export class MockAccessDeviceProvider implements IAccessDeviceProvider {
  private readonly logger = new Logger(MockAccessDeviceProvider.name);
  private deviceStates = new Map<string, DeviceStatus>();
  private unlockLogs: Array<{ providerDeviceId: string; unlockedAt: Date; durationMs: number }> = [];

  getProviderName(): string {
    return 'MOCK';
  }

  async getDeviceStatus(providerDeviceId: string): Promise<DeviceStatus> {
    return this.deviceStates.get(providerDeviceId) || 'ONLINE';
  }

  setDeviceStatus(providerDeviceId: string, status: DeviceStatus): void {
    this.deviceStates.set(providerDeviceId, status);
  }

  async unlock(providerDeviceId: string, durationMs: number = 3000): Promise<boolean> {
    this.logger.log(`[MOCK HARDWARE] Unlocking device ${providerDeviceId} for ${durationMs}ms`);
    this.unlockLogs.push({
      providerDeviceId,
      unlockedAt: new Date(),
      durationMs,
    });
    return true;
  }

  async lock(providerDeviceId: string): Promise<boolean> {
    this.logger.log(`[MOCK HARDWARE] Locking device ${providerDeviceId}`);
    return true;
  }

  async sendAccessDecision(providerDeviceId: string, decision: AccessDecisionResult): Promise<void> {
    this.logger.log(
      `[MOCK HARDWARE] Decision for device ${providerDeviceId}: ${decision.allowed ? 'ALLOWED' : 'DENIED'} (${decision.reason})`
    );
  }

  getUnlockLogs(): Array<{ providerDeviceId: string; unlockedAt: Date; durationMs: number }> {
    return [...this.unlockLogs];
  }

  clearLogs(): void {
    this.unlockLogs = [];
    this.deviceStates.clear();
  }
}
