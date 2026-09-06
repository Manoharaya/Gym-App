import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAccessCredentialDto } from '../dto/access-credential.dto';
import { CredentialType, CredentialStatus, DynamicQRCredentialResponse } from '@fitcore/types';
import * as crypto from 'crypto';

@Injectable()
export class AccessCredentialService {
  private readonly logger = new Logger(AccessCredentialService.name);
  private readonly QR_SECRET = process.env.ACCESS_QR_SECRET || 'fitcore-access-qr-secret-key-2026';
  private readonly QR_TTL_SECONDS = 60; // 60 seconds dynamic token rotation

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Hashes credential references to ensure raw secrets/cards/PINs are never stored in plaintext.
   */
  hashReference(reference: string): string {
    return crypto.createHash('sha256').update(reference).digest('hex');
  }

  /**
   * Registers a new credential (e.g. RFID card, NFC tag, Mobile device, or QR baseline).
   */
  async createCredential(organisationId: string, dto: CreateAccessCredentialDto) {
    const member = await this.prisma.memberProfile.findFirst({
      where: { id: dto.memberProfileId, organisationId },
    });

    if (!member) {
      throw new NotFoundException('Member profile not found in this organisation');
    }

    const rawRef = dto.credentialReference || crypto.randomUUID();
    const hashedRef = this.hashReference(rawRef);

    // Display identifier: masked representation e.g. "•••4821" or "QR-Active"
    let display = dto.displayIdentifier;
    if (!display) {
      if (dto.type === 'QR_CODE') {
        display = 'Dynamic QR Pass';
      } else if (rawRef.length > 4) {
        display = `••••${rawRef.slice(-4)}`;
      } else {
        display = `${dto.type}-${rawRef}`;
      }
    }

    const credential = await this.prisma.accessCredential.create({
      data: {
        organisationId,
        memberProfileId: dto.memberProfileId,
        type: dto.type,
        status: 'ACTIVE',
        credentialReference: hashedRef,
        displayIdentifier: display,
        metadata: dto.metadata ? JSON.parse(JSON.stringify(dto.metadata)) : undefined,
      },
    });

    return {
      ...credential,
      // Only return the rawRef on creation so client/hardware can encode it, but DB stores hashedRef
      rawCredentialReference: rawRef,
    };
  }

  /**
   * Generates a short-lived HMAC-signed dynamic QR token for mobile client display.
   * Eliminates replay attacks and static QR screenshot exploits.
   */
  async generateDynamicQRToken(
    organisationId: string,
    memberProfileId: string
  ): Promise<DynamicQRCredentialResponse> {
    const member = await this.prisma.memberProfile.findFirst({
      where: { id: memberProfileId, organisationId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Ensure member has an active QR credential record
    let credential = await this.prisma.accessCredential.findFirst({
      where: {
        organisationId,
        memberProfileId,
        type: 'QR_CODE',
        status: 'ACTIVE',
      },
    });

    if (!credential) {
      const created = await this.createCredential(organisationId, {
        memberProfileId,
        type: 'QR_CODE',
        displayIdentifier: 'Dynamic QR Pass',
      });
      credential = created;
    }

    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.QR_TTL_SECONDS;
    const nonce = crypto.randomBytes(8).toString('hex');

    const payload = {
      orgId: organisationId,
      memId: memberProfileId,
      credId: credential.id,
      iat: now,
      exp,
      nonce,
    };

    const payloadString = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.QR_SECRET)
      .update(payloadString)
      .digest('base64url');

    const token = `FCQR.${payloadString}.${signature}`;

    return {
      token,
      displayIdentifier: credential.displayIdentifier || 'Dynamic QR Pass',
      expiresAt: new Date(exp * 1000).toISOString(),
      refreshIntervalSeconds: this.QR_TTL_SECONDS,
    };
  }

  /**
   * Resolves and validates a credential from an opaque reference or dynamic QR token.
   */
  async resolveCredential(organisationId: string, credentialRefOrToken: string) {
    // 1. Check if token is a dynamic QR token
    if (credentialRefOrToken.startsWith('FCQR.')) {
      return this.resolveDynamicQRToken(organisationId, credentialRefOrToken);
    }

    // 2. Otherwise treat as static reference (RFID / NFC / Card / Barcode)
    const hashedRef = this.hashReference(credentialRefOrToken);

    // Also check direct match in case caller passed the hash
    const credential = await this.prisma.accessCredential.findFirst({
      where: {
        organisationId,
        OR: [
          { credentialReference: hashedRef },
          { credentialReference: credentialRefOrToken },
        ],
      },
      include: {
        memberProfile: true,
      },
    });

    if (!credential) {
      return {
        valid: false,
        reason: 'CREDENTIAL_NOT_FOUND' as const,
        credential: null,
        memberProfile: null,
      };
    }

    // Check status transitions
    if (credential.status === 'REVOKED') {
      return {
        valid: false,
        reason: 'CREDENTIAL_REVOKED' as const,
        credential,
        memberProfile: credential.memberProfile,
      };
    }

    if (credential.status === 'SUSPENDED') {
      return {
        valid: false,
        reason: 'CREDENTIAL_SUSPENDED' as const,
        credential,
        memberProfile: credential.memberProfile,
      };
    }

    if (credential.status === 'EXPIRED' || (credential.expiresAt && credential.expiresAt < new Date())) {
      return {
        valid: false,
        reason: 'CREDENTIAL_EXPIRED' as const,
        credential,
        memberProfile: credential.memberProfile,
      };
    }

    if (credential.status !== 'ACTIVE') {
      return {
        valid: false,
        reason: 'CREDENTIAL_NOT_FOUND' as const,
        credential,
        memberProfile: credential.memberProfile,
      };
    }

    return {
      valid: true,
      reason: 'ALLOWED' as const,
      credential,
      memberProfile: credential.memberProfile,
    };
  }

  /**
   * Validates dynamic QR token signature, expiration, and organisation isolation.
   */
  private async resolveDynamicQRToken(organisationId: string, token: string) {
    const parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== 'FCQR') {
      return {
        valid: false,
        reason: 'INVALID_REQUEST' as const,
        credential: null,
        memberProfile: null,
      };
    }

    const payloadString = parts[1];
    const signature = parts[2];

    const expectedSignature = crypto
      .createHmac('sha256', this.QR_SECRET)
      .update(payloadString)
      .digest('base64url');

    if (signature !== expectedSignature) {
      this.logger.warn('Dynamic QR token HMAC signature verification failed');
      return {
        valid: false,
        reason: 'CREDENTIAL_NOT_FOUND' as const,
        credential: null,
        memberProfile: null,
      };
    }

    try {
      const payload = JSON.parse(Buffer.from(payloadString, 'base64url').toString('utf-8'));
      const now = Math.floor(Date.now() / 1000);

      // Verify expiration (allowing 10s clock skew)
      if (payload.exp && payload.exp < now - 10) {
        return {
          valid: false,
          reason: 'CREDENTIAL_EXPIRED' as const,
          credential: null,
          memberProfile: null,
        };
      }

      // Verify organisation boundary
      if (payload.orgId !== organisationId) {
        return {
          valid: false,
          reason: 'ORGANISATION_MISMATCH' as const,
          credential: null,
          memberProfile: null,
        };
      }

      const credential = await this.prisma.accessCredential.findFirst({
        where: { id: payload.credId, organisationId },
        include: { memberProfile: true },
      });

      if (!credential) {
        return {
          valid: false,
          reason: 'CREDENTIAL_NOT_FOUND' as const,
          credential: null,
          memberProfile: null,
        };
      }

      if (credential.status === 'REVOKED') {
        return {
          valid: false,
          reason: 'CREDENTIAL_REVOKED' as const,
          credential,
          memberProfile: credential.memberProfile,
        };
      }

      if (credential.status !== 'ACTIVE') {
        return {
          valid: false,
          reason: 'CREDENTIAL_SUSPENDED' as const,
          credential,
          memberProfile: credential.memberProfile,
        };
      }

      return {
        valid: true,
        reason: 'ALLOWED' as const,
        credential,
        memberProfile: credential.memberProfile,
      };
    } catch (err) {
      return {
        valid: false,
        reason: 'INVALID_REQUEST' as const,
        credential: null,
        memberProfile: null,
      };
    }
  }

  /**
   * Revokes a credential permanently. Controlled transition: once REVOKED, cannot be re-activated.
   */
  async revokeCredential(organisationId: string, credentialId: string) {
    const credential = await this.prisma.accessCredential.findFirst({
      where: { id: credentialId, organisationId },
    });

    if (!credential) {
      throw new NotFoundException('Credential not found');
    }

    return this.prisma.accessCredential.update({
      where: { id: credentialId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Lists active credentials for a member.
   */
  async getMemberCredentials(organisationId: string, memberProfileId: string) {
    return this.prisma.accessCredential.findMany({
      where: { organisationId, memberProfileId },
      select: {
        id: true,
        type: true,
        status: true,
        displayIdentifier: true,
        issuedAt: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
