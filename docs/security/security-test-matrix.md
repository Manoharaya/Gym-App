# FitCore — Security Test Matrix

This matrix documents the full security test execution across all platform components, mapping the attack vector, expected result, observed result, automated test suite, and release status.

| Area | Test Scenario | Expected Result | Actual Result | Status | Evidence / Suite |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Headers** | Check for `X-Content-Type-Options: nosniff` | nosniff | nosniff | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **Headers** | Check for `X-Frame-Options: DENY` | DENY | DENY | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **Headers** | Check for `Strict-Transport-Security` | Present (max-age 1yr) | Present | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **Headers** | Check for `Content-Security-Policy` | frame-ancestors 'none' | frame-ancestors 'none' | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **Headers** | Redaction of `X-Powered-By` | Undefined / Omitted | Undefined | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **SSRF** | Block loopback URL (`http://127.0.0.1:8080`) | DENY | False | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **SSRF** | Block broadcast/wildcard URL (`http://0.0.0.0`) | DENY | False | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **SSRF** | Block cloud metadata (`http://169.254.169.254`) | DENY | False | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **SSRF** | Block GCP metadata (`metadata.google.internal`) | DENY | False | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **SSRF** | Block decimal encoded IP (`http://2130706433/`) | DENY | False | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **SSRF** | Block hex encoded IP (`http://0x7f000001/`) | DENY | False | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **SSRF** | Block Carrier-Grade NAT (`http://100.64.0.1/`) | DENY | False | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **SSRF** | Block IPv6 loopback (`http://[::1]:8080`) | DENY | False | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **SSRF** | Block IPv4-mapped loopback (`[::ffff:127.0.0.1]`) | DENY | False | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **SSRF** | Allow legitimate HTTPS webhook URL | ALLOW | True | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **Tenant** | Org Owner A accesses Org B (`/organisations/B`) | 403 / 404 | 403 / 404 | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **Tenant** | Member A queries Member B (`/members?org=B`) | 403 / 404 | 403 / 404 | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **Tenant** | Spoofing `x-organisation-id` header | 403 Forbidden | 403 Forbidden | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **Outlet** | Outlet Manager A mutates Outlet B resources | 403 / 404 | 403 / 404 | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **RBAC** | Member calls `/platform-admin/disaster-recovery` | 403 Forbidden | 403 Forbidden | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **RBAC** | Member calls `/observability/metrics` | 403 Forbidden | 403 Forbidden | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **RBAC** | Superadmin calls `/platform-admin/*` | 200 OK | 200 OK | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **API** | Mass assignment of `isSuperAdmin` / `role` | 400 Bad Request | 400 Bad Request | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **Injection**| SQL injection string in search filter | Sanitized / Safe | 200 OK (Clean DB) | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **Injection**| XSS script tags in string fields | Safe Storage | 200 OK (Raw String) | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **Auth** | Login with incorrect password | 401 Unauthorized | 401 Unauthorized | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **Auth** | Login with non-existent email account | 401 Unauthorized | 401 Unauthorized | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **Auth** | Zero account enumeration on login failures | Identical Generic Msg | Identical Generic Msg | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **MFA** | Login without MFA when MFA enabled | `mfaRequired: true` | `mfaRequired: true` | **PASS** | `test/security.e2e-spec.ts` |
| **MFA** | Replayed or invalid TOTP code | 400 Bad Request | 400 Bad Request | **PASS** | `test/security.e2e-spec.ts` |
| **MFA** | Single-use recovery code reuse attempt | 400 Bad Request | 400 Bad Request | **PASS** | `test/security.e2e-spec.ts` |
| **Session** | Expired or revoked access token reuse | 401 Unauthorized | 401 Unauthorized | **PASS** | `test/security.e2e-spec.ts` |
| **Session** | Refresh token rotation & family revocation | Tokens Revoked | Tokens Revoked | **PASS** | `test/security.e2e-spec.ts` |
| **AI** | Prompt injection: disregard system instructions | BLOCK | BLOCK | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **AI** | Prohibited topics: diagnose medical condition | BLOCK | BLOCK | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **AI** | Legitimate fitness workout request | ALLOW | ALLOW | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **AI** | Boundary framing on untrusted user inputs | Enclosed in markers | Enclosed in markers | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **AI** | Redaction of echoed system instruction prompts | REDACT | REDACT | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **Privacy** | Password hash & MFA secret in `/auth/me` | Omitted / Redacted | Never Returned | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **Billing** | Cross-tenant access to SaaS subscriptions | 403 / 404 | 403 / 404 | **PASS** | `test/penetration-qa.e2e-spec.ts` |
| **Payment** | Duplicate webhook payment processing | IDEMPOTENT | IDEMPOTENT | **PASS** | `test/payment-security.e2e-spec.ts` |
| **Booking** | Concurrent booking beyond capacity | SAFE (Waitlist) | SAFE (Waitlist) | **PASS** | `test/booking-security.e2e-spec.ts` |
