# Changelog

All notable changes to the FitCore platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-06

### Added - Day 1 Foundation Release

- **Monorepo Architecture**: Configured pnpm workspaces and Turborepo 2.1 pipeline.
- **Core Shared Packages**:
  - `@fitcore/types`: 32 platform database entity contracts, tenant contexts, permission rules, health and AI contracts.
  - `@fitcore/config`: Environment validation and isolated Second Wind Athletic Club dev seed data.
  - `@fitcore/constants`: User roles, permission scopes, standardized error codes, HTTP headers.
  - `@fitcore/validation`: Zod validation schemas for credentials, tenant switching, and pagination.
  - `@fitcore/api-client`: Production HTTP client with automatic tenant header injection and error normalization.
  - `@fitcore/ui`: Cross-platform athletic design tokens (colors, typography, spacing, radius, shadows).
  - `@fitcore/utils`: Date/currency formatters and multi-tenant permission evaluator.
- **Mobile Foundation (`apps/mobile`)**:
  - Expo SDK 51 with prebuild configuration and native permission manifests for iOS & Android.
  - Role-segregated navigation architecture (`RootNavigator`, `AuthNavigator`, `AppNavigator`, and 6 role-scoped subnavigators).
  - 14 production-grade accessible design system primitives.
  - Infrastructure abstractions: `SecureStorage` (Keychain/Keystore), `LocalStorage`, `CacheStorage`.
  - Service abstractions: `AuthService`, `HealthService`, `WearableService`, `AIService`, `NotificationService`, `DocumentService`.
  - Centralized logger with sensitive PII, health data, and credential redaction.
  - React `ErrorBoundary` and global crash shielding.
  - 24 feature modules established with clean directory boundaries.
  - Day 1 Technical Verification Shell screen (`AppShell`).
- **Testing & CI**:
  - Jest test runner setup with React Native Testing Library.
  - Unit tests covering app startup, tenant isolation, permissions engine, and API client.
  - GitHub Actions CI workflow (`.github/workflows/ci.yml`).
- **Documentation**:
  - Architecture overview (`docs/architecture/overview.md`).
  - Mobile architecture & prebuild specification (`docs/architecture/mobile.md`).
  - Multi-tenancy & scoping model (`docs/architecture/multi-tenancy.md`).
  - Mobile security & health telemetry standards (`docs/security/mobile-security.md`).
  - Architecture Decision Record (`docs/decisions/ADR-001-mobile-stack.md`).
