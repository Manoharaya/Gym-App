# FitCore AI Receptionist — Privacy, Retention & Security

## Overview
The AI Receptionist operates within strict data privacy, role-based access control (RBAC), and tenant isolation boundaries to safeguard member health, billing, and communication data.

---

## Data Privacy Controls

### 1. Zero Health Information in Transcripts & Summaries
- AI summaries and notifications must strictly exclude private health records, medical diagnoses, PAR-Q questionnaire answers, and rehabilitation notes.
- If a customer mentions an injury or medical condition, it is classified as a general safety/trainer concern without persisting clinical records in interaction summaries.

### 2. Marketing Consent Verification
- Outbound notifications or follow-up communications following missed calls or prospect interactions require prior recorded consent (`consentStatus === 'GRANTED'`).
- Unknown telephone callers who leave no message receive zero automated marketing messages.

### 3. Masked Financial Data
- Credit card numbers, CVVs, and raw payment credentials are never captured, processed, or logged in conversation messages, voice transcripts, or interaction metadata.

---

## Access & Retention Policies

### 1. Conversation Transcripts
- Retained according to organization retention policy (default: 90 days).
- Viewable exclusively by authorized staff (`RECEPTION`, `OUTLET_MANAGER`, `ORGANISATION_OWNER`, `SUPERADMIN`).
- Every view action generates an immutable audit record (`RECEPTIONIST_TRANSCRIPT_VIEWED`).

### 2. Voice Call Audio Recordings
- Stored in private object storage with strict encryption at rest.
- Never accessible via public URLs; authorized staff must request time-limited signed URLs (maximum TTL: 15 minutes).
- Generating a playback URL is audited with `RECEPTIONIST_RECORDING_VIEWED`.

### 3. Multi-Tenant Isolation (IDOR Defense)
- All interaction lookups, handoff assignments, and follow-up updates query `organisationId` and `outletId` directly.
- Cross-tenant access attempts immediately fail with HTTP 403 `ForbiddenException` and security alert logging.
