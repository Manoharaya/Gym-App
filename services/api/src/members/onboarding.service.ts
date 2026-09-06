import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  /**
   * Evaluates authoritative onboarding status across all required components.
   */
  async getOnboardingProgress(userId: string) {
    const profile = await this.prisma.memberProfile.findUnique({
      where: { userId },
      include: {
        onboarding: true,
        parqSubmissions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        consentRecords: {
          include: {
            consentType: true,
          },
        },
        signatures: true,
        documents: true,
        injuries: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Member profile not found');
    }

    const mandatoryConsentTypes = await this.prisma.consentType.findMany({
      where: { isMandatory: true },
    });

    // 1. Profile Step
    const isProfileComplete = Boolean(
      profile.preferredName && (profile.emergencyContactName || profile.dateOfBirth)
    );

    // 2. PAR-Q Step
    const latestParq = profile.parqSubmissions[0];
    const isParqComplete = Boolean(
      latestParq && ['SUBMITTED', 'APPROVED'].includes(latestParq.status)
    );

    // 3. Consents Step
    const activeConsentedTypeIds = new Set(
      profile.consentRecords
        .filter((c) => c.status === 'CONSENTED')
        .map((c) => c.consentTypeId)
    );
    const areMandatoryConsentsComplete = mandatoryConsentTypes.every((mc) =>
      activeConsentedTypeIds.has(mc.id)
    );

    // 4. Signature Step
    const hasSignature = profile.signatures.some(
      (s) => s.documentType === 'ONBOARDING_AGREEMENT'
    );

    // Define steps
    const steps = [
      { key: 'PROFILE', title: 'Personal Information', status: isProfileComplete ? 'COMPLETED' : 'PENDING' },
      { key: 'PARQ', title: 'Physical Activity Readiness', status: isParqComplete ? 'COMPLETED' : 'PENDING' },
      { key: 'HEALTH_SCREENING', title: 'Health Screening', status: 'COMPLETED' },
      { key: 'INJURIES', title: 'Injury History', status: 'COMPLETED' }, // Optional logging, always accessible
      { key: 'CONSENTS', title: 'Compliance & Consent', status: areMandatoryConsentsComplete ? 'COMPLETED' : 'PENDING' },
      { key: 'DOCUMENTS', title: 'Medical Clearance', status: 'COMPLETED' }, // Optional unless flagged
      { key: 'SIGNATURE', title: 'Digital Declaration', status: hasSignature ? 'COMPLETED' : 'PENDING' },
      { key: 'REVIEW', title: 'Final Review', status: isProfileComplete && isParqComplete && areMandatoryConsentsComplete && hasSignature ? 'COMPLETED' : 'PENDING' },
    ];

    const coreSteps = [isProfileComplete, isParqComplete, areMandatoryConsentsComplete, hasSignature];
    const completedCore = coreSteps.filter(Boolean).length;
    const totalCore = coreSteps.length;
    const percentage = Math.round((completedCore / totalCore) * 100);

    return {
      status: profile.onboardingStatus,
      currentStep: profile.onboarding?.currentStep ?? 'PROFILE',
      progress: {
        completed: completedCore,
        total: totalCore,
        percentage,
      },
      steps,
    };
  }

  /**
   * Starts or resumes the onboarding session.
   */
  async startOnboarding(userId: string) {
    const profile = await this.prisma.memberProfile.findUnique({
      where: { userId },
      include: { onboarding: true },
    });

    if (!profile) {
      throw new NotFoundException('Member profile not found');
    }

    if (profile.onboardingStatus === 'NOT_STARTED') {
      await this.prisma.$transaction([
        this.prisma.memberProfile.update({
          where: { id: profile.id },
          data: { onboardingStatus: 'IN_PROGRESS', status: 'ONBOARDING' },
        }),
        this.prisma.memberOnboarding.upsert({
          where: { memberProfileId: profile.id },
          update: { status: 'IN_PROGRESS', startedAt: new Date() },
          create: {
            memberProfileId: profile.id,
            status: 'IN_PROGRESS',
            currentStep: 'PROFILE',
            startedAt: new Date(),
          },
        }),
      ]);

      await this.audit.log({
        userId,
        organisationId: profile.organisationId,
        action: 'MEMBER_ONBOARDING_STARTED',
        resource: 'member_onboardings',
        resourceId: profile.id,
      });
    }

    return this.getOnboardingProgress(userId);
  }

  /**
   * Updates the current active onboarding step.
   */
  async updateCurrentStep(userId: string, step: string) {
    const profile = await this.prisma.memberProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Member profile not found');
    }

    const onboarding = await this.prisma.memberOnboarding.upsert({
      where: { memberProfileId: profile.id },
      update: { currentStep: step },
      create: {
        memberProfileId: profile.id,
        currentStep: step,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    return onboarding;
  }

  /**
   * Authoritative backend validation of completion.
   * Throws BadRequestException if any mandatory component is missing.
   */
  async validateAndCompleteOnboarding(userId: string) {
    const progress = await this.getOnboardingProgress(userId);

    const pendingSteps = progress.steps
      .filter((s) => ['PROFILE', 'PARQ', 'CONSENTS', 'SIGNATURE'].includes(s.key))
      .filter((s) => s.status !== 'COMPLETED');

    if (pendingSteps.length > 0) {
      throw new BadRequestException({
        message: 'Cannot complete onboarding: required steps are incomplete',
        incompleteSteps: pendingSteps.map((s) => s.key),
      });
    }

    const profile = await this.prisma.memberProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Member profile not found');
    }

    await this.prisma.$transaction([
      this.prisma.memberProfile.update({
        where: { id: profile.id },
        data: {
          onboardingStatus: 'COMPLETED',
          status: 'ACTIVE',
        },
      }),
      this.prisma.memberOnboarding.update({
        where: { memberProfileId: profile.id },
        data: {
          status: 'COMPLETED',
          currentStep: 'COMPLETE',
          completedAt: new Date(),
        },
      }),
    ]);

    await this.audit.log({
      userId,
      organisationId: profile.organisationId,
      action: 'MEMBER_ONBOARDING_COMPLETED',
      resource: 'member_onboardings',
      resourceId: profile.id,
    });

    return {
      success: true,
      onboardingStatus: 'COMPLETED',
      message: 'Member onboarding completed successfully',
    };
  }
}
