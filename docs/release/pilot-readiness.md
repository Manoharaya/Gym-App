# FitCore v1.0 — Controlled Pilot Strategy & Readiness Plan

## 1. Pilot Phasing & Progression Gates

```
┌────────────────────────────────────────────────────────┐
│ Phase 1: Internal Staff Pilot (Week 1–2)               │
│ - FitCore team dogfooding on staging & dev instances   │
│ - Simulated member check-ins, bookings, and payments   │
└──────────────────────────┬─────────────────────────────┘
                           │ Gate: Zero P0/P1 defects
┌──────────────────────────▼─────────────────────────────┐
│ Phase 2: Single-Organisation Pilot (Week 3–4)          │
│ - Initial Gym: Second Wind Athletic Club (Perth CBD)   │
│ - Scope: 1 outlet, 250 pilot members, 5 trainers       │
│ - Dedicated Slack/Teams bridge with gym owners         │
└──────────────────────────┬─────────────────────────────┘
                           │ Gate: >= 99.5% uptime, <1% check-in latency > 100ms
┌──────────────────────────▼─────────────────────────────┐
│ Phase 3: Multi-Outlet Expansion (Week 5–6)             │
│ - Second Wind (Fremantle + Joondalup branches added)   │
│ - Second Pilot: Apex Strength (Cross-tenant validation)│
└──────────────────────────┬─────────────────────────────┘
                           │ Gate: Zero cross-tenant anomalies, 100% billing parity
┌──────────────────────────▼─────────────────────────────┐
│ Phase 4: General Availability (FitCore v1.0 GA)        │
│ - Open onboarding for commercial gym operators         │
└────────────────────────────────────────────────────────┘
```

---

## 2. Pilot Success Criteria
1. **Turnstile / Physical Access Reliability**: < 100ms latency on QR scan; 0 false rejections of valid members.
2. **Payment & Billing Accuracy**: Zero duplicate charges; 100% reconciliation match with Stripe ledger.
3. **Class Booking Concurrency**: Zero overbookings beyond maximum capacity limits.
4. **AI Safety & Accuracy**: 0 prompt injection breaches; 0 fabricated medical diagnoses or hallucinated class times.
5. **Customer Satisfaction**: CSAT >= 4.5/5 from pilot gym managers and staff.

---

## 3. Data Protection & Tenant Isolation Invariants
- Pilot gym data is isolated in production PostgreSQL under separate tenant records (`organisationId`).
- Test gym data is never intermingled with commercial pilot databases.
- GDPR privacy deletion requests (`Right to Be Forgotten`) execute within 24 hours during pilot.
