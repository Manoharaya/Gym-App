/**
 * FitCore — Day 49: Developer Sandbox Environment Service
 */

import { Injectable } from '@nestjs/common';

export interface SandboxStatusDto {
  environment: 'SANDBOX';
  isAvailable: boolean;
  syntheticDatasets: {
    membersCount: number;
    classesCount: number;
    trainersCount: number;
    membershipsCount: number;
  };
  featuresSupported: string[];
}

@Injectable()
export class DeveloperSandboxService {
  /**
   * Returns status and capabilities of the developer sandbox environment
   */
  getSandboxStatus(): SandboxStatusDto {
    return {
      environment: 'SANDBOX',
      isAvailable: true,
      syntheticDatasets: {
        membersCount: 150,
        classesCount: 25,
        trainersCount: 8,
        membershipsCount: 5,
      },
      featuresSupported: [
        'API_KEY_AUTHENTICATION',
        'OAUTH_2_PKCE',
        'WEBHOOK_TEST_DELIVERIES',
        'RATE_LIMITING_EMULATION',
        'IDEMPOTENCY_VERIFICATION',
      ],
    };
  }

  /**
   * Returns synthetic member record for sandbox testing
   */
  getSyntheticMember(id = 'mem_sandbox_001'): any {
    return {
      id,
      firstName: 'Alex',
      lastName: 'Sanderson',
      email: 'alex.sanderson@example.sandbox',
      phone: '+61400000000',
      status: 'ACTIVE',
      membershipStatus: 'ACTIVE',
      joinedAt: '2026-01-15T08:00:00.000Z',
      isSynthetic: true,
    };
  }

  /**
   * Returns synthetic class session for sandbox testing
   */
  getSyntheticClass(id = 'cls_sandbox_001'): any {
    return {
      id,
      name: 'Sandbox HIIT Express',
      classType: 'HIIT',
      trainerName: 'Jordan Coach',
      roomName: 'Studio A (Main)',
      startsAt: new Date(Date.now() + 3600000).toISOString(),
      endsAt: new Date(Date.now() + 7200000).toISOString(),
      capacity: 20,
      bookedCount: 12,
      isFull: false,
      status: 'SCHEDULED',
      isSynthetic: true,
    };
  }
}
