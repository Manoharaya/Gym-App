import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { CreateTrainerNoteDto, UpdateTrainerNoteDto } from '../dto/personal-training.dto';
import { TrainingProgramService } from './training-program.service';
import type { TrainerNoteVisibility } from '@fitcore/types';

@Injectable()
export class TrainerNoteService {
  private readonly logger = new Logger(TrainerNoteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly programService: TrainingProgramService,
  ) {}

  private hasRole(actor: AuthenticatedUser, role: string, organisationId?: string): boolean {
    return actor.isSuperAdmin || actor.roles?.some((r) => r.role === role && (!organisationId || r.organisationId === organisationId));
  }

  private hasAnyRole(actor: AuthenticatedUser, roles: string[], organisationId?: string): boolean {
    return actor.isSuperAdmin || actor.roles?.some((r) => roles.includes(r.role) && (!organisationId || r.organisationId === organisationId));
  }

  /**
   * Resolves the trainer profile id for the actor.
   */
  private async resolveTrainerProfileId(
    organisationId: string,
    actor: AuthenticatedUser,
  ): Promise<string> {
    const trainer = await this.prisma.trainerProfile.findFirst({
      where: {
        organisationId,
        staffProfile: { userId: actor.id },
        status: 'ACTIVE',
      },
    });

    if (!trainer) {
      throw new ForbiddenException({
        code: 'TRAINER_NOT_FOUND',
        message: 'Only active trainers or authorized staff can create coaching notes',
      });
    }

    return trainer.id;
  }

  /**
   * Creates a coaching note.
   * Safe default visibility is 'PRIVATE'.
   * Audit log metadata deliberately masks note text content.
   */
  async createNote(
    organisationId: string,
    memberProfileId: string,
    dto: CreateTrainerNoteDto,
    actor: AuthenticatedUser,
  ) {
    await this.programService.assertMemberCoachingAccess(organisationId, memberProfileId, actor);
    const trainerProfileId = await this.resolveTrainerProfileId(organisationId, actor);

    const visibility: TrainerNoteVisibility = dto.visibility || 'PRIVATE';

    const note = await this.prisma.trainerNote.create({
      data: {
        organisationId,
        outletId: dto.outletId,
        memberProfileId,
        trainerProfileId,
        trainingProgramId: dto.trainingProgramId,
        trainingGoalId: dto.trainingGoalId,
        personalTrainingSessionId: dto.personalTrainingSessionId,
        noteType: dto.noteType || 'GENERAL',
        content: dto.content,
        visibility,
        isPinned: dto.isPinned || false,
      },
      include: {
        trainerProfile: {
          select: { id: true, professionalName: true, profilePhotoUrl: true },
        },
      },
    });

    // PRIVACY REQUIREMENT: Note contents are NEVER logged to audit trails.
    await this.auditService.log({
      userId: actor.id,
      organisationId,
      action: 'TRAINER_NOTE_CREATED',
      resource: 'trainer_notes',
      resourceId: note.id,
      metadata: {
        memberProfileId,
        trainerProfileId,
        noteType: note.noteType,
        visibility: note.visibility,
        // Content is omitted for privacy
      },
    });

    return note;
  }

  /**
   * Retrieves notes for a member filtered strictly by actor's visibility authorization:
   * - MEMBER: Only 'MEMBER_VISIBLE' notes.
   * - Author Trainer: 'PRIVATE', 'STAFF', 'MEMBER_VISIBLE' notes written by them, plus 'STAFF' notes by others.
   * - Other assigned Staff: 'STAFF' and 'MEMBER_VISIBLE' notes only.
   */
  async findMemberNotes(
    organisationId: string,
    memberProfileId: string,
    actor: AuthenticatedUser,
  ) {
    const { member, trainerProfileId } = await this.programService.assertMemberCoachingAccess(
      organisationId,
      memberProfileId,
      actor,
    );

    const isMemberActor = this.hasRole(actor, 'MEMBER') && member.userId === actor.id;
    const isOwnerOrSuper = this.hasAnyRole(actor, ['SUPERADMIN', 'ORGANISATION_OWNER'], organisationId);

    let visibilityCondition: any;

    if (isMemberActor) {
      // Member can only see notes explicitly marked MEMBER_VISIBLE
      visibilityCondition = { visibility: 'MEMBER_VISIBLE' };
    } else if (isOwnerOrSuper) {
      // Owner/Superadmin can view all notes in organisation
      visibilityCondition = {};
    } else if (trainerProfileId) {
      // Trainer can see:
      // 1. Their own notes (PRIVATE, STAFF, MEMBER_VISIBLE)
      // 2. Any notes with STAFF or MEMBER_VISIBLE visibility
      visibilityCondition = {
        OR: [
          { trainerProfileId },
          { visibility: { in: ['STAFF', 'MEMBER_VISIBLE'] } },
        ],
      };
    } else {
      // Other staff (e.g. Outlet Manager) can view STAFF and MEMBER_VISIBLE
      visibilityCondition = { visibility: { in: ['STAFF', 'MEMBER_VISIBLE'] } };
    }

    return this.prisma.trainerNote.findMany({
      where: {
        organisationId,
        memberProfileId,
        ...visibilityCondition,
      },
      include: {
        trainerProfile: {
          select: { id: true, professionalName: true, profilePhotoUrl: true },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Updates a note. Only author trainer or superadmin can edit.
   */
  async updateNote(
    organisationId: string,
    noteId: string,
    dto: UpdateTrainerNoteDto,
    actor: AuthenticatedUser,
  ) {
    const note = await this.prisma.trainerNote.findFirst({
      where: { id: noteId, organisationId },
      include: { trainerProfile: { include: { staffProfile: true } } },
    });

    if (!note) {
      throw new NotFoundException({
        code: 'TRAINER_NOTE_NOT_FOUND',
        message: `Trainer note '${noteId}' not found`,
      });
    }

    const isAuthor = note.trainerProfile.staffProfile.userId === actor.id;
    const isSuper = this.hasRole(actor, 'SUPERADMIN');

    if (!isAuthor && !isSuper) {
      throw new ForbiddenException({
        code: 'TRAINER_NOTE_ACCESS_DENIED',
        message: 'Only the author trainer can edit this note',
      });
    }

    const updated = await this.prisma.trainerNote.update({
      where: { id: noteId },
      data: {
        content: dto.content,
        visibility: dto.visibility,
        noteType: dto.noteType,
        isPinned: dto.isPinned,
      },
      include: {
        trainerProfile: {
          select: { id: true, professionalName: true, profilePhotoUrl: true },
        },
      },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      action: 'TRAINER_NOTE_UPDATED',
      resource: 'trainer_notes',
      resourceId: noteId,
      metadata: {
        memberProfileId: note.memberProfileId,
        visibility: updated.visibility,
        // Content is omitted for privacy
      },
    });

    return updated;
  }

  /**
   * Deletes a note. Only author trainer or superadmin can delete.
   */
  async deleteNote(organisationId: string, noteId: string, actor: AuthenticatedUser) {
    const note = await this.prisma.trainerNote.findFirst({
      where: { id: noteId, organisationId },
      include: { trainerProfile: { include: { staffProfile: true } } },
    });

    if (!note) {
      throw new NotFoundException({
        code: 'TRAINER_NOTE_NOT_FOUND',
        message: `Trainer note '${noteId}' not found`,
      });
    }

    const isAuthor = note.trainerProfile.staffProfile.userId === actor.id;
    const isSuper = this.hasRole(actor, 'SUPERADMIN');

    if (!isAuthor && !isSuper) {
      throw new ForbiddenException({
        code: 'TRAINER_NOTE_ACCESS_DENIED',
        message: 'Only the author trainer can delete this note',
      });
    }

    await this.prisma.trainerNote.delete({ where: { id: noteId } });

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      action: 'TRAINER_NOTE_DELETED',
      resource: 'trainer_notes',
      resourceId: noteId,
      metadata: { memberProfileId: note.memberProfileId },
    });

    return { success: true, deletedNoteId: noteId };
  }
}
