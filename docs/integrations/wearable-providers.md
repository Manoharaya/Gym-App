# Wearables & IoT Integration Architecture

## Overview
FitCore enables gym members to connect their personal health and fitness devices to sync workouts, heart rates, daily active calories, and steps, consolidating Day 23 wearable capabilities into the central multi-scope integration architecture.

---

## Scope & Consent Model

Unlike organisation-level integrations, Wearables are strictly **MEMBER**-scoped:
* `scope`: `MEMBER`
* `memberId`: Authenticated member's UUID
* `tenant`: Bound to member's organisation and outlet
* Health Data Consent: Explicit member consent captured during OAuth 2.0 grant.
* Revocation: Member can disconnect at any time from the FitCore mobile app, instantly wiping access tokens.

---

## Supported Providers

| Provider | Scope | Auth Mechanism | Capabilities |
|----------|-------|----------------|--------------|
| **Apple Health** | MEMBER | HealthKit Bridge / Local Sync | Workouts, Steps, Active Energy, Heart Rate Samples |
| **Google Fit / Health Connect** | MEMBER | OAuth 2.0 PKCE / Android Health Connect | Activity Sessions, Step Count, Sleep Stages |
| **Fitbit** | MEMBER | OAuth 2.0 PKCE | Intraday Heart Rate, Logged Workouts, Sleep Scores |
| **Garmin** | MEMBER | OAuth 1.0a / OAuth 2.0 | Activity Summaries, Respiration, Training Readiness |
| **Whoop** | MEMBER | OAuth 2.0 | Strain Score, Recovery Percentage, Sleep Performance |

---

## Data Privacy & GDPR/HIPAA Boundary

Health metrics ingested through the integration platform:
1. Are marked as Sensitive Personal Data.
2. Are isolated from billing, POS, and accounting synchronization streams.
3. Are never exported to third-party general ledgers or customer support logs.
