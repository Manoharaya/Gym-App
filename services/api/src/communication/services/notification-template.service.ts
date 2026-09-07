import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import {
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
  NotificationChannelEnum,
  NotificationCategoryEnum,
} from '../dto/communication.dto';

interface RenderedNotification {
  title: string;
  subject?: string;
  body: string;
}

@Injectable()
export class NotificationTemplateService implements OnModuleInit {
  private readonly logger = new Logger(NotificationTemplateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async onModuleInit() {
    await this.seedSystemTemplates();
  }

  /**
   * Seeds default system templates (immutable by organisation users).
   */
  async seedSystemTemplates(): Promise<void> {
    const systemTemplates: Array<{
      key: string;
      name: string;
      channel: NotificationChannelEnum;
      category: NotificationCategoryEnum;
      subject?: string;
      body: string;
      variables: string[];
    }> = [
      {
        key: 'BOOKING_CONFIRMED',
        name: 'Booking Confirmed (In-App)',
        channel: NotificationChannelEnum.IN_APP,
        category: NotificationCategoryEnum.BOOKING,
        subject: 'Booking Confirmed',
        body: 'Your spot in {{booking.className}} at {{outlet.name}} on {{booking.startTime}} is confirmed.',
        variables: ['booking.className', 'outlet.name', 'booking.startTime', 'member.firstName'],
      },
      {
        key: 'BOOKING_CONFIRMED',
        name: 'Booking Confirmed (Push)',
        channel: NotificationChannelEnum.PUSH,
        category: NotificationCategoryEnum.BOOKING,
        subject: 'Booking Confirmed',
        body: 'You are confirmed for {{booking.className}} at {{outlet.name}} on {{booking.startTime}}.',
        variables: ['booking.className', 'outlet.name', 'booking.startTime'],
      },
      {
        key: 'BOOKING_CONFIRMED',
        name: 'Booking Confirmed (Email)',
        channel: NotificationChannelEnum.EMAIL,
        category: NotificationCategoryEnum.BOOKING,
        subject: 'Your Booking Confirmation: {{booking.className}}',
        body: 'Hi {{member.firstName}},\n\nYour spot in {{booking.className}} is confirmed for {{booking.startTime}} at {{outlet.name}}.\n\nSee you there!\n{{outlet.name}} Team',
        variables: ['member.firstName', 'booking.className', 'booking.startTime', 'outlet.name'],
      },
      {
        key: 'CLASS_REMINDER',
        name: 'Class Reminder 30m (Push)',
        channel: NotificationChannelEnum.PUSH,
        category: NotificationCategoryEnum.BOOKING,
        subject: 'Class Starting Soon',
        body: 'Reminder: {{booking.className}} begins in {{reminder.timeUntil}} at {{outlet.name}}.',
        variables: ['booking.className', 'reminder.timeUntil', 'outlet.name'],
      },
      {
        key: 'CLASS_REMINDER',
        name: 'Class Reminder 30m (In-App)',
        channel: NotificationChannelEnum.IN_APP,
        category: NotificationCategoryEnum.BOOKING,
        subject: 'Class Starting Soon',
        body: '{{booking.className}} with {{trainer.name}} starts at {{booking.startTime}}.',
        variables: ['booking.className', 'trainer.name', 'booking.startTime'],
      },
      {
        key: 'WAITLIST_PROMOTED',
        name: 'Waitlist Spot Confirmed (In-App)',
        channel: NotificationChannelEnum.IN_APP,
        category: NotificationCategoryEnum.BOOKING,
        subject: 'Spot Confirmed from Waitlist! 🎉',
        body: 'A spot opened up in {{booking.className}}! You have been promoted to Confirmed.',
        variables: ['booking.className'],
      },
      {
        key: 'WAITLIST_PROMOTED',
        name: 'Waitlist Spot Confirmed (Push)',
        channel: NotificationChannelEnum.PUSH,
        category: NotificationCategoryEnum.BOOKING,
        subject: 'Spot Confirmed! 🎉',
        body: 'Great news! You have been promoted off the waitlist into {{booking.className}}.',
        variables: ['booking.className'],
      },
      {
        key: 'WORKOUT_ASSIGNED',
        name: 'Workout Assigned (In-App)',
        channel: NotificationChannelEnum.IN_APP,
        category: NotificationCategoryEnum.TRAINING,
        subject: 'Workout Assigned',
        body: 'Coach {{trainer.name}} assigned a new workout: {{workout.name}}.',
        variables: ['trainer.name', 'workout.name'],
      },
      {
        key: 'WORKOUT_ASSIGNED',
        name: 'Workout Assigned (Push)',
        channel: NotificationChannelEnum.PUSH,
        category: NotificationCategoryEnum.TRAINING,
        subject: 'New Workout Assigned 🏋️',
        body: 'Your coach assigned {{workout.name}}. Check your training plan to view sets.',
        variables: ['workout.name'],
      },
      {
        key: 'PAYMENT_SUCCEEDED',
        name: 'Payment Succeeded (In-App)',
        channel: NotificationChannelEnum.IN_APP,
        category: NotificationCategoryEnum.PAYMENT,
        subject: 'Payment Successful',
        body: 'Payment of {{payment.amountFormatted}} for {{payment.description}} was processed successfully.',
        variables: ['payment.amountFormatted', 'payment.description'],
      },
      {
        key: 'PAYMENT_FAILED',
        name: 'Payment Failed (In-App)',
        channel: NotificationChannelEnum.IN_APP,
        category: NotificationCategoryEnum.PAYMENT,
        subject: 'Payment Unsuccessful',
        body: 'Your payment of {{payment.amountFormatted}} failed. Please update your payment method.',
        variables: ['payment.amountFormatted'],
      },
      {
        key: 'PT_SESSION_REMINDER',
        name: 'Personal Training Session (In-App)',
        channel: NotificationChannelEnum.IN_APP,
        category: NotificationCategoryEnum.TRAINING,
        subject: 'Personal Training Session Reminder',
        body: 'You have a 1-on-1 session with {{trainer.name}} at {{session.startTime}} at {{outlet.name}}.',
        variables: ['trainer.name', 'session.startTime', 'outlet.name'],
      },
      {
        key: 'MEMBERSHIP_EXPIRING',
        name: 'Membership Expiring Soon (Email)',
        channel: NotificationChannelEnum.EMAIL,
        category: NotificationCategoryEnum.MEMBERSHIP,
        subject: 'Your {{membership.planName}} Membership is Expiring Soon',
        body: 'Hi {{member.firstName}},\n\nYour membership at {{outlet.name}} will expire on {{membership.expiresAt}}.\nRenew today to maintain uninterrupted access.',
        variables: ['membership.planName', 'member.firstName', 'outlet.name', 'membership.expiresAt'],
      },
      {
        key: 'STREAK_MAINTAINED',
        name: 'Streak Milestone (In-App)',
        channel: NotificationChannelEnum.IN_APP,
        category: NotificationCategoryEnum.PROGRESS,
        subject: '🔥 Streak Milestone!',
        body: 'You are on fire! You have maintained a {{streak.days}}-day activity streak.',
        variables: ['streak.days'],
      },
      {
        key: 'STREAK_MAINTAINED',
        name: 'Streak Milestone (Push)',
        channel: NotificationChannelEnum.PUSH,
        category: NotificationCategoryEnum.PROGRESS,
        subject: '🔥 Streak Milestone!',
        body: 'Keep the momentum going! You reached a {{streak.days}}-day streak.',
        variables: ['streak.days'],
      },
      {
        key: 'CHALLENGE_COMPLETED',
        name: 'Challenge Completed (In-App)',
        channel: NotificationChannelEnum.IN_APP,
        category: NotificationCategoryEnum.PROGRESS,
        subject: '🏆 Challenge Completed!',
        body: 'Congratulations! You successfully completed the challenge: {{challenge.name}}.',
        variables: ['challenge.name'],
      },
      {
        key: 'HABIT_REMINDER',
        name: 'Daily Habit Reminder (In-App)',
        channel: NotificationChannelEnum.IN_APP,
        category: NotificationCategoryEnum.PROGRESS,
        subject: '📋 Daily Habit Reminder',
        body: 'Don\'t forget to complete your habit: {{habit.name}} today!',
        variables: ['habit.name'],
      },
    ];

    for (const st of systemTemplates) {
      const existing = await this.prisma.notificationTemplate.findFirst({
        where: {
          organisationId: null,
          key: st.key,
          channel: st.channel,
        },
      });

      if (!existing) {
        await this.prisma.notificationTemplate.create({
          data: {
            organisationId: null,
            key: st.key,
            name: st.name,
            channel: st.channel,
            category: st.category,
            subject: st.subject,
            body: st.body,
            variables: st.variables,
            isSystem: true,
            version: 1,
            status: 'PUBLISHED',
          },
        });
      }
    }

    this.logger.log('System notification templates verified.');
  }

  /**
   * Safe variable substitution engine:
   * Replaces `{{path.prop}}` securely without code execution or injection.
   */
  render(templateText: string, context: Record<string, any>): string {
    if (!templateText) return '';

    return templateText.replace(/{{\s*([a-zA-Z0-9_.]+)\s*}}/g, (_match, path) => {
      const value = this.resolvePath(context, path);
      if (value === undefined || value === null) {
        return '';
      }
      return this.sanitizeString(String(value));
    });
  }

  /**
   * Deep resolution of dotted paths e.g. "booking.className".
   */
  private resolvePath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return current;
  }

  /**
   * Sanitizes strings to prevent script injection.
   */
  private sanitizeString(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Fetches the best matching template for an organization:
   * 1. Looks for an organisation-custom template first.
   * 2. Falls back to the FitCore system template.
   */
  async resolveTemplate(
    organisationId: string,
    key: string,
    channel: NotificationChannelEnum,
  ) {
    // 1. Check custom org template
    const orgTemplate = await this.prisma.notificationTemplate.findFirst({
      where: {
        organisationId,
        key,
        channel,
        status: 'PUBLISHED',
      },
      orderBy: { version: 'desc' },
    });

    if (orgTemplate) return orgTemplate;

    // 2. Fall back to system template
    const systemTemplate = await this.prisma.notificationTemplate.findFirst({
      where: {
        organisationId: null,
        key,
        channel,
        status: 'PUBLISHED',
      },
      orderBy: { version: 'desc' },
    });

    return systemTemplate;
  }

  /**
   * Renders a complete notification (title, subject, body) for a given template and data context.
   */
  renderNotification(
    template: { name: string; subject?: string | null; body: string },
    variables: Record<string, any>,
  ): RenderedNotification {
    const title = template.subject
      ? this.render(template.subject, variables)
      : template.name;
    const subject = template.subject
      ? this.render(template.subject, variables)
      : undefined;
    const body = this.render(template.body, variables);

    return { title, subject, body };
  }

  /**
   * Create an organisation custom template.
   */
  async createTemplate(
    organisationId: string,
    dto: CreateNotificationTemplateDto,
    actor: AuthenticatedUser,
  ) {
    const template = await this.prisma.notificationTemplate.create({
      data: {
        organisationId,
        key: dto.key,
        name: dto.name,
        channel: dto.channel,
        category: dto.category,
        subject: dto.subject,
        body: dto.body,
        variables: dto.variables,
        isSystem: false,
        version: 1,
        status: 'PUBLISHED',
      },
    });

    await this.audit.log({
      userId: actor.id,
      action: 'TEMPLATE_CREATED',
      resource: 'notification_templates',
      resourceId: template.id,
      organisationId,
      metadata: { key: dto.key, channel: dto.channel },
    });

    return template;
  }

  /**
   * Update an existing organisation template.
   * Modifying system templates is strictly prohibited.
   */
  async updateTemplate(
    organisationId: string,
    templateId: string,
    dto: UpdateNotificationTemplateDto,
    actor: AuthenticatedUser,
  ) {
    const existing = await this.prisma.notificationTemplate.findUnique({
      where: { id: templateId },
    });

    if (!existing) {
      throw new NotFoundException('Template not found');
    }

    if (existing.isSystem || existing.organisationId === null) {
      throw new ForbiddenException('Cannot modify system templates');
    }

    if (existing.organisationId !== organisationId && !actor.isSuperAdmin) {
      throw new ForbiddenException('Cannot modify template from another organisation');
    }

    // Branch to new version if updating content of a published template
    const maxVersionTemplate = await this.prisma.notificationTemplate.findFirst({
      where: {
        organisationId: existing.organisationId,
        key: existing.key,
        channel: existing.channel,
      },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const newVersion = (maxVersionTemplate?.version ?? existing.version) + 1;

    const updated = await this.prisma.notificationTemplate.update({
      where: { id: templateId },
      data: {
        name: dto.name ?? existing.name,
        subject: dto.subject !== undefined ? dto.subject : existing.subject,
        body: dto.body ?? existing.body,
        variables: dto.variables ?? (existing.variables as any),
        status: dto.status ?? existing.status,
        version: newVersion,
      },
    });

    await this.audit.log({
      userId: actor.id,
      action: 'TEMPLATE_UPDATED',
      resource: 'notification_templates',
      resourceId: updated.id,
      organisationId,
      metadata: { key: existing.key, version: newVersion },
    });

    return updated;
  }

  /**
   * List templates for an organisation (includes system templates).
   */
  async getTemplates(organisationId: string) {
    return this.prisma.notificationTemplate.findMany({
      where: {
        OR: [{ organisationId: null }, { organisationId }],
      },
      orderBy: [{ key: 'asc' }, { version: 'desc' }],
    });
  }
}
