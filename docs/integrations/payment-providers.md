# Payment Integration Architecture

## Overview
FitCore provides a unified payment abstraction consolidating Day 6 payment rails (Stripe, Esewa, Khalti) into the Day 48 Integration Platform.

```text
FitCore Billing / POS
         ↓
Payment Integration Service
         ↓
PaymentProviderAdapter (Stripe / Esewa / Khalti)
         ↓
External Gateway API
```

---

## Supported Providers & Features

| Provider | Capabilities | Authentication | Webhooks |
|----------|--------------|----------------|----------|
| **Stripe** | Invoicing, Charges, Cards, Customer Vault, Subscriptions | API Secret Key / Restricted Key | `stripe-signature` HMAC-SHA256 |
| **Esewa** | Nepal Digital Wallet, QR Payments, Verification | Merchant Code & Secret Key | MD5 / SHA256 Signature Query |
| **Khalti** | Nepal Digital Wallet, Khalti e-Banking | Secret Key & Public Key | SHA256 Webhook Callbacks |

---

## Inbound Webhook Handling

External payment events (`payment_intent.succeeded`, `charge.refunded`, `invoice.payment_failed`) are ingested through the central webhook receiver:
`POST /api/v1/integrations/webhooks/:provider`

* **Stripe**: Verified via Stripe Webhook Secret (`stripe.webhooks.constructEvent`).
* **Esewa**: Verified against transaction status validation endpoint.
* **Khalti**: Verified via transaction confirmation lookup.

All webhooks emit normalized internal domain events (`PAYMENT_RECEIVED`, `REFUND_ISSUED`) consumed by FitCore's Billing Engine. Zero direct gateway dependencies exist inside the Core Billing service.
