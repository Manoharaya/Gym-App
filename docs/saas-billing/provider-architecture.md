# Provider Architecture & Resilience

Provider abstraction decoupling FitCore from specific payment gateways.

## Adapter Interface: `ISaasBillingProvider`
Capabilities:
- `createCustomer(request)`
- `createSubscription(request)`
- `cancelSubscription(providerSubscriptionReference, immediate)`
- `collectInvoicePayment(request)`
- `verifyWebhook(headers, rawBody)`

## Outage Handling
If a third-party payment gateway experiences downtime or transient errors:
1. Invoices are placed in `OPEN` status with scheduled background retry.
2. Organisations are not falsely suspended during provider outages.
3. Idempotent webhook verification buffers events safely.
