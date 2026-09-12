# FitCore — Security Findings Log

## Overview
This log documents all security findings identified, triaged, remediated, and verified during the Day 59 Full Security & Penetration QA assessment.

---

### Finding SEC-001: Developer Platform SSRF Validation Gap for Decimal, Hex, 0.0.0.0, and CGNAT IP Encodings
- **Severity**: **HIGH**
- **Affected Component**: `DeveloperSecurityService.validateUrlSafe` (`services/api/src/developer-platform/services/developer-security.service.ts`)
- **Attack Scenario**: An attacker with a registered developer application registers an outbound webhook URL encoded as pure decimal integers (e.g. `http://2130706433/` which points to `127.0.0.1`), wildcard bind `http://0.0.0.0/`, hex `http://0x7f000001/`, or Carrier-Grade NAT (`100.64.0.0/10`), bypassing standard dotted-quad regex checks to query internal network services or cloud metadata.
- **Root Cause**: `validateUrlSafe` checked dotted-decimal IPv4 ranges (`hostname.split('.').map(Number)`), but did not account for non-standard IP formats (integer, hex, octal), wildcard `0.0.0.0/8`, Carrier-Grade NAT, or IPv6 address notations.
- **Exploitability**: Moderate (requires valid developer application registration).
- **Impact**: High (potential access to internal VPC microservices or cloud metadata endpoints).
- **Fix**: Upgraded `validateUrlSafe()` to:
  1. Strip bracket enclosures for IPv6.
  2. Reject `0.0.0.0`, `0`, and `0.0.0.0/8`.
  3. Prohibit pure decimal strings (`/^\d+$/`) and hex/octal patterns.
  4. Block Carrier-Grade NAT (`100.64.0.0/10`) and benchmarking ranges (`198.18.0.0/15`).
  5. Check IPv6 link-local (`fe80::`), unique-local (`fc00::`, `fd00::`), and IPv4-mapped loopback (`::ffff:`).
  6. Block cloud metadata domains (`metadata.google.internal`, `169.254.169.254`, `fd00:ec2::254`).
- **Regression Test**: `services/api/test/penetration-qa.e2e-spec.ts` (Section 2: SSRF Defense).
- **Verification Result**: **VERIFIED / PASS** (All 7 SSRF test cases blocked; legitimate HTTPS webhooks allowed).
- **Residual Risk**: Negligible. DNS rebinding mitigated by standard short DNS caching and egress firewall policies.
- **Status**: **CLOSED**

---

### Finding SEC-002: Missing Enterprise Defensive HTTP Security Headers
- **Severity**: **MEDIUM**
- **Affected Component**: HTTP Response Pipeline (`services/api/src/common/middleware/security-headers.middleware.ts`, `app.module.ts`)
- **Attack Scenario**: A malicious site embeds FitCore within an iframe to perform clickjacking attacks, or an attacker exploits MIME-type sniffing in legacy browsers to execute untrusted user uploads as scripts.
- **Root Cause**: While CORS and ValidationPipe were globally configured in `main.ts`, defensive HTTP headers (`X-Frame-Options`, `X-Content-Type-Options`, `Content-Security-Policy`, `Strict-Transport-Security`) were not enforced via dedicated middleware.
- **Exploitability**: Moderate.
- **Impact**: Moderate (clickjacking, MIME confusion).
- **Fix**: Created and globally applied `SecurityHeadersMiddleware` setting:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Content-Security-Policy: default-src 'self'; frame-ancestors 'none';`
  - Redaction of `X-Powered-By`.
- **Regression Test**: `services/api/test/penetration-qa.e2e-spec.ts` (Section 1: HTTP Security Headers Verification).
- **Verification Result**: **VERIFIED / PASS**.
- **Residual Risk**: None.
- **Status**: **CLOSED**

---

### Finding SEC-003: BigInt Serialization Failure Causing 500 Error on Platform Admin Backup Endpoints
- **Severity**: **MEDIUM**
- **Affected Component**: `TransformInterceptor` (`services/api/src/common/interceptors/transform.interceptor.ts`)
- **Attack Scenario**: Platform administrators accessing `/api/v1/platform-admin/disaster-recovery/backups` encounter an unhandled 500 error due to `TypeError: Do not know how to serialize a BigInt` when backup records contain `sizeBytes: BigInt`.
- **Root Cause**: JavaScript native `JSON.stringify` does not support `BigInt` primitives emitted by Prisma for 64-bit integer columns.
- **Exploitability**: Low (denial of administrative visibility).
- **Impact**: Moderate (breaks operational and disaster recovery monitoring dashboards).
- **Fix**: Implemented recursive `serializeBigInts()` converter in `TransformInterceptor` and attached global `(BigInt.prototype).toJSON = function() { return Number(this); }`.
- **Regression Test**: `services/api/test/penetration-qa.e2e-spec.ts` (Section 5: RBAC & Superadmin Platform Access).
- **Verification Result**: **VERIFIED / PASS** (Returns 200 OK with clean numeric serialization of `sizeBytes`).
- **Residual Risk**: Zero for file sizes under Number.MAX_SAFE_INTEGER (~9 PB).
- **Status**: **CLOSED**

---

## 3. Summary of Findings Lifecycle

| Finding ID | Severity | Description | Initial Status | Final Status |
| :--- | :--- | :--- | :---: | :---: |
| **SEC-001** | HIGH | SSRF Validation Bypass (decimal/hex/0.0.0.0) | OPEN | **CLOSED** |
| **SEC-002** | MEDIUM | Missing HTTP Defensive Headers (clickjacking/MIME) | OPEN | **CLOSED** |
| **SEC-003** | MEDIUM | BigInt Serialization 500 in Admin Endpoints | OPEN | **CLOSED** |

- **Open Critical Findings**: 0
- **Open High Findings**: 0
- **Open Medium Findings**: 0
- **Open Low Findings**: 0
