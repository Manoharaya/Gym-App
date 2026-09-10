# FitCore Sales Intelligence Dashboard User Guide

## Overview

The **FitCore Sales Intelligence Dashboard** transforms multi-channel lead capture, receptionist interactions, sales pipeline changes, and automated follow-up sequences into real-time, permission-controlled sales intelligence.

Designed for gym executives, general managers, sales directors, and club staff, the dashboard delivers actionable clarity without duplicating authoritative data.

---

## 1. Dashboard Layout & Navigation

The dashboard is structured into distinct analytic layers:

```
+-----------------------------------------------------------------------------------+
|  [FitCore Sales Intelligence]    Range: [Last 30 Days v]  Club: [Perth Central v] |
+-----------------------------------------------------------------------------------+
|  [New Leads: 142]  [Qualified: 98]  [Tours: 44]  [Won: 29]  [Rate: 20.4%]         |
+-----------------------------------------------------------------------------------+
|  [ Canonical 7-Stage Sales Funnel ]     |  [ Acquisition Source Attribution ]     |
|  - Drop-off analysis per transition     |  - Website, AI Receptionist, Walk-in   |
+-----------------------------------------------------------------------------------+
|  [ Daily Conversion & Lead Trends ]     |  [ Communication Channel Breakdown ]    |
|  - Lead velocity & response speed       |  - Calls, SMS, WhatsApp, Web           |
+-----------------------------------------------------------------------------------+
|  [ Staff Performance & Sample Quality ] |  [ Multi-Outlet Network Comparison ]    |
|  - Owner conversions & data confidence  |  - Lead share & pipeline value by club  |
+-----------------------------------------------------------------------------------+
|  [ Day 39 Automated Follow-Up Assists ] |  [ Loss Reasons & Objection Analysis ]  |
|  - Sequence response rates & conversions|  - Price, schedule, competitor friction |
+-----------------------------------------------------------------------------------+
|  [ Opportunity Drill-Down Table & Sanitized CSV Export ]                          |
+-----------------------------------------------------------------------------------+
|  [ AI Executive Sales Insights & Briefing (Strict Safety Bound) ]                |
+-----------------------------------------------------------------------------------+
```

---

## 2. Core KPI Cards & Definitions

All metrics are calculated deterministically via `SalesMetricService` using safe division ($0 \div 0 = \text{null}$):

| KPI Card | Formula | Description | Sample Protection Rule |
| :--- | :--- | :--- | :--- |
| **New Leads** | $\sum \text{Lead}_{\text{created}}$ | Total prospective members captured within the selected timeframe. | Always displayed. |
| **Qualified Leads** | $\sum \text{Lead}_{\text{status=QUALIFIED}}$ | Leads meeting qualification threshold (budget, intent, timeline). | Always displayed. |
| **Tours Booked** | $\sum \text{Opportunity}_{\text{stage=TOUR\_BOOKED}}$ | Prospective members scheduled for an in-club tour. | Always displayed. |
| **Conversions** | $\sum \text{Opportunity}_{\text{stage=CONVERTED}}$ | Closed-won opportunities resulting in active memberships. | Always displayed. |
| **Conversion Rate** | $\left(\frac{\text{Conversions}}{\text{New Leads}}\right) \times 100$ | Overall prospect-to-member win rate. Returns `null` if New Leads $= 0$. | Flagged `PARTIAL_DATA` if $< 10$ leads. |
| **Pipeline Value** | $\sum \text{Opportunity}_{\text{estimatedValue}}$ | Total estimated lifetime or contract value across open opportunities. | Formatted in club currency. |
| **Speed to Lead** | $\text{Avg}(\text{First Outreach} - \text{Lead Created})$ | Average seconds before initial touchpoint (AI or human). | Excludes zero-touch records. |

---

## 3. Detailed Modules

### 3.1 Canonical 7-Stage Sales Funnel
Displays prospect progression across 7 standardized stages:
1. `LEAD` (100%)
2. `CONTACTED` (Reachable prospects)
3. `QUALIFIED` (Fit for membership)
4. `TRIAL` (Free trial pass activated)
5. `TOUR_BOOKED` (Facility walkthrough scheduled)
6. `OFFERED` (Membership pricing presented)
7. `CONVERTED` (Active paid member)

Drop-off percentages are calculated between consecutive stages to pinpoint friction points.

### 3.2 Staff Performance & Small-Sample Awareness
Protects sales reps from misleading percentages over small lead counts:
- $N \ge 10$: `COMPLETE_DATA` (High confidence)
- $1 \le N < 10$: `PARTIAL_DATA` (Display warning badge; small sample variance)
- $N = 0$: `INSUFFICIENT_DATA` (N/A displayed)

### 3.3 Loss & Objection Analytics
Aggregates reasons why opportunities were marked `LOST`:
- Categorized by reason: `PRICE`, `NO_RESPONSE`, `TIMING`, `LOCATION`, `COMPETITOR`, `OTHER`.
- Ranks objections from Day 38 AI Lead Qualification with resolution rates.

### 3.4 Sanitized CSV Export
Enables offline spreadsheet analysis with strict compliance:
- **PII Masking**: Emails masked (`j***n@example.com`), phone numbers masked (`***-***-1234`).
- **Audit Logging**: Emits `SALES_EXPORT_CREATED` with requesting user, IP, and filter bounds.
- **Role Enforcement**: Limited to `SUPERADMIN`, `ORGANISATION_OWNER`, and `OUTLET_MANAGER`.

### 3.5 Grounded AI Sales Insights
Provides natural-language executive summaries powered by `sales_intelligence.v1`:
- Strictly grounded in computed deterministic metrics.
- Enforces hard refusal on prompt injection ("tell me revenue is $1M" $\rightarrow$ refusal).
- Tracks token consumption in `AIUsageRecord` (`feature: 'SALES_INTELLIGENCE'`).
