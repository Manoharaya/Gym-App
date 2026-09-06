# ADR-006: Physical Access, Check-In/Check-Out & Door Access Foundation

## Status
Accepted

## Context
FitCore is an enterprise multi-tenant fitness SaaS supporting multi-outlet gym networks.
A critical architectural boundary exists between member relational assignments, commercial contracts, financial transactions, and physical facility entry:
1. `MemberOutlet` reflects where a member originally joined or prefers to train. It is purely administrative and MUST NOT grant physical door access.
2. Financial payments (`PaymentTransaction`) verify money received, but NEVER directly unlock doors. Physical access requires an `ACTIVE` `MemberMembership`.
3. Gyms utilize varied access hardware (turnstiles, RFID/NFC readers, smart doors, dynamic QR scanners). The core domain must remain completely hardware-vendor agnostic.
4. Security demands zero fail-open defaults, dynamic non-replayable credentials (HMAC QR rotation), strict cross-tenant device isolation, duplicate scan suppression, and auditable staff overrides.

## Decisions

### 1. Separation of Concerns & Invariants
- **Relational vs. Physical Access**: `MemberOutlet` is purely relational. Physical access authority is derived exclusively from active `MemberMembership` and its `MembershipAccessScope`.
- **Payment vs. Physical Access**: `PaymentTransaction == SUCCEEDED` does NOT grant door entry; only the resulting `ACTIVE` membership state does.
- **Single Decision Authority**: `AccessDecisionService.canAccess()` is the single centralized authority for evaluating entry/exit rights.
- **Fail-Safe Defaults**: Any unknown, ambiguous, or error condition strictly resolves to `DENY` (`allowed: false`).

### 2. Provider-Agnostic Access Hardware Abstraction
- Defined `IAccessDeviceProvider` contract with operations:
  - `unlockDoor(deviceId, durationMs, accessEventId)`
  - `lockDoor(deviceId)`
  - `getDeviceStatus(deviceId)`
  - `pingDevice(deviceId)`
- Implemented `MockAccessDeviceProvider` for local and automated testing. Production hardware integrations (Axis, Hikvision, Paxton, Salto, Gallagher, STid) will plug into this interface without domain refactoring.

### 3. Rotating Dynamic Credentials
- Replaced static barcode/QR passes with dynamic HMAC-SHA256 signed QR codes with a 60-second TTL.
- Raw biometric data and encryption master keys are strictly prohibited in the API and mobile layers.
- Credentials support RFID/NFC fobs, dynamic QR, BLE mobile keys, and PIN codes.

### 4. Idempotency & Duplicate Scan Suppression
- Check-in requests require idempotency tracking (`deviceId + deviceEventId` or credential cooldown).
- Rapid duplicate scans within 5 seconds return the existing check-in result without generating duplicate database records or skewing analytics.

### 5. Staff Access Overrides
- Reception staff and managers can issue temporary, time-bounded (max 24 hours) `AccessOverride` records with mandatory justification reasons (`MANAGER_APPROVAL`, `FORGOT_PASS`, `VIP_GUEST`, etc.).
- Active overrides take precedence over suspended memberships, ensuring emergency facility operations while maintaining an immutable audit log.

## Consequences

### Positive
- Strict tenant and physical isolation across multi-location franchises.
- Total freedom to switch hardware vendors across turnstiles, barriers, and smart locks.
- Complete audit trail of every entry attempt (allowed or denied) in `AccessEvent`.
- Eliminates pass-sharing and screen-grab fraud via dynamic QR rotation.

### Negative
- Turnstiles require network connectivity to verify dynamic credentials via API or edge gateway caching.
- Dynamic QR requires active device clock synchronization.
