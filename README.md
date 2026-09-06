# FitCore — Multi-Tenant Fitness SaaS & Cross-Platform Mobile Platform

FitCore is a scalable, enterprise-grade cross-platform fitness platform engineered for high-performance athletic clubs, gym chains, and strength facilities. The platform is initially tailored for **Second Wind Athletic Club** in Perth, Western Australia, while architected from Day 1 to support hundreds of organisations, multi-outlet management, role-based workflows, wearable telemetry, and AI-driven athletic coaching.

---

## 🏗️ Architecture Highlights

- **Multi-Tenant Hierarchy**:
  ```text
  Platform → Organisation → Outlet → User → Role → Permissions
  ```
- **Zero Hardcoding**: Second Wind Athletic Club and Perth CBD are isolated strictly as development seed data. The core platform architecture is completely multi-tenant agnostic.
- **Strict Layer Decoupling**:
  - `Screen` → `Hook` → `Feature Service` → `API Client` → `Backend API`
  - `Screen` → `Store/Hook` → `Storage Abstraction` → `Hardware Enclave Storage`
  - `Backend API` → `Guard Pipeline` → `Service Layer` → `Prisma ORM` → `PostgreSQL`
- **Zero-Trust Multi-Tenancy**:
  - Row-level database isolation with foreign key cascades and composite indexes.
  - Runtime request validation via `TenantGuard` and `TenantContextService`.
  - Comprehensive anti-IDOR validation on flat and nested endpoints.
- **Hierarchical RBAC & Anti-Escalation**:
  - Strict rank ordering: `SUPERADMIN (100) > OWNER (80) > MANAGER (60) > FINANCE (50) > RECEPTION (40) = TRAINER (40) > MEMBER (10)`.
  - `PermissionsService.validateRoleAssignment` blocks cross-tenant role granting and privilege self-escalation.
- **Authentication & Security**:
  - Short-lived JWT access tokens (15m) and stateful refresh tokens (7d) with cryptographically secure single-use rotation and reuse compromise detection.
  - Brute-force rate limiting via `RateLimiterService` (Redis + in-memory fallback).
  - SHA-256 hashed staff invitation tokens with 7-day expiration.

---

## 💻 Technology Stack

| Domain | Technology |
| :--- | :--- |
| **Backend Core** | NestJS 10, TypeScript 5.5, Node.js 20+ |
| **Database & Cache**| PostgreSQL 16+, Prisma ORM 5, Redis 7+ |
| **Mobile Core** | React Native 0.74, Expo SDK 51, TypeScript 5.5 |
| **Monorepo** | pnpm workspaces, Turborepo 2.1 |
| **Client State** | Zustand |
| **Server State** | TanStack Query v5 |
| **Navigation** | React Navigation v6 (Native Stack) |
| **Validation** | Zod (Mobile / Packages) & Class-Validator (NestJS API) |
| **Security** | `expo-secure-store`, bcrypt, Argon2, crypto token hashing |
| **Testing** | Jest, Supertest, React Native Testing Library |

---

## 📁 Repository Structure

```text
fitcore/
│
├── apps/
│   ├── mobile/             # React Native Expo cross-platform mobile app
│   │   ├── src/
│   │   │   ├── app/        # App entry and verification shell
│   │   │   ├── components/ # 14 Accessible design system primitives
│   │   │   ├── features/   # 24 Isolated feature domain modules
│   │   │   ├── hooks/      # useTenant, useAuth, useTheme, usePermissions
│   │   │   ├── navigation/ # Role-segregated navigation architecture
│   │   │   ├── providers/  # Tenant, Auth, Theme, QueryClient, ErrorBoundary
│   │   │   ├── services/   # Storage, Logger, API, Health, Wearables, AI
│   │   │   ├── store/      # Zustand client stores (tenantStore, authStore)
│   │   │   └── theme/      # Colors, typography, spacing, radius, shadows
│   ├── web/                # Future Next.js member portal
│   └── admin/              # Future Superadmin enterprise console
│
├── packages/
│   ├── types/              # Domain entities, tenant context, permissions, AI
│   ├── config/             # Environment validation and dev seed data
│   ├── constants/          # Roles, scopes, error codes, HTTP headers
│   ├── validation/         # Zod schemas (auth, tenant, pagination)
│   ├── api-client/         # Production HTTP client with tenant injection
│   ├── ui/                 # Cross-platform design tokens
│   └── utils/              # Permission evaluators, date, currency helpers
│
├── services/
│   └── api/                # NestJS REST API service (Day 2 & Day 3 active)
│       ├── prisma/         # Prisma schema and seed scripts
│       ├── src/
│       │   ├── auth/           # Authentication, tokens, sessions, invitations
│       │   ├── organisations/  # Multi-tenant organization administration
│       │   ├── outlets/        # Gym branch & facility management
│       │   ├── users/          # User management, staff invites, role grants
│       │   ├── permissions/    # Hierarchical RBAC & anti-escalation engine
│       │   ├── tenancy/        # TenantGuard & context resolution
│       │   ├── common/         # Rate limiting, pagination, logging, envelopes
│       │   ├── database/       # PrismaService & DatabaseModule
│       │   ├── redis/          # RedisService & memory fallback
│       │   ├── audit/          # Compliance audit logger
│       │   └── health/         # Liveness & readiness probes
│       └── test/               # E2E test suites (46 passing tests)
│
├── infrastructure/
│   ├── docker/             # Local PostgreSQL & Redis compose
│   └── aws/                # Cloud CDK / Terraform manifests
│
├── docs/
│   ├── architecture/       # Backend, mobile, tenancy, identity specs
│   ├── security/           # Authentication, RBAC, mobile security specs
│   ├── database/           # Schema, ER diagrams, and RLS specifications
│   └── decisions/          # Architecture Decision Records (ADRs)
│
├── .github/workflows/ci.yml # Automated CI pipeline
└── pnpm-workspace.yaml     # pnpm workspace definition
```

---

## 🚀 Quick Start Guide

### Prerequisites

- Node.js `v20.x` or higher
- pnpm `v10.x` or higher (`npm install -g pnpm`)
- PostgreSQL 16+ running locally on port 5432 (or via Docker)
- Redis 7+ (optional, service falls back to in-memory store automatically)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Database & Environment

```bash
# Start local postgres & redis via docker (if desired)
cd infrastructure/docker && docker compose up -d && cd ../..

# Configure backend environment
cp services/api/.env.example services/api/.env

# Run Prisma migrations & push schema
pnpm --filter @fitcore/api prisma db push

# Seed development organizations, outlets, roles, and test users
pnpm --filter @fitcore/api prisma db seed
```

### 3. Start the Backend API

```bash
pnpm --filter @fitcore/api start:dev
# API available at: http://localhost:3000/api/v1
# Swagger Docs at:  http://localhost:3000/docs
```

### 4. Start the Mobile Development Server

```bash
pnpm --filter @fitcore/mobile start
```

---

## 🔑 Development Seed Accounts & Credentials

Default development password for all seed accounts: `Password123!`

| Role | Email | Tenant Scoping |
|---|---|---|
| **SUPERADMIN** | `superadmin@fitcore.io` | Global Platform |
| **ORGANISATION_OWNER** | `owner@secondwind.com.au` | Second Wind Athletic Club |
| **OUTLET_MANAGER** | `manager.perth@secondwind.com.au` | Second Wind — Perth CBD Outlet |
| **TRAINER** | `trainer@secondwind.com.au` | Second Wind — Perth CBD Outlet |
| **RECEPTION** | `reception@secondwind.com.au` | Second Wind — Perth CBD Outlet |
| **MEMBER** | `member@secondwind.com.au` | Second Wind — Perth CBD Outlet |
| **APEX OWNER** | `owner@apexstrength.com.au` | Apex Strength Co (Tenant B) |
| **DISABLED USER** | `disabled@secondwind.com.au` | Blocked Account (403 Forbidden) |
| **SUSPENDED USER** | `suspended@secondwind.com.au` | Blocked Account (403 Forbidden) |

---

## 🧪 Testing & Validation

All 60 automated tests across monorepo packages, mobile, and backend pass with zero warnings:

```bash
# Run all unit and E2E tests across monorepo
pnpm test

# Run backend E2E tests specifically (46 tests in 8 suites)
pnpm --filter @fitcore/api test:e2e

# Run strict TypeScript typecheck across all 16 packages
pnpm typecheck

# Run linter
pnpm lint
```

### Backend E2E Test Suite Breakdown
1. `test/day3-lifecycle.e2e-spec.ts` — Full Day 3 end-to-end multi-tenant lifecycle (11 tests).
2. `test/tenant-isolation.e2e-spec.ts` — Cross-tenant zero-trust isolation matrix (10 tests).
3. `test/idor-security.e2e-spec.ts` — Insecure Direct Object Reference prevention (4 tests).
4. `test/auth.e2e-spec.ts` — Registration, authentication, token rotation, context switching (10 tests).
5. `test/permissions.e2e-spec.ts` — Granular permission checks and RBAC (5 tests).
6. `test/outlet-isolation.e2e-spec.ts` — Cross-outlet isolation within same organization (3 tests).
7. `test/health.e2e-spec.ts` — API liveness & readiness health probes (2 tests).
8. `test/request-id.e2e-spec.ts` — Request ID correlation propagation (1 test).

---

## 🔒 Security & Sensitive Data Policy

FitCore enforces rigorous security standards across all layers:
1. **Never commit secrets**: Database credentials and JWT secrets are injected strictly via validated environment variables.
2. **Never log PII**: `StructuredLogger` automatically redacts credentials, authorization tokens, card details, and biometric records.
3. **Zero-Trust Multi-Tenancy**: Every request is authenticated, tenant-scoped, and evaluated against strict RBAC rules.
4. **Privilege Escalation Immune**: Hierarchical validation blocks self-promotion and tenant crossing.
5. **Brute-Force Guarded**: Login endpoints rate limit failed attempts per email and IP address.
