import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { STORAGE_PROVIDER, StorageProvider } from '../storage/storage.interface';
import { calculatePagination } from '../common/dto/pagination.dto';
import {
  CreateMemberDto,
  UpdateMemberProfileDto,
  StaffUpdateMemberDto,
  MemberFilterDto,
  CreateInjuryDto,
  UpdateInjuryDto,
  CreateSignatureDto,
  RequestDocumentUploadDto,
  RegisterDocumentDto,
} from './dto/member-domain.dto';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: StorageProvider
  ) {}

  /**
   * Resolves the authenticated user's MemberProfile. Throws NotFoundException if not a member.
   */
  async getMemberProfileByUserId(userId: string) {
    const profile = await this.prisma.memberProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            displayName: true,
            phone: true,
            avatarUrl: true,
            status: true,
          },
        },
        memberOutlets: {
          include: {
            outlet: {
              select: {
                id: true,
                name: true,
                slug: true,
                code: true,
                city: true,
              },
            },
          },
        },
        onboarding: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Member profile not found for authenticated user');
    }

    return profile;
  }

  /**
   * Self-service member profile update. Cannot modify tenant, outlet, or status directly.
   */
  async updateSelfProfile(userId: string, dto: UpdateMemberProfileDto) {
    const profile = await this.getMemberProfileByUserId(userId);

    const updated = await this.prisma.memberProfile.update({
      where: { id: profile.id },
      data: {
        preferredName: dto.preferredName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        profilePhotoUrl: dto.profilePhotoUrl,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
        emergencyContactRelationship: dto.emergencyContactRelationship,
        timezone: dto.timezone,
      },
    });

    await this.audit.log({
      userId,
      organisationId: profile.organisationId,
      action: 'MEMBER_PROFILE_UPDATED',
      resource: 'member_profiles',
      resourceId: profile.id,
      metadata: { changed: Object.keys(dto) },
    });

    return updated;
  }

  /**
   * Creates a member transactionally (User + Role + MemberProfile + MemberOutlet + MemberOnboarding).
   */
  async createMemberForOrg(
    orgId: string,
    dto: CreateMemberDto,
    invitedByUserId: string
  ) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new BadRequestException('User with this email already exists');
    }

    const memberRole = await this.prisma.role.findUnique({ where: { name: 'MEMBER' } });
    if (!memberRole) {
      throw new NotFoundException('MEMBER system role not found');
    }

    // Default password hash for invited members
    const temporaryPassword = crypto.randomBytes(8).toString('hex') + 'A1!';
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          displayName: `${dto.firstName} ${dto.lastName}`,
          phone: dto.phone,
          status: 'INVITED',
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: memberRole.id,
          organisationId: orgId,
          outletId: dto.outletId,
        },
      });

      if (dto.outletId) {
        await tx.userOutlet.create({
          data: {
            userId: user.id,
            outletId: dto.outletId,
          },
        });
      }

      const memberProfile = await tx.memberProfile.create({
        data: {
          userId: user.id,
          organisationId: orgId,
          preferredName: dto.preferredName ?? dto.firstName,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          gender: dto.gender,
          emergencyContactName: dto.emergencyContactName,
          emergencyContactPhone: dto.emergencyContactPhone,
          emergencyContactRelationship: dto.emergencyContactRelationship,
          status: 'INVITED',
          onboardingStatus: 'NOT_STARTED',
        },
      });

      if (dto.outletId) {
        await tx.memberOutlet.create({
          data: {
            memberProfileId: memberProfile.id,
            outletId: dto.outletId,
            status: 'ACTIVE',
          },
        });
      }

      const onboarding = await tx.memberOnboarding.create({
        data: {
          memberProfileId: memberProfile.id,
          currentStep: 'PROFILE',
          status: 'NOT_STARTED',
        },
      });

      return { user, memberProfile, onboarding };
    });

    await this.audit.log({
      userId: invitedByUserId,
      organisationId: orgId,
      outletId: dto.outletId,
      action: 'MEMBER_CREATED',
      resource: 'members',
      resourceId: result.memberProfile.id,
      metadata: { email: dto.email, targetUserId: result.user.id },
    });

    return result;
  }

  /**
   * Retrieves paginated members for an organisation with filter support.
   */
  async findAllForOrg(orgId: string, filter: MemberFilterDto) {
    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      organisationId: orgId,
      deletedAt: null,
    };

    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.onboardingStatus) {
      where.onboardingStatus = filter.onboardingStatus;
    }
    if (filter.outletId) {
      where.memberOutlets = {
        some: { outletId: filter.outletId, status: 'ACTIVE' },
      };
    }
    if (filter.search) {
      where.user = {
        OR: [
          { firstName: { contains: filter.search, mode: 'insensitive' } },
          { lastName: { contains: filter.search, mode: 'insensitive' } },
          { email: { contains: filter.search, mode: 'insensitive' } },
        ],
      };
    }

    const [members, total] = await Promise.all([
      this.prisma.memberProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              displayName: true,
              phone: true,
              status: true,
            },
          },
          memberOutlets: {
            select: {
              outletId: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.memberProfile.count({ where }),
    ]);

    return {
      data: members,
      meta: calculatePagination(total, page, limit),
    };
  }

  /**
   * Retrieves member details with strict tenant/outlet scoping & IDOR prevention.
   */
  async findByIdScoped(memberId: string, actor: any) {
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            displayName: true,
            phone: true,
            avatarUrl: true,
            status: true,
          },
        },
        memberOutlets: {
          include: {
            outlet: true,
          },
        },
        onboarding: true,
      },
    });

    if (!member || member.deletedAt) {
      throw new NotFoundException(`Member with ID ${memberId} not found`);
    }

    // Check permissions
    if (!actor.isSuperAdmin) {
      const hasOrgAccess = actor.roles.some((r: any) => r.organisationId === member.organisationId);
      const isSelf = member.userId === actor.userId;

      if (!hasOrgAccess && !isSelf) {
        throw new ForbiddenException('Cross-tenant access forbidden');
      }

      // Check outlet-scoping if actor is outlet manager or reception
      const isOutletScoped = actor.roles.every(
        (r: any) => ['OUTLET_MANAGER', 'RECEPTION', 'TRAINER'].includes(r.role || r.name) && r.outletId
      );

      if (isOutletScoped && !isSelf) {
        const actorOutlets = actor.roles.map((r: any) => r.outletId);
        const memberOutlets = member.memberOutlets.map((mo) => mo.outletId);
        const sharesOutlet = actorOutlets.some((oId: string) => memberOutlets.includes(oId));
        if (!sharesOutlet) {
          throw new ForbiddenException('Member does not belong to your assigned outlet');
        }
      }
    }

    return member;
  }

  /**
   * Updates a member's status or details by authorized staff.
   */
  async updateMemberStatus(memberId: string, dto: StaffUpdateMemberDto, actor: any) {
    const member = await this.findByIdScoped(memberId, actor);

    const updated = await this.prisma.memberProfile.update({
      where: { id: member.id },
      data: {
        status: dto.status,
        onboardingStatus: dto.onboardingStatus,
        preferredName: dto.preferredName,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
      },
    });

    await this.audit.log({
      userId: actor.userId,
      organisationId: member.organisationId,
      action: 'MEMBER_STATUS_UPDATED',
      resource: 'member_profiles',
      resourceId: member.id,
      metadata: { changed: dto },
    });

    return updated;
  }

  // ------------------------------------------
  // Injuries Domain
  // ------------------------------------------

  async getInjuries(userId: string) {
    const profile = await this.getMemberProfileByUserId(userId);
    return this.prisma.injury.findMany({
      where: { memberProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createInjury(userId: string, dto: CreateInjuryDto) {
    const profile = await this.getMemberProfileByUserId(userId);

    const injury = await this.prisma.injury.create({
      data: {
        memberProfileId: profile.id,
        bodyArea: dto.bodyArea,
        description: dto.description,
        status: dto.status ?? 'ACTIVE',
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        notes: dto.notes,
      },
    });

    await this.audit.log({
      userId,
      organisationId: profile.organisationId,
      action: 'INJURY_RECORDED',
      resource: 'injuries',
      resourceId: injury.id,
      metadata: { bodyArea: dto.bodyArea, status: dto.status },
    });

    return injury;
  }

  async updateInjury(userId: string, injuryId: string, dto: UpdateInjuryDto) {
    const profile = await this.getMemberProfileByUserId(userId);

    const injury = await this.prisma.injury.findFirst({
      where: { id: injuryId, memberProfileId: profile.id },
    });

    if (!injury) {
      throw new NotFoundException(`Injury record ${injuryId} not found`);
    }

    const updated = await this.prisma.injury.update({
      where: { id: injuryId },
      data: {
        description: dto.description,
        status: dto.status,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        notes: dto.notes,
      },
    });

    await this.audit.log({
      userId,
      organisationId: profile.organisationId,
      action: 'INJURY_UPDATED',
      resource: 'injuries',
      resourceId: injuryId,
      metadata: { status: dto.status },
    });

    return updated;
  }

  // ------------------------------------------
  // Digital Signatures
  // ------------------------------------------

  async createSignature(
    userId: string,
    dto: CreateSignatureDto,
    ipAddress?: string,
    userAgent?: string
  ) {
    const profile = await this.getMemberProfileByUserId(userId);

    // Cryptographic evidence reference hash
    const signatureReference = crypto
      .createHash('sha256')
      .update(`${profile.id}:${dto.documentType}:${dto.documentVersion}:${dto.signerName}:${Date.now()}`)
      .digest('hex');

    const signature = await this.prisma.signature.create({
      data: {
        memberProfileId: profile.id,
        documentType: dto.documentType,
        documentVersion: dto.documentVersion,
        signatureMethod: dto.signatureMethod ?? 'ELECTRONIC_ACCEPTANCE',
        signerName: dto.signerName,
        signatureReference,
        ipAddress,
        userAgent,
      },
    });

    await this.audit.log({
      userId,
      organisationId: profile.organisationId,
      action: 'SIGNATURE_CREATED',
      resource: 'signatures',
      resourceId: signature.id,
      metadata: {
        documentType: dto.documentType,
        signatureReference,
      },
      ipAddress,
      userAgent,
    });

    return signature;
  }

  // ------------------------------------------
  // Documents & Storage
  // ------------------------------------------

  async requestDocumentUploadUrl(userId: string, dto: RequestDocumentUploadDto) {
    const profile = await this.getMemberProfileByUserId(userId);

    // Secure, non-colliding storage key: org/member/docType/uuid_sanitizedFileName
    const ext = dto.fileName.split('.').pop() || 'dat';
    const randomId = crypto.randomUUID();
    const storageKey = `tenants/${profile.organisationId}/members/${profile.id}/${dto.documentType}/${randomId}.${ext}`;

    const signedResult = await this.storage.getUploadSignedUrl(
      storageKey,
      dto.mimeType,
      900 // 15 mins
    );

    return signedResult;
  }

  async registerDocument(userId: string, dto: RegisterDocumentDto) {
    const profile = await this.getMemberProfileByUserId(userId);

    const doc = await this.prisma.memberDocument.create({
      data: {
        memberProfileId: profile.id,
        documentType: dto.documentType,
        storageKey: dto.storageKey,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        size: dto.size,
        status: 'UPLOADED',
        uploadedById: userId,
      },
    });

    await this.audit.log({
      userId,
      organisationId: profile.organisationId,
      action: 'DOCUMENT_UPLOADED',
      resource: 'member_documents',
      resourceId: doc.id,
      metadata: {
        documentType: dto.documentType,
        fileName: dto.fileName,
        size: dto.size,
      },
    });

    return doc;
  }

  async getDocumentDownloadUrl(userId: string, documentId: string, actor: any) {
    const doc = await this.prisma.memberDocument.findUnique({
      where: { id: documentId },
      include: { memberProfile: true },
    });

    if (!doc) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    // IDOR verification
    if (!actor.isSuperAdmin) {
      const isSelf = doc.memberProfile.userId === actor.userId;
      const hasOrgAccess = actor.roles.some(
        (r: any) => r.organisationId === doc.memberProfile.organisationId
      );

      if (!isSelf && !hasOrgAccess) {
        throw new ForbiddenException('Cross-tenant document access forbidden');
      }

      // Check role restriction: Reception cannot read medical clearance documents
      const isReception = actor.roles.every((r: any) => (r.role || r.name) === 'RECEPTION');
      if (isReception && doc.documentType === 'MEDICAL_CLEARANCE' && !isSelf) {
        throw new ForbiddenException('Reception role is restricted from accessing medical clearance documents');
      }
    }

    const downloadUrl = await this.storage.getDownloadSignedUrl(doc.storageKey, 900);

    await this.audit.log({
      userId: actor.userId,
      organisationId: doc.memberProfile.organisationId,
      action: 'DOCUMENT_ACCESSED',
      resource: 'member_documents',
      resourceId: doc.id,
      metadata: { documentType: doc.documentType },
    });

    return { downloadUrl, document: doc };
  }
}
