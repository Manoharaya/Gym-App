# ADR 016: Wearables Integration Foundation & Health Data Synchronization Architecture

## Status
Accepted (Day 23)

## Context
On Day 23, FitCore implements the **Wearables Integration Foundation & Health Data Synchronization** platform. This system integrates commercial health and fitness tracking ecosystems (Apple Health, Google Health Connect, Fitbit) into the FitCore platform.

### Core Architectural Drivers
1. **Member-Owned Health Data Boundary**: Wearable data is personal biometric telemetry belonging to the individual Member, NOT to a gym outlet, club, personal trainer, or gym membership. If a member changes gyms, cancels their membership, or changes trainers, their personal health telemetry remains member-owned and fully intact.
2. **Provider-Neutral Abstraction**: Different wearable providers expose radically different authentication models (native iOS HealthKit framework, Android Health Connect Jetpack SDK, OAuth 2.0 Web APIs like Fitbit and Garmin). The core domain must remain completely decoupled from provider-specific protocols.
3. **Phased Wave Delivery**:
   - **Wave 1 (Active)**: Apple Health / HealthKit, Google Health Connect, Fitbit.
   - **Wave 2 (Architecture Ready, Disabled Extension Points)**: Garmin Connect, WHOOP, Oura Ring.
4. **Strict Token Security & Secret Protection**: OAuth access and refresh tokens must never reside in plain text within database tables, audit logs, or API responses.
5. **Idempotency, Normalization, & Deduplication**: Wearable devices sync intermittently, frequently re-transmitting overlapping windows. The system must eliminate duplicates deterministically and normalize diverse units to canonical FitCore units.
6. **Scoped Trainer Access & Day 4 Compliance**: Personal trainers must only view high-level aggregated activity summaries for active assigned clients (`TrainerClientAssignment`). Raw sensor timestamps and continuous telemetry feeds must NEVER be accessible to gym staff or trainers.
7. **Day 49 Privacy Centre Foundation**: Members must have self-service transparency into held categories, active consent records (`WEARABLE_DATA`), and full self-service data deletion capabilities.
8. **Day 23 Integration Boundary**: Strictly data ingestion and integration today. **NO AI wearable intelligence, NO AI recovery scoring, and NO medical diagnosis** are implemented today.

---

## Decision

### 1. Domain Modeling & Member Ownership
- Health data is modeled as `WearableConnection` and `HealthDataRecord` tied directly to `memberId` and `organisationId`.
- The composite key `@@unique([memberId, provider])` on `WearableConnection` guarantees a member has at most one connection per provider.
- `HealthDataRecord` enforces deterministic deduplication via `@@unique([connectionId, dataType, sourceRecordId])` and SHA-256 fingerprinting.

### 2. Provider Registry & Wave Capabilities (`WearableCapabilitiesRegistry`)
- `IWearableProvider` defines the neutral contract (`getCapabilities()`, `authorize()`, `revokeAuthorization()`, `fetchData()`).
- The capabilities registry classifies providers into `Wave 1` (Active: Apple Health, Google Health Connect, Fitbit) and `Wave 2` (Disabled: Garmin, WHOOP, Oura).
- Attempting to connect a Wave 2 provider throws `BadRequestException` with guidance regarding Wave 2 availability.

### 3. Token Encryption & Cryptographic Isolation (`TokenEncryptionService`)
- All provider secrets (`accessToken`, `refreshToken`) are encrypted using **AES-256-GCM authenticated encryption**.
- A cryptographically random 16-byte IV is generated per token and stored alongside the ciphertext and 16-byte authentication tag in the format `iv:authTag:ciphertext`.
- API endpoints never return access tokens or refresh tokens in DTO payloads.

### 4. Canonical Unit Normalization & Validation
- Canonical Units:
  - `STEPS`: `steps` (integer >= 0)
  - `DISTANCE`: `km` (converted from m, mi, km)
  - `ACTIVE_CALORIES`: `kcal` (converted from cal, kj, kcal)
  - `HEART_RATE`: `bpm` (clamped to physiological bounds 25–260 bpm)
  - `RESTING_HEART_RATE`: `bpm`
  - `SLEEP`: `minutes` (converted from hours, minutes, seconds)
  - `WORKOUT`: `count`
- `HealthDataValidator` rejects invalid data types, non-numeric values, negative steps/calories/distances, and future timestamps exceeding a 15-minute clock drift threshold.

### 5. Idempotent Synchronization Engine (`WearableSyncService`)
- Supports both **device-forwarded client batches** (iOS HealthKit / Android Health Connect) and **provider pull sync** (Fitbit).
- Normalizes incoming payloads, enforces data validation, computes SHA-256 fingerprints, and performs duplicate checks before persisting records.
- Records a complete audit trail in `WearableSyncLog` capturing duration, record counts, and errors.
- Stores raw debug payloads in `WearableRawData` with AES-256 encryption and a 7-day automatic retention expiry.

### 6. Scoped Trainer Visibility (`WearableTrainerService`)
- Trainers can only view summarized telemetry for members where `TrainerClientAssignment` is `ACTIVE`.
- Unassigned staff or cross-organization trainers are rejected with `403 Forbidden`.
- The returned `WearableTrainerClientSummaryDto` contains strictly weekly averages and today's high-level totals. Raw telemetry streams, GPS data, and sensor timestamps are omitted by design.

### 7. Self-Service Privacy View & Deletion (`WearablePrivacyService`, `WearableDataDeletionService`)
- `GET /api/v1/wearables/privacy` provides full transparency into held categories, active Day 4 `WEARABLE_DATA` compliance status, and trainer visibility rules.
- `DELETE /api/v1/wearables/data` provides self-service data deletion (single connection, provider-specific, or full member wearable data purge).

### 8. AI Platform Context Extension
- Added `'WEARABLE_HEALTH_DATA'` to `AIContextSource`.
- Updated `AIContextPermissionService`, `AIContextEngineService`, and `SensitiveDataSanitizerService` to securely inject high-level wearable metrics into member AI context only when `WEARABLE_DATA` consent is active.

---

## Consequences

### Positive
- **Guaranteed Member Privacy**: Zero exposure of raw sensor logs to trainers or gym staff; health data belongs solely to the member.
- **Robust Against Retries & Mobile Intermittency**: Idempotent deduplication handles network retries and duplicate mobile uploads seamlessly.
- **Future-Proof Extensibility**: Wave 2 providers (Garmin, WHOOP, Oura) can be enabled with zero schema modifications.
- **Enterprise-Grade Compliance**: AES-256-GCM encryption, Day 4 consent verification, and GDPR/CCPA self-service data deletion readiness.

### Negative & Mitigations
- **Battery & Sync Latency**: Frequent background sync on mobile can impact battery life. *Mitigation: Default sync window of 7 days on initial connect, sliding incremental windows with rate limiting on mobile clients.*
- **Storage Growth**: Telemetry records grow rapidly over time. *Mitigation: 7-day TTL on raw payloads (`WearableRawData`), structured daily summaries, and tenant-scoped archival indexing.*
