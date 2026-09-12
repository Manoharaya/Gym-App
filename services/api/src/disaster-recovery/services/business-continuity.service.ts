import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface BusinessContinuityReport {
  valid: boolean;
  totalChecks: number;
  violations: string[];
  metrics: {
    activeMembershipsChecked: number;
    sessionsChecked: number;
    paymentsAudited: number;
    saasSubscriptionsChecked: number;
  };
  timestamp: string;
}

export interface DegradedModePlan {
  subsystem: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'FAILED_OVER';
  impactOnCoreOperations: 'NONE' | 'LOW' | 'MEDIUM';
  fallbackStrategy: string;
  dataBuffering: string;
  recoveryAction: string;
}

@Injectable()
export class BusinessContinuityService {
  private readonly logger = new Logger(BusinessContinuityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates business invariants across core platform domains.
   */
  async validateBusinessInvariants(organisationId?: string): Promise<BusinessContinuityReport> {
    const violations: string[] = [];
    let totalChecks = 0;

    const orgFilter = organisationId ? { organisationId } : {};

    // 1. Membership Invariant: Active memberships have recognized accessScope
    totalChecks++;
    const invalidScopes = await this.prisma.memberMembership.findMany({
      where: {
        ...orgFilter,
        status: 'ACTIVE',
        accessScope: { notIn: ['SINGLE_OUTLET', 'MULTI_OUTLET', 'ALL_ORGANISATION_OUTLETS'] },
      },
      select: { id: true, accessScope: true },
      take: 10,
    });
    if (invalidScopes.length > 0) {
      violations.push(
        `MEMBERSHIP_INVARIANT_VIOLATION: ${invalidScopes.length} active memberships have invalid accessScope: ${invalidScopes[0].accessScope}`,
      );
    }

    // 2. Booking Invariant: Class session confirmed bookings must not exceed capacity
    totalChecks++;
    const overbookedSessions = organisationId
      ? await this.prisma.$queryRaw<any[]>`
          SELECT cs.id, cs.capacity, COUNT(b.id)::int as confirmed_count
          FROM class_sessions cs
          JOIN bookings b ON b."classSessionId" = cs.id
          WHERE b.status = 'CONFIRMED' AND cs."organisationId" = ${organisationId}
          GROUP BY cs.id, cs.capacity
          HAVING COUNT(b.id) > cs.capacity
          LIMIT 5
        `
      : await this.prisma.$queryRaw<any[]>`
          SELECT cs.id, cs.capacity, COUNT(b.id)::int as confirmed_count
          FROM class_sessions cs
          JOIN bookings b ON b."classSessionId" = cs.id
          WHERE b.status = 'CONFIRMED'
          GROUP BY cs.id, cs.capacity
          HAVING COUNT(b.id) > cs.capacity
          LIMIT 5
        `;

    if (overbookedSessions.length > 0) {
      violations.push(
        `BOOKING_INVARIANT_VIOLATION: Found ${overbookedSessions.length} overbooked sessions exceeding strict capacity limit`,
      );
    }

    // 3. Payment Invariant: No negative transaction amounts
    totalChecks++;
    const invalidPayments = await this.prisma.paymentTransaction.findMany({
      where: {
        ...orgFilter,
        amountMinor: { lt: 0 },
      },
      select: { id: true, amountMinor: true },
      take: 5,
    });
    if (invalidPayments.length > 0) {
      violations.push(
        `PAYMENT_INVARIANT_VIOLATION: ${invalidPayments.length} payment transactions with negative amounts detected`,
      );
    }

    // 4. SaaS Subscription Invariant: Subscribed organizations have valid plan
    totalChecks++;
    const activeSubs = await this.prisma.saasSubscription.findMany({
      where: { ...orgFilter, status: 'ACTIVE' },
      select: { id: true, planId: true },
      take: 20,
    });
    const invalidSubs = activeSubs.filter((s) => !s.planId);

    if (invalidSubs.length > 0) {
      violations.push(
        `SAAS_BILLING_VIOLATION: ${invalidSubs.length} active SaaS subscriptions without associated plan`,
      );
    }

    const orgArg = organisationId ? { where: { organisationId } } : undefined;

    const [activeMembershipsCount, sessionsCount, paymentsCount, saasSubsCount] =
      await Promise.all([
        this.prisma.memberMembership.count({
          where: { ...orgFilter, status: 'ACTIVE' },
        }),
        this.prisma.classSession.count(orgArg),
        this.prisma.paymentTransaction.count(orgArg),
        this.prisma.saasSubscription.count(orgArg),
      ]);

    const valid = violations.length === 0;

    this.logger.log(
      `[BUSINESS CONTINUITY] Business invariant validation complete: ${violations.length === 0 ? 'ALL INVARIANTS SATISFIED' : 'VIOLATIONS FOUND: ' + violations.length}`,
    );

    return {
      valid,
      totalChecks,
      violations,
      metrics: {
        activeMembershipsChecked: activeMembershipsCount,
        sessionsChecked: sessionsCount,
        paymentsAudited: paymentsCount,
        saasSubscriptionsChecked: saasSubsCount,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Evaluates degraded-mode operating capability for any specific subsystem.
   */
  evaluateDegradedMode(subsystem: string): DegradedModePlan {
    switch (subsystem.toUpperCase()) {
      case 'AI':
        return {
          subsystem: 'AI',
          status: 'DEGRADED',
          impactOnCoreOperations: 'NONE',
          fallbackStrategy:
            'Automatic fallback to rule-based static templates for workout suggestions and member guidance. Core gym bookings, turnstile access, and payments remain 100% operational.',
          dataBuffering: 'AI prompt logs buffered locally; non-critical telemetry queued.',
          recoveryAction:
            'Circuit breaker automatically probes LLM endpoints every 30s. Automatically rejoins upon 3 consecutive successful HTTP 200 health responses.',
        };

      case 'ACCESS':
        return {
          subsystem: 'ACCESS',
          status: 'DEGRADED',
          impactOnCoreOperations: 'LOW',
          fallbackStrategy:
            'Turnstiles operate on fast cached outlet policies & pre-synced active credential lists. For unknown credentials or un-cached members, staff manual check-in override is authorized. Fail-secure: never unlock all doors indiscriminately.',
          dataBuffering: 'Badge swipe events stored in local turnstile reader flash buffer and uploaded when connection resumes.',
          recoveryAction:
            'Flush turnstile buffer upon network recovery; reconcile check-in timestamps against member attendance history.',
        };

      case 'COMMUNICATION':
        return {
          subsystem: 'COMMUNICATION',
          status: 'DEGRADED',
          impactOnCoreOperations: 'LOW',
          fallbackStrategy:
            'Outbound SMS/Email notifications queued in BullMQ with exponential backoff (initial: 10s, max: 2 hours). Non-urgent marketing comms suppressed.',
          dataBuffering: 'Redis persistent job queue with dead-letter queue (DLQ) guarantee.',
          recoveryAction:
            'Re-engage provider rate throttles (50 req/sec) to drain queue without hitting provider rate limits.',
        };

      case 'ACCOUNTING':
        return {
          subsystem: 'ACCOUNTING',
          status: 'DEGRADED',
          impactOnCoreOperations: 'NONE',
          fallbackStrategy:
            'Invoices, payments, and tax records remain fully recorded and authoritative inside FitCore PostgreSQL. External Xero/QuickBooks synchronization is deferred.',
          dataBuffering: 'Accounting sync outbox table stores pending ledger transactions.',
          recoveryAction:
            'Execute idempotent accounting sync job using FitCore transaction IDs as idempotency keys.',
        };

      case 'WEARABLES':
        return {
          subsystem: 'WEARABLES',
          status: 'DEGRADED',
          impactOnCoreOperations: 'NONE',
          fallbackStrategy:
            'Member profile renders last known biometric and heart rate data from last successful sync. Live metrics indicate "Offline - Reconnecting".',
          dataBuffering: 'Webhook ingest buffers incoming payload fragments.',
          recoveryAction:
            'Poll wearable OAuth APIs for retrospective interval data upon reconnection.',
        };

      default:
        return {
          subsystem,
          status: 'DEGRADED',
          impactOnCoreOperations: 'MEDIUM',
          fallbackStrategy: 'Service degraded mode fallback enabled.',
          dataBuffering: 'Transactional queue buffering.',
          recoveryAction: 'Manual operator inspection required.',
        };
    }
  }
}
