# FitCore Payment Security & Compliance (Day 6)

## 1. Zero Sensitive Card Data (PCI-DSS Scope Minimization)

FitCore adheres strictly to PCI-DSS Level 1 scope minimization:
- **No Primary Account Numbers (PAN)**, full credit card numbers, or card verification values (CVV/CVC) are ever received, processed, or persisted by FitCore servers or databases.
- Card entry is performed either client-side or through tokenization abstraction.
- The `payment_methods` table strictly stores token references (`providerPaymentMethodId`), card brands (e.g. `VISA`, `MASTERCARD`), truncated public last 4 digits (`last4`), and expiration dates (`expiryMonth`, `expiryYear`).

```sql
-- Schema verification of payment_methods
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payment_methods';
-- No cvc, cvv, or full pan columns exist.
```

---

## 2. Anti-IDOR (Insecure Direct Object Reference) Protection

All payment and invoice endpoints enforce strict multi-layer authorization:
1. **Tenant Isolation**: Requests must contain a valid active tenant context (`x-organisation-id`). Attempts to read or pay invoices belonging to other organisations are blocked with `403 Forbidden` by `TenantGuard`.
2. **Member Ownership Scoping**: Members querying `/invoices` or `/payments` are authoritatively scoped to their own `memberProfileId`.
3. **Cross-Member Payment Blocking**: If a member attempts to charge or pay an invoice on behalf of another member, `PaymentsController` blocks the request with `403 Forbidden` ("Cannot process payments on behalf of another member").

---

## 3. Idempotency & Financial Double-Charge Prevention

FitCore provides server-side transaction replay prevention via the `idempotency_records` table:
- Clients submit an `Idempotency-Key` header with payment requests.
- The system uniquely indexes `[organisationId, idempotencyKey]`.
- Identical requests within 24 hours return the cached response with `_isIdempotentReplay: true` without hitting payment gateways or creating duplicate financial ledger entries.

---

## 4. Webhook Integrity & Replay Deduplication

Payment gateways send asynchronous notifications (charges, disputes, settlement updates):
- **Signature Verification**: Webhooks verify HMAC signatures before payload inspection. Unsigned or invalid webhooks fail with `400 Bad Request`.
- **Deduplication Matrix**: Unique constraint `[provider, providerEventId]` in `payment_webhook_events`. Subsequent replay deliveries return `200 OK` with `status: 'IGNORED'`.

---

## 5. Role-Based Access Control (RBAC) Matrix

| Action | Super Admin | Org Owner | Finance | Outlet Manager | Reception | Trainer | Member |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Create Invoice** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **List All Org Invoices** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **View Own Invoices** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Own) |
| **Void Open Invoice** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Pay Own Invoices** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Own) |
| **Charge Member Card** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Record Cash/POS Payment**| ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Issue Refunds** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Manage Payment Methods** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ (Own) |
| **Manage Discount Codes** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
