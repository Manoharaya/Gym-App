# Controlled Data Deletion Workflow

## 1. Flow & Invariants
$$\text{MEMBER REQUEST} \longrightarrow \text{IDENTITY VERIFICATION} \longrightarrow \text{AUTHORIZATION} \longrightarrow \text{IMPACT ANALYSIS} \longrightarrow \text{HOLD CHECK} \longrightarrow \text{DELETION PLAN} \longrightarrow \text{EXECUTION} \longrightarrow \text{AUDIT}$$

**Never direct database delete**: Requests never execute a raw `DELETE FROM users`. Instead, an explicit `PrivacyDeletionPlan` is compiled.

## 2. Multi-Domain Strategy
Each domain declares an explicit strategy:
- **PROFILE**: Irreversibly anonymized. Direct identifiers (email, name, phone, photo) are replaced with cryptographic pseudonyms. `deletedAt` is recorded.
- **HEALTH**: Deleted (screenings, injuries, clearances) unless an active legal hold requires retention.
- **WEARABLES**: Biometric records deleted. Provider connections disconnected and credentials revoked.
- **TRAINING & NUTRITION**: Workout logs, body measurements, personal records, and meal entries deleted.
- **AI**: Conversational history and coaching context deleted.
- **PAYMENTS & FINANCIAL**: **RETAINED** with reason `LEGAL_TAX_ACCOUNTING_REQUIREMENT` (7-year statutory retention).
- **AUDIT & SECURITY**: **RETAINED** with reason `LEGAL_AUDIT_TELEMETRY_REQUIREMENT`.
