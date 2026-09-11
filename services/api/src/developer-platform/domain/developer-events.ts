/**
 * FitCore — Day 49: Outbound Developer Webhook Events
 */

export interface DeveloperWebhookEventEnvelope<T = any> {
  id: string;
  type: string;
  version: string;
  createdAt: string;
  organisationId: string;
  data: T;
  test?: boolean;
}

export const APPROVED_DEVELOPER_EVENT_TYPES = [
  'member.created',
  'member.updated',
  'membership.created',
  'membership.updated',
  'membership.expired',
  'booking.created',
  'booking.cancelled',
  'booking.completed',
  'class.created',
  'class.updated',
  'class.cancelled',
  'attendance.checked_in',
  'attendance.completed',
  'attendance.no_show',
  'payment.succeeded',
  'payment.failed',
  'refund.created',
  'invoice.created',
  'invoice.paid',
  'communication.sent',
  'communication.delivered',
  'communication.failed',
] as const;

export type ApprovedDeveloperEventType = typeof APPROVED_DEVELOPER_EVENT_TYPES[number];
