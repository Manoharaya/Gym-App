# Database Schema: AI Reactivation & Member Recovery

Two core PostgreSQL tables were added via Prisma schema to support Day 27:

---

## 1. `member_reactivation_profiles`

Stores consolidated inactivity telemetry, personal baseline frequency comparisons, active recovery states, and grounded recommendation summaries for each member within an organisation.

```prisma
model MemberReactivationProfile {
  id                         String        @id @default(cuid())
  organisationId             String
  memberId                   String
  lifecycleState             String        @default("INACTIVE") // NOT_ELIGIBLE, ELIGIBLE, IN_REACTIVATION, REENGAGED, CLOSED
  reactivationStatus         String        @default("FOLLOW_UP_RECOMMENDED") // NO_ACTION, FOLLOW_UP_RECOMMENDED, FOLLOW_UP_IN_PROGRESS, REENGAGED, DISMISSED, EXPIRED
  recoveryState              String        @default("NO_RECOVERY_SIGNAL") // NO_RECOVERY_SIGNAL, EARLY_REENGAGEMENT, PARTIAL_REENGAGEMENT, STABLE_REENGAGEMENT, REENGAGED
  inactivityStartDate        DateTime?
  lastMeaningfulActivityAt   DateTime?
  lastMeaningfulActivityType String?
  inactivityDays             Int           @default(0)
  baselineWeeklyVisits       Float?
  currentWeeklyVisits        Float?
  dropPct                    Float?
  previousEngagementLevel    String?       // VERY_LOW, LOW, MODERATE, HIGH, VERY_HIGH
  currentEngagementLevel     String?
  retentionRiskLevel         String?       // INSUFFICIENT_DATA, LOW, MODERATE, ELEVATED, HIGH
  retentionRiskTrend         String?       // IMPROVING, STABLE, WORSENING, INSUFFICIENT_DATA
  primaryBarriers            Json          // ReactivationBarrierItem[]
  positiveSignals            Json          // ReactivationPositiveSignalItem[]
  recommendedStrategy        String?       // One of the 13 controlled strategies
  confidenceScore            Float?
  explanationSummary         String?       @db.Text
  draftMessage               String?       @db.Text
  reengagementDetectedAt     DateTime?
  reengagementAchievedAt     DateTime?
  currentRecoveryPlanId      String?
  aiGeneratedAt              DateTime?
  rawAnalysis                Json?
  analysisVersion            Int           @default(1)
  dataVersion                Int           @default(1)
  createdAt                  DateTime      @default(now())
  updatedAt                  DateTime      @updatedAt
  expiresAt                  DateTime?

  organisation               Organisation  @relation(fields: [organisationId], references: [id], onDelete: Cascade)
  memberProfile              MemberProfile @relation(fields: [memberId], references: [id], onDelete: Cascade)
  currentRecoveryPlan        MemberRecoveryPlan? @relation("CurrentRecoveryPlan", fields: [currentRecoveryPlanId], references: [id], onDelete: SetNull)

  @@unique([organisationId, memberId])
  @@index([organisationId, reactivationStatus])
  @@index([organisationId, lifecycleState])
  @@index([organisationId, recoveryState])
  @@index([memberId])
  @@map("member_reactivation_profiles")
}
```

---

## 2. `member_recovery_plans`

Manages structured, human-approved recovery interventions with lifecycle state tracking, assigned staff, audit references, and dismissal reasons.

```prisma
model MemberRecoveryPlan {
  id                    String        @id @default(cuid())
  organisationId        String
  outletId              String?
  memberId              String
  strategyType          String        @default("GENERAL_SUPPORT") // One of the 13 controlled strategies
  strategy              String?       // backwards compatibility
  priority              String        @default("MEDIUM") // LOW, MEDIUM, HIGH, URGENT
  targetChannel         String        @default("TRAINER_MESSAGE")
  recommendedAction     String        @db.Text
  reason                String?       @db.Text
  draftMessage          String?       @db.Text
  suggestedStaffMessage String?       @db.Text
  suggestedNextStep     String?       @db.Text
  staffNotes            String?       @db.Text
  outcomeNotes          String?       @db.Text
  assignedStaffId       String?
  approvedByStaffId     String?
  status                String        @default("PENDING_APPROVAL") // DRAFT, PENDING_APPROVAL, APPROVED, IN_PROGRESS, REENGAGED, COMPLETED, DISMISSED, EXPIRED
  dismissalReason       String?       @db.Text
  recommendedAt         DateTime      @default(now())
  approvedAt            DateTime?
  startedAt             DateTime?
  completedAt           DateTime?
  dismissedAt           DateTime?
  expiresAt             DateTime?
  source                String        @default("AI_RECOMMENDATION") // AI_RECOMMENDATION, MANUAL_STAFF
  analysisVersion       Int           @default(1)
  dataVersion           Int           @default(1)
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt

  organisation          Organisation  @relation(fields: [organisationId], references: [id], onDelete: Cascade)
  outlet                Outlet?       @relation(fields: [outletId], references: [id], onDelete: SetNull)
  memberProfile         MemberProfile @relation(fields: [memberId], references: [id], onDelete: Cascade)
  assignedStaff         User?         @relation("AssignedRecoveryStaff", fields: [assignedStaffId], references: [id], onDelete: SetNull)
  approvedByStaff       User?         @relation("ApprovedRecoveryStaff", fields: [approvedByStaffId], references: [id], onDelete: SetNull)
  currentInProfiles     MemberReactivationProfile[] @relation("CurrentRecoveryPlan")

  @@index([organisationId, status])
  @@index([memberId])
  @@index([assignedStaffId, status])
  @@index([outletId, status])
  @@map("member_recovery_plans")
}
```
