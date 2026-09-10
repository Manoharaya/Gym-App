# FitCore Sales Metric Definitions & Mathematical Formulas

This document serves as the canonical dictionary and reference guide for all metrics calculated across the **FitCore Sales Intelligence Dashboard** (Day 40). Every widget, chart, and export adheres to these authoritative definitions.

---

## 1. Lead & Pipeline Volume Metrics

### 1.1 New Leads (`newLeads`)
- **DisplayName**: New Leads
- **Definition**: The total number of unique prospective member leads captured during the selected reporting period.
- **Formula**:
  $$\text{newLeads} = \sum \mathbf{1}_{\{ \text{Lead.createdAt} \in [t_{\text{start}}, t_{\text{end}}] \land \text{Lead.organisationId} = \text{tenantId} \}}$$
- **Source**: Day 33 Multi-Tenant Lead Capture (`Lead`).
- **Denominator**: N/A (Count).
- **Time Window**: Selected reporting period (UTC normalized from outlet timezone).
- **Timezone**: Evaluated using the outlet's IANA timezone.
- **Limitations**: Excludes rejected spam, merged duplicates, and test entities.

---

### 1.2 Qualified Leads (`qualifiedLeads`)
- **DisplayName**: Qualified Leads
- **Definition**: Prospective leads whose qualification status has authoritatively reached `QUALIFIED` or whose buying intent flag is `isHighIntent = true`.
- **Formula**:
  $$\text{qualifiedLeads} = \text{COUNT}(\text{Lead WHERE } \text{qualificationStatus} = \text{'QUALIFIED'} \lor \text{isHighIntent} = \text{true})$$
- **Source**: Day 38 AI Lead Qualification (`LeadQualificationProfile`).
- **Denominator**: N/A (Count).
- **Time Window**: Selected reporting period based on lead creation.
- **Timezone**: Outlet local wall-clock converted to UTC.
- **Limitations**: Does not count leads that are actively in progress or flagged for manual staff review.

---

### 1.3 Open Opportunities (`openOpportunities`)
- **DisplayName**: Open Commercial Opportunities
- **Definition**: Active commercial opportunities in the pipeline that have not reached a terminal closed stage (`CONVERTED` or `LOST`).
- **Formula**:
  $$\text{openOpportunities} = \text{COUNT}(\text{SalesOpportunity WHERE currentStage} \notin \{\text{'CONVERTED'}, \text{'LOST'}\})$$
- **Source**: Day 37 Commercial Sales Pipeline (`SalesOpportunity`).
- **Denominator**: N/A (Count).
- **Time Window**: Active snapshot at time of query.
- **Timezone**: UTC.
- **Limitations**: Includes opportunities that are currently flagged as stale (`isStale = true`) but not yet marked lost.

---

## 2. Conversion & Funnel Rates

### 2.1 Overall Conversion Rate (`conversionRate`)
- **DisplayName**: Lead to Member Conversion Rate
- **Definition**: The percentage of leads captured within the cohort period that progressed to an authoritative conversion (`CONVERTED`).
- **Formula**:
  $$\text{conversionRate} = \begin{cases} \text{null} & \text{if } \text{newLeads} = 0 \\ \text{round}\left(\frac{\text{conversions}}{\text{newLeads}} \times 100, 1\right) & \text{otherwise} \end{cases}$$
- **Source**: Days 33 and 37 (`Lead` and `SalesOpportunity`).
- **Denominator**: Total `newLeads` created within the cohort window.
- **Time Window**: Cohort creation window.
- **Timezone**: Outlet timezone.
- **Limitations**: If `newLeads < 10`, marked `INSUFFICIENT_DATA` or `PARTIAL_DATA` to prevent statistical distortion.

---

### 2.2 Stage Conversion Rate (`stageConversionRate`)
- **DisplayName**: Funnel Stage-to-Stage Progression Rate
- **Definition**: The percentage of opportunities entering stage $S_i$ that advance to next stage $S_{i+1}$.
- **Formula**:
  $$\text{stageConversionRate}(S_i \to S_{i+1}) = \frac{\text{Opportunities in } S_{i+1}}{\text{Opportunities in } S_i} \times 100$$
- **Source**: Day 37 `SalesStageHistory`.
- **Denominator**: Count of opportunities entering stage $S_i$.
- **Time Window**: Selected period.
- **Timezone**: UTC.
- **Limitations**: Non-linear pipeline transitions are reflected in drop-off analytics.

---

## 3. Responsiveness & Speed Metrics

### 3.1 Speed to Lead (`speedToLeadSeconds`)
- **DisplayName**: Average Speed to Lead
- **Definition**: Elapsed seconds from lead record creation to the timestamp of the first outbound contact (via AI Receptionist, Sales Agent, Staff, or Automated Follow-Up).
- **Formula**:
  $$\text{speedToLead} = \text{firstOutboundContactAt} - \text{leadCreatedAt} \quad (\text{seconds})$$
- **Source**: Days 33, 28, and 37 (`Lead`, `CommunicationDeliveryEvent`, `SalesActivity`).
- **Denominator**: Total contacted leads with recorded activity timestamps.
- **Time Window**: Selected date range.
- **Timezone**: Calculated via millisecond epoch difference (timezone invariant).
- **Limitations**: Separates automated AI touches from human staff contacts to avoid false speed attribution.

---

### 3.2 Inbound Response Rate (`responseRate`)
- **DisplayName**: Response Rate
- **Definition**: The percentage of prospects receiving outbound communication who responded with an inbound communication or message.
- **Formula**:
  $$\text{responseRate} = \frac{\text{COUNT}(\text{Prospects with inbound response})}{\text{COUNT}(\text{Prospects sent outbound messages})} \times 100$$
- **Source**: Days 28, 37, 39 (`CommunicationDeliveryEvent`, `FollowUpResponse`).
- **Denominator**: Unique prospects sent outbound communications.
- **Time Window**: Selected date range.
- **Timezone**: Outlet timezone.
- **Limitations**: Delivery receipts and read receipts are NOT counted as active customer responses.

---

## 4. Pipeline Valuation & Financial Boundary

### 4.1 Estimated Pipeline Value (`pipelineValue`)
- **DisplayName**: Estimated Pipeline Value
- **Definition**: The total estimated commercial value of all open opportunities currently progressing in the pipeline.
- **Formula**:
  $$\text{pipelineValue} = \sum_{\text{open opps}} \text{estimatedValue}$$
- **Source**: Day 37 `SalesOpportunity.estimatedValue`.
- **Denominator**: N/A (Currency Sum).
- **Time Window**: Current snapshot.
- **Timezone**: UTC.
- **Limitations**: **Estimated value only**. Does not represent realized cash revenue. Cash accounting and recurring invoice reconciliation belong to Day 41.

---

## 5. Small Sample Evaluation Standards

To maintain analytical integrity, FitCore enforces small-sample protection rules across all widgets:

| Sample Size ($N$) | Data Quality Flag | Dashboard Treatment | AI Interpretation |
|---|---|---|---|
| $N = 0$ | `INSUFFICIENT_DATA` | Display `N/A` (never $0\%$) | Excluded from trend analysis |
| $1 \le N < 10$ | `PARTIAL_DATA` | Display value with caution tooltip | Append small-sample caveat |
| $N \ge 10$ | `COMPLETE_DATA` | Display full metric and comparison | Full statistical interpretation |
