import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

/**
 * Domain Exporters interface
 */
export interface ExportedDomainSection {
  domain: string;
  dataset: string;
  classification: string;
  exportedAt: string;
  recordCount: number;
  records: any[];
  [key: string]: any;
}

@Injectable()
export class DomainExportersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Member Profile Exporter
   * Excludes: password hashes, reset tokens, internal staff notes
   */
  async exportMemberProfile(memberId: string): Promise<ExportedDomainSection> {
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
            createdAt: true,
          },
        },
      },
    });

    if (!member) {
      return {
        domain: 'members',
        dataset: 'PROFILE',
        classification: 'PERSONAL',
        exportedAt: new Date().toISOString(),
        recordCount: 0,
        records: [],
      };
    }

    const safeRecord = {
      id: member.id,
      email: member.user.email,
      phone: member.user.phone,
      fullName: `${member.user.firstName} ${member.user.lastName}`.trim(),
      preferredName: member.preferredName,
      dateOfBirth: member.dateOfBirth?.toISOString() || null,
      gender: member.gender,
      emergencyContactName: member.emergencyContactName,
      emergencyContactPhone: member.emergencyContactPhone,
      emergencyContactRelationship: member.emergencyContactRelationship,
      timezone: member.timezone,
      status: member.status,
      createdAt: member.createdAt.toISOString(),
    };

    return {
      domain: 'members',
      dataset: 'PROFILE',
      classification: 'PERSONAL',
      exportedAt: new Date().toISOString(),
      recordCount: 1,
      records: [safeRecord],
    };
  }

  /**
   * Health Data Exporter
   * Pre-exercise health screening questionnaires and medical clearances
   */
  async exportHealthData(memberId: string): Promise<ExportedDomainSection> {
    const [screenings, injuries, clearances] = await Promise.all([
      this.prisma.healthScreening.findMany({
        where: { memberProfileId: memberId },
        select: {
          id: true,
          status: true,
          screeningVersion: true,
          notes: true,
          createdAt: true,
        },
      }),
      this.prisma.injury.findMany({
        where: { memberProfileId: memberId },
        select: {
          id: true,
          bodyArea: true,
          description: true,
          status: true,
        },
      }),
      this.prisma.medicalClearance.findMany({
        where: { memberProfileId: memberId },
        select: {
          id: true,
          status: true,
          issuedDate: true,
          expiryDate: true,
          notes: true,
        },
      }),
    ]);

    const records = [
      ...screenings.map((s) => ({ type: 'HEALTH_SCREENING', ...s })),
      ...injuries.map((i) => ({ type: 'INJURY', ...i })),
      ...clearances.map((c) => ({ type: 'MEDICAL_CLEARANCE', ...c })),
    ];

    return {
      domain: 'health',
      dataset: 'HEALTH_RECORDS',
      classification: 'HIGHLY_SENSITIVE',
      exportedAt: new Date().toISOString(),
      recordCount: records.length,
      records,
    };
  }

  /**
   * Training & Progress Exporter
   */
  async exportTrainingData(memberId: string): Promise<ExportedDomainSection> {
    const [workouts, measurements, personalRecords] = await Promise.all([
      this.prisma.workout.findMany({
        where: { memberProfileId: memberId },
        select: {
          id: true,
          title: true,
          status: true,
          startedAt: true,
          completedAt: true,
        },
      }),
      this.prisma.bodyMeasurement.findMany({
        where: { memberProfileId: memberId },
        select: {
          id: true,
          measurementType: true,
          value: true,
          unit: true,
          recordedAt: true,
        },
      }),
      this.prisma.personalRecord.findMany({
        where: { memberProfileId: memberId },
        select: {
          id: true,
          exerciseId: true,
          recordType: true,
          value: true,
        },
      }),
    ]);

    return {
      domain: 'training',
      dataset: 'TRAINING_AND_PROGRESS',
      classification: 'PERSONAL',
      exportedAt: new Date().toISOString(),
      recordCount: workouts.length + measurements.length + personalRecords.length,
      workouts,
      measurements,
      personalRecords,
      records: [
        ...workouts.map((w) => ({ type: 'WORKOUT', ...w })),
        ...measurements.map((m) => ({ type: 'MEASUREMENT', ...m })),
        ...personalRecords.map((p) => ({ type: 'PERSONAL_RECORD', ...p })),
      ],
    };
  }

  /**
   * Nutrition Exporter
   */
  async exportNutritionData(memberId: string): Promise<ExportedDomainSection> {
    const foodLogs = await this.prisma.foodLog.findMany({
      where: { memberProfileId: memberId },
      select: {
        id: true,
        mealType: true,
        consumedAt: true,
        foodNameAtLog: true,
        calories: true,
        protein: true,
        carbohydrates: true,
        fat: true,
      },
    });

    return {
      domain: 'nutrition',
      dataset: 'NUTRITION_LOGS',
      classification: 'PERSONAL',
      exportedAt: new Date().toISOString(),
      recordCount: foodLogs.length,
      records: foodLogs,
    };
  }

  /**
   * Wearables Exporter
   * Excludes: encrypted access tokens, refresh tokens, client secrets
   */
  async exportWearableData(memberId: string): Promise<ExportedDomainSection> {
    const records = await this.prisma.healthDataRecord.findMany({
      where: { memberId },
      select: {
        id: true,
        provider: true,
        dataType: true,
        value: true,
        unit: true,
        recordedAt: true,
      },
      take: 1000,
      orderBy: { recordedAt: 'desc' },
    });

    return {
      domain: 'wearables',
      dataset: 'WEARABLE_TELEMETRY',
      classification: 'HIGHLY_SENSITIVE',
      exportedAt: new Date().toISOString(),
      recordCount: records.length,
      records,
    };
  }

  /**
   * Payment & Billing Exporter
   * Excludes: full card numbers, CVVs, gateway secret keys
   */
  async exportPaymentData(memberId: string): Promise<ExportedDomainSection> {
    const [transactions, invoices] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        where: { memberProfileId: memberId },
        select: {
          id: true,
          amountMinor: true,
          currency: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.invoice.findMany({
        where: { memberProfileId: memberId },
        select: {
          id: true,
          invoiceNumber: true,
          totalMinor: true,
          currency: true,
          status: true,
          paidAt: true,
        },
      }),
    ]);

    return {
      domain: 'payments',
      dataset: 'BILLING_HISTORY',
      classification: 'SENSITIVE',
      exportedAt: new Date().toISOString(),
      recordCount: transactions.length + invoices.length,
      records: [
        ...transactions.map((t) => ({ type: 'TRANSACTION', ...t })),
        ...invoices.map((i) => ({ type: 'INVOICE', ...i })),
      ],
    };
  }

  /**
   * Consents Exporter
   */
  async exportConsentData(memberId: string): Promise<ExportedDomainSection> {
    const records = await this.prisma.consentRecord.findMany({
      where: { memberProfileId: memberId },
      select: {
        id: true,
        status: true,
        consentedAt: true,
        withdrawnAt: true,
        withdrawalReason: true,
        consentType: { select: { key: true, name: true } },
        consentVersion: { select: { version: true } },
      },
    });

    return {
      domain: 'consent',
      dataset: 'CONSENT_HISTORY',
      classification: 'INTERNAL',
      exportedAt: new Date().toISOString(),
      recordCount: records.length,
      records: records.map((r: any) => ({
        id: r.id,
        consentKey: r.consentType.key,
        consentName: r.consentType.name,
        version: r.consentVersion.version,
        status: r.status,
        consentedAt: r.consentedAt.toISOString(),
        withdrawnAt: r.withdrawnAt?.toISOString() || null,
        withdrawalReason: r.withdrawalReason || null,
      })),
    };
  }

  /**
   * Security & Device Exporter
   * Excludes: password hashes, raw tokens, MFA secrets, recovery codes
   */
  async exportSecurityData(memberId: string): Promise<ExportedDomainSection> {
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberId },
      select: { userId: true },
    });

    if (!member?.userId) {
      return {
        domain: 'security',
        dataset: 'SECURITY_DEVICES',
        classification: 'INTERNAL',
        exportedAt: new Date().toISOString(),
        recordCount: 0,
        records: [],
      };
    }

    const devices = await this.prisma.userDevice.findMany({
      where: { userId: member.userId },
      select: {
        id: true,
        deviceName: true,
        platform: true,
        browser: true,
        status: true,
        firstSeenAt: true,
        lastSeenAt: true,
      },
    });

    return {
      domain: 'security',
      dataset: 'SECURITY_DEVICES',
      classification: 'INTERNAL',
      exportedAt: new Date().toISOString(),
      recordCount: devices.length,
      records: devices,
    };
  }
}
