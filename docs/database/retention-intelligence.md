# Database Schema: AI Retention Intelligence

The retention intelligence layer introduces two primary PostgreSQL relational tables managed via Prisma ORM:
1. `retention_analyses` (`RetentionAnalysis`)
2. `retention_followup_tasks` (`RetentionFollowUpTask`)

---

## 1. `retention_analyses` Table

Stores generated AI analysis snapshots, explainable factors, positive signals, and staff feedback ratings.

```prisma
model RetentionAnalysis {
  id                       String        @id @default(cuid())
  organisationId           String
  memberId                 String
  riskLevel                String        // INSUFFICIENT_DATA, LOW, MODERATE, ELEVATED, HIGH
  riskTrend                String        // IMPROVING, STABLE, WORSENING, INSUFFICIENT_DATA
  analysisVersion          Int           @default(1)
  dataVersion              Int           @default(1)
  primaryFactors           Json          // RetentionRiskFactor[]
  secondaryFactors         Json?         // Secondary factors
  positiveSignals          Json?         // RetentionPositiveSignal[]
  recommendedInterventions Json          // RetentionInterventionRecommendation[]
  suggestedStaffNote       String?       @db.Text
  summary                  String        @db.Text
  confidence               String        @default("MEDIUM") // HIGH, MEDIUM, LOW, INSUFFICIENT_DATA
  generatedBy              String        @default("AI")     // AI, DETERMINISTIC
  model                    String?
  promptVersion            Int           @default(1)
  idempotencyKey           String?
  feedbackRating           String?       // HELPFUL, NOT_HELPFUL, INCORRECT, NOT_RELEVANT
  feedbackComment          String?       @db.Text
  createdAt                DateTime      @default(now())
  updatedAt                DateTime      @updatedAt
  expiresAt                DateTime?

  organisation             Organisation  @relation(fields: [organisationId], references: [id], onDelete: Cascade)
  memberProfile            MemberProfile @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@index([organisationId, memberId, createdAt])
  @@index([memberId, createdAt])
  @@index([organisationId, riskLevel])
  @@index([idempotencyKey])
  @@map("retention_analyses")
}
```

---

## 2. `retention_followup_tasks` Table

Represents the human-in-the-loop task workflow for gym staff and personal trainers.

```prisma
model RetentionFollowUpTask {
  id                  String        @id @default(cuid())
  organisationId      String
  outletId            String?
  memberId            String
  assignedStaffId     String?
  riskLevel           String        // INSUFFICIENT_DATA, LOW, MODERATE, ELEVATED, HIGH
  interventionType    String        // TRAINER_CHECK_IN, GOAL_REVIEW, etc.
  source              String        @default("AI_RECOMMENDATION") // AI_RECOMMENDATION, MANUAL, STAFF_DASHBOARD
  status              String        @default("OPEN") // OPEN, ASSIGNED, IN_PROGRESS, COMPLETED, DISMISSED, EXPIRED
  priority            String        @default("MEDIUM") // LOW, MEDIUM, HIGH
  title               String?
  notes               String?       @db.Text
  dueAt               DateTime?
  completedAt         DateTime?
  completedByStaffId  String?
  dismissalReason     String?       @db.Text
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  organisation        Organisation  @relation(fields: [organisationId], references: [id], onDelete: Cascade)
  outlet              Outlet?       @relation(fields: [outletId], references: [id], onDelete: SetNull)
  memberProfile       MemberProfile @relation(fields: [memberId], references: [id], onDelete: Cascade)
  assignedStaff       User?         @relation("AssignedRetentionStaff", fields: [assignedStaffId], references: [id], onDelete: SetNull)
  completedByStaff    User?         @relation("CompletedRetentionStaff", fields: [completedByStaffId], references: [id], onDelete: SetNull)

  @@index([organisationId, status])
  @@index([memberId])
  @@index([assignedStaffId, status])
  @@index([outletId, status])
  @@map("retention_followup_tasks")
}
```

---

## 3. Relationships & Data Integrity Constraints
- **Foreign Keys**: Cascades on `organisationId` and `memberId` to guarantee tenant isolation and clean member deletion.
- **SetNull on Staff**: If a trainer or staff member leaves the organization, historical tasks preserve member and outcome records with `assignedStaffId = null`.
- **Indexing Strategy**:
  - Compound index on `[organisationId, memberId, createdAt]` accelerates latest-snapshot queries.
  - Compound index on `[organisationId, status]` optimizes staff queue queries and count aggregations.
  - Index on `[idempotencyKey]` enables sub-millisecond duplicate suppression.
