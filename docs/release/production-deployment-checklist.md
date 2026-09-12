# FitCore v1.0 — Production Deployment Checklist

## 1. Infrastructure Preparation
- [x] **PostgreSQL 16 Cluster**: Provisioned with Multi-AZ replication, connection pooling (PgBouncer), and automated snapshot schedules.
- [x] **Redis 7 Cluster**: Provisioned with TLS, password authentication, and 4GB+ memory allocation.
- [x] **Object Storage (AWS S3)**: Private bucket provisioned with SSE-KMS, Block Public Access enabled, and lifecycle policies.
- [x] **Container Orchestration**: Kubernetes deployment manifests / ECS task definitions configured with CPU/Memory limits.
- [x] **Ingress / WAF**: Cloudflare / AWS ALB configured with TLS 1.3, rate-limiting on `/api/v1/auth/*`, and DDoS mitigation.

---

## 2. Security & Configuration
- [x] **Production Secrets**: Configured via AWS Secrets Manager / Doppler; zero secrets committed in source code.
- [x] **JWT Keys**: High-entropy 256-bit symmetric secrets or asymmetric RS256 key pairs provisioned.
- [x] **Defensive HTTP Headers**: `SecurityHeadersMiddleware` active (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security: max-age=31536000`, `Content-Security-Policy`).
- [x] **CORS Configuration**: Restricted strictly to authorized tenant domains; wildcards forbidden.
- [x] **MFA & Account Lockout**: 5 failed login attempts trigger 15-minute lockout; zero account enumeration.

---

## 3. Database Migration & Integrity
- [x] **Prisma Schema Validation**: `prisma validate` executed successfully (0 errors).
- [x] **Pre-Deployment Backup**: Full encrypted dump taken and SHA-256 checksum verified.
- [x] **Forward Migration Drill**: Migrations applied against staging replica without downtime or table locks.

---

## 4. Third-Party Integration Credentials
- [x] **Stripe**: Live API keys and webhook signing secret configured.
- [x] **AI Gateways**: OpenAI, Anthropic, and Google Vertex production API quotas provisioned.
- [x] **Email & SMS**: SendGrid DKIM/SPF verified; Twilio A2P 10DLC registration verified.
- [x] **Accounting**: OAuth redirect URIs registered with Xero and Intuit QuickBooks developer portals.

---

## 5. Post-Deployment Verification
- [x] **Liveness & Readiness Probes**: `/api/v1/observability/health/live` and `/ready` returning 200.
- [x] **Synthetic Smoke Tests**: User login, class discovery, membership verification, and test webhook dispatch.
- [x] **Observability Dashboard**: Metrics, logs, and trace ingestion confirmed active.
