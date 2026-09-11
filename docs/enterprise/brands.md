# Multi-Brand Architecture

## 1. Overview
Large enterprises frequently operate distinct commercial brands targeting different market segments (e.g. premium 24/7 fitness clubs vs. high-intensity boutique pilates studios vs. budget wellness clubs).

The `OrganisationBrand` entity allows an enterprise to maintain brand identities within a single consolidated database and billing organization.

## 2. Model Structure
```prisma
model OrganisationBrand {
  id              String        @id @default(cuid())
  organisationId  String
  name            String
  code            String        // Uppercase unique code within organisation
  slug            String        // URL-friendly slug
  description     String?
  logoUrl         String?
  website         String?
  primaryColor    String?
  secondaryColor  String?
  accentColor     String?
  status          String        @default("ACTIVE") // ACTIVE, INACTIVE, ARCHIVED
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  deletedAt       DateTime?
}
```

## 3. Brand Archival Protocol
When an enterprise archives a brand:
1. Associated active outlets are checked.
2. Active outlets have their `brandId` safely set to `null` or reassigned to a successor brand.
3. The brand record is marked `status = 'ARCHIVED'` with `deletedAt = now()`.
4. Audit trail records the action and affected outlet count.
