# Business Intelligence (BI) Dashboard & Unified Business Intelligence

## Executive Summary & Mission
The **FitCore Business Intelligence (BI)** layer provides authorized executive leadership, finance officers, and outlet operators with an integrated, high-fidelity lens into gym performance. Rather than introducing a second CRM, an independent accounting ledger, or an out-of-sync analytics database, Day 45 unifies authoritative metrics already calculated across FitCore's operational domains:

* **Membership Lifecycle** (Day 2, Day 5, Day 40)
* **Sales Pipeline & Funnels** (Day 40)
* **Financial Performance & Multi-Currency Accounting** (Day 6, Day 41–44)
* **Access Control & Facility Attendance** (Day 7, Day 11)
* **Training & Class Bookings** (Day 8, Day 12)
* **Engagement & Telemetry** (Day 13–18)
* **Retention & Churn Mitigation** (Day 20–22, Day 39)
* **Omnichannel Communications** (Day 23–25)
* **AI Platform & Automation** (Day 19, Day 26–28, Day 44)

---

## Core Tenets

### 1. Existing Domains Remain Authoritative
FitCore's core operational models (e.g., `MemberMembership`, `PaymentTransaction`, `Invoice`, `Lead`, `CheckIn`) remain the sole authoritative source of truth. The BI module derives metrics through deterministic query aggregation and ephemeral projection rollups. It never modifies operational records or introduces conflicting state.

### 2. Multi-Currency Partitioning
Gyms operating across multiple geographies (e.g., Australia `AUD`, United States `USD`, Nepal `NPR`) record financial transactions in their native currencies. FitCore strictly separates financial metrics by currency. Currencies are never summed into arbitrary combined figures without licensed FX services.

### 3. Net Member Change Integrity
Net membership dynamics are strictly governed by the authoritative formula:
$$\text{Net Member Change} = \text{New Members} + \text{Reactivated Members} - \text{Cancelled Members}$$
Returning and reactivated members are explicitly recognized to provide a true picture of business momentum.

### 4. Explicit Denominators Everywhere
Rates and percentages always expose their underlying mathematical basis:
* **Lead-to-Member Conversion Rate:** $\frac{\text{Conversions}}{\text{Total Leads}}$
* **Payment Success Rate:** $\frac{\text{Successful Payments}}{\text{Total Payment Attempts}}$
* **Class Fill Rate:** $\frac{\text{Bookings}}{\text{Total Capacity}}$
* **Attendance Frequency:** $\frac{\text{Visits}}{\text{Active Members}}$

### 5. Grounded, Advisory AI Insights
The integrated AI advisory agent (`business_intelligence.v1`) operates exclusively on verified, in-memory domain metrics. It rejects prompt injections, refuses requests to invent or simulate numbers, and provides non-punitive, constructive operational recommendations.

---

## High-Level Architecture

```
                                  [ Authorized User ]
                                           │
                                  [ JWT Auth & RBAC ]
                                           │
                         ┌─────────────────┴─────────────────┐
                         ▼                                   ▼
              Mobile Executive Dashboard          REST API Controller
           (Cross-Domain, Multi-Currency)    (/api/v1/business-intelligence/*)
                         │                                   │
                         └─────────────────┬─────────────────┘
                                           ▼
                             BusinessIntelligenceService
                                           │
         ┌───────────────────┬─────────────┼───────────────────┬──────────────────┐
         ▼                   ▼             ▼                   ▼                  ▼
  MetricRegistryService  QueryService  ComparisonService   CacheService (Redis) AIInsightService
         │                   │             │                   │                  │
         │         ┌─────────┴─────────┐   │                   │                  ▼
         │         ▼                   ▼   │                   │         ModelGatewayService
         │   Authoritative DB     Ephemeral│                   │                  │
         │   (PostgreSQL)         Projections                  │                  ▼
         │   - PaymentTransaction (Rollups)                    │          business_intelligence.v1
         │   - MemberMembership                                │
         │   - Lead / Opportunity                              │
         └─────────────────────────────────────────────────────┘
```

---

## Key Capabilities

1. **Unified Executive Overview**: One-click health status across 7 operational dimensions (`MEMBERSHIP`, `SALES`, `FINANCE`, `ATTENDANCE`, `ENGAGEMENT`, `RETENTION`, `OPERATIONS`).
2. **Period-over-Period Comparisons**: Flexible time ranges (`TODAY`, `YESTERDAY`, `LAST_7_DAYS`, `LAST_30_DAYS`, `THIS_MONTH`, `LAST_MONTH`, `THIS_QUARTER`, `LAST_QUARTER`, `THIS_YEAR`, `LAST_YEAR`, `CUSTOM`) with zero-denominator safety (`direction: 'NOT_COMPARABLE'`).
3. **Multi-Outlet Scoping**: Dynamic switching between aggregate organisation-level view and individual outlet drill-down with strict tenant isolation.
4. **Data Quality & Caveat System**: Transparent indicators of sample adequacy (flagging $< 10$ record pools), data freshness, and reconciliation status.
5. **Deterministic CSV Export**: RFC 4180-compliant export sanitized against spreadsheet formula injection attacks (`=`, `+`, `-`, `@`).
6. **Executive Q&A AI**: Grounded advisory chat assisting managers in diagnosing churn, optimizing class schedules, and reviewing payment health.
