import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class AnonymizationService {
  /**
   * Generates a deterministic, irreversible pseudonymous identifier.
   */
  generatePseudonym(id: string, salt: string = 'fc_anon_salt'): string {
    return crypto
      .createHmac('sha256', salt)
      .update(id)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Generates an anonymized email address.
   */
  anonymizeEmail(userId: string): string {
    const hash = this.generatePseudonym(userId);
    return `anonymized-${hash}@privacy.fitcore.local`;
  }

  /**
   * Anonymizes user details.
   */
  anonymizeUserData(userId: string): {
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    avatarUrl: string | null;
  } {
    return {
      email: this.anonymizeEmail(userId),
      firstName: 'Anonymized',
      lastName: 'Member',
      phone: null,
      avatarUrl: null,
    };
  }

  /**
   * Anonymizes member profile details.
   */
  anonymizeMemberProfile(profileId: string): {
    preferredName: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    emergencyContactRelationship: string | null;
    profilePhotoUrl: string | null;
  } {
    return {
      preferredName: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      emergencyContactRelationship: null,
      profilePhotoUrl: null,
    };
  }
}
