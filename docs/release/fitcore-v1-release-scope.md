# FitCore v1.0 — Release Scope & Capability Classification

## 1. Scope Governance
A capability is designated **INCLUDED** in FitCore v1.0.0-rc.1 if and only if it satisfies the full lifecycle criterion:
`UI + API + Database + Authorization + Business Rules + Error Handling + Audit + Observability + Testing + Documentation`

---

## 2. Capability Classifications

### 2.1 INCLUDED (Release-Ready & Certified)
The following capabilities are fully implemented, end-to-end verified with automated regression tests, and certified for production use:
- **Core Multi-Tenancy**: Organization and multi-outlet partition, tenant isolation guards, and header spoofing defense.
- **Identity & Authentication**: Argon2/Bcrypt hashing, dual JWT token architecture, token rotation, session revocation, and 5-failure lockout defense.
- **Role-Based Access Control**: 7 platform roles (`SUPERADMIN`, `ORGANISATION_OWNER`, `OUTLET_MANAGER`, `RECEPTION`, `TRAINER`, `FINANCE`, `MEMBER`) with server-side validation.
- **Member Management & Onboarding**: Profile, emergency contacts, medical screening, PAR-Q questionnaires, and versioned consent logs.
- **Membership & Access**: Plan configuration, intervals, multi-outlet access rules, turnstile QR access credentials, and offline policy caching.
- **Class Booking & Scheduling**: Class templates, recurring session generation, capacity ceilings, waitlist automation, and attendance check-in.
- **Personal Training & Workouts**: Exercise library, custom workout builder, set/rep tracking, and body metric progress logs.
- **Nutrition**: Macro targets, dietary tags, preference/allergy separation, and meal plan templates.
- **AI Platform Core**: Prompt framing, untrusted input boundary encapsulation, prompt injection defense, output sanitization, and strict domain service routing (zero raw SQL).
- **AI Coaches & Daily Check-In**: AI Fitness Coach, AI Nutrition Coach, and Conversational Daily Readiness Check-In.
- **CRM & Sales Pipeline**: Lead capture, qualification status, opportunity pipeline, and automated multi-touch follow-up sequences.
- **Recurring Billing & Financial Intelligence**: Gym membership recurring billing, invoice generation, Stripe payment idempotency, and MRR/ARR analytics.
- **FitCore SaaS Billing**: Complete architectural separation of gym member billing from FitCore platform billing (subscriptions, plan tiers, usage limits, metering).
- **Observability**: Prometheus metrics registry, structured logging with correlation IDs, health probes, and alert engine.
- **Disaster Recovery**: KMS AES-256-GCM encrypted database dumps, SHA-256 integrity verification, automated sandbox restore drill, and non-destructive audits.
- **Platform Security Hardening**: Strict defensive HTTP headers (`nosniff`, `DENY`, `HSTS`, `CSP`), SSRF hardening against non-standard IP notations and metadata endpoints.

---

### 2.2 CONDITIONAL (Implemented, Dependent on External Credentials)
The following capabilities are fully implemented in code and verified with sandbox/mock adapters, but require customer-provided production credentials for live activation:
- **Stripe Live Processing**: Requires live Stripe API keys and configured webhook endpoints.
- **Xero & QuickBooks Accounting Synchronization**: Requires production OAuth 2.0 app registrations and tenant authorization tokens.
- **Twilio Voice Receptionist**: WebRTC and PSTN phone integration requires provisioned Twilio phone numbers and SIP trunking.
- **Wearables Sync (Apple Health, Garmin, Whoop, Fitbit)**: Requires developer partner credentials and member OAuth consent.
- **Email/SMS Notifications (SendGrid, Twilio SMS)**: Requires authenticated sender domains and provider API tokens.

---

### 2.3 NOT READY (Deferred from Core Marketing)
The following features are partially stubbed or prototyped and are **strictly excluded** from release marketing claims:
- **Autonomous Unsupervised AI Financial Mutations**: AI proposing refunds or price changes without explicit human staff confirmation.
- **Multi-Region Automated Zero-Downtime Database Failover**: Relies on documented manual replica promotion runbooks rather than automated cross-cloud orchestration.

---

### 2.4 FUTURE (Post-v1.0 Roadmap)
- **Computer Vision Form Analysis**: Real-time camera-based exercise form feedback.
- **Multi-Language Speech Translation for Voice Receptionist**: Real-time cross-lingual telephony translation.
- **Decentralized Gym Roaming Network**: Cross-organisation peer federation across independent gym chains.
