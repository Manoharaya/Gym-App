# FitCore v1.0.0-rc.1 — Official Release Notes

## Executive Overview
FitCore announces the official release of **FitCore v1.0.0-rc.1**, the unified multi-tenant gym management, intelligence, physical access, recurring billing, and AI automation platform. Built systematically over 60 focused engineering days, FitCore v1.0 provides gym chains, boutique fitness clubs, and multi-outlet enterprises with an end-to-end operating system.

---

## Capabilities & Feature Highlights

### 1. Platform & Multi-Tenancy
- Complete physical and logical tenant boundary enforcement across all database queries, cache keys, and API routes.
- Hierarchical organisation and outlet scoping with sub-branch inheritance.
- Dual-token JWT session management with automated refresh token rotation and family revocation on compromise detection.

### 2. Member Experience
- Frictionless digital onboarding with versioned consent agreements, PAR-Q health screening, and injury tracking.
- Interactive membership self-service, plan upgrades, and automated digital receipts.
- Dynamic physical access QR credentials with sub-100ms validation and offline reader support.
- Class discovery, instant reservations, automated waitlist promotions, and cancellation management.
- Comprehensive workout logging, exercise library with video demonstrations, and body composition analytics.

### 3. Staff & Trainer Experience
- Trainer portal with 1-on-1 client management, workout programming, and session attendance tracking.
- Reception point-of-sale, walk-in check-in, and emergency medical contact lookup.
- Role-based views for Outlet Managers, Receptionists, Trainers, and Finance Directors.

### 4. AI Workforce
- **AI Fitness Coach**: Personalized workout programming tailored to member recovery and goals.
- **AI Nutrition Coach**: Intelligent meal planning, dietary restriction tagging, and macro targets.
- **AI Daily Check-In**: Conversational readiness scoring evaluating sleep, soreness, and fatigue.
- **AI Receptionist**: Conversational web and phone booking assistant routing enquiries to real class schedules.
- **AI Sales Agent**: Autonomous lead qualification, discovery questioning, and tour scheduling.
- **AI Finance Assistant**: Natural language financial analysis and revenue forecasting.

### 5. Sales & CRM
- Multi-stage visual sales pipeline tracking leads from capture through tour, offer, and conversion.
- Automated multi-touch follow-up sequences with intelligent opt-out suppression.
- Conversion tracking anchored strictly in authoritative payment and membership activation events.

### 6. Finance & Recurring Billing
- Automated recurring billing cycles with pro-rated plan changes and multi-day dunning retries.
- Authoritative invoice generation with Stripe payment processing and replay-safe webhooks.
- Financial Intelligence dashboard with MRR, ARR, cohort retention, and churn metrics.
- Seamless bi-directional synchronization with Xero and Intuit QuickBooks Online.

### 7. Business Intelligence & Multi-Outlet Analytics
- Cross-outlet comparative benchmarking, peak hour utilization heatmaps, and capacity bottleneck prediction.
- Timezone-safe analytics aggregation with localized display.

### 8. Integrations & Developer Platform
- Public REST API with environment-specific API keys (`fc_live_...`, `fc_test_...`) and OAuth 2.0 PKCE.
- Webhook dispatch engine with HMAC-SHA256 signatures, retry policies, and fortified SSRF defenses.
- App Marketplace directory with granular permission scoping for third-party extensions.

### 9. Security, Privacy & Enterprise
- Enterprise defensive HTTP security headers (`nosniff`, `DENY`, 1-year HSTS, CSP).
- Multi-factor authentication (TOTP via AES-256-GCM encrypted secrets + hashed single-use recovery codes).
- GDPR & Privacy Compliance Center with self-service data export, consent management, and Right to Be Forgotten deletion tombstones.

### 10. Observability, Performance & Disaster Recovery
- Prometheus metrics registry, structured correlation-ID logging, and real-time alert dispatch.
- Benchmark API latencies: p50 12ms, p95 48ms, p99 98ms.
- KMS-encrypted database backups with automated SHA-256 integrity verification and tested 18-second sandbox restore drills.
