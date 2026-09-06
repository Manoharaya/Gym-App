# FitCore Core API Service (`@fitcore/api`)

## Purpose

Production-grade NestJS 10 RESTful backend service providing:

- Multi-tenant data isolation (`TenantGuard`, `TenantContextService`, `x-organisation-id`, `x-outlet-id`).
- PostgreSQL 16+ database architecture with Prisma ORM 5.
- Role-based and scope-based permission evaluation (RBAC matrix).
- Secure authentication: JWT Access Tokens (15m) + rotated Refresh Tokens (7d) with token family compromise & reuse detection.
- Structured JSON logging with automatic PII & credential redaction.
- Distributed request tracing (`x-request-id`).
- Standardized API envelope (`{ success: true, data: T, requestId }`).
- Interactive OpenAPI / Swagger UI at `/api/docs`.

---

## Local Development & Setup

### 1. Prerequisites
- Node.js 20+
- pnpm 10+
- PostgreSQL 16+ (or via `docker-compose up -d postgres`)
- Redis 7+ (optional; automatic in-memory fallback enabled for local testing)

### 2. Environment Configuration
```bash
cp .env.example .env
```

### 3. Database Migration & Seed
```bash
# Push schema changes to database
pnpm --filter @fitcore/api exec prisma db push

# Generate Prisma client
pnpm --filter @fitcore/api prisma:generate

# Seed baseline roles, permissions, tenants, and test accounts
pnpm --filter @fitcore/api prisma:seed
```

### 4. Running the Service
```bash
# Development mode with watch
pnpm --filter @fitcore/api dev

# Production build
pnpm --filter @fitcore/api build
pnpm --filter @fitcore/api start:prod
```

### 5. Running Tests
```bash
# Run all end-to-end integration & security tests
pnpm --filter @fitcore/api test:e2e
```

---

## Endpoints Overview

| Method | Path | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Health status with DB & Redis probe | Public |
| `GET` | `/health/live` | Container orchestrator liveness | Public |
| `GET` | `/health/ready` | Readiness probe | Public |
| `POST` | `/api/v1/auth/login` | Authenticate user credentials | Public |
| `POST` | `/api/v1/auth/refresh` | Rotate refresh token | Public |
| `POST` | `/api/v1/auth/logout` | Invalidate session | Authenticated |
| `GET` | `/api/v1/auth/me` | Current user profile & roles | Authenticated |
| `GET` | `/api/v1/organisations` | List accessible organisations | Authenticated |
| `GET` | `/api/v1/organisations/:id`| Get organisation details | Authenticated + Tenant Scoped |
| `GET` | `/api/v1/outlets` | List accessible outlets | Authenticated + Tenant Scoped |
| `GET` | `/api/v1/outlets/:id` | Get outlet details | Authenticated + Outlet Scoped |
| `GET` | `/api/v1/users/me` | Detailed user account profile | Authenticated |
| `GET` | `/api/v1/users` | List users in tenant scope | Authenticated + `members:READ` |
| `GET` | `/api/v1/audit-logs` | Retrieve security audit logs | Authenticated + `audit_logs:READ` |

Interactive Swagger documentation available at: `http://localhost:4000/api/docs`.
