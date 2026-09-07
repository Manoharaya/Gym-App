import { Injectable, Logger } from '@nestjs/common';
import {
  DeliveryResult,
  EmailNotificationRequest,
  EmailProvider,
  InAppNotificationRequest,
  InAppProvider,
  PushNotificationRequest,
  PushProvider,
  SmsNotificationRequest,
  SmsProvider,
} from './provider.interface';

@Injectable()
export class ConsoleEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ConsoleEmailProvider.name);

  async send(request: EmailNotificationRequest): Promise<DeliveryResult> {
    this.logger.log(
      `[MOCK_EMAIL] Sent to ${request.to} | Subject: "${request.subject}" | Org: ${request.organisationId}`,
    );
    return {
      success: true,
      providerMessageId: `email_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };
  }
}

@Injectable()
export class ConsoleSmsProvider implements SmsProvider {
  private readonly logger = new Logger(ConsoleSmsProvider.name);

  async send(request: SmsNotificationRequest): Promise<DeliveryResult> {
    this.logger.log(
      `[MOCK_SMS] Sent to ${request.to} | Message: "${request.body.substring(0, 60)}..." | Org: ${request.organisationId}`,
    );
    return {
      success: true,
      providerMessageId: `sms_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };
  }
}

@Injectable()
export class ConsolePushProvider implements PushProvider {
  private readonly logger = new Logger(ConsolePushProvider.name);

  async send(request: PushNotificationRequest): Promise<DeliveryResult> {
    this.logger.log(
      `[MOCK_PUSH] Sent to ${request.tokens.length} device(s) | Title: "${request.title}" | Org: ${request.organisationId}`,
    );
    return {
      success: true,
      providerMessageId: `push_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };
  }
}

@Injectable()
export class LocalInAppProvider implements InAppProvider {
  private readonly logger = new Logger(LocalInAppProvider.name);

  async send(request: InAppNotificationRequest): Promise<DeliveryResult> {
    this.logger.log(
      `[IN_APP] Delivered notification ${request.notificationId} to user ${request.recipientUserId}`,
    );
    return {
      success: true,
      providerMessageId: `inapp_${request.notificationId}`,
    };
  }
}
