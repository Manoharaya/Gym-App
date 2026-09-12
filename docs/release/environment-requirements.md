# FitCore v1.0 — Production Environment & Infrastructure Requirements

## 1. Runtime & Language Dependencies
- **Node.js**: `v20.14.0 LTS` or higher (tested on `v20.x`).
- **pnpm**: `v9.x` (monorepo workspace manager).
- **TypeScript**: `v5.5.x`.
- **NestJS CLI / Framework**: `v10.4.x`.

---

## 2. Data Stores & Caching
- **PostgreSQL**: `v16.x`
  - Connection pooling: PgBouncer or native Prisma pool (recommended pool size: 20–50 connections per instance).
  - Storage: SSD with provisioned IOPS (gp3, min 3000 IOPS).
  - Extensions: `pgcrypto`, `uuid-ossp`.
- **Redis**: `v7.2.x`
  - Mode: Cluster or High-Availability Sentinel with TLS.
  - Memory: Min 4GB RAM with `volatile-lru` eviction policy.
  - Persistence: RDB snapshots every 15 minutes + AOF enabled (`everysec`).

---

## 3. Storage & Object Repositories
- **AWS S3 / MinIO**:
  - Private buckets with Default KMS Encryption (SSE-KMS).
  - Lifecycle rules: 90 days cold glacier transition for historical exports, 30-day purge for temporary export archives.
  - CORS: Restricted strictly to tenant web/admin domains.

---

## 4. Background Workers & Queue Architecture
- **BullMQ Queue Engine**:
  - Redis backed.
  - Worker concurrency: 5–10 concurrent jobs per worker pod.
  - Dead Letter Queue (DLQ): Max retries = 5 with exponential backoff (initial delay: 5s, max delay: 15m).

---

## 5. Third-Party Provider Integrations (Production Specifications)
- **AI Platform Providers**:
  - OpenAI (`gpt-4o`, `gpt-4o-mini`), Anthropic (`claude-3-5-sonnet`), Google Vertex/Gemini (`gemini-1.5-pro`).
  - Timeout: 15s per LLM call with fallback templates.
- **Payment Gateway**:
  - Stripe API `2024-06-20` or higher.
  - Required Webhook Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `invoice.payment_succeeded`, `charge.refunded`.
- **Communications**:
  - SendGrid / AWS SES: Verified domain SPF/DKIM/DMARC records.
  - Twilio: A2P 10DLC registration for outbound SMS; SIP trunk for voice.
- **Accounting**:
  - Xero Partner App or QuickBooks Intuit Developer App (OAuth 2.0 PKCE).

---

## 6. Networking, TLS & Security Headers
- **TLS**: Version 1.3 mandatory; fallback to 1.2 with secure cipher suites.
- **WAF / Reverse Proxy**: Cloudflare or AWS ALB with rate limiting (100 req/min per IP on public auth endpoints).
- **DNS**: Anycast routing with split-horizon internal resolution for VPC endpoints.
