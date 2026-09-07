import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageProvider, STORAGE_PROVIDER } from '../storage/storage.interface';
import { Inject } from '@nestjs/common';
import { AuthenticatedUser } from '../common/interfaces/request-with-user.interface';
import {
  CreateTrainerProfileDto,
  UpdateTrainerProfileDto,
  CreateCertificationDto,
  UpdateCertificationDto,
  AssignClientDto,
  ReassignClientDto,
  QueryTrainersDto,
} from './dto/staff-domain.dto';

@Injectable()
export class TrainerService {
  private readonly logger = new Logger(TrainerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(STORAGE_PROVIDER) private readonly storageProvider: StorageProvider,
  ) {}

  /**
   * Creates a TrainerProfile linked to an existing StaffProfile.
   */
  async createTrainerProfile(
    organisationId: string,
    dto: CreateTrainerProfileDto,
    actor: AuthenticatedUser,
  ) {
    const staff = await this.prisma.staffProfile.findFirst({
      where: { id: dto.staffProfileId, organisationId, deletedAt: null },
    });
    if (!staff) {
      throw new NotFoundException(`Staff profile '${dto.staffProfileId}' not found in organisation`);
    }

    const existing = await this.prisma.trainerProfile.findUnique({
      where: { staffProfileId: dto.staffProfileId },
    });
    if (existing) {
      throw new ConflictException(`Trainer profile already exists for staff '${dto.staffProfileId}'`);
    }

    const trainer = await this.prisma.trainerProfile.create({
      data: {
        staffProfileId: dto.staffProfileId,
        organisationId,
        professionalName: dto.professionalName,
        bio: dto.bio,
        profilePhotoUrl: dto.profilePhotoUrl,
        specialties: dto.specialties || [],
        yearsExperience: dto.yearsExperience || 0,
        languages: dto.languages || ['English'],
        coachingStyle: dto.coachingStyle,
        trainingApproach: dto.trainingApproach,
        consultationAvailability: dto.consultationAvailability,
        status: 'ACTIVE',
      },
      include: {
        staffProfile: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
            outletAssignments: { include: { outlet: true } },
          },
        },
        certifications: true,
      },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      action: 'TRAINER_CREATED',
      resource: 'trainers',
      resourceId: trainer.id,
      metadata: { professionalName: dto.professionalName, specialties: dto.specialties },
    });

    return trainer;
  }

  /**
   * Retrieves paginated trainer directory with filtering.
   */
  async findAllTrainers(organisationId: string, query: QueryTrainersDto, actor: AuthenticatedUser) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      organisationId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.specialty) {
      where.specialties = { has: query.specialty };
    }

    if (query.language) {
      where.languages = { has: query.language };
    }

    if (query.outletId) {
      where.staffProfile = {
        outletAssignments: {
          some: {
            outletId: query.outletId,
            status: 'ACTIVE',
          },
        },
      };
    }

    if (query.search) {
      where.OR = [
        { professionalName: { contains: query.search, mode: 'insensitive' } },
        { bio: { contains: query.search, mode: 'insensitive' } },
        { staffProfile: { user: { email: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.trainerProfile.count({ where }),
      this.prisma.trainerProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          staffProfile: {
            include: {
              user: {
                select: { id: true, email: true, firstName: true, lastName: true, phone: true },
              },
              outletAssignments: {
                where: { status: 'ACTIVE' },
                include: { outlet: true },
              },
            },
          },
          certifications: true,
          _count: {
            select: {
              clientAssignments: {
                where: { status: 'ACTIVE' },
              },
            },
          },
        },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves single trainer profile by ID.
   */
  async findTrainerById(organisationId: string, trainerId: string, actor: AuthenticatedUser) {
    const trainer = await this.prisma.trainerProfile.findFirst({
      where: { id: trainerId, organisationId },
      include: {
        staffProfile: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true, phone: true },
            },
            outletAssignments: {
              include: { outlet: true },
            },
          },
        },
        certifications: {
          orderBy: { issueDate: 'desc' },
        },
        clientAssignments: {
          where: { status: 'ACTIVE' },
          include: {
            memberProfile: {
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true, email: true },
                },
              },
            },
            outlet: true,
          },
        },
      },
    });

    if (!trainer) {
      throw new NotFoundException(`Trainer profile '${trainerId}' not found`);
    }

    return trainer;
  }

  /**
   * Updates trainer profile information.
   */
  async updateTrainerProfile(
    organisationId: string,
    trainerId: string,
    dto: UpdateTrainerProfileDto,
    actor: AuthenticatedUser,
  ) {
    await this.findTrainerById(organisationId, trainerId, actor);

    const updated = await this.prisma.trainerProfile.update({
      where: { id: trainerId },
      data: {
        professionalName: dto.professionalName,
        bio: dto.bio,
        profilePhotoUrl: dto.profilePhotoUrl,
        specialties: dto.specialties,
        yearsExperience: dto.yearsExperience,
        languages: dto.languages,
        coachingStyle: dto.coachingStyle,
        trainingApproach: dto.trainingApproach,
        consultationAvailability: dto.consultationAvailability,
        status: dto.status,
      },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      action: 'TRAINER_UPDATED',
      resource: 'trainers',
      resourceId: trainerId,
      metadata: { changes: dto },
    });

    return updated;
  }

  /**
   * Adds a professional certification to a trainer profile.
   */
  async addCertification(
    organisationId: string,
    trainerId: string,
    dto: CreateCertificationDto,
    actor: AuthenticatedUser,
  ) {
    await this.findTrainerById(organisationId, trainerId, actor);

    const now = new Date();
    const expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;
    let initialStatus: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' = 'ACTIVE';

    if (expiryDate) {
      if (expiryDate < now) {
        initialStatus = 'EXPIRED';
      } else {
        const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          initialStatus = 'EXPIRING_SOON';
        }
      }
    }

    // Generate signed download URL if document reference exists
    let documentUrl = dto.documentUrl;
    if (dto.documentReference && !documentUrl) {
      try {
        documentUrl = await this.storageProvider.getDownloadSignedUrl(dto.documentReference);
      } catch (err: any) {
        this.logger.warn(`Could not generate download signed URL: ${err.message}`);
      }
    }

    const cert = await this.prisma.trainerCertification.create({
      data: {
        trainerProfileId: trainerId,
        certificationName: dto.certificationName,
        issuingOrganisation: dto.issuingOrganisation,
        certificationNumber: dto.certificationNumber,
        issueDate: new Date(dto.issueDate),
        expiryDate,
        documentReference: dto.documentReference,
        documentUrl,
        documentMetadata: dto.documentMetadata ? JSON.parse(JSON.stringify(dto.documentMetadata)) : undefined,
        status: initialStatus,
        verifiedAt: new Date(),
        verifiedById: actor.id,
      },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      action: 'TRAINER_CERTIFICATION_ADDED',
      resource: 'certifications',
      resourceId: cert.id,
      metadata: { certificationName: dto.certificationName, issuingOrganisation: dto.issuingOrganisation },
    });

    return cert;
  }

  /**
   * Updates an existing certification.
   */
  async updateCertification(
    organisationId: string,
    trainerId: string,
    certId: string,
    dto: UpdateCertificationDto,
    actor: AuthenticatedUser,
  ) {
    await this.findTrainerById(organisationId, trainerId, actor);

    const cert = await this.prisma.trainerCertification.findFirst({
      where: { id: certId, trainerProfileId: trainerId },
    });
    if (!cert) {
      throw new NotFoundException(`Certification '${certId}' not found for trainer`);
    }

    const updated = await this.prisma.trainerCertification.update({
      where: { id: certId },
      data: {
        certificationName: dto.certificationName,
        issuingOrganisation: dto.issuingOrganisation,
        certificationNumber: dto.certificationNumber,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        documentReference: dto.documentReference,
        status: dto.status,
      },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      action: 'TRAINER_CERTIFICATION_UPDATED',
      resource: 'certifications',
      resourceId: certId,
      metadata: { changes: dto },
    });

    return updated;
  }

  /**
   * Removes or revokes a certification.
   */
  async deleteCertification(
    organisationId: string,
    trainerId: string,
    certId: string,
    actor: AuthenticatedUser,
  ) {
    await this.findTrainerById(organisationId, trainerId, actor);

    const cert = await this.prisma.trainerCertification.findFirst({
      where: { id: certId, trainerProfileId: trainerId },
    });
    if (!cert) {
      throw new NotFoundException(`Certification '${certId}' not found for trainer`);
    }

    await this.prisma.trainerCertification.delete({ where: { id: certId } });

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      action: 'TRAINER_CERTIFICATION_DELETED',
      resource: 'certifications',
      resourceId: certId,
    });

    return { success: true };
  }

  /**
   * Assigns a client to a trainer.
   * Enforces:
   * 1. Multi-tenant boundary: Trainer & Member must belong to same organisation.
   * 2. Active status: Inactive trainer or member cannot be assigned.
   * 3. PRIMARY TRAINER RULE: Enforces single active PRIMARY trainer per member in the organisation.
   */
  async assignClient(
    organisationId: string,
    trainerId: string,
    dto: AssignClientDto,
    actor: AuthenticatedUser,
  ) {
    // 1. Verify trainer exists and is ACTIVE
    const trainer = await this.findTrainerById(organisationId, trainerId, actor);
    if (trainer.status !== 'ACTIVE') {
      throw new BadRequestException(`Trainer '${trainer.professionalName}' is not active`);
    }

    // 2. Verify member exists and belongs to organisation
    const member = await this.prisma.memberProfile.findFirst({
      where: { id: dto.memberProfileId, organisationId, deletedAt: null },
      include: { user: true },
    });
    if (!member) {
      throw new NotFoundException(`Member '${dto.memberProfileId}' not found in organisation`);
    }
    if (['SUSPENDED', 'ARCHIVED'].includes(member.status)) {
      throw new BadRequestException(`Cannot assign client with status '${member.status}'`);
    }

    // 3. Outlet verification if provided
    if (dto.outletId) {
      const outlet = await this.prisma.outlet.findFirst({
        where: { id: dto.outletId, organisationId },
      });
      if (!outlet) {
        throw new BadRequestException(`Outlet '${dto.outletId}' does not belong to organisation`);
      }
    }

    const assignmentType = dto.assignmentType || 'PRIMARY';

    // 4. Concurrency-safe transaction
    return this.prisma.$transaction(async (tx) => {
      // PRIMARY TRAINER RULE
      if (assignmentType === 'PRIMARY') {
        const existingPrimary = await tx.trainerClientAssignment.findFirst({
          where: {
            organisationId,
            memberProfileId: dto.memberProfileId,
            assignmentType: 'PRIMARY',
            status: 'ACTIVE',
          },
          include: { trainerProfile: true },
        });

        if (existingPrimary) {
          if (existingPrimary.trainerProfileId === trainerId) {
            throw new ConflictException(
              `Member '${member.preferredName || member.user.firstName}' is already assigned to this trainer as PRIMARY`,
            );
          }
          throw new ConflictException(
            `Member already has an active PRIMARY trainer (${existingPrimary.trainerProfile.professionalName}). Use the reassignment workflow to transfer the client.`,
          );
        }
      }

      // Check duplicate assignment for same trainer-member pair
      const duplicateAssignment = await tx.trainerClientAssignment.findFirst({
        where: {
          trainerProfileId: trainerId,
          memberProfileId: dto.memberProfileId,
          assignmentType,
          status: 'ACTIVE',
        },
      });
      if (duplicateAssignment) {
        throw new ConflictException(`Active ${assignmentType} assignment already exists for this trainer and member`);
      }

      const assignment = await tx.trainerClientAssignment.create({
        data: {
          organisationId,
          outletId: dto.outletId,
          trainerProfileId: trainerId,
          memberProfileId: dto.memberProfileId,
          assignmentType,
          status: 'ACTIVE',
          startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          assignedById: actor.id,
          notes: dto.notes,
        },
        include: {
          trainerProfile: true,
          memberProfile: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
          outlet: true,
        },
      });

      await this.auditService.log({
        userId: actor.id,
        organisationId,
        outletId: dto.outletId,
        action: 'TRAINER_CLIENT_ASSIGNED',
        resource: 'trainer_clients',
        resourceId: assignment.id,
        metadata: {
          trainerId,
          memberProfileId: dto.memberProfileId,
          assignmentType,
        },
      });

      return assignment;
    });
  }

  /**
   * Reassigns a client from one trainer to another.
   * Preserves historical records and links previousAssignmentId.
   */
  async reassignClient(
    organisationId: string,
    trainerId: string,
    assignmentId: string,
    dto: ReassignClientDto,
    actor: AuthenticatedUser,
  ) {
    const existing = await this.prisma.trainerClientAssignment.findFirst({
      where: { id: assignmentId, organisationId, trainerProfileId: trainerId, status: 'ACTIVE' },
    });
    if (!existing) {
      throw new NotFoundException(`Active client assignment '${assignmentId}' not found`);
    }

    // Verify new trainer
    const newTrainer = await this.prisma.trainerProfile.findFirst({
      where: { id: dto.newTrainerId, organisationId, status: 'ACTIVE' },
    });
    if (!newTrainer) {
      throw new NotFoundException(`Target trainer '${dto.newTrainerId}' not found or inactive`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Close existing assignment
      await tx.trainerClientAssignment.update({
        where: { id: assignmentId },
        data: {
          status: 'REASSIGNED',
          endDate: new Date(),
          notes: dto.transferNotes
            ? `${existing.notes ? existing.notes + ' | ' : ''}Reassigned: ${dto.transferNotes}`
            : existing.notes,
        },
      });

      // 2. Create new assignment
      const newAssignment = await tx.trainerClientAssignment.create({
        data: {
          organisationId,
          outletId: existing.outletId,
          trainerProfileId: dto.newTrainerId,
          memberProfileId: existing.memberProfileId,
          assignmentType: dto.assignmentType || existing.assignmentType,
          status: 'ACTIVE',
          startDate: new Date(),
          assignedById: actor.id,
          notes: dto.transferNotes,
          previousAssignmentId: existing.id,
        },
        include: {
          trainerProfile: true,
          memberProfile: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
        },
      });

      await this.auditService.log({
        userId: actor.id,
        organisationId,
        action: 'TRAINER_CLIENT_REASSIGNED',
        resource: 'trainer_clients',
        resourceId: newAssignment.id,
        metadata: {
          previousTrainerId: trainerId,
          newTrainerId: dto.newTrainerId,
          memberProfileId: existing.memberProfileId,
          reason: dto.reason,
        },
      });

      return newAssignment;
    });
  }

  /**
   * Terminates a trainer-client assignment relationship, preserving historical data.
   */
  async terminateClientAssignment(
    organisationId: string,
    trainerId: string,
    memberProfileId: string,
    actor: AuthenticatedUser,
  ) {
    await this.findTrainerById(organisationId, trainerId, actor);

    const activeAssignments = await this.prisma.trainerClientAssignment.findMany({
      where: {
        organisationId,
        trainerProfileId: trainerId,
        memberProfileId,
        status: 'ACTIVE',
      },
    });

    if (activeAssignments.length === 0) {
      throw new NotFoundException('No active assignment found for this member and trainer');
    }

    await this.prisma.trainerClientAssignment.updateMany({
      where: {
        organisationId,
        trainerProfileId: trainerId,
        memberProfileId,
        status: 'ACTIVE',
      },
      data: {
        status: 'TERMINATED',
        endDate: new Date(),
      },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      action: 'TRAINER_CLIENT_UNASSIGNED',
      resource: 'trainer_clients',
      resourceId: activeAssignments[0]!.id,
      metadata: { trainerId, memberProfileId },
    });

    return { success: true, count: activeAssignments.length };
  }

  /**
   * Retrieves clients assigned to a trainer with privacy boundaries.
   */
  async findTrainerClients(organisationId: string, trainerId: string, actor: AuthenticatedUser) {
    // Privacy boundary: if actor is TRAINER and not managing other trainers, ensure trainerId matches actor
    if (!actor.isSuperAdmin) {
      const isOwnerOrManager = actor.roles.some((r) =>
        r.organisationId === organisationId && ['ORGANISATION_OWNER', 'OUTLET_MANAGER'].includes(r.role),
      );
      if (!isOwnerOrManager) {
        const staff = await this.prisma.staffProfile.findUnique({ where: { userId: actor.id } });
        const trainer = staff ? await this.prisma.trainerProfile.findUnique({ where: { staffProfileId: staff.id } }) : null;
        if (trainer && trainer.id !== trainerId) {
          throw new ForbiddenException('Privacy boundary: Trainers can only view their own assigned clients');
        }
      }
    }

    return this.prisma.trainerClientAssignment.findMany({
      where: { organisationId, trainerProfileId: trainerId, status: 'ACTIVE' },
      include: {
        memberProfile: {
          select: {
            id: true,
            userId: true,
            preferredName: true,
            status: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        outlet: { select: { id: true, name: true, code: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * Retrieves trainers assigned to a member.
   */
  async findMemberTrainers(organisationId: string, memberProfileId: string, actor: AuthenticatedUser) {
    return this.prisma.trainerClientAssignment.findMany({
      where: { organisationId, memberProfileId },
      include: {
        trainerProfile: {
          include: {
            staffProfile: {
              select: { displayName: true, jobTitle: true, profilePhotoUrl: true },
            },
            certifications: {
              where: { status: 'ACTIVE' },
              select: { id: true, certificationName: true, issuingOrganisation: true },
            },
          },
        },
        outlet: { select: { id: true, name: true } },
      },
      orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    });
  }
}
