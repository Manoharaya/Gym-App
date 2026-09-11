# Marketplace Versioning & Release Lifecycle

## 1. SemVer 2.0.0 Specification
All marketplace listings adhere strictly to Semantic Versioning (`MAJOR.MINOR.PATCH`):
* **PATCH (`1.0.x`)**: Non-breaking bug fixes, performance optimizations, and UI asset refreshes.
* **MINOR (`1.x.0`)**: Backward-compatible feature additions, optional permissions, or additional configuration fields.
* **MAJOR (`x.0.0`)**: Breaking architectural changes, newly mandated permissions, or schema alterations.

## 2. Immutable Version Artifacts
When a version is published, its manifest, required permissions, and dependencies become immutable in `MarketplaceListingVersion`:
```
MarketplaceListing (slug: "cloudgate-pro", currentVersion: "2.4.0")
 ├── Version 1.0.0 (Released: 2026-01-10) [ARCHIVED]
 ├── Version 2.0.0 (Released: 2026-04-15) [DEPRECATED]
 └── Version 2.4.0 (Released: 2026-08-01) [PUBLISHED]
```

## 3. Safe Tenant Version Upgrades
* Tenants remain on their installed version until an administrator triggers an upgrade via `POST /marketplace/installations/:id/upgrade`.
* Upgrades perform automatic dependency and permission checks prior to updating the installation pointer.
