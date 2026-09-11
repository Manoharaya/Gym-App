# Marketplace Hardware & Platform Integrations (Day 48 Alignment)

## 1. Hardware Integration Boundary
Hardware controllers (turnstiles, optical gates, RFID card readers, lock lockers) published on the marketplace map directly to **Day 48 Hardware & Platform Integrations** (`IntegrationProvider`, `IntegrationConnection`).
* Marketplace listing manages user evaluation, screenshots, manufacturer documentation, and permission approval.
* Installation initiates or links to an `IntegrationConnection` configured for specific gym outlets.
* Real-time check-in and access decisions continue to execute via Day 48 edge drivers with sub-50ms offline cache support.

## 2. Platform Sync Bridges
SaaS platform integrations (e.g. Xero Accounting, Mailchimp, Zapier) leverage Day 48 webhook workers and sync jobs:
* Tenant installs the listing from the catalog.
* Marketplace records permissions (`payments:read`, `members:read`).
* Day 48 handles the background bidirectional synchronization and ledger mapping.
