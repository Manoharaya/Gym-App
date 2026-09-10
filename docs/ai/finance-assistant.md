# FitCore Day 44: AI Finance Assistant

## Executive Overview

The **AI Finance Assistant** is a production-grade, multi-tenant AI financial intelligence layer embedded into the FitCore platform. It enables authorised gym owners, finance managers, outlet directors, and front-desk personnel to ask plain-language questions in **English** and **Nepali (नेपाली)** regarding organisational and outlet financial performance, collections, billing health, and accounting sync status.

Crucially, the AI Finance Assistant is **NOT** a new ledger, payment gateway, autonomous treasury manager, or statutory tax engine. It is an **explainable, strictly read-only question-answering and synthesis interface** grounded directly in authoritative ledgers established in:
- **Day 6**: Payments, Invoices, Refunds, Receipts
- **Day 41**: Financial Intelligence & Analytics Ledger
- **Day 42**: Recurring Billing & Automated Dunning Collections
- **Day 43**: Accounting Provider Sync & Reconciliation Foundation

---

## Architectural Principles

1. **Read-Only Ledger Security**: The AI assistant has zero ability to trigger financial mutations, post transactions, void invoices, modify subscription amounts, or issue refunds.
2. **Deterministic Grounding**: Every number and percentage in the assistant's output is cross-validated server-side against live query results. If an ungrounded or hallucinated figure is detected, the answer is immediately intercepted and replaced with an authoritative fallback.
3. **Context Minimisation & Privacy**: Strictly excludes all sensitive health records, PAR-Q medical clearances, biometric telemetry, trainer notes, and cardholder PANs from LLM prompts.
4. **Bilingual Grounding (English & Nepali)**: Full native support for Nepali financial queries (e.g., "यो महिना कति आम्दानी भयो?", "कलेक्सन दर कति छ?") with deterministic terminology mapping to FitCore ledger concepts.
5. **Explainability & Non-Causal Attribution**: The system separates factual data points (`FACT`), observed signals (`OBSERVED SIGNAL`), speculative hypotheses (`POSSIBLE EXPLANATION`), and operational boundaries (`LIMITATION`).

---

## Core Capabilities

- **Revenue Intelligence**: Gross revenue, net revenue, refunds, membership revenue breakdown, period-over-period comparisons with zero-division safety.
- **Collections & Dunning Visibility**: Recurring billing collection rate, retry recovery rate, automated dunning cases, upcoming billing schedules.
- **Receivables & Debt Aging**: Total outstanding invoices, overdue amounts, overdue invoice counts.
- **Accounting Integration Health**: Xero/QuickBooks sync status, token validity, sync failures, reconciliation conflicts count.
- **Metric Definitions**: Canonical definitions, formulas, sources, and accounting caveats for 20+ standard metrics.
- **Conversational Memory & Feedback**: Multi-turn conversation sessions with tenant isolation and 1–5 star user audit feedback.
