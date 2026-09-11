# Sales Intelligence Domain

## Overview
The **Sales Intelligence** domain brings authoritative CRM visibility into lead acquisition, qualification efficiency, opportunity pipelines, and staff conversion metrics.

---

## The Sales Conversion Funnel

The funnel maps prospect progression across 6 standardized stages:

```
[ 1. LEADS ] ──► [ 2. CONTACTED ] ──► [ 3. QUALIFIED ] ──► [ 4. TRIAL / TOUR ] ──► [ 5. OFFERED ] ──► [ 6. CONVERTED ]
```

### Stage Definitions & Explicit Denominators:
Each funnel stage exposes both its absolute count and its progression rate relative to the preceding stage's explicit denominator:

| Stage | Definition | Explicit Denominator | Progression Formula |
| :--- | :--- | :--- | :--- |
| `LEADS` | Total prospect leads registered in date window | Base Population | Baseline (100%) |
| `CONTACTED` | Leads contacted via call, SMS, or WhatsApp | Total Leads | `(Contacted / Total Leads) * 100` |
| `QUALIFIED` | Leads meeting budget, goals, and commitment criteria | Contacted Leads | `(Qualified / Contacted) * 100` |
| `TRIAL_TOUR` | Prospects completing a physical tour or trial session | Qualified Leads | `(Tours + Trials / Qualified) * 100` |
| `OFFERED` | Formal membership proposals submitted | Trial / Tour Leads | `(Offered / Trial Tour) * 100` |
| `CONVERTED` | Contracts signed and initial payment processed | Offered Leads | `(Converted / Offered) * 100` |

---

## Overall Lead Conversion Rate
$$\text{Conversion Rate} = \frac{\text{Total Converted}}{\text{Conversion Denominator}} \times 100$$
Where `Conversion Denominator` is explicitly exposed in the API payload:
* If `newLeads > 0`, `conversionDenominator = newLeads`.
* If `newLeads == 0` and `opportunities > 0`, `conversionDenominator = opportunities.length`.
* If both are 0, `conversionRate = null`.

---

## Speed to Lead & Response Efficiency
* **Speed to Lead**: Median time in seconds from prospect lead creation to first outbound contact by staff or AI Receptionist.
* **Response Rate**: Percentage of leads receiving outbound outreach within the target SLA (default: 15 minutes).

---

## Pipeline Valuation & Lead Source Attribution
* **Pipeline Value**: Sum of estimated contract values across all active open opportunities.
* **Lead Source Breakdown**: Performance partitioned by lead acquisition channel:
  * `WEBSITE`: Inbound web forms and landing pages.
  * `AI_RECEPTIONIST`: Autonomous front-desk voice and text conversions.
  * `WALK_IN`: Unscheduled facility visitors.
  * `REFERRAL`: Existing member word-of-mouth recommendations.
  * `SOCIAL_MEDIA`: Paid marketing campaigns (Meta, Google, TikTok).
