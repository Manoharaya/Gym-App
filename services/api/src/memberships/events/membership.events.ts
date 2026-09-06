/**
 * FitCore Membership Domain Events
 * Prepares event interfaces for future consumers:
 * Payments, Door Access, Booking, Notifications, AI, Analytics, CRM
 */

export interface BaseMembershipEvent {
  membershipId: string;
  organisationId: string;
  memberProfileId: string;
  timestamp: Date;
  actorId?: string;
  actorRole?: string;
  metadata?: Record<string, unknown>;
}

export class MembershipCreatedEvent implements BaseMembershipEvent {
  static readonly EVENT_NAME = 'membership.created';
  constructor(
    public readonly membershipId: string,
    public readonly organisationId: string,
    public readonly memberProfileId: string,
    public readonly planId: string,
    public readonly timestamp: Date = new Date(),
    public readonly actorId?: string,
    public readonly actorRole?: string,
    public readonly metadata?: Record<string, unknown>
  ) {}
}

export class MembershipActivatedEvent implements BaseMembershipEvent {
  static readonly EVENT_NAME = 'membership.activated';
  constructor(
    public readonly membershipId: string,
    public readonly organisationId: string,
    public readonly memberProfileId: string,
    public readonly timestamp: Date = new Date(),
    public readonly actorId?: string,
    public readonly actorRole?: string,
    public readonly metadata?: Record<string, unknown>
  ) {}
}

export class MembershipPausedEvent implements BaseMembershipEvent {
  static readonly EVENT_NAME = 'membership.paused';
  constructor(
    public readonly membershipId: string,
    public readonly organisationId: string,
    public readonly memberProfileId: string,
    public readonly reason?: string,
    public readonly timestamp: Date = new Date(),
    public readonly actorId?: string,
    public readonly actorRole?: string,
    public readonly metadata?: Record<string, unknown>
  ) {}
}

export class MembershipResumedEvent implements BaseMembershipEvent {
  static readonly EVENT_NAME = 'membership.resumed';
  constructor(
    public readonly membershipId: string,
    public readonly organisationId: string,
    public readonly memberProfileId: string,
    public readonly timestamp: Date = new Date(),
    public readonly actorId?: string,
    public readonly actorRole?: string,
    public readonly metadata?: Record<string, unknown>
  ) {}
}

export class MembershipSuspendedEvent implements BaseMembershipEvent {
  static readonly EVENT_NAME = 'membership.suspended';
  constructor(
    public readonly membershipId: string,
    public readonly organisationId: string,
    public readonly memberProfileId: string,
    public readonly reason?: string,
    public readonly timestamp: Date = new Date(),
    public readonly actorId?: string,
    public readonly actorRole?: string,
    public readonly metadata?: Record<string, unknown>
  ) {}
}

export class MembershipCancelledEvent implements BaseMembershipEvent {
  static readonly EVENT_NAME = 'membership.cancelled';
  constructor(
    public readonly membershipId: string,
    public readonly organisationId: string,
    public readonly memberProfileId: string,
    public readonly reason?: string,
    public readonly timestamp: Date = new Date(),
    public readonly actorId?: string,
    public readonly actorRole?: string,
    public readonly metadata?: Record<string, unknown>
  ) {}
}

export class MembershipRenewedEvent implements BaseMembershipEvent {
  static readonly EVENT_NAME = 'membership.renewed';
  constructor(
    public readonly membershipId: string,
    public readonly newMembershipId: string,
    public readonly organisationId: string,
    public readonly memberProfileId: string,
    public readonly timestamp: Date = new Date(),
    public readonly actorId?: string,
    public readonly actorRole?: string,
    public readonly metadata?: Record<string, unknown>
  ) {}
}

export class MembershipExpiredEvent implements BaseMembershipEvent {
  static readonly EVENT_NAME = 'membership.expired';
  constructor(
    public readonly membershipId: string,
    public readonly organisationId: string,
    public readonly memberProfileId: string,
    public readonly timestamp: Date = new Date(),
    public readonly metadata?: Record<string, unknown>
  ) {}
}
