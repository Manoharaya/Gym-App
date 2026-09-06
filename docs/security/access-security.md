# FitCore Physical Access Security & Compliance (Day 7)

## 1. Zero Sensitive Biometric / Secret Data

FitCore adheres strictly to physical security and privacy compliance standards:
- **No Raw Biometric Data**: FitCore servers, databases, and mobile clients never capture, store, or transmit raw fingerprints, facial geometry, or retinal templates. Only external hardware vendors' localized biometric matchers or anonymized badge IDs are referenced.
- **Zero Exposed Secrets**:
  - `AccessCredential.credentialHash` is stored as an irreversible SHA-256 hash.
  - Plaintext credential codes, card numbers, or cryptographic signing keys are never returned in public or member-facing APIs.
  - Mobile dynamic QR codes are generated with time-bounded, single-use HMAC signatures that rotate every 60 seconds.

---

## 2. Cross-Tenant Device & Physical Isolation

1. **Hardware Scoping**:
   - Every `AccessDevice` and `AccessPoint` is bound immutably to an `Organisation` and `Outlet`.
   - Access controllers sending webhook events (`/api/v1/access/devices/events`) validate the device token and ensure the device belongs exclusively to the claiming tenant.
   - Devices registered to Organisation B are blocked from submitting events for Organisation A with `401 Unauthorized` / `403 Forbidden`.
2. **Credential Isolation**:
   - Credentials issued by Organisation A will never unlock turnstiles or doors in Organisation B (`ORGANISATION_MISMATCH`).

---

## 3. Anti-IDOR & Member Ownership Protections

1. **Visit History Isolation**:
   - Members querying `/api/v1/access/visits` or `/api/v1/access/status` are strictly scoped to their own verified `memberProfileId`.
   - Any query parameter attempting to specify a different `memberProfileId` is discarded or rejected, preventing IDOR snooping on other members' attendance patterns.
2. **Staff-Only Operations**:
   - Staff manual check-in (`/api/v1/access/manual-checkin`), manual check-out (`/api/v1/access/manual-checkout`), and access overrides (`/api/v1/access/overrides`) require staff-level permissions (`access:MANUAL_CHECKIN`, `access:OVERRIDE`).
   - Ordinary member attempts are rejected with `403 Forbidden`.

---

## 4. Fail-Safe vs. Fail-Secure Defaults

- **Fail-Secure Access Gates**: In turnstiles and exterior entry doors, all network failures, unknown credentials, expired memberships, or offline device states resolve strictly to **`DENY`** (`allowed: false`).
- **Emergency Evacuation (Fire Alarms)**: Emergency egress is handled by dedicated life-safety hardware relays directly wired to turnstile drop-arms, completely independent of software cloud layers.

---

## 5. Role-Based Access Control (RBAC) Matrix

| Action | Super Admin | Org Owner | Outlet Manager | Reception | Trainer | Member |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Check Entry Rights** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Own) |
| **Physical Check-In** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Self QR) |
| **Physical Check-Out** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Self QR) |
| **Staff Manual Check-In** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Staff Manual Check-Out** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Grant Staff Override** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **View Facility Audit Logs** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **View Own Visit History** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Own) |
| **Manage Access Devices** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Manage Access Points** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Issue/Revoke Credentials** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
