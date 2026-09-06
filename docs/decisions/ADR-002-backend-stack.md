# ADR-002: Backend Architecture & Technology Stack

## Status
**Accepted** (Day 2 Milestone)

## Context
FitCore requires a robust, secure, enterprise-ready backend to power multi-tenant athletic club operations across web and mobile. Requirements include:
1. Multi-tenant isolation at both organization and outlet levels.
2. High-performance relational database modeling with foreign key integrity.
3. Extensible RBAC permission matrix for seven baseline roles.
4. Stateless access tokens paired with rotated refresh tokens for maximum mobile security.
5. Standardized response envelopes and distributed request tracing.

## Decision
We selected the following backend stack:
- **Framework**: **NestJS 10** with Express engine. Provides architecture patterns (modules, guards, interceptors, pipes, dependency injection) out-of-the-box.
- **Language**: **TypeScript 5.5** in strict mode across monorepo packages.
- **ORM / Database**: **Prisma ORM 5** with **PostgreSQL 16+**. Prisma offers compile-time type-safe queries, migration workflows, and automated client generation.
- **Caching & Session Storage**: **Redis 7** (with a graceful in-memory fallback to avoid local test breakage).
- **Authentication**: **Passport JWT** with `bcryptjs` password hashing and SHA-256 token rotation hashing.
- **Documentation**: **@nestjs/swagger** for OpenAPI 3.0 generation at `/api/docs`.

## Consequences
### Positive
- Unified TypeScript codebase sharing types with `@fitcore/types` and `@fitcore/api-client`.
- Declarative security enforcement via NestJS Guards (`JwtAuthGuard`, `TenantGuard`, `PermissionsGuard`).
- Clear separation of concerns between HTTP controllers, business services, and database persistence.
- Zero-downtime containerized deployment via Docker and Docker Compose.

### Trade-offs
- Prisma connection pooling requires setting-based RLS handling when PostgreSQL RLS is enabled at the DB layer.
- Framework abstraction introduces initial boilerplate compared to minimal HTTP servers.
