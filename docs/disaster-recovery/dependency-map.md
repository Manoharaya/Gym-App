# Disaster Recovery Dependency Map

The following topological dependency tree defines recovery prerequisites and dependencies across the FitCore platform. Components must be restored in strict ascending tier order.

```mermaid
graph TD
    classDef tier0 fill:#ff4d4f,stroke:#333,stroke-width:2px,color:#fff;
    classDef tier1 fill:#faad14,stroke:#333,stroke-width:2px,color:#fff;
    classDef tier2 fill:#1890ff,stroke:#333,stroke-width:2px,color:#fff;

    subgraph Tier0["Tier 0: Infrastructure & Core Datastores"]
        KMS["AWS KMS / Encryption Keys"]
        PG["PostgreSQL Master Database"]:::tier0
        S3["AWS S3 Encrypted Storage"]:::tier0
        REDIS["Redis Datastore"]:::tier0
    end

    subgraph Tier1["Tier 1: Core Application & Messaging"]
        API["FitCore Core API (NestJS)"]:::tier0
        QUEUES["BullMQ Persistent Queues"]:::tier1
        WORKERS["FitCore Background Workers"]:::tier1
        AUTH["Authentication & Sessions"]:::tier0
    end

    subgraph Tier2["Tier 2: Business & External Integrations"]
        ACCESS["Access Control & Turnstiles"]:::tier0
        BOOKING["Bookings & Capacity Lock"]:::tier0
        BILLING["Member & SaaS Billing"]:::tier0
        PAY_GATEWAY["Payment Gateways (Stripe/GoCardless)"]:::tier1
        AI_GATEWAY["AI Gateway (OpenAI/Anthropic)"]:::tier1
        NOTIFS["Communications (Twilio/SendGrid)"]:::tier1
        ACCOUNTING["Accounting Outbox (Xero/QBO)"]:::tier2
    end

    KMS --> PG
    KMS --> S3
    PG --> API
    REDIS --> API
    REDIS --> QUEUES
    QUEUES --> WORKERS
    API --> AUTH
    AUTH --> ACCESS
    API --> BOOKING
    API --> BILLING
    BILLING --> PAY_GATEWAY
    API --> AI_GATEWAY
    WORKERS --> NOTIFS
    WORKERS --> ACCOUNTING
```

---

## Authoritative Recovery Order

```text
1. AWS KMS & Secret Decryption Keys
2. PostgreSQL Primary Database (Restore + Migration Verification)
3. Redis Primary Instance (AOF/RDB reload)
4. S3 Object Storage Access & IAM Roles
5. BullMQ Queues (Redis stream hydration)
6. NestJS Core API Instances
7. Background Worker Pool (Payment, Notification, Analytics consumers)
8. Public DNS & Ingress Routing
9. External Provider Gateways & Reconciliation Jobs
10. Observability Probes & Continuous Health Monitors
```
