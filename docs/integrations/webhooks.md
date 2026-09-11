# Inbound Webhook Pipeline & Idempotency Architecture

## Overview

The FitCore Integrations Platform provides a standardized, secure webhook ingestion engine exposed under:

```http
POST /api/v1/integrations/webhooks/:provider
```

---

## 1. Webhook Pipeline Stages

Every inbound webhook traverses an 8-stage verification and processing pipeline:

```text
1. REQUEST ARRIVAL
      ↓
2. PROVIDER IDENTIFICATION
      ↓
3. CRYPTOGRAPHIC SIGNATURE VERIFICATION
   (Validates HMAC SHA-256 header using provider secret; rejects spoofing with 401)
      ↓
4. EVENT ID & TYPE EXTRACTION
   (Extracts unique providerEventId, e.g. evt_stripe_*, MessageSid, etc.)
      ↓
5. IDEMPOTENCY CHECK
   (Queries integration_webhook_events by unique [provider, externalEventId])
      ↓
   [Already Exists?] ─── YES ───> Return 200 OK with status: DUPLICATE (Skip side-effects)
      ↓ NO
6. EVENT NORMALIZATION
   (Maps vendor-specific event into canonical FitCore type: PAYMENT_SUCCEEDED, INVOICE_PAID, etc.)
      ↓
7. EVENT PERSISTENCE
   (Stores raw payload and hash in integration_webhook_events with status PROCESSED)
      ↓
8. DOMAIN DISPATCH & TRANSACTION RECONCILIATION
```

---

## 2. Webhook Idempotency Guarantee

Third-party webhooks frequently retry delivery during temporary network delays or 5xx responses. If an event is delivered multiple times, the FitCore Integrations Platform guarantees:

1. **No Duplicate Charges**: `PAYMENT_SUCCEEDED` events will never create duplicate ledger or payment transaction records.
2. **No Duplicate Invoices**: `INVOICE_CREATED` events will not create multiple invoices.
3. **No Duplicate SMS/Alerts**: Message receipts will update existing delivery records without duplicate notifications.
4. **Idempotent 200 OK Response**: Duplicate arrivals return:
   ```json
   {
     "received": true,
     "duplicate": true,
     "eventId": "cmtwjy...",
     "provider": "STRIPE",
     "status": "DUPLICATE",
     "normalizedType": "PAYMENT_SUCCEEDED",
     "message": "Event was previously received and processed. Duplicate ignored safely."
   }
   ```
