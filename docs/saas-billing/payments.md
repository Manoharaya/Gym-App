# Payments & Payment Method Management

Handling payment collection, methods, and credentials safely.

## Credential Isolation
FitCore never stores raw card numbers, CVVs, or sensitive banking credentials in the database.
- `SaasBillingCustomer` stores only the external provider reference (e.g. `cus_saas_...`) along with non-sensitive display metadata (`paymentMethodLast4`, `paymentMethodBrand`, `paymentMethodExpiry`).
- Payment collection delegates directly to `SaasBillingProvider`.

## Statuses
- `SUCCEEDED`: Payment settled successfully.
- `PENDING` / `PROCESSING`: In-flight settlement.
- `REQUIRES_ACTION`: 3D Secure / SCA step-up required by customer's bank.
- `FAILED`: Payment rejected (insufficient funds, expired card, network error).
