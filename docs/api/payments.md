# FitCore Payment & Billing API Reference (Day 6)

## Base URL
`/api/v1`

## Standard Headers
- `Authorization`: `Bearer <jwt_token>`
- `x-organisation-id`: `<organisation_id>`
- `idempotency-key`: `<unique_request_uuid>` (optional for charges)

---

## 1. Invoices API

### Create Invoice
- **Endpoint**: `POST /invoices`
- **Roles**: `ORGANISATION_OWNER`, `FINANCE`
- **Request Body**:
```json
{
  "memberProfileId": "prof_123",
  "currency": "AUD",
  "discountCode": "WELCOME10",
  "taxRatePercentage": 10,
  "items": [
    {
      "description": "Second Wind Premium Monthly Membership",
      "quantity": 1,
      "unitAmountMinor": 11999,
      "memberMembershipId": "mm_abc"
    }
  ]
}
```
- **Response**: `201 Created` with calculated `subtotalMinor`, `discountMinor`, `taxMinor`, `totalMinor`, `amountDueMinor: 11999`, and status `OPEN`.

### List Invoices
- **Endpoint**: `GET /invoices`
- **Query Params**: `memberProfileId`, `status`, `skip`, `take`
- **Roles**: Staff/Finance lists org invoices; Member lists own invoices.

### Get Invoice by ID
- **Endpoint**: `GET /invoices/:id`
- **Response**: `200 OK` with line items and linked payment transactions.

### Void Invoice
- **Endpoint**: `POST /invoices/:id/void`
- **Roles**: `ORGANISATION_OWNER`, `FINANCE`
- **Body**: `{ "reason": "Issued in error" }`

### Member Self-Service Invoices
- `GET /members/me/invoices`: Returns logged-in member's invoices.
- `GET /members/me/invoices/:id`: Returns member's invoice details.

---

## 2. Payments & Transactions API

### Process Online Charge
- **Endpoint**: `POST /payments/charge`
- **Headers**: `idempotency-key: <uuid>` (recommended)
- **Request Body**:
```json
{
  "memberProfileId": "prof_123",
  "invoiceId": "inv_123",
  "amountMinor": 11999,
  "currency": "AUD",
  "paymentMethodId": "pm_123",
  "provider": "MOCK"
}
```
- **Response**: `201 Created` with `status: "SUCCEEDED"`.
- **Side Effect**: Marks invoice `PAID`, triggers `PaymentMembershipBridge.onInvoicePaid()`.

### Record Manual Payment (Cash / POS)
- **Endpoint**: `POST /payments/manual`
- **Roles**: Staff, Reception, Finance, Org Owner
- **Request Body**:
```json
{
  "memberProfileId": "prof_123",
  "invoiceId": "inv_123",
  "amountMinor": 1500,
  "currency": "AUD",
  "paymentMethodType": "MANUAL_CASH",
  "notes": "Paid cash at front reception desk"
}
```

### Process Refund
- **Endpoint**: `POST /payments/refund`
- **Roles**: `ORGANISATION_OWNER`, `FINANCE`
- **Request Body**:
```json
{
  "paymentTransactionId": "tx_123",
  "amountMinor": 3000,
  "reason": "Customer cancellation"
}
```
- **Response**: `201 Created` with refund record. Updates transaction status to `PARTIALLY_REFUNDED` or `REFUNDED`. Reopens linked invoice.

### List Transactions
- `GET /payments`: List transactions.
- `GET /payments/:id`: Get transaction receipt details.
- `GET /members/me/payments`: Member self-service transaction history.
- `GET /members/me/payments/:id`: Member self-service receipt details.

---

## 3. Tokenized Payment Methods API

- `GET /payment-methods`: List saved payment methods.
- `POST /payment-methods`: Add tokenized card (`providerPaymentMethodId`, `brand`, `last4`, `expiryMonth`, `expiryYear`).
- `PATCH /payment-methods/:id/default`: Set default payment method.
- `DELETE /payment-methods/:id`: Remove / deactivate payment method.

---

## 4. Webhooks API (Public)

- **Endpoint**: `POST /webhooks/:provider`
- **Auth**: Public (signature verified via headers).
- **Headers**: `x-fitcore-signature`
- **Response**: `200 OK` `{ "status": "PROCESSED" }` or `{ "status": "IGNORED" }` on replay.
