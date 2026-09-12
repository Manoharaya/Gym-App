# FitCore — Secure Development Lifecycle (SDLC) Policy

## 1. Principles of Secure Engineering
Every FitCore engineer and agent must strictly adhere to the following core tenets:
1. **Server-Side Authority**: Client state is never authoritative. Never trust client-supplied `organisationId`, `outletId`, `role`, or `isSuperAdmin`.
2. **Fail-Closed Security**: In the presence of ambiguity or unknown security states, default to safe denial (`403 Forbidden` / `401 Unauthorized`).
3. **Defense in Depth**: Rely on layered controls (Network -> Gateway -> Guard -> Service -> Database ACLs).
4. **Zero Unparameterized Queries**: All PostgreSQL interactions must execute through Prisma or parameterized SQL. Raw unparameterized queries are forbidden.
5. **AI Never Bypasses Security**: AI models and features cannot directly execute arbitrary database operations or override RBAC scopes.
6. **No Secrets in Source**: Zero API keys, passwords, or private keys in repository commits.

---

## 2. Secure Coding Invariants

### 2.1 Multi-Tenant Isolation
- Always verify that database queries filter by `organisationId` derived from the validated `tenantContext`:
  ```typescript
  // CORRECT:
  const records = await prisma.member.findMany({
    where: { organisationId: req.tenantContext.organisationId }
  });
  
  // FORBIDDEN:
  const records = await prisma.member.findMany({
    where: { organisationId: req.body.organisationId } // NEVER TRUST BODY
  });
  ```

### 2.2 DTOs and Mass Assignment
- Every incoming endpoint DTO must define strict `class-validator` annotations.
- The global `ValidationPipe` with `forbidNonWhitelisted: true` and `whitelist: true` must remain active.

### 2.3 SSRF Defense
- Any outbound HTTP call triggered by user-supplied URLs must validate the destination URL using `DeveloperSecurityService.validateUrlSafe()`.

### 2.4 Cryptography & Hashing
- Passwords must be hashed using Bcrypt (minimum 10 salt rounds) or Argon2.
- High-entropy secrets (API keys, webhook secrets) must be hashed using SHA-256 (`crypto.createHash('sha256')`).
- Reversible secrets (MFA secrets, integration credentials) must use AES-256-GCM.

---

## 3. CI/CD Security Quality Gates
Every Pull Request and deployment must pass the following automated gate checks:
```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm audit --prod
pnpm --filter @fitcore/api test:e2e -- test/penetration-qa.e2e-spec.ts
```
Failure of any gate check blocks merging and production promotion.
