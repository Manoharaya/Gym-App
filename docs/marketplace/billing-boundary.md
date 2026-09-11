# Marketplace Commercial Billing Boundary (Day 55 Alignment)

## 1. Scope of Day 50 vs Day 55
A critical architectural boundary governs marketplace commercial transactions:

| Feature Dimension | Handled in Day 50 (Today) | Deferred to Day 55 (Future) |
| :--- | :---: | :---: |
| **Pricing Type Metadata** (`FREE`, `PAID`, `SUBSCRIPTION`, `USAGE_BASED`, `CONTACT_SALES`) | ✅ | — |
| **Pricing Model JSON Display** (rate, unit, currency labels) | ✅ | — |
| **Installation Lifecycle** (`ACTIVE`, `PAUSED`, `UPGRADING`, `UNINSTALLED`) | ✅ | — |
| **Credit Card Checkout & Invoicing** | ❌ (Forbidden) | ✅ |
| **App Store Commission Splitting** (e.g. 80/20 developer payout) | ❌ (Forbidden) | ✅ |
| **Automated Metered Usage Aggregation & Ledger Posting** | ❌ (Forbidden) | ✅ |
| **Billing Disputes & Chargeback Workflows** | ❌ (Forbidden) | ✅ |

## 2. Rationale
Keeping commercial checkouts and commission accounting decoupled ensures that:
1. Day 50 remains a pure, reliable installation, permission, and discovery engine.
2. Future billing engines can evolve independently without altering the core installation state machine.
