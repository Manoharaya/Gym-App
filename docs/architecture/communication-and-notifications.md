# FitCore Architecture — Communication & Notifications Foundation

## 1. Executive Summary

Day 17 implements the **Communication & Notifications Foundation** for FitCore. It establishes a multi-tenant, event-driven notification architecture supporting in-app alerts, mobile push notifications, transactional emails, and SMS alerts.

The system is strictly decoupled from domain logic. Notification records never become generic JSON blobs on existing business entities. Instead, domain events are intercepted by a centralized `NotificationOrchestrator`, verified against recipient preferences and legal consent, rendered through sandboxed templates, persisted with immutable content snapshots, and dispatched via an asynchronous queue with exponential backoff retries.

---

## 2. Domain Boundaries & Entity Architecture

```
[Domain Event]
  ├── Membership (Activated, Expiring)
  ├── Payment (Succeeded, Failed)
  ├── Booking (Confirmed, Cancelled, Waitlist Promoted)
  ├── Attendance (Checked In, No-Show)
  ├── Training (Workout Assigned, Completed, Goal Completed)
  └── PT Session (Approaching)
         │
         ▼
[NotificationOrchestrator]
  ├── 1. Recipient & Tenant Verification
  ├── 2. Consent Verification (Day 4 Canonical ConsentRecord)
  ├── 3. Notification Preferences & Quiet Hours Evaluation
  ├── 4. Template Resolution (Org Custom -> System Fallback)
  ├── 5. Safe Variable Rendering (Sandboxed Regex Substitution)
  ├── 6. Notification Snapshot Persistence (PostgreSQL)
  ├── 7. Channel Delivery Persistence (NotificationDelivery)
  └── 8. Asynchronous Queue Enqueue (Redis / In-Memory Fallback)
         │
         ▼
[NotificationDeliveryService]
  ├── InAppProvider (Local DB State)
  ├── PushProvider (FCM / APNS / Console Mock)
  ├── EmailProvider (SendGrid / SES / Console Mock)
  └── SmsProvider (Twilio / MessageBird / Console Mock)
```

### Entity Model

1. **`Notification`**:
   - Primary user alert record.
   - Belongs to `organisationId` and `recipientUserId`.
   - Stores immutable rendered `title`, `body`, and optional deep-linking `data`.
   - Status: `PENDING`, `SENT`, `DELIVERED`, `READ`, `FAILED`, `EXPIRED`, `CANCELLED`.
   - Read state tracked via `readAt`.

2. **`NotificationDelivery`**:
   - Channel-specific delivery state (`IN_APP`, `PUSH`, `EMAIL`, `SMS`).
   - Tracks `provider`, `providerMessageId`, `attemptCount`, `deliveredAt`, `failedAt`, `failureCode`, `failureReason`.
   - Decoupled from `Notification` to allow one alert to fan out across multiple channels simultaneously.

3. **`NotificationPreference`**:
   - User preference per organisation, category (`BOOKING`, `TRAINING`, `PAYMENT`, `MARKETING`, etc.), and channel.
   - Tracks `enabled`, `quietHoursStart`, `quietHoursEnd`, and `timezone`.
   - Transactional alerts (`SECURITY`, urgent payment/system) bypass non-essential opt-outs.

4. **`NotificationTemplate`**:
   - Template content versioning (`version + 1`).
   - Distinguishes System templates (`organisationId: null`, `isSystem: true`) from Organization templates (`organisationId: string`).
   - Enforces immutability: Organization admins cannot edit or delete FitCore system templates.

5. **`PushDevice`**:
   - Stores device push tokens (`userId`, `organisationId`, `deviceId`, `platform`, `pushToken`, `status`).
   - Supports multiple devices per user.
   - Masks raw tokens in user-facing endpoints to prevent credential leakage.

6. **`NotificationSchedule`**:
   - Stores future alerts and automated reminders (e.g. 24h, 2h, 30m before class).
   - Enforces idempotency via unique `idempotencyKey`.

---

## 3. Sandboxed Template Engine & Safe Variable Interpolation

To prevent Template Injection and arbitrary script execution:
- Templates use double curly braces: `{{path.property}}`.
- Substitution is performed through a deterministic regex evaluator: `/{{\s*([a-zA-Z0-9_.]+)\s*}}/g`.
- Variables are deep-resolved from an authorized payload dictionary.
- All values are HTML/entity-sanitized (`&`, `<`, `>`, `"`, `'`).
- Missing or undefined variables safely resolve to empty strings without throwing runtime errors.
- Never uses `eval()`, `Function()`, or external scripting runtimes.

---

## 4. Consent & Privacy Rules

### Canonical Consent Integration
- Marketing notifications strictly evaluate the member's canonical Day 4 `ConsentRecord`.
- If marketing consent is `DECLINED`, `WITHDRAWN`, or absent, marketing deliveries are immediately blocked with `MARKETING_CONSENT_WITHDRAWN_OR_MISSING`.
- Transactional notifications (billing invoices, fraud/security notices, facility safety alerts) are legally required and do not require marketing consent.

### Quiet Hours
- Quiet hours (e.g. 10:00 PM – 7:00 AM) are evaluated against the user's localized timezone.
- Mutes intrusive channels (`PUSH`, `SMS`) while preserving delivery to the in-app notification center.

---

## 5. Queue & Retry Architecture

- **Queue**: Redis-backed FIFO queue (`notification-delivery`, `notification-scheduled`, `notification-retry`) with in-memory resilient fallback.
- **Retries**: Exponential backoff with jitter (`Math.min(60000, 1000 * Math.pow(2, attemptCount))`).
- **Dead-Letter Limit**: Maximum 3 delivery attempts. On the 3rd failed attempt, the delivery is marked as `FAILED` and logged to the audit system.

---

## 6. Security & Tenant Isolation

- **Zero-Trust User Isolation**: All in-app notification queries filter by `where: { recipientUserId: user.id, organisationId }`. User A cannot view, mark as read, or delete User B's notifications under any circumstances (IDOR prevention).
- **Tenant Isolation**: Organisation A cannot inspect or dispatch notifications for Organisation B. System templates are globally accessible for read, but immutable for mutations.
- **Sensitive Data Minimization**: Notifications never transmit raw PAR-Q answers, medical clearances, private trainer notes, or full credit card numbers.
