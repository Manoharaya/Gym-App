# Marketplace Developer Applications (Day 49 Alignment)

## 1. Relationship with Developer Platform
A third-party application on the marketplace is backed by a Day 49 `DeveloperApplication`:
```
   ┌────────────────────────────────┐
   │  Day 49 DeveloperApplication   │
   │  - Client ID & Client Secret   │
   │  - Redirect URIs               │
   │  - Allowed Scopes              │
   │  - Rate Limit Tier             │
   └───────────────┬────────────────┘
                   │
                   ▼ 1:1 or 1:N
   ┌────────────────────────────────┐
   │   Day 50 MarketplaceListing    │
   │  - Public Catalog Display      │
   │  - Reviews & Star Ratings      │
   │  - Installation Manifest       │
   │  - Scopes & Health Consent     │
   └────────────────────────────────┘
```

## 2. OAuth Consent Delegation
When a tenant installs a marketplace listing backed by a developer app:
1. Marketplace generates active `MarketplacePermissionGrant` records matching the listing's requested scopes.
2. The developer application can then issue scoped API requests or listen to webhooks within the boundaries approved by the gym administrator.
