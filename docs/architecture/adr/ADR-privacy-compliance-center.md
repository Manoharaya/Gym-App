# Architecture Decision Record: Privacy & Compliance Center (Day 53)

## Context
FitCore operates as a multi-tenant enterprise fitness management and engagement platform handling sensitive personal data across members, staff, trainers, billing, workouts, biometric health metrics, AI coaching, communications, and wearable sensors. To comply with global privacy regulations (GDPR, CCPA/CPRA, HIPAA security rule guidance, PIPEDA, Australian Privacy Principles) and maintain member trust, FitCore requires a centralized privacy and data governance layer.

Fragmented deletion scripts, hard-coded redaction, ad-hoc export queries, or distributed consent tables risk data leakage, regulatory non-compliance, unauthorized data deletion, and operational downtime.

## Decision
1. **Centralized Governance Orchestrator**:
   - Establish a unified pipeline: `DISCOVER → CLASSIFY → INFORM → CONSENT → AUTHORIZE → ACCESS → EXPORT → RETAIN → DELETE → AUDIT`.
   - All privacy operations pass through `PrivacyService` and dedicated sub-domain services (`PrivacyCatalogService`, `PrivacyConsentService`, `PrivacyPreferencesService`, `PrivacyRequestService`, `PrivacyDataAccessService`, `PrivacyExportService`, `PrivacyDeletionService`, `PrivacyRetentionService`).

2. **Personal Data Catalog & Multi-Dimensional Classification**:
   - 24 standardized personal data categories mapped across 5 classification levels (`PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`, `SPECIAL_CATEGORY`).
   - Categorized by purpose of processing, legal basis, default retention policy, and storage destinations.

3. **Consent Re-use & Withdrawal Impact Evaluation**:
   - Reuse existing Day 4 `ConsentVersion` and `ConsentRecord` models rather than spinning up parallel tables.
   - Implement withdrawal impact analysis before committing consent revocation, warning members if withdrawal degrades features (e.g. AI coaching, wearable sync, biometric performance analytics).

4. **Multi-Domain Data Export Engine**:
   - Asynchronous export execution via `PrivacyExportJob` and `PrivacyExportArtifact`.
   - Domain-specific exporters (`Identity`, `Profile`, `Bookings`, `Workouts`, `Nutrition`, `Billing`, `Communications`, `Consents`, `Audit`).
   - Strict secret redaction: Zero passwords, MFA secrets, tokens, Stripe client secrets, or integration credentials may ever be included in exported bundles.
   - Encrypted at rest using AES-256-GCM with SHA-256 integrity checksums, accessed via signed, short-lived download tokens.

5. **Multi-Phase Controlled Deletion & Anonymization Workflow**:
   - Controlled deletion state machine with explicit planning (`PrivacyDeletionPlan` and `PrivacyDeletionItem`).
   - Actions split into: `DELETE` (ephemeral data, cached metrics), `ANONYMIZE` (member profile, attendance, workouts), `RETAIN` (statutory invoices, payment transactions, security logs with justification), and `RESTRICT` (isolated storage).
   - Reversible preview stage before irreversible execution. Irreversible pseudonymization of personal identifiers with deterministic/salted cryptographic tokens.

6. **Retention Governance & Legal/Audit Holds**:
   - `PrivacyRetentionHold` prevents deletion or retention purges during active litigation, regulatory inquiries, or audit investigations.
   - Statutory retention exemptions for financial records (7-10 years) and security audit trails (365+ days).

7. **AI & Wearable Privacy Boundaries**:
   - Integrate Day 19 AI Context Engine with `PrivacyAiPolicyService`: sanitize context windows, exclude prompt histories and private notes if consent is revoked or personalization is toggled off.
   - Wearables can be disconnected safely without deleting historical workout records unless explicitly requested by the member.

8. **Security & Day 52 Step-Up Auth Integration**:
   - Sensitive requests (data export download, account deletion, restriction requests) require Day 52 Step-Up authentication (`SecurityActionChallenge`).
   - Multi-tenant tenant boundaries strictly verified: members and admins are isolated within their `organisationId`.

## Consequences
- **Positive**:
  - Full compliance with Article 15 (Access), Article 17 (Erasure), Article 20 (Portability), and Article 7 (Consent Withdrawal) of GDPR, as well as CCPA consumer rights.
  - Zero disruption to existing billing, booking, or security audit pipelines.
  - Safe, auditable data handling with complete provenance in `SecurityEvent` and `AuditLog`.
  - Member empowerment through clear, human-readable mobile privacy controls.
- **Negative / Trade-offs**:
  - Exports and deletions cannot be instant synchronous operations; they require asynchronous job tracking to prevent database strain.
  - Anonymization requires careful foreign-key preservation to avoid breaking financial summaries and aggregated operational metrics.
