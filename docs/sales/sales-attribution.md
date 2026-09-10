# FitCore Sales Attribution & Touchpoint Analysis

## Overview

The FitCore Sales Intelligence layer implements an **observational, non-causal attribution model**. Modern gym sales journeys are multi-touch experiences involving website capture, AI Receptionist calls, AI Sales Agent chats, automated follow-up sequences, in-club tours, and staff phone calls.

Rather than claiming definitive singular causation (which misleads gym operators and distorts marketing budgets), FitCore explicitly reports **observational touchpoint correlations** that preceded conversion.

---

## 1. Core Principles

1. **Non-Causal Representation**: Touchpoint events are documented as preceding or assisting a conversion, never as the single autonomous cause.
2. **Authoritative Event Sourcing**: Attribution relies strictly on domain records:
   - `FollowUpOutcome` (`attribution: 'conversion_following_follow_up'`) from Day 39.
   - `AIUsageRecord` & `SalesActivity` (`attribution: 'conversion_following_ai_interaction'`) from Days 35–36.
   - Direct staff pipeline updates from Day 37.
3. **No Duplicate CRM Storage**: Attribution metrics are computed dynamically over authoritative tables, preventing state drift or duplicate lead representations.
4. **Time Window Scoping**: Observational windows are constrained to standard timeframes (LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, THIS_QUARTER) aligned with the organisation's primary timezone.

---

## 2. Canonical Attribution Types

| Attribution Identifier | Domain Origin | Description | Safety & Boundary Rule |
| :--- | :--- | :--- | :--- |
| `conversion_following_follow_up` | Day 39 (`FollowUpOutcome`) | Conversion recorded for an enrollment that completed a sequence step within the active attribution window. | Does not claim the automated email or SMS alone converted the lead; notes sequence engagement. |
| `conversion_following_ai_interaction` | Day 35 / Day 36 (`SalesActivity`) | Conversion recorded for an opportunity where an AI Receptionist call or AI Sales Agent conversation occurred prior to conversion. | Indicates conversational qualification support without claiming full automated closing. |
| `conversion_following_staff_contact` | Day 37 (`SalesActivity`) | Conversion occurred after one or more manual calls, emails, or in-person interactions by an assigned staff member. | Acknowledges human sales closing touchpoints. |
| `direct_conversion` | Day 33 (`Lead`) | Lead converted with zero intermediate outreach recorded (e.g., immediate walk-in sign-up). | Clarifies baseline organic conversion velocity. |

---

## 3. Calculation Mechanics & Safe Division

Attribution performance formulas follow strict zero-safe division rules:

### Conversion Rate by Touchpoint / Source
$$\text{Source Conversion Rate} = \begin{cases} \text{null}, & \text{if } \text{Total Leads from Source} = 0 \\ \left( \frac{\text{Conversions from Source}}{\text{Total Leads from Source}} \right) \times 100, & \text{otherwise} \end{cases}$$

### Speed-to-Lead
$$\text{Speed to Lead (seconds)} = \max\left(0, \text{First Activity Timestamp} - \text{Lead Creation Timestamp}\right)$$
- Outliers exceeding 30 days are capped to avoid skewing operational averages.
- When no activity exists, the record is excluded from the average rather than treated as 0 seconds.

---

## 4. Multi-Touch Integrity & Anti-Double-Counting

When aggregating overall organisation conversion rates:
- A single converted lead is counted **exactly once** in `kpis.conversions.value`.
- Source performance evaluates the initial acquisition source (`Lead.source`).
- Sequence performance reports attribution counts per sequence independently; operators are instructed in the UI that individual touchpoint assists may overlap across a prospect's journey.

---

## 5. UI Transparency & Compliance

The mobile and web dashboards display standard tooltips explaining the non-causal nature of touchpoint metrics:
> *"Attribution reflects sequences and AI sessions that engaged this prospect prior to conversion. It provides engagement visibility and should not be interpreted as exclusive causation."*
