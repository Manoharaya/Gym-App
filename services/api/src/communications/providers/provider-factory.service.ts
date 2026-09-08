import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommunicationChannel } from '../communications.types';
import { CommunicationProvider } from './communication-provider.interface';
import { DevelopmentCommunicationProvider } from './development/development-provider.adapter';
import { EmailProviderAdapter } from './email/email-provider.adapter';
import { SmsProviderAdapter } from './sms/sms-provider.adapter';
import { WhatsAppProviderAdapter } from './whatsapp/whatsapp-provider.adapter';
import { PushProviderAdapter } from './push/push-provider.adapter';

@Injectable()
export class CommunicationProviderFactory {
  private readonly logger = new Logger(CommunicationProviderFactory.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly devProvider: DevelopmentCommunicationProvider,
    private readonly emailAdapter: EmailProviderAdapter,
    private readonly smsAdapter: SmsProviderAdapter,
    private readonly whatsAppAdapter: WhatsAppProviderAdapter,
    private readonly pushAdapter: PushProviderAdapter,
  ) {}

  /**
   * Resolves the appropriate provider implementation for a given channel and organisation.
   * Defaults to DevelopmentCommunicationProvider in dev/test or when live credentials are not set.
   */
  getProvider(channel: CommunicationChannel, organisationConfig?: Record<string, any>): CommunicationProvider {
    const isLive = this.configService.get<string>('NODE_ENV') === 'production' &&
      this.configService.get<boolean>('COMMUNICATIONS_LIVE_ENABLED') === true;

    if (!isLive) {
      return this.devProvider;
    }

    switch (channel) {
      case 'EMAIL':
        return this.emailAdapter;
      case 'SMS':
        return this.smsAdapter;
      case 'WHATSAPP':
        return this.whatsAppAdapter;
      case 'PUSH':
        return this.pushAdapter;
      case 'IN_APP':
      case 'VOICE':
      default:
        return this.devProvider;
    }
  }

  /**
   * Resolves provider by name (for webhook verification and handling).
   */
  getProviderByName(providerName: string): CommunicationProvider {
    const normalized = providerName.toUpperCase();
    if (normalized.includes('EMAIL') || normalized === 'SENDGRID' || normalized === 'SES') {
      return this.emailAdapter;
    }
    if (normalized.includes('SMS') || normalized === 'TWILIO') {
      return this.smsAdapter;
    }
    if (normalized.includes('WHATSAPP') || normalized === 'META') {
      return this.whatsAppAdapter;
    }
    if (normalized.includes('PUSH') || normalized === 'FCM' || normalized === 'APNS') {
      return this.pushAdapter;
    }
    return this.devProvider;
  }
}
