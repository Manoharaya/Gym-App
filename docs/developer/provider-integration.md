# FitCore Provider Integration Architecture (Day 48 Bridge)

## 1. Overview
The Developer Platform builds upon the foundation established in **Day 48: External Integration Architecture**:

```text
External System / Third-Party Partner
      ↓ (HTTPS + API Key / OAuth)
Developer Public API (/api/v1/public/*)
      ↓ (Rate Limiting, Scope Auth, Tenant Resolution)
FitCore Domain Services (BookingService, MemberService)
      ↓
Day 48 Integration Platform (Stripe, Xero, Twilio, Access Control)
```

## 2. Inbound vs Outbound Data Flow
- **Inbound (Public API)**: Authorised external systems query member directories, reserve spots in classes, and inspect attendance via `/api/v1/public/*`.
- **Outbound (Webhooks)**: FitCore pushes real-time events (`booking.created`, `attendance.checked_in`) to partner webhooks, signed with HMAC-SHA256.
- **Bi-directional Sync**: Day 48 Integration Adapters run scheduled synchronization jobs while emitting webhook updates consumed by developer applications.
