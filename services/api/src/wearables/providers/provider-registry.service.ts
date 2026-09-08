import { Injectable, BadRequestException } from '@nestjs/common';
import { WearableProviderType } from '@fitcore/types';
import { IWearableProvider } from './wearable-provider.interface';
import { AppleHealthProvider } from './apple-health.provider';
import { GoogleHealthConnectProvider } from './google-health-connect.provider';
import { FitbitProvider } from './fitbit.provider';
import { WearableCapabilitiesRegistry } from '../domain/wearable-capabilities.registry';

@Injectable()
export class ProviderRegistryService {
  private readonly providers = new Map<WearableProviderType, IWearableProvider>();

  constructor(
    private readonly capabilities: WearableCapabilitiesRegistry,
    private readonly appleHealth: AppleHealthProvider,
    private readonly googleHealthConnect: GoogleHealthConnectProvider,
    private readonly fitbit: FitbitProvider,
  ) {
    this.providers.set('APPLE_HEALTH', this.appleHealth);
    this.providers.set('GOOGLE_HEALTH_CONNECT', this.googleHealthConnect);
    this.providers.set('FITBIT', this.fitbit);
  }

  getProvider(providerType: WearableProviderType): IWearableProvider {
    const isSupported = this.capabilities.isProviderSupported(providerType);
    if (!isSupported) {
      throw new BadRequestException(
        `Provider '${providerType}' is currently not enabled or belongs to Wave 2 future extensions.`,
      );
    }

    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new BadRequestException(`No active adapter registered for provider '${providerType}'.`);
    }

    return provider;
  }
}
