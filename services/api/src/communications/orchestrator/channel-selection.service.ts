import { Injectable, Logger } from '@nestjs/common';
import { CommunicationChannel, CommunicationType } from '../communications.types';

export interface RecipientContactCapabilities {
  hasEmail: boolean;
  hasPhone: boolean;
  hasPushTokens: boolean;
}

@Injectable()
export class ChannelSelectionService {
  private readonly logger = new Logger(ChannelSelectionService.name);

  /**
   * Selects the best communication channel based on request parameters,
   * member contact capabilities, preferences, and communication type.
   */
  selectChannel(params: {
    requestedChannel?: CommunicationChannel;
    type: CommunicationType;
    capabilities: RecipientContactCapabilities;
    preferredChannel?: CommunicationChannel;
  }): CommunicationChannel {
    const { requestedChannel, type, capabilities, preferredChannel } = params;

    // 1. If a channel was explicitly requested and recipient has capability, use it
    if (requestedChannel && this.supportsChannel(requestedChannel, capabilities)) {
      return requestedChannel;
    }

    // 2. If recipient has a preferred channel and capability, use it
    if (preferredChannel && this.supportsChannel(preferredChannel, capabilities)) {
      return preferredChannel;
    }

    // 3. Fallback logic based on CommunicationType
    switch (type) {
      case 'SECURITY':
      case 'TRANSACTIONAL':
        if (capabilities.hasEmail) return 'EMAIL';
        if (capabilities.hasPhone) return 'SMS';
        if (capabilities.hasPushTokens) return 'PUSH';
        return 'IN_APP';

      case 'REACTIVATION':
      case 'REMINDER':
        if (capabilities.hasPhone) return 'SMS';
        if (capabilities.hasPushTokens) return 'PUSH';
        if (capabilities.hasEmail) return 'EMAIL';
        return 'IN_APP';

      case 'MARKETING':
      case 'ENGAGEMENT':
      case 'OPERATIONAL':
      case 'SYSTEM':
      default:
        if (capabilities.hasPushTokens) return 'PUSH';
        if (capabilities.hasEmail) return 'EMAIL';
        if (capabilities.hasPhone) return 'SMS';
        return 'IN_APP';
    }
  }

  private supportsChannel(channel: CommunicationChannel, cap: RecipientContactCapabilities): boolean {
    switch (channel) {
      case 'EMAIL':
        return cap.hasEmail;
      case 'SMS':
      case 'WHATSAPP':
        return cap.hasPhone;
      case 'PUSH':
        return cap.hasPushTokens;
      case 'IN_APP':
        return true;
      case 'VOICE':
        return cap.hasPhone;
      default:
        return false;
    }
  }
}
