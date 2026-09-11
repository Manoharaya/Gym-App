# Marketplace Installations & Lifecycle Management

## 1. Installation Scopes
* **`ORGANISATION`**: Accessible across all physical locations and digital touchpoints within the gym organisation.
* **`OUTLET`**: Bound strictly to a single physical gym facility (e.g. on-premise turnstile gate controllers, local physiotherapy rooms).

## 2. Finite State Machine
```
   [Install]
       │
       ▼
   ┌─────────┐      Pause       ┌─────────┐
   │ ACTIVE  │ ───────────────> │ PAUSED  │
   │         │ <─────────────── │         │
   └────┬────┘      Resume      └─────────┘
        │
        ├───────── Upgrade ──────> [ UPGRADING ] ──> [ ACTIVE ]
        │
        ▼
   [Uninstall]
        │
        ▼
  ┌─────────────┐
  │ UNINSTALLED │  (All permission grants revoked immediately)
  └─────────────┘
```

## 3. Idempotency & Conflict Prevention
* Enforced via database constraint `@@unique([organisationId, listingId, outletId])`.
* Pre-flight installation checks prevent concurrent duplicate installations and detect conflicting applications before records are created.
