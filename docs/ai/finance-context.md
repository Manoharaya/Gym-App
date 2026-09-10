# AI Finance Context Minimisation & Data Boundary

## Purpose

The **Finance Context Builder** (`FinanceContextService`) is responsible for compiling concise, authoritative financial facts into the prompt payload while strictly enforcing privacy and tenancy boundaries.

---

## Strict Context Minimisation Rules

To comply with HIPAA, GDPR, PCI-DSS, and FitCore multi-tenant security architecture:

### 1. Prohibited Context Elements (Strict Omission)
The context builder is mathematically forbidden from pulling or injecting:
- **PAR-Q / Medical Forms**: Physical condition, heart issues, joint limitations, doctor clearance notes.
- **Biometric & Wearable Telemetry**: Heart rate, VO2 max, sleep metrics, workout logs, body composition data.
- **Trainer Notes**: Personal conversations, lifestyle notes, member habits.
- **Payment Card PANs**: Unmasked PAN numbers, CVVs, cardholder security codes. Only last-4 and card brand may appear if relevant.
- **External PII**: Third-party accounting customer addresses, bank routing numbers, internal sync passwords.

### 2. Permitted Context Elements
Only aggregated or scoped financial metadata is included:
- Sums, counts, averages of payments, refunds, invoices.
- Plan performance metrics (aggregated plan revenue, active counts).
- Outlet names and aggregated revenues.
- Reconciliation conflict codes, sync statuses, timestamp of last sync.
- Canonical formulas and accounting definitions.

---

## Token Efficiency & Caching

1. **Context Size**: Designed to fit comfortably within 1,500 prompt tokens.
2. **Deterministic Pre-Aggregation**: Rather than streaming raw transaction lists to the LLM, FitCore executes database aggregations first (`_sum`, `_count`) and presents synthesized facts.
3. **Multi-Layer Cache**: Responses for static periods (e.g., "last month's revenue") are cached in Redis for up to 300 seconds (5 minutes) keyed by `finance_ai:{orgId}:{outletId}:{currency}:{queryHash}`.
