# FitCore Platform Architecture Overview

## Mission & Purpose

FitCore is an enterprise-ready, multi-tenant SaaS platform and cross-platform mobile application engineered for high-performance athletic clubs, strength & conditioning facilities, and fitness chains.

Initially deployed for **Second Wind Athletic Club** in Perth, the platform architecture is engineered from Day 1 to support hundreds of gym organisations, each operating multiple outlets and branches with complete tenant isolation.

---

## The Core Domain Hierarchy

Every entity, request, session, and permission evaluation follows a strict organizational hierarchy:

```text
Platform
   ↓
Organisation
   ↓
Outlet
   ↓
User
   ↓
Role
   ↓
Permissions
```

### Architectural Rule: No Hardcoded Assumptions

- Second Wind Athletic Club and Perth CBD are configured strictly as **development seed data**.
- The core platform never assumes a single gym, single outlet, or specific geographic location.
- All persistent data models and API requests must be scoped to:
  - `organisationId`
  - `outletId` (when applicable)
  - `userId`

---

## Architectural Layer Boundaries

To ensure absolute separation of concerns and maintainability across tens of feature modules, the application enforces the following unidirectional dependency flow:

```text
Presentation Layer
(Screens, Components, Navigation, Theme)
       ↓
Application Logic Layer
(Custom Hooks, Stores, Session Management)
       ↓
Feature Service Layer
(Domain-specific Orchestration)
       ↓
Infrastructure Layer
(API Client, Secure Storage, Hardware Native Adapters)
       ↓
Backend / API
```

### Critical Enforcement Rules

1. **Never call `fetch()` directly from UI components**:
   - `Screen` → `Hook` → `Feature Service` → `API Client` → `Backend API`.
2. **Never couple storage directly to `AsyncStorage`**:
   - `Screen` → `Hook/Store` → `Storage Abstraction` → `SecureStorage/LocalStorage`.
3. **Never call LLM providers directly from the mobile app**:
   - `Mobile App` → `FitCore API` → `AI Orchestration Service` → `LLM Provider`.

---

## Repository Monorepo Structure

```text
fitcore/
├── apps/
│   ├── mobile/         # React Native / Expo cross-platform mobile app
│   ├── web/            # Next.js web portal (future)
│   └── admin/          # Superadmin console (future)
├── packages/
│   ├── types/          # Shared TypeScript domain & entity contracts
│   ├── config/         # Environment & seed configuration
│   ├── constants/      # Roles, permissions, error codes, HTTP headers
│   ├── validation/     # Zod runtime schemas
│   ├── api-client/     # Normalized HTTP client with tenant injection
│   ├── ui/             # Cross-platform design tokens & theme constants
│   └── utils/          # Date, currency, and permission evaluators
├── services/
│   ├── api/            # Core backend REST API (future)
│   ├── ai/             # Dedicated AI orchestration microservice (future)
│   └── workers/        # Asynchronous telemetry & billing workers (future)
├── infrastructure/
│   ├── docker/         # Local compose configurations
│   └── aws/            # Production IaC manifests
└── docs/               # System documentation, security specs, and ADRs
```
