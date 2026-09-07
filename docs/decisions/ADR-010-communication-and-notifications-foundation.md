# ADR-010: Communication & Notifications Foundation Architecture

## Status
Accepted (Day 17)

## Context
FitCore requires a multi-tenant communication and notification engine supporting in-app notifications, mobile push notifications, transactional emails, and SMS alerts. Key requirements include:
1. Strict domain boundaries: Communication state must never be stored as arbitrary JSON blobs inside Member, Staff, Booking, Attendance, or Membership entities.
2. Canonical consent compliance: Marketing communications must strictly enforce Day 4 canonical consent, while transactional alerts bypass marketing opt-outs.
3. Historical immutability: Notifications must preserve the exact rendered content at the time of delivery, even if the underlying template or user profile is modified later.
4. Channel independence: A single logical notification event must be able to fan out across multiple distinct channels (e.g. IN_APP + PUSH + EMAIL) with independent delivery tracking and failure handling.
5. High security & zero trust: User A must never access User B's notifications, and organisation staff must not edit platform system templates.

## Decision
We implemented a decoupled **Domain Event -> Notification Orchestrator -> Channel Provider** pipeline:

1. **Decoupled Orchestration**:
   Domain events (`BOOKING_CONFIRMED`, `WAITLIST_PROMOTED`, `WORKOUT_ASSIGNED`, `PAYMENT_SUCCEEDED`, etc.) are consumed by `NotificationOrchestratorService`. The originating domain services do not import or know about email, push, or SMS providers.

2. **Multi-Delivery Architecture**:
   The primary `Notification` entity represents the user-facing alert (storing the rendered `title` and `body`). Related `NotificationDelivery` rows track delivery state (`PENDING`, `DELIVERED`, `FAILED`), attempt counts, provider message IDs, and error codes per channel.

3. **Sandboxed Template Engine**:
   Templates use deterministic regex interpolation (`{{path.property}}`) with deep path resolution and strict HTML escaping. Arbitrary code execution (`eval`) is strictly prohibited. System templates are immutable to organization users.

4. **Two-Tier Consent & Quiet Hours**:
   `NotificationPreferenceService` checks both explicit user preferences, quiet hours (HH:mm localized to user timezone), and canonical `ConsentRecord` status for marketing broadcasts.

5. **Asynchronous Queue with Resilient Fallback**:
   Deliveries are enqueued into a Redis-backed queue with automatic exponential backoff retries (maximum 3 attempts) and an in-memory fallback for local development and test reliability.

## Alternatives Considered

1. **Direct Provider Calls from Domain Services**:
   - *Rejected*: Would create tight coupling, duplicate preference and consent checks across every module, and cause HTTP request timeouts when external provider APIs experience latency.
2. **Dynamic Template Evaluation on Read**:
   - *Rejected*: If a gym changes its template or branding next month, all historical notifications in a member's notification centre would retroactively change, violating auditability.
3. **Single Channel Field on Notification Entity**:
   - *Rejected*: Inability to track multi-channel delivery (e.g., push succeeded, but email bounced) without overwriting status.

## Consequences

- **Positive**:
  - Full auditability: Exact message text and channel delivery timestamps are permanently preserved.
  - Zero-trust privacy: Notifications never contain raw PAR-Q answers, medical clearances, or credit card numbers.
  - Ready for future AI: Foundation is prepared for future AI Receptionist, AI Coach, and marketing automation without rewriting communication pipelines.
- **Negative / Trade-offs**:
  - Requires maintaining template seeds and versioning.
  - Multiple delivery rows per notification increase storage slightly, mitigated by database indexing.
