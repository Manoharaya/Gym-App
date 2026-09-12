# 13 — Synthetic Monitoring

## Synthetic Canary Probes
FitCore runs scheduled synthetic transactions across international points of presence (US East, EU West, AP Southeast):

1. **Member Login Flow**: Submits mock member credentials, verifies JWT issuance, and checks profile fetch latency (< 250ms).
2. **Class Booking Flow**: Reserves a dedicated synthetic dummy class slot, verifies database reservation locks, and cancels the reservation.
3. **Turnstile Door Check Flow**: Simulates an access token barcode scan at an outlet turnstile reader to verify access decision latency (< 50ms).
4. **Stripe Webhook Ping**: Issues signed mock webhook events to ensure signature validation and idempotency handling succeed.

## Detection Value
Synthetic monitoring catches network routing degradations, DNS failures, and third-party SSL expirations before actual gym members encounter issues.
