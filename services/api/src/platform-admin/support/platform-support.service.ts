import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CommunicationsService } from '../../communications/communications.service';
import {
  CreateSupportTicketDto,
  UpdateSupportTicketDto,
  CreateSupportMessageDto,
  AssignSupportTicketDto,
} from '../dto/platform-admin.dto';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { SupportTicketStatus, SupportMessageVisibility } from '@fitcore/types';

@Injectable()
export class PlatformSupportService {
  private readonly logger = new Logger(PlatformSupportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly communicationsService: CommunicationsService,
  ) {}

  /**
   * Generates sequential ticket identifier e.g. TIK-2026-0001
   */
  private async generateTicketNumber(): Promise<string> {
    const count = await this.prisma.supportTicket.count();
    const year = new Date().getFullYear();
    const sequence = (count + 1).toString().padStart(4, '0');
    return `TIK-${year}-${sequence}`;
  }

  /**
   * Calculates SLA targets based on ticket priority.
   */
  private calculateSlaTargets(priority: string) {
    const now = Date.now();
    let firstResponseHours = 24;
    let resolutionHours = 72;

    switch (priority) {
      case 'CRITICAL':
        firstResponseHours = 1;
        resolutionHours = 4;
        break;
      case 'URGENT':
        firstResponseHours = 2;
        resolutionHours = 8;
        break;
      case 'HIGH':
        firstResponseHours = 4;
        resolutionHours = 24;
        break;
      case 'MEDIUM':
        firstResponseHours = 12;
        resolutionHours = 48;
        break;
      case 'LOW':
      default:
        firstResponseHours = 24;
        resolutionHours = 72;
        break;
    }

    return {
      firstResponseTarget: new Date(now + firstResponseHours * 60 * 60 * 1000),
      resolutionTarget: new Date(now + resolutionHours * 60 * 60 * 1000),
    };
  }

  /**
   * Determines SLA compliance state for a ticket.
   */
  private evaluateSlaStatus(ticket: any): 'WITHIN_TARGET' | 'AT_RISK' | 'OVERDUE' {
    if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
      return 'WITHIN_TARGET';
    }

    const now = Date.now();
    const targetTime = ticket.firstRespondedAt
      ? ticket.resolutionTarget.getTime()
      : ticket.firstResponseTarget.getTime();

    if (now > targetTime) {
      return 'OVERDUE';
    }

    // At risk if within 25% of target window remaining
    const startTime = ticket.createdAt.getTime();
    const totalDuration = targetTime - startTime;
    const remaining = targetTime - now;

    if (remaining < totalDuration * 0.25) {
      return 'AT_RISK';
    }

    return 'WITHIN_TARGET';
  }

  /**
   * Creates a new support ticket.
   */
  async createTicket(dto: CreateSupportTicketDto, creator: AuthenticatedUser) {
    const org = await this.prisma.organisation.findUnique({
      where: { id: dto.organisationId },
    });

    if (!org) {
      throw new NotFoundException(`Organisation ${dto.organisationId} not found`);
    }

    const ticketNumber = await this.generateTicketNumber();
    const priority = dto.priority || 'MEDIUM';
    const { firstResponseTarget, resolutionTarget } = this.calculateSlaTargets(priority);

    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        organisationId: dto.organisationId,
        creatorUserId: creator.id,
        title: dto.title,
        description: dto.description,
        priority,
        category: dto.category || 'OTHER',
        status: 'OPEN',
        firstResponseTarget,
        resolutionTarget,
        metadata: dto.metadata || {},
      },
    });

    // Create initial message
    await this.prisma.supportTicketMessage.create({
      data: {
        ticketId: ticket.id,
        authorUserId: creator.id,
        content: dto.description,
        visibility: 'ORGANISATION',
      },
    });

    await this.auditService.log({
      userId: creator.id,
      organisationId: dto.organisationId,
      action: 'SUPPORT_TICKET_CREATED',
      resource: 'support_ticket',
      resourceId: ticket.id,
      metadata: { ticketNumber, title: ticket.title, priority: ticket.priority },
    });

    return ticket;
  }

  /**
   * Lists support tickets with filtering, pagination, and SLA tracking.
   */
  async listTickets(
    query: {
      organisationId?: string;
      status?: SupportTicketStatus;
      priority?: string;
      assignedToUserId?: string;
      page?: number;
      limit?: number;
    },
    user: AuthenticatedUser,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.organisationId) {
      where.organisationId = query.organisationId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.priority) {
      where.priority = query.priority;
    }
    if (query.assignedToUserId) {
      where.assignedToUserId = query.assignedToUserId;
    }

    // If user is not platform superadmin, restrict strictly to user's organisations
    if (!user.isSuperAdmin) {
      const allowedOrgs = Array.from(
        new Set([user.primaryOrganisationId, ...user.roles.map((r) => r.organisationId)].filter(Boolean) as string[]),
      );
      where.organisationId = { in: allowedOrgs };
    }

    const [total, items] = await Promise.all([
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organisation: { select: { id: true, name: true } },
          creatorUser: { select: { id: true, email: true, firstName: true, lastName: true } },
          assignedToUser: { select: { id: true, email: true, firstName: true, lastName: true } },
          _count: { select: { messages: true } },
        },
      }),
    ]);

    return {
      items: items.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        organisationId: t.organisationId,
        organisationName: t.organisation.name,
        creatorUserId: t.creatorUserId,
        creatorEmail: t.creatorUser.email,
        assignedToUserId: t.assignedToUserId,
        assignedToName: t.assignedToUser
          ? `${t.assignedToUser.firstName} ${t.assignedToUser.lastName}`
          : null,
        title: t.title,
        status: t.status,
        priority: t.priority,
        category: t.category,
        firstResponseTarget: t.firstResponseTarget,
        resolutionTarget: t.resolutionTarget,
        slaStatus: this.evaluateSlaStatus(t),
        messagesCount: t._count.messages,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves single ticket and thread with strict server-side visibility enforcement.
   * INTERNAL_ONLY messages are strictly omitted if requester is an organisation tenant user.
   */
  async getTicket(ticketId: string, user: AuthenticatedUser) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        organisation: { select: { id: true, name: true } },
        creatorUser: { select: { id: true, email: true, firstName: true, lastName: true } },
        assignedToUser: { select: { id: true, email: true, firstName: true, lastName: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            authorUser: { select: { id: true, email: true, firstName: true, lastName: true } },
            attachments: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Support ticket ${ticketId} not found`);
    }

    const isPlatformStaff =
      user.isSuperAdmin ||
      user.roles.some((r) => ['SUPERADMIN', 'PLATFORM_ADMIN', 'PLATFORM_SUPPORT'].includes(r.role));

    // Non-platform staff tenant isolation check
    if (!isPlatformStaff) {
      const allowedOrgs = new Set(
        [user.primaryOrganisationId, ...user.roles.map((r) => r.organisationId)].filter(Boolean),
      );
      if (!allowedOrgs.has(ticket.organisationId)) {
        throw new ForbiddenException('You do not have access to this support ticket');
      }
    }

    // Filter messages: INTERNAL_ONLY notes must NEVER be shown to customer/organisation users
    const filteredMessages = ticket.messages
      .filter((m) => {
        if (m.visibility === 'INTERNAL_ONLY') {
          return isPlatformStaff;
        }
        return true;
      })
      .map((m) => ({
        id: m.id,
        ticketId: m.ticketId,
        authorUserId: m.authorUserId,
        authorName: `${m.authorUser.firstName} ${m.authorUser.lastName}`,
        authorEmail: m.authorUser.email,
        visibility: m.visibility,
        content: m.content,
        attachments: m.attachments.map((a) => ({
          id: a.id,
          fileName: a.fileName,
          fileSize: a.fileSize,
          mimeType: a.mimeType,
          scanStatus: a.scanStatus,
        })),
        createdAt: m.createdAt,
      }));

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      organisationId: ticket.organisationId,
      organisationName: ticket.organisation.name,
      creatorUserId: ticket.creatorUserId,
      creatorEmail: ticket.creatorUser.email,
      assignedToUserId: ticket.assignedToUserId,
      assignedToName: ticket.assignedToUser
        ? `${ticket.assignedToUser.firstName} ${ticket.assignedToUser.lastName}`
        : null,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      firstResponseTarget: ticket.firstResponseTarget,
      resolutionTarget: ticket.resolutionTarget,
      slaStatus: this.evaluateSlaStatus(ticket),
      messages: filteredMessages,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }

  /**
   * Adds a message or internal note to a ticket thread.
   */
  async addMessage(
    ticketId: string,
    dto: CreateSupportMessageDto,
    author: AuthenticatedUser,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Support ticket ${ticketId} not found`);
    }

    const isPlatformStaff =
      author.isSuperAdmin ||
      author.roles.some((r) => ['SUPERADMIN', 'PLATFORM_ADMIN', 'PLATFORM_SUPPORT'].includes(r.role));

    // Only platform staff can create INTERNAL_ONLY notes
    let visibility: SupportMessageVisibility = (dto.visibility as SupportMessageVisibility) || 'ORGANISATION';
    if (visibility === 'INTERNAL_ONLY' && !isPlatformStaff) {
      throw new ForbiddenException('Organisation users cannot post INTERNAL_ONLY support notes');
    }

    // Record first response timestamp if platform staff responds
    const updateData: any = { updatedAt: new Date() };
    if (isPlatformStaff && !ticket.firstRespondedAt) {
      updateData.firstRespondedAt = new Date();
      if (ticket.status === 'OPEN') {
        updateData.status = 'IN_PROGRESS';
      }
    }

    const [message] = await Promise.all([
      this.prisma.supportTicketMessage.create({
        data: {
          ticketId,
          authorUserId: author.id,
          visibility,
          content: dto.content,
          attachments: dto.attachments
            ? {
                create: dto.attachments.map((a) => ({
                  fileName: a.fileName,
                  fileSize: a.fileSize,
                  mimeType: a.mimeType,
                  storageKey: a.storageKey,
                })),
              }
            : undefined,
        },
      }),
      this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: updateData,
      }),
    ]);

    await this.auditService.log({
      userId: author.id,
      organisationId: ticket.organisationId,
      action: 'SUPPORT_TICKET_MESSAGE_ADDED',
      resource: 'support_ticket',
      resourceId: ticketId,
      metadata: { visibility, messageId: message.id },
    });

    return message;
  }

  /**
   * Updates ticket status, priority, or assignment.
   */
  async updateTicket(
    ticketId: string,
    dto: UpdateSupportTicketDto,
    actor: AuthenticatedUser,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Support ticket ${ticketId} not found`);
    }

    const updateData: any = { updatedAt: new Date() };
    if (dto.status) {
      updateData.status = dto.status;
      if (dto.status === 'RESOLVED') updateData.resolvedAt = new Date();
      if (dto.status === 'CLOSED') updateData.closedAt = new Date();
    }
    if (dto.priority) updateData.priority = dto.priority;
    if (dto.assignedToUserId !== undefined) updateData.assignedToUserId = dto.assignedToUserId;

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId: ticket.organisationId,
      action: 'SUPPORT_TICKET_UPDATED',
      resource: 'support_ticket',
      resourceId: ticketId,
      metadata: { previousStatus: ticket.status, newStatus: updated.status },
    });

    return updated;
  }

  /**
   * Assigns a ticket to a platform support agent.
   */
  async assignTicket(
    ticketId: string,
    dto: AssignSupportTicketDto,
    actor: AuthenticatedUser,
  ) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.assignedToUserId },
    });

    if (!targetUser) {
      throw new NotFoundException(`Assignee user ${dto.assignedToUserId} not found`);
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        assignedToUserId: dto.assignedToUserId,
        status: 'ACKNOWLEDGED',
      },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId: updated.organisationId,
      action: 'SUPPORT_TICKET_ASSIGNED',
      resource: 'support_ticket',
      resourceId: ticketId,
      metadata: { assignedToUserId: dto.assignedToUserId },
    });

    return updated;
  }
}
