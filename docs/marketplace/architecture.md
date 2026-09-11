# FitCore Marketplace Foundation — System Architecture

## 1. Architectural Topology
```
       ┌─────────────────────────────────────────────────────────┐
       │             FitCore Marketplace Gateway                │
       │  (Public Discovery, Categories, Search, Featured Feed)  │
       └────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │               Marketplace Module Boundary               │
       │                                                         │
       │  ┌────────────────────┐       ┌──────────────────────┐  │
       │  │ Listing Lifecycle  │       │ Installation Manager │  │
       │  │ & Version Engine   │       │ & Health Supervisor  │  │
       │  └─────────┬──────────┘       └──────────┬───────────┘  │
       │            │                             │              │
       │            ▼                             ▼              │
       │  ┌────────────────────┐       ┌──────────────────────┐  │
       │  │ Dependency Graph   │       │ Permission & Health  │  │
       │  │ & Conflict Matrix  │       │ PII Consent Boundary │  │
       │  └────────────────────┘       └──────────────────────┘  │
       └────────────────────────────┬────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
 ┌──────────────────────┐┌──────────────────────┐┌──────────────────────┐
 │  Day 49 Developer    ││  Day 48 Hardware &   ││  Day 19 AI           │
 │  Platform & OAuth    ││  IoT Integrations    ││  Orchestration Core  │
 └──────────────────────┘└──────────────────────┘└──────────────────────┘
```

## 2. Multi-Tenant Data Model
1. **`MarketplaceCategory`**: Taxonomical groupings (`business-apps`, `integrations`, `ai-agents`, `trainers-coaches`, `training-programs`, `wellness-services`).
2. **`MarketplaceListing`**: Entity holding manifest, metadata, current version, pricing model, required permissions, and publisher links.
3. **`MarketplaceListingVersion`**: Immutable historical release artifacts containing version tags, changelogs, manifests, and dependencies.
4. **`MarketplaceInstallation`**: Multi-tenant binding table linking `Organisation` (and optionally `Outlet`) to a specific `MarketplaceListing` and `MarketplaceListingVersion`. Enforced via `@@unique([organisationId, listingId, outletId])`.
5. **`MarketplacePermissionGrant`**: Per-installation permission state with special handling for sensitive Health PII.
6. **`MarketplaceReview`**: Verified social proof records with aggregate ratings synced to listings.
7. **`MarketplaceAuditLog`**: Tamper-evident record of all lifecycle, configuration, grant, and revocation events.
