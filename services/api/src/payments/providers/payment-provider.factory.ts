import { Injectable, BadRequestException } from '@nestjs/common';
import { IPaymentProvider } from '../interfaces/payment-provider.interface';
import { MockPaymentProvider } from './mock-payment.provider';
import { ManualPaymentProvider } from './manual-payment.provider';

@Injectable()
export class PaymentProviderFactory {
  private readonly providers = new Map<string, IPaymentProvider>();

  constructor(
    private readonly mockProvider: MockPaymentProvider,
    private readonly manualProvider: ManualPaymentProvider
  ) {
    this.registerProvider(mockProvider);
    this.registerProvider(manualProvider);
  }

  registerProvider(provider: IPaymentProvider) {
    this.providers.set(provider.providerName.toUpperCase(), provider);
  }

  getProvider(providerName: string = 'MOCK'): IPaymentProvider {
    const key = providerName.toUpperCase();
    const provider = this.providers.get(key);
    if (!provider) {
      throw new BadRequestException(`Payment provider '${providerName}' is not configured or supported`);
    }
    return provider;
  }
}
