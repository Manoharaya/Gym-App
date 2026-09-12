# FitCore — Release Fixes Log (Day 59–60)

## 1. Overview
This log documents all defects, hardening items, and anomalies identified and resolved during the Day 59 Security Assessment and Day 60 Release Candidate preparation.

---

### Fix FIX-001: Developer Platform SSRF Validation Hardening
- **Severity**: HIGH
- **Reproduction**: Pass integer-encoded IP (`http://2130706433/`), wildcard (`http://0.0.0.0/`), or Carrier-Grade NAT (`100.64.0.0/10`) to webhook endpoint registration.
- **Root Cause**: `validateUrlSafe` only checked dotted-decimal IPv4 ranges without accounting for non-standard formats or AWS/GCP cloud metadata domains.
- **Fix**: Fortified regex and boundary checks in `DeveloperSecurityService.validateUrlSafe()` to reject decimal integer hostnames, hex/octal formats, `0.0.0.0/8`, CGNAT (`100.64.0.0/10`), IPv6 link-local, and cloud metadata.
- **Verification**: `test/penetration-qa.e2e-spec.ts` (Section 2: 7 test vectors passing).

---

### Fix FIX-002: Enterprise Defensive HTTP Security Headers
- **Severity**: MEDIUM
- **Reproduction**: Inspect response headers on any API route; `X-Frame-Options` and `Content-Security-Policy` were missing.
- **Root Cause**: Missing dedicated middleware in the global NestJS application pipeline.
- **Fix**: Implemented `SecurityHeadersMiddleware` applying `nosniff`, `DENY`, `max-age=31536000` HSTS, and CSP `frame-ancestors 'none'`. Registered in `AppModule.configure()`.
- **Verification**: `test/penetration-qa.e2e-spec.ts` (Section 1: Headers verification passing).

---

### Fix FIX-003: Prisma BigInt Serialization in JSON Envelope Interceptor
- **Severity**: MEDIUM
- **Reproduction**: Query `/api/v1/platform-admin/disaster-recovery/backups` containing `sizeBytes: BigInt`.
- **Root Cause**: JavaScript `JSON.stringify` throws `TypeError: Do not know how to serialize a BigInt` on native BigInt primitives emitted by Prisma.
- **Fix**: Added recursive `serializeBigInts()` converter in `TransformInterceptor` and attached global fallback `(BigInt.prototype).toJSON = function() { return Number(this); }`.
- **Verification**: `test/penetration-qa.e2e-spec.ts` & `test/release-candidate-qa.e2e-spec.ts` (Superadmin backup endpoint returning 200 with clean numeric fields).

---

### Fix FIX-004: Exercise Library and Member Listing Scope Alignment in QA Suite
- **Severity**: LOW
- **Reproduction**: Master QA suite querying member list and exercises catalog encountered pagination envelope mismatch.
- **Root Cause**: Tests expected raw arrays rather than standardized `{ items: [...], meta: {...} }` pagination envelopes.
- **Fix**: Updated `release-candidate-qa.e2e-spec.ts` assertions to accurately evaluate pagination envelopes.
- **Verification**: `test/release-candidate-qa.e2e-spec.ts` (Section 3 & 6 passing).
