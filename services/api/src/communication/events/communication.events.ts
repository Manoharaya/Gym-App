import {
  NotificationCategoryEnum,
  NotificationPriorityEnum,
} from '../dto/communication.dto';

export enum CommunicationEventTypes {
  MEMBERSHIP_ACTIVATED = 'membership.activated',
  MEMBERSHIP_EXPIRING = 'membership.expiring',
  PAYMENT_SUCCEEDED = 'payment.succeeded',
  PAYMENT_FAILED = 'payment.failed',
  BOOKING_CONFIRMED = 'booking.confirmed',
  BOOKING_CANCELLED = 'booking.cancelled',
  WAITLIST_PROMOTED = 'waitlist.promoted',
  CLASS_REMINDER = 'class.reminder',
  CLASS_CHECKED_IN = 'class.checked_in',
  CLASS_NO_SHOW = 'class.no_show',
  PT_SESSION_REMINDER = 'pt_session.reminder',
  WORKOUT_ASSIGNED = 'workout.assigned',
  WORKOUT_COMPLETED = 'workout.completed',
  GOAL_COMPLETED = 'goal.completed',
}

export interface DomainNotificationEvent {
  type: string;
  organisationId: string;
  outletId?: string | null;
  recipientUserId: string;
  memberId?: string | null;
  category: NotificationCategoryEnum;
  priority?: NotificationPriorityEnum;
  variables: Record<string, any>;
  data?: {
    actionType?: string;
    actionId?: string;
    deepLink?: string;
    [key: string]: any;
  } | null;
  isMarketing?: boolean;
  idempotencyKey?: string | null;
}
