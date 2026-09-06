# Changelog

All notable changes to the FitCore platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-09-06

### Added - Day 2 Backend Foundation & PostgreSQL Multi-Tenant Architecture

- **Core Backend Architecture (`services/api`)**:
  - NestJS 10 application with TypeScript 5.5 in strict mode.
  - Global URI versioning at `/api/v1` with Swagger OpenAPI documentation at `/api/docs`.
  - Global validation pipe with class-validator and class-transformer.
  - Standardized API envelope (`{ success: true, data: T, requestId }`) matching `@fitcore/api-client`.
  - Distributed request correlation tracking (`RequestIdMiddleware` with `x-request-id`).
- **Database & Prisma Schema (`services/api/prisma`)**:
  - 11 core multi-tenant models: `Organisation`, `Outlet`, `User`, `Role`, `Permission`, `RolePermission`, `UserRole`, `UserOutlet`, `Session`, `RefreshToken`, `AuditLog`.
  - Relational indexes for high-concurrency multi-tenant query performance.
  - Idempotent database seed script (`seed.ts`) populating 7 system roles, permissions, 2 organizations (Second Wind Athletic Club & Apex Strength Co), 3 outlets, and test accounts.
- **Security & Multi-Tenancy Engine**:
  - `TenantContextService` & `TenantGuard` enforcing zero-trust tenant boundary isolation.
  - Cross-tenant access prevention strictly returning `403 Forbidden`.
  - Outlet-level scoping restricting branch staff while permitting organization-wide administrative roles.
  - JWT Authentication: 15-minute access tokens and 7-day single-use refresh tokens.
  - Refresh token rotation with cryptographic `jti` and session family invalidation upon token reuse compromise.
  - Structured JSON logging (`StructuredLogger`) with automatic PII, token, and credential masking.
- **Cache & Infrastructure**:
  - Docker Compose configuration for PostgreSQL 16 Alpine and Redis 7 Alpine with persistent volumes and healthchecks.
  - `RedisService` with automatic in-memory fallback cache for high developer velocity.
- **End-to-End Testing**:
  - 6 e2e test suites passing 22/22 tests:
    - `tenant-isolation.e2e-spec.ts`: Validates strict 403 blocks across tenant boundaries and header spoofing.
    - `outlet-isolation.e2e-spec.ts`: Validates branch scoping vs. organization-wide permissions.
    - `auth.e2e-spec.ts`: Validates login, bearer auth, token rotation, and reuse compromise detection.
    - `permissions.e2e-spec.ts`: Validates RBAC matrix across roles.
    - `request-id.e2e-spec.ts`: Validates correlation ID propagation.
    - `health.e2e-spec.ts`: Validates `/health`, `/health/live`, and `/health/ready`.
- **Documentation**:
  - Backend architecture specification (`docs/architecture/backend.md`).
  - Database schema & ER diagrams (`docs/database/schema.md`).
  - Multi-tenancy & PostgreSQL RLS strategy (`docs/database/multi-tenancy.md`).
  - Backend security & token lifecycle specification (`docs/security/backend-security.md`).
  - API versioning & envelope standards (`docs/api/api-versioning.md`).
  - Architecture Decision Record (`docs/decisions/ADR-002-backend-stack.md`).

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
